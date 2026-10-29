var Validation = (function () {
  var LEVELS = ['ACHIEVED', 'IN_PROGRESS', 'BEGINNING', 'NOT_APPLICABLE'];
  var GENERAL_RESULTS = ['FULLY_AGREE', 'DISAGREE'];

  function text(value, max) {
    var normalized = value == null ? '' : String(value).normalize('NFC').trim();
    if (normalized.length > max) throw AppErrors.validation('Un campo excede el máximo de ' + max + ' caracteres.');
    return normalized;
  }
  function required(value, label, max) {
    var result = text(value, max || 5000);
    if (!result) throw AppErrors.validation(label + ' es obligatorio.', { field: label });
    return result;
  }
  function validateVisitDraft(dto) {
    if (!dto || typeof dto !== 'object') throw AppErrors.validation('La evaluación enviada no es válida.');
    if (dto.studentCount !== '' && dto.studentCount != null) {
      var count = Number(dto.studentCount);
      if (!Number.isInteger(count) || count < 0 || count > 999) throw AppErrors.validation('El número de estudiantes debe estar entre 0 y 999.');
    }
    ['contentTopic'].forEach(function (f) { if (dto[f] != null) text(dto[f], 250); });
    if (dto.observationRecord != null) text(dto.observationRecord, 12000);
    ['strengths', 'improvements', 'directiveCommitments', 'teacherCommitments', 'finalObservations'].forEach(function (f) {
      if (dto[f] != null) text(dto[f], 5000);
    });
    (dto.generalResponses || []).forEach(function (r) {
      if (GENERAL_RESULTS.indexOf(r.result) < 0) throw AppErrors.validation('Resultado general inválido.');
      if (r.result === 'DISAGREE') required(r.argument, 'El argumento del desacuerdo', 1000);
    });
    (dto.rubricResponses || []).forEach(function (r) {
      if (LEVELS.indexOf(r.level) < 0) throw AppErrors.validation('Nivel de rúbrica inválido.');
      if (r.level === 'NOT_APPLICABLE') required(r.observation, 'La justificación de No aplica', 1000);
      else if (r.observation != null) text(r.observation, 1000);
    });
    return true;
  }
  function validateForReview(aggregate) {
    validateVisitDraft(aggregate);
    var vDate = aggregate.visitDate || aggregate.visit_date;
    if (vDate) aggregate.visitDate = vDate;
    if (!aggregate.shift) aggregate.shift = aggregate.shift || 'Matutina';
    var labels = {
      visitDate: 'Fecha', teacherId: 'Docente', gradeCourse: 'Curso', subject: 'Asignatura',
      contentTopic: 'Contenido / Tema',
      strengths: 'Fortalezas', improvements: 'Aspectos a mejorar',
      directiveCommitments: 'Compromiso directivo'
    };
    Object.keys(labels).forEach(function (key) {
      var snakeKey = key.replace(/[A-Z]/g, function (c) { return '_' + c.toLowerCase(); });
      var val = (aggregate[key] != null && String(aggregate[key]).trim() !== '')
        ? aggregate[key]
        : ((aggregate[snakeKey] != null && String(aggregate[snakeKey]).trim() !== '') ? aggregate[snakeKey] : '');
      required(val, labels[key], 5000);
    });
    if (aggregate.observationRecord != null && aggregate.observationRecord !== '') {
      text(aggregate.observationRecord, 12000);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(aggregate.visitDate)) || isNaN(new Date(aggregate.visitDate + 'T00:00:00').getTime())) throw AppErrors.validation('La fecha de visita no es válida.');
    var today = new Date(); today.setHours(23,59,59,999);
    if (new Date(aggregate.visitDate + 'T00:00:00') > today) throw AppErrors.validation('La fecha de visita no puede ser futura.');
    if ((aggregate.generalResponses || []).length !== 6) throw AppErrors.validation('Debe responder los seis criterios generales.');
    if ((aggregate.rubricResponses || []).length !== 15) throw AppErrors.validation('Debe responder los quince criterios de la rúbrica.');
    var generalIds=(aggregate.generalResponses||[]).map(function(r){return r.generalCriterionId;});
    var rubricIds=(aggregate.rubricResponses||[]).map(function(r){return r.criterionId;});
    if(new Set(generalIds).size!==6||new Set(rubricIds).size!==15) throw AppErrors.validation('Hay respuestas duplicadas en los criterios.');
    if (aggregate.aiUsed && !aggregate.reviewedByHuman) throw AppErrors.validation('Confirme la revisión humana del texto asistido por IA.');
    return true;
  }
  function validateForFinalization(aggregate) {
    validateForReview(aggregate);
    var teacherComm = (aggregate.teacherCommitments != null && String(aggregate.teacherCommitments).trim() !== '')
      ? aggregate.teacherCommitments
      : ((aggregate.teacher_commitments != null && String(aggregate.teacher_commitments).trim() !== '') ? aggregate.teacher_commitments : '');
    required(teacherComm, 'Compromiso docente', 5000);
    return true;
  }
  function safeCell(value) {
    var s = value == null ? '' : String(value);
    return /^[=+\-@]/.test(s) ? "'" + s : s;
  }
  return { text: text, required: required, validateVisitDraft: validateVisitDraft, validateForReview: validateForReview, validateForFinalization: validateForFinalization, safeCell: safeCell };
})();
