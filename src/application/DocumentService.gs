var DocumentService = (function () {
  var TYPES=['ANNEX_1','ANNEX_2','ANNEX_3','ANNEX_5','FULL_PACKAGE'];
  function snapshot_(visitId,dataVersion){var rows=SheetsRepository.filter('VISIT_SNAPSHOTS',function(s){return String(s.visit_id)===String(visitId)&&Number(s.data_version)===Number(dataVersion);});if(!rows.length)throw AppErrors.document('No existe snapshot para esta versión.');return rows[0];}
  function generate(visitId,type,options,requestId){
    if(typeof options==='string'&&!requestId){requestId=options;options={};}
    options=options||{};var force=!!options.force;
    if(TYPES.indexOf(type)<0)throw AppErrors.validation('Tipo de documento inválido.');
    var actor=Auth.current(),visit=VisitService.raw(visitId);Auth.assertVisit(actor,visit,false);if([VisitState.values.FINALIZED,VisitState.values.DOCUMENTS].indexOf(visit.status)<0)throw AppErrors.validation('Finalice la evaluación antes de generar documentos.');
    var config=AppConfig.validate(),snapshotRow=snapshot_(visitId,visit.data_version),idempotency=[visitId,visit.data_version,type,config.templateVersion,snapshotRow.snapshot_hash,force?Utilities.getUuid():''].join('|');
    function ensureSharing_(f){if(!f||!f.setSharing)return;try{f.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){try{f.setSharing(DriveApp.Access.DOMAIN_WITH_LINK,DriveApp.Permission.VIEW);}catch(e2){}}}
    var existing=SheetsRepository.filter('DOCUMENTS',function(d){return d.visit_id===visitId&&Number(d.data_version)===Number(visit.data_version)&&d.document_type===type&&d.template_version===config.templateVersion&&d.snapshot_hash===snapshotRow.snapshot_hash&&d.status==='READY'&&!d.superseded_at;})[0];
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
    if(force&&existing){existing.superseded_at=JsonUtil.now();SheetsRepository.upsert('DOCUMENTS',['document_id'],existing);}
    var job=SheetsRepository.find('DOCUMENT_JOBS','idempotency_key',idempotency)||{job_id:Utilities.getUuid(),idempotency_key:idempotency,visit_id:visitId,data_version:visit.data_version,document_type:type,attempt_count:0,request_id:requestId};job.status='GENERATING';job.attempt_count=Number(job.attempt_count||0)+1;job.started_at=JsonUtil.now();job.last_error_code='';SheetsRepository.upsert('DOCUMENT_JOBS',['idempotency_key'],job);
    var name=visit.visit_code+'_v'+visit.data_version+'_'+type+'.pdf';
    try{var snapshot=JSON.parse(snapshotRow.snapshot_json),file=DocsGateway.render(config.templateIds[type],name,snapshot,type,config.tempFolderId,config.outputFolderId),record={document_id:Utilities.getUuid(),visit_id:visitId,data_version:visit.data_version,document_type:type,template_version:config.templateVersion,snapshot_hash:snapshotRow.snapshot_hash,status:'READY',drive_file_id:file.getId(),file_name:name,mime_type:MimeType.PDF,size_bytes:file.getSize(),generated_at:JsonUtil.now(),generated_by:actor.user_id,superseded_at:'',error_code:''};SheetsRepository.append('DOCUMENTS',record);job.status='READY';job.completed_at=JsonUtil.now();SheetsRepository.upsert('DOCUMENT_JOBS',['idempotency_key'],job);Audit.write(actor,'DOCUMENT_GENERATED','VISIT',visitId,visit.data_version,requestId,'SUCCESS','Documento generado',{type:type,snapshotHash:snapshotRow.snapshot_hash});
      var readyTypes=SheetsRepository.filter('DOCUMENTS',function(d){return d.visit_id===visitId&&Number(d.data_version)===Number(visit.data_version)&&d.status==='READY'&&!d.superseded_at;}).map(function(d){return d.document_type;});if(readyTypes.indexOf('FULL_PACKAGE')>=0||TYPES.every(function(t){return readyTypes.indexOf(t)>=0;})){visit.status=VisitState.values.DOCUMENTS;visit.row_version=Number(visit.row_version)+1;SheetsRepository.upsert('VISITS',['visit_id'],visit);}return Object.assign({},record,{url:file.getUrl(),reused:false});
    }catch(e){job.status='ERROR';job.completed_at=JsonUtil.now();job.last_error_code=e.code||'DOCUMENT_ERROR';SheetsRepository.upsert('DOCUMENT_JOBS',['idempotency_key'],job);Audit.write(actor,'DOCUMENT_FAILED','VISIT',visitId,visit.data_version,requestId,'ERROR','Falló generación documental',{type:type,code:job.last_error_code});throw e.code?e:AppErrors.document();}
  }
  function list(visitId){var actor=Auth.current(),visit=VisitService.raw(visitId);Auth.assertVisit(actor,visit,false);return SheetsRepository.filter('DOCUMENTS',function(d){return d.visit_id===visitId&&!d.superseded_at&&d.status==='READY';}).map(function(d){if(d.drive_file_id){try{var f=DriveApp.getFileById(d.drive_file_id);if(f&&f.setSharing){try{f.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){try{f.setSharing(DriveApp.Access.DOMAIN_WITH_LINK,DriveApp.Permission.VIEW);}catch(e2){}}}d.url=f.getUrl();}catch(e){d.url='https://drive.google.com/file/d/'+d.drive_file_id+'/view';}}return d;});}
  function getBlob(visitId,type){var actor=Auth.current(),visit=VisitService.raw(visitId);Auth.assertVisit(actor,visit,false);var doc=SheetsRepository.filter('DOCUMENTS',function(d){return d.visit_id===visitId&&d.document_type===type&&d.status==='READY'&&!d.superseded_at;})[0];if(!doc||!doc.drive_file_id)throw AppErrors.document('El documento solicitado no existe o aún no ha sido generado.');var file=DriveApp.getFileById(doc.drive_file_id);if(file&&file.setSharing){try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){try{file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK,DriveApp.Permission.VIEW);}catch(e2){}}}var bytes=file.getBlob().getBytes();return {fileName:doc.file_name||file.getName()||'Expediente.pdf',mimeType:'application/pdf',base64:Utilities.base64Encode(bytes)};}
  return {generate:generate,list:list,getBlob:getBlob,types:TYPES};
})();

