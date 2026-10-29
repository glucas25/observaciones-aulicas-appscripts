var FinalizationService = (function () {
  function finalize(visitId, expectedVersion, visitDto, requestId) {
    if (typeof visitDto === 'string' && !requestId) {
      requestId = visitDto;
      visitDto = null;
    }
    var actor = Auth.requireRoles(['ADMIN', 'DIRECTIVE', 'EVALUATOR']), lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      var row = VisitService.raw(visitId); Auth.assertVisit(actor,row,true);
      if (row.status === VisitState.values.FINALIZED || row.status === VisitState.values.DOCUMENTS) {
        var existingSnap = SheetsRepository.filter('VISIT_SNAPSHOTS', function (s) {
          return String(s.visit_id) === String(visitId) && Number(s.data_version) === Number(row.data_version);
        })[0];
        return { visit: VisitService.aggregate(row), snapshotHash: existingSnap ? existingSnap.snapshot_hash : '' };
      }
      if (expectedVersion != null && Number(row.row_version) !== Number(expectedVersion)) {
        Audit.write(actor, 'VERSION_CONFLICT', 'VISIT', visitId, row.data_version, requestId, 'ERROR', 'Conflicto de versión al finalizar');
        throw AppErrors.conflict();
      }
      var now = JsonUtil.now();
      if (visitDto && VisitService.applyDraft) {
        if (!VisitState.isEditable(row.status)) throw AppErrors.validation('La evaluación está bloqueada para edición.');
        row = VisitService.applyDraft(visitId, visitDto, actor, now, row);
      }
      if (row.status === VisitState.values.DRAFT || row.status === VisitState.values.REOPENED) {
        VisitState.assertTransition(row.status, VisitState.values.REVIEW);
        row.status = VisitState.values.REVIEW;
      } else if (row.status !== VisitState.values.REVIEW) {
        throw AppErrors.validation('El estado actual de la evaluación no permite finalizarla.');
      }
      var aggregate = VisitService.aggregate(row); Validation.validateForFinalization(aggregate);
      VisitState.assertTransition(row.status, VisitState.values.FINALIZED);
      var generalById={},rubricById={},evidenceById={};
      SheetsRepository.all('GENERAL_CRITERIA').forEach(function(c){generalById[c.general_criterion_id]=c;});
      SheetsRepository.all('RUBRIC_CRITERIA').forEach(function(c){rubricById[c.criterion_id]=c;});
      SheetsRepository.all('EVIDENCE_CHECK_TYPES').forEach(function(c){evidenceById[c.check_type_id]=c;});
      aggregate.generalResponses.forEach(function(r){var c=generalById[r.generalCriterionId];if(!c||String(c.catalog_version)!==String(row.general_catalog_version))throw AppErrors.validation('Una respuesta general no corresponde al catálogo de la visita.');r.criterionCode=c.criterion_code;r.criterionText=c.text;});
      aggregate.rubricResponses.forEach(function(r){var c=rubricById[r.criterionId];if(!c||String(c.rubric_version_id)!==String(row.rubric_version_id))throw AppErrors.validation('Una respuesta no corresponde a la versión de rúbrica de la visita.');r.criterionCode=c.criterion_code;r.criterionTitle=c.title;r.descriptorAchieved=c.descriptor_achieved;r.descriptorInProgress=c.descriptor_in_progress;r.descriptorBeginning=c.descriptor_beginning;r.groupCode=c.group_code;r.sortOrder=Number(c.sort_order||0);});
      aggregate.evidenceChecks.forEach(function(r){var c=evidenceById[r.checkTypeId];if(!c||String(c.catalog_version)!==String(row.evidence_catalog_version))throw AppErrors.validation('Un check no corresponde al catálogo de la visita.');r.checkCode=c.check_code;r.label=c.label;});
      var existing=SheetsRepository.filter('VISIT_SNAPSHOTS',function(s){return String(s.visit_id)===visitId&&Number(s.data_version)===Number(row.data_version);})[0],snapshot,hash;
      if(existing){snapshot=JSON.parse(existing.snapshot_json);hash=existing.snapshot_hash;}else{snapshot=Object.assign({},aggregate,{snapshotSchemaVersion:1,finalizedAt:now,finalizedBy:actor.user_id});delete snapshot.rowVersion;hash=JsonUtil.hash(snapshot);SheetsRepository.append('VISIT_SNAPSHOTS',{snapshot_id:Utilities.getUuid(),visit_id:visitId,data_version:row.data_version,snapshot_json:JSON.stringify(snapshot),snapshot_hash:hash,schema_version:1,created_at:now,created_by:actor.user_id});}
      row.status=VisitState.values.FINALIZED; row.finalized_at=now; row.finalized_by=actor.user_id; row.row_version=Number(row.row_version)+1; row.updated_at=now; row.updated_by=actor.user_id;
      SheetsRepository.upsert('VISITS',['visit_id'],row);
      Audit.write(actor,'VISIT_FINALIZED','VISIT',visitId,row.data_version,requestId,'SUCCESS','Evaluación finalizada',{snapshotHash:hash});
      return {visit:VisitService.aggregate(row),snapshotHash:hash};
    } finally { lock.releaseLock(); }
  }
  function changeStatus(visitId, target, expectedVersion, visitDto, requestId) {
    if (typeof visitDto === 'string' && !requestId) {
      requestId = visitDto;
      visitDto = null;
    }
    var actor = Auth.requireRoles(['ADMIN', 'DIRECTIVE', 'EVALUATOR']), lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      var row = VisitService.raw(visitId); Auth.assertVisit(actor, row, true);
      if(Number(row.row_version)!==Number(expectedVersion)) {
        Audit.write(actor, 'VERSION_CONFLICT', 'VISIT', visitId, row.data_version, requestId, 'ERROR', 'Conflicto de versión al cambiar estado');
        throw AppErrors.conflict();
      }
      var now = JsonUtil.now();
      if (visitDto && VisitService.applyDraft) {
        if (!VisitState.isEditable(row.status)) throw AppErrors.validation('La evaluación está bloqueada para edición.');
        row = VisitService.applyDraft(visitId, visitDto, actor, now, row);
      }
      if(target===VisitState.values.REVIEW)Validation.validateForReview(VisitService.aggregate(row));
      VisitState.assertTransition(row.status,target); row.status=target; row.row_version=Number(row.row_version)+1; row.updated_at=now; row.updated_by=actor.user_id;
      SheetsRepository.upsert('VISITS',['visit_id'],row); Audit.write(actor,'VISIT_STATUS_CHANGED','VISIT',visitId,row.data_version,requestId,'SUCCESS','Estado actualizado',{status:target});
      return VisitService.aggregate(row);
    } finally { lock.releaseLock(); }
  }
  function reopen(visitId,reason,requestId) {
    var actor=Auth.requireRoles(['ADMIN']),why=Validation.required(reason,'Motivo de reapertura',500),row=VisitService.raw(visitId);
    VisitState.assertTransition(row.status,VisitState.values.REOPENED); row.status=VisitState.values.REOPENED; row.data_version=Number(row.data_version)+1; row.row_version=Number(row.row_version)+1;
    row.reopened_at=JsonUtil.now(); row.reopened_by=actor.user_id; row.reopen_reason=why; row.updated_at=JsonUtil.now(); row.updated_by=actor.user_id;
    SheetsRepository.upsert('VISITS',['visit_id'],row); Audit.write(actor,'VISIT_REOPENED','VISIT',visitId,row.data_version,requestId,'SUCCESS','Evaluación reabierta',{reason:why}); return VisitService.aggregate(row);
  }
  function annul(visitId,reason,requestId) {
    var actor=Auth.requireRoles(['ADMIN']),why=Validation.required(reason,'Motivo de anulación',500),row=VisitService.raw(visitId);
    VisitState.assertTransition(row.status,VisitState.values.ANNULLED); row.status=VisitState.values.ANNULLED; row.row_version=Number(row.row_version)+1; row.annulled_at=JsonUtil.now(); row.annulled_by=actor.user_id; row.annul_reason=why;
    SheetsRepository.upsert('VISITS',['visit_id'],row); Audit.write(actor,'VISIT_ANNULLED','VISIT',visitId,row.data_version,requestId,'SUCCESS','Evaluación anulada',{reason:why}); return VisitService.aggregate(row);
  }
  return {finalize:finalize,changeStatus:changeStatus,reopen:reopen,annul:annul};
})();
