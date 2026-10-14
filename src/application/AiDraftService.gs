var AiDraftService = (function () {
  function draft(visitId,requestId) {
    var actor = Auth.requireRoles(['ADMIN', 'DIRECTIVE', 'EVALUATOR']), visit = VisitService.get(visitId); if (!VisitState.isEditable(visit.status)) throw AppErrors.validation('La evaluación no se puede editar.');
    var missing = [];
    if (!visit.observationRecord || !String(visit.observationRecord).trim()) {
      missing.push('el Anexo 1 (registro narrativo en Paso 2)');
    }
    var rubricsCount = (visit.rubricResponses || []).length;
    if (rubricsCount < 15) {
      missing.push('los 15 criterios de la rúbrica (' + rubricsCount + '/15 evaluados en Paso 4)');
    }
    if (missing.length > 0) {
      throw AppErrors.validation('Para generar el borrador con IA es obligatorio completar: ' + missing.join(' y ') + '.');
    }
    var LEVEL_NAMES = { ACHIEVED: 'Logrado', IN_PROGRESS: 'En proceso', BEGINNING: 'En inicio', NOT_APPLICABLE: 'No aplica' };
    var GENERAL_NAMES = { FULLY_AGREE: 'Totalmente de acuerdo', DISAGREE: 'En desacuerdo' };
    var rubricMap = {};
    try { (SheetsRepository.all('RUBRIC_CRITERIA') || []).forEach(function (c) { rubricMap[c.criterion_id] = c; }); } catch (_) {}
    var generalMap = {};
    try { (SheetsRepository.all('GENERAL_CRITERIA') || []).forEach(function (g) { generalMap[g.general_criterion_id] = g; }); } catch (_) {}

    var input = {
      observationRecord: visit.observationRecord || '',
      gradeCourse: visit.gradeCourse || '',
      subject: visit.subject || '',
      contentTopic: visit.contentTopic || '',
      generalResponses: (visit.generalResponses || []).map(function (r) {
        var g = generalMap[r.generalCriterionId] || {};
        return { criterio: g.text || r.generalCriterionId, resultado: GENERAL_NAMES[r.result] || r.result, argumento: r.argument || '' };
      }),
      rubricResponses: (visit.rubricResponses || []).map(function (r) {
        var c = rubricMap[r.criterionId] || {};
        return { criterio: c.title || r.criterionId, nivel: LEVEL_NAMES[r.level] || r.level, descriptor: r.descriptorSnapshot || '', observacion: r.observation || '' };
      })
    };
    var start=Date.now(),config=AppConfig.get(),record={ai_request_id:Utilities.getUuid(),visit_id:visitId,data_version:visit.dataVersion,provider:config.aiProvider,model:config.aiModel,prompt_version:config.aiPromptVersion,input_hash:JsonUtil.hash(input),requested_at:JsonUtil.now(),requested_by:actor.user_id,accepted:false,human_edited:false};
    try { var result=AiGateway.generate(input); record.status='SUCCESS'; record.latency_ms=Date.now()-start; record.output_json=JSON.stringify(result); SheetsRepository.append('AI_REQUESTS',record); Audit.write(actor,'AI_DRAFT_GENERATED','VISIT',visitId,visit.dataVersion,requestId,'SUCCESS','Borrador IA generado'); return {requestId:record.ai_request_id,draft:result}; }
    catch(e){record.status='ERROR';record.latency_ms=Date.now()-start;record.error_code=e.code||'AI_UNAVAILABLE';SheetsRepository.append('AI_REQUESTS',record);Audit.write(actor,'AI_DRAFT_FAILED','VISIT',visitId,visit.dataVersion,requestId,'ERROR','Falló borrador IA',{code:record.error_code});throw e;}
  }
  function accept(aiRequestId,humanEdited,requestId) { var actor = Auth.requireRoles(['ADMIN', 'DIRECTIVE', 'EVALUATOR']), row = SheetsRepository.find('AI_REQUESTS','ai_request_id',aiRequestId);if(!row)throw AppErrors.notFound('La solicitud de IA');var visit=VisitService.raw(row.visit_id);Auth.assertVisit(actor,visit,true);row.accepted=true;row.human_edited=!!humanEdited;row.accepted_at=JsonUtil.now();SheetsRepository.upsert('AI_REQUESTS',['ai_request_id'],row);Audit.write(actor,'AI_DRAFT_ACCEPTED','VISIT',row.visit_id,row.data_version,requestId,'SUCCESS','Borrador IA aceptado',{humanEdited:!!humanEdited});return true; }
  return {draft:draft,accept:accept};
})();
