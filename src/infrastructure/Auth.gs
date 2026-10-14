var Auth = (function () {
  function email_() { return String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); }
  function current() {
    var email = email_();
    if (!email) throw AppErrors.auth();
    var user = SheetsRepository.find('USERS', 'email', email);
    if (!user || String(user.active).toLowerCase() === 'false') throw AppErrors.forbidden();
    user.email = email;
    return user;
  }
  function userRoles_(user) {
    return String(user.role || '').split(',').map(function (r) { return r.trim().toUpperCase(); });
  }
  function hasRole(user, role) {
    var roles = userRoles_(user);
    return roles.indexOf('ADMIN') >= 0 || roles.indexOf(String(role).toUpperCase()) >= 0;
  }
  function requireRoles(roles) {
    var user = current();
    var userRoles = userRoles_(user);
    var has = userRoles.indexOf('ADMIN') >= 0 || roles.some(function (r) { return userRoles.indexOf(String(r).toUpperCase()) >= 0; });
    if (!has) throw AppErrors.forbidden();
    return user;
  }
  function cleanName_(s) {
    return String(s || '').replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
  }
  function namesMatch_(a, b) {
    var ca = cleanName_(a), cb = cleanName_(b);
    if (!ca || !cb) return false;
    if (ca === cb) return true;
    if (ca.indexOf(cb) >= 0 || cb.indexOf(ca) >= 0) return true;
    var wa = ca.split(/\s+/).sort().join(' '), wb = cb.split(/\s+/).sort().join(' ');
    return wa === wb;
  }
  function teacherForUser(user) {
    if (!user) return null;
    var email = String(user && user.email || '').trim().toLowerCase();
    return SheetsRepository.filter('TEACHERS', function (teacher) {
      if (String(teacher.active).toLowerCase() === 'false') return false;
      var tchEmail = String(teacher.email || '').trim().toLowerCase();
      var tchUserId = teacher.user_id ? String(teacher.user_id) : '';
      if (email && tchEmail === email) return true;
      if (user.user_id && tchUserId === String(user.user_id)) return true;
      if (namesMatch_(user.display_name, teacher.full_name)) return true;
      return false;
    })[0] || null;
  }
  function isReceivedVisit_(user, visit) {
    if (!user || !visit) return false;
    var teacher = teacherForUser(user);
    if (teacher) {
      var tchId = String(teacher.teacher_id || '');
      var tchUid = String(teacher.user_id || '');
      var vTchId = String(visit.teacher_id || '');
      if (tchId && vTchId === tchId) return true;
      if (tchUid && vTchId === tchUid) return true;
    }
    if (user.user_id && String(visit.teacher_id) === String(user.user_id)) return true;
    if (namesMatch_(user.display_name, visit.teacher_name_snapshot)) return true;
    return false;
  }
  function isVisibleToTeacher_(visit) {
    return ['IN_REVIEW', 'FINALIZED', 'DOCUMENTS_GENERATED', 'REOPENED'].indexOf(String(visit.status)) >= 0;
  }
  function canListVisit(user, visit) {
    var userRoles = userRoles_(user);
    if (userRoles.indexOf('ADMIN') >= 0 || userRoles.indexOf('VIEWER') >= 0) return true;
    if (user.role === 'DIRECTIVE') return String(visit.institution_id) === String(user.institution_id);
    if (String(visit.evaluator_user_id) === String(user.user_id)) return true;
    if (visit.co_evaluator_user_id && String(visit.co_evaluator_user_id) === String(user.user_id)) return true;
    return isReceivedVisit_(user, visit);
  }
  function canViewVisit(user, visit) {
    var userRoles = userRoles_(user);
    if (userRoles.indexOf('ADMIN') >= 0 || userRoles.indexOf('VIEWER') >= 0) return true;
    if (user.role === 'DIRECTIVE') return String(visit.institution_id) === String(user.institution_id);
    if (String(visit.evaluator_user_id) === String(user.user_id)) return true;
    if (visit.co_evaluator_user_id && String(visit.co_evaluator_user_id) === String(user.user_id)) return true;
    return isReceivedVisit_(user, visit) && isVisibleToTeacher_(visit);
  }
  function canAccessVisit(user, visit) {
    return canViewVisit(user, visit);
  }
  function isObservedTeacher(user, visit) {
    return isReceivedVisit_(user, visit);
  }
  function canEditVisit(user, visit) {
    var userRoles = userRoles_(user);
    if (userRoles.indexOf('ADMIN') >= 0) return true;
    if (userRoles.indexOf('VIEWER') >= 0) return false;
    var isLead = String(visit.evaluator_user_id) === String(user.user_id);
    var isCo = !!(visit.co_evaluator_user_id && String(visit.co_evaluator_user_id) === String(user.user_id));
    return ['DIRECTIVE','EVALUATOR'].some(function (r) { return userRoles.indexOf(r) >= 0; }) && (isLead || isCo);
  }
  function assertVisit(user, visit, edit) {
    if (edit) {
      if (!canEditVisit(user, visit)) throw AppErrors.forbidden();
    } else {
      if (isReceivedVisit_(user, visit) && !isVisibleToTeacher_(visit)) {
        throw AppErrors.forbidden('La evaluación se encuentra en fase de preparación por el evaluador y aún no está disponible para revisión.');
      }
      if (!canViewVisit(user, visit)) throw AppErrors.forbidden();
    }
  }
  function hasActiveAssignment(user, teacher, visitDate) {
    var userRoles = userRoles_(user);
    if (userRoles.indexOf('ADMIN') >= 0) return true;
    var canEval = ['DIRECTIVE', 'EVALUATOR'].some(function (r) { return userRoles.indexOf(r) >= 0; });
    if (!canEval) return false;
    return SheetsRepository.filter('EVALUATOR_ASSIGNMENTS', function (row) {
      return String(row.active).toLowerCase() !== 'false' &&
        (String(row.evaluator_user_id) === String(user.user_id) || String(row.co_evaluator_user_id) === String(user.user_id)) &&
        (String(row.teacher_id) === String(teacher.teacher_id) || String(row.teacher_id) === String(teacher.user_id));
    }).length > 0;
  }
  function assertCanCreate(user, teacher, visitDate) {
    if (user.role !== 'ADMIN' && String(teacher.institution_id) !== String(user.institution_id)) throw AppErrors.forbidden();
    if (user.role !== 'ADMIN' && String(teacher.email || '').trim().toLowerCase() === String(user.email || '').trim().toLowerCase()) throw AppErrors.forbidden('No puede crear una evaluación para usted mismo.');
    if (!hasActiveAssignment(user, teacher, visitDate)) throw AppErrors.forbidden('El docente no está asignado a este evaluador para la fecha indicada.');
  }
  return {
    current: current,
    requireRoles: requireRoles,
    hasRole: hasRole,
    teacherForUser: teacherForUser,
    isObservedTeacher: isObservedTeacher,
    canListVisit: canListVisit,
    canViewVisit: canViewVisit,
    canAccessVisit: canAccessVisit,
    canEditVisit: canEditVisit,
    assertVisit: assertVisit,
    hasActiveAssignment: hasActiveAssignment,
    assertCanCreate: assertCanCreate
  };
})();
