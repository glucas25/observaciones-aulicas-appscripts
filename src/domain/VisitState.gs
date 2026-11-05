var VisitState = (function () {
  var STATES = {
    DRAFT: 'DRAFT', REVIEW: 'IN_REVIEW', FINALIZED: 'FINALIZED',
    DOCUMENTS: 'DOCUMENTS_GENERATED', REOPENED: 'REOPENED', ANNULLED: 'ANNULLED'
  };
  var transitions = {};
  transitions[STATES.DRAFT] = [STATES.REVIEW, STATES.ANNULLED];
  transitions[STATES.REVIEW] = [STATES.DRAFT, STATES.FINALIZED, STATES.ANNULLED];
  transitions[STATES.FINALIZED] = [STATES.DOCUMENTS, STATES.REOPENED, STATES.ANNULLED];
  transitions[STATES.DOCUMENTS] = [STATES.REOPENED, STATES.ANNULLED];
  transitions[STATES.REOPENED] = [STATES.REVIEW, STATES.FINALIZED, STATES.ANNULLED];
  transitions[STATES.ANNULLED] = [];

  function assertTransition(from, to) {
    if ((transitions[from] || []).indexOf(to) < 0) {
      throw AppErrors.validation('Transición de estado no permitida: ' + from + ' → ' + to + '.');
    }
  }
  function isEditable(status) { return [STATES.DRAFT, STATES.REVIEW, STATES.REOPENED].indexOf(status) >= 0; }
  return { values: STATES, assertTransition: assertTransition, isEditable: isEditable };
})();

