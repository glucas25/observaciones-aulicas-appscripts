var DocumentService = (function () {
  var TYPES=['ANNEX_1','ANNEX_2','ANNEX_3','ANNEX_5','FULL_PACKAGE'];
  function snapshot_(visitId,dataVersion){var rows=SheetsRepository.filter('VISIT_SNAPSHOTS',function(s){return String(s.visit_id)===String(visitId)&&Number(s.data_version)===Number(dataVersion);});if(!rows.length)throw AppErrors.document('No existe snapshot para esta versión.');return rows[0];}
  function ensureSharing_(f){if(!f||!f.setSharing)return;try{f.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){try{f.setSharing(DriveApp.Access.DOMAIN_WITH_LINK,DriveApp.Permission.VIEW);}catch(e2){}}}
  function latestManagedLogo_(config){
    try{
      if(typeof DriveApp==='undefined'||!config||!config.outputFolderId)return '';
      var folder=DriveApp.getFolderById(config.outputFolderId),best=null,bestTime=0;
      function scan(iterator){
        while(iterator&&iterator.hasNext()){
          var file=iterator.next(),name=String(file.getName?file.getName():''),mime=String(file.getMimeType?file.getMimeType():'').toLowerCase();
          if(!/logo/i.test(name))continue;
          if(!/^image\/(png|jpeg)$/.test(mime)&&!(/\.(png|jpe?g)$/i.test(name)))continue;
          var changed=file.getLastUpdated?file.getLastUpdated():null,time=changed&&changed.getTime?changed.getTime():0;
          if(!best||time>bestTime){best=file;bestTime=time;}
        }
      }
      scan(folder.getFilesByType(MimeType.PNG));
      scan(folder.getFilesByType(MimeType.JPEG));
      try{scan(DriveApp.searchFiles("title contains 'logo' and trashed = false"));}catch(searchError){}
      return best?best.getId():'';
    }catch(e){return '';}
  }
  function currentInstitution_(visit){
    try{
      if(typeof SheetSchema!=='undefined'&&SheetSchema.all&&SheetSchema.all.INSTITUTIONS)SheetsRepository.ensureColumns('INSTITUTIONS',SheetSchema.all.INSTITUTIONS);
      return SheetsRepository.find?SheetsRepository.find('INSTITUTIONS','institution_id',visit.institution_id):null;
    }catch(e){return null;}
  }
  function currentLogo_(institution,config){var stored=institution?(institution.logo_drive_id||institution.logo_file_id||''):'';return stored||latestManagedLogo_(config);}
  function currentMinistryLogo_(institution){return institution?(institution.ministry_logo_drive_id||institution.ministry_logo_file_id||''):'';}
  function hydrateInstitution_(snapshot,visit,logoId,ministryLogoId,institution){snapshot=snapshot||{};snapshot.institutionId=snapshot.institutionId||visit.institution_id||'';if(logoId)snapshot.institutionLogoDriveId=logoId;if(ministryLogoId)snapshot.institutionMinistryLogoDriveId=ministryLogoId;if(institution){snapshot.institutionNameSnapshot=institution.name||snapshot.institutionNameSnapshot;snapshot.institutionAddress=institution.address||snapshot.institutionAddress;snapshot.institutionPhone=institution.phone||'';snapshot.institutionEmail=institution.email||'';snapshot.institutionProvince=institution.province||'';snapshot.location=institution.location||snapshot.location;snapshot.zone=institution.zone||snapshot.zone;snapshot.district=institution.district||snapshot.district;snapshot.circuit=institution.circuit||snapshot.circuit;}return snapshot;}
  function generate(visitId,type,options,requestId){
    if(typeof options==='string'&&!requestId){requestId=options;options={};}
    options=options||{};var force=!!options.force;
    if(TYPES.indexOf(type)<0)throw AppErrors.validation('Tipo de documento inválido.');
    var actor=Auth.current(),visit=VisitService.raw(visitId);Auth.assertVisit(actor,visit,false);if([VisitState.values.FINALIZED,VisitState.values.DOCUMENTS].indexOf(visit.status)<0)throw AppErrors.validation('Finalice la evaluación antes de generar documentos.');
    var config=AppConfig.validate(),institution=currentInstitution_(visit),logoId=currentLogo_(institution,config),ministryLogoId=currentMinistryLogo_(institution),templateVersion=config.templateVersion+(logoId?'-logo-'+logoId:'')+(ministryLogoId?'-ministry-'+ministryLogoId:''),snapshotRow=snapshot_(visitId,visit.data_version),idempotency=[visitId,visit.data_version,type,templateVersion,snapshotRow.snapshot_hash,force?Utilities.getUuid():''].join('|');
    var existing=SheetsRepository.filter('DOCUMENTS',function(d){return d.visit_id===visitId&&Number(d.data_version)===Number(visit.data_version)&&d.document_type===type&&d.template_version===templateVersion&&d.snapshot_hash===snapshotRow.snapshot_hash&&d.status==='READY'&&!d.superseded_at;})[0];
    if(!force&&existing){
      try{
        var existingFile=DriveApp.getFileById(existing.drive_file_id);
        ensureSharing_(existingFile);
        var existingUrl=existingFile.getUrl();
        if(visit.status===VisitState.values.FINALIZED){
          visit.status=VisitState.values.DOCUMENTS;
          visit.row_version=Number(visit.row_version)+1;
          SheetsRepository.upsert('VISITS',['visit_id'],visit);
        }
        return Object.assign({},existing,{url:existingUrl,reused:true});
      }catch(e){
        existing.superseded_at=JsonUtil.now();
        SheetsRepository.upsert('DOCUMENTS',['document_id'],existing);
      }
    }
    var job=SheetsRepository.find('DOCUMENT_JOBS','idempotency_key',idempotency)||{job_id:Utilities.getUuid(),idempotency_key:idempotency,visit_id:visitId,data_version:visit.data_version,document_type:type,attempt_count:0,request_id:requestId};job.status='GENERATING';job.attempt_count=Number(job.attempt_count||0)+1;job.started_at=JsonUtil.now();job.last_error_code='';SheetsRepository.upsert('DOCUMENT_JOBS',['idempotency_key'],job);
    var name=visit.visit_code+'_v'+visit.data_version+'_'+type+'.pdf';
    try{var snapshot=hydrateInstitution_(JSON.parse(snapshotRow.snapshot_json),visit,logoId,ministryLogoId,institution),file=DocsGateway.render(config.templateIds[type],name,snapshot,type,config.tempFolderId,config.outputFolderId),generatedAt=JsonUtil.now();SheetsRepository.filter('DOCUMENTS',function(d){return String(d.visit_id)===String(visitId)&&Number(d.data_version)===Number(visit.data_version)&&d.document_type===type&&d.status==='READY'&&!d.superseded_at;}).forEach(function(old){old.superseded_at=generatedAt;SheetsRepository.upsert('DOCUMENTS',['document_id'],old);});var record={document_id:Utilities.getUuid(),visit_id:visitId,data_version:visit.data_version,document_type:type,template_version:templateVersion,snapshot_hash:snapshotRow.snapshot_hash,status:'READY',drive_file_id:file.getId(),file_name:name,mime_type:MimeType.PDF,size_bytes:file.getSize(),generated_at:generatedAt,generated_by:actor.user_id,superseded_at:'',error_code:''};SheetsRepository.append('DOCUMENTS',record);job.status='READY';job.completed_at=JsonUtil.now();SheetsRepository.upsert('DOCUMENT_JOBS',['idempotency_key'],job);Audit.write(actor,'DOCUMENT_GENERATED','VISIT',visitId,visit.data_version,requestId,'SUCCESS','Documento generado',{type:type,snapshotHash:snapshotRow.snapshot_hash});
      var readyTypes=SheetsRepository.filter('DOCUMENTS',function(d){return d.visit_id===visitId&&Number(d.data_version)===Number(visit.data_version)&&d.status==='READY'&&!d.superseded_at;}).map(function(d){return d.document_type;});if(readyTypes.indexOf('FULL_PACKAGE')>=0||TYPES.every(function(t){return readyTypes.indexOf(t)>=0;})){visit.status=VisitState.values.DOCUMENTS;visit.row_version=Number(visit.row_version)+1;SheetsRepository.upsert('VISITS',['visit_id'],visit);}return Object.assign({},record,{url:file.getUrl(),reused:false});
    }catch(e){job.status='ERROR';job.completed_at=JsonUtil.now();job.last_error_code=e.code||'DOCUMENT_ERROR';SheetsRepository.upsert('DOCUMENT_JOBS',['idempotency_key'],job);Audit.write(actor,'DOCUMENT_FAILED','VISIT',visitId,visit.data_version,requestId,'ERROR','Falló generación documental',{type:type,code:job.last_error_code});throw e.code?e:AppErrors.document();}
  }
  function list(visitId){var actor=Auth.current(),visit=VisitService.raw(visitId);Auth.assertVisit(actor,visit,false);var docs=SheetsRepository.filter('DOCUMENTS',function(d){return String(d.visit_id)===String(visitId)&&!d.superseded_at&&d.status==='READY';});docs.sort(function(a,b){return String(b.generated_at||'').localeCompare(String(a.generated_at||''));});return docs.map(function(d){if(d.drive_file_id)d.url='https://drive.google.com/file/d/'+d.drive_file_id+'/view?usp=sharing';return d;});}
  function getBlob(visitId,type){var actor=Auth.current(),visit=VisitService.raw(visitId);Auth.assertVisit(actor,visit,false);var docs=SheetsRepository.filter('DOCUMENTS',function(d){return String(d.visit_id)===String(visitId)&&d.document_type===type&&d.status==='READY'&&!d.superseded_at;});if(!docs.length)throw AppErrors.document('El documento solicitado no existe o aún no ha sido generado.');var doc=docs[docs.length-1];var file;try{file=DriveApp.getFileById(doc.drive_file_id);if(file&&file.isTrashed&&file.isTrashed()){throw new Error('El archivo está en la papelera');}}catch(e){doc.superseded_at=JsonUtil.now();SheetsRepository.upsert('DOCUMENTS',['document_id'],doc);throw AppErrors.document('El archivo PDF en Google Drive no fue encontrado o fue eliminado. Haga clic en "Regenerar" para generar una copia nueva.');}ensureSharing_(file);var bytes=file.getBlob().getBytes();return {fileName:doc.file_name||file.getName()||'Expediente.pdf',mimeType:'application/pdf',base64:Utilities.base64Encode(bytes)};}
  return {generate:generate,list:list,getBlob:getBlob,types:TYPES};
})();

