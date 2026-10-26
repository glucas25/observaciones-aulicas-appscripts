var CatalogService = (function () {
  function active_(name) {
    return SheetsRepository.filter(name, function (r) { return String(r.active).toLowerCase() !== 'false'; });
  }
  function getAll() {
    var user = Auth.current();
    var users = [];
    try { users = active_('USERS'); } catch (e) {}
    var teachers = [];
    try { teachers = active_('TEACHERS'); } catch (e) {}

    var knownIds = {};
    teachers.forEach(function (t) {
      if (t.teacher_id) knownIds[String(t.teacher_id)] = true;
      if (t.user_id) knownIds[String(t.user_id)] = true;
      if (t.email) knownIds[String(t.email).toLowerCase()] = true;
    });

    users.forEach(function (u) {
      var uid = String(u.user_id || ''), uEmail = String(u.email || '').toLowerCase();
      if (!knownIds[uid] && (!uEmail || !knownIds[uEmail])) {
        teachers.push({
          teacher_id: u.user_id,
          teacher_code: u.user_code || ('DOC-' + uid.slice(0, 6).toUpperCase()),
          institution_id: u.institution_id,
          identity_reference: u.identity_reference || '',
          full_name: u.display_name,
          email: u.email || '',
          position: u.position || 'Docente',
          role: u.role,
          active: u.active,
          user_id: u.user_id
        });
      }
    });

    var userRoles = String(user.role || '').split(',').map(function (r) { return r.trim().toUpperCase(); });
    var isAdmin = userRoles.indexOf('ADMIN') >= 0;

    var allTeachers = [].concat(teachers);
    if (!isAdmin) {
      var assigned = {};
      try {
        active_('EVALUATOR_ASSIGNMENTS').forEach(function (row) {
          if ((String(row.evaluator_user_id) === String(user.user_id) || String(row.co_evaluator_user_id) === String(user.user_id)) &&
              String(row.active).toLowerCase() !== 'false') {
            assigned[String(row.teacher_id)] = true;
          }
        });
      } catch (e) {}
      teachers = teachers.filter(function (teacher) {
        return (assigned[String(teacher.teacher_id)] || (teacher.user_id && assigned[String(teacher.user_id)])) &&
          String(teacher.institution_id) === String(user.institution_id) &&
          String(teacher.email || '').trim().toLowerCase() !== String(user.email || '').trim().toLowerCase();
      });
    }

    var evaluators = users.filter(function (u) {
      var roles = String(u.role || '').split(',').map(function (r) { return r.trim().toUpperCase(); });
      return roles.indexOf('ADMIN') >= 0 || roles.indexOf('DIRECTIVE') >= 0 || roles.indexOf('EVALUATOR') >= 0;
    }).map(function (u) {
      return {
        user_id: u.user_id,
        display_name: u.display_name,
        email: u.email || '',
        position: u.position || '',
        role: u.role,
        institution_id: u.institution_id
      };
    });
    if (!isAdmin) {
      evaluators = evaluators.filter(function (e) { return String(e.institution_id) === String(user.institution_id); });
    }

    var assignments = [];
    try {
      var allAssignments = active_('EVALUATOR_ASSIGNMENTS');
      var userMap = {};
      users.forEach(function (u) {
        if (u.user_id) userMap[String(u.user_id)] = u;
        if (u.teacher_id) userMap[String(u.teacher_id)] = u;
      });
      allTeachers.forEach(function (t) {
        if (t.teacher_id) userMap[String(t.teacher_id)] = t;
        if (t.user_id) userMap[String(t.user_id)] = t;
      });
      assignments = allAssignments.map(function (a) {
        var ev = userMap[String(a.evaluator_user_id)] || {};
        var co = a.co_evaluator_user_id ? (userMap[String(a.co_evaluator_user_id)] || {}) : null;
        var tch = userMap[String(a.teacher_id)] || {};
        var tchName = tch.full_name || tch.display_name || (tch.email ? tch.email.split('@')[0] : '') || a.teacher_id;
        var evName = ev.display_name || ev.full_name || (ev.email ? ev.email.split('@')[0] : '') || a.evaluator_user_id;
        var coName = co ? (co.display_name || co.full_name || (co.email ? co.email.split('@')[0] : '') || a.co_evaluator_user_id) : '';
        return {
          assignment_id: a.assignment_id,
          evaluator_user_id: a.evaluator_user_id,
          evaluator_name: evName,
          evaluator_position: ev.position || '',
          co_evaluator_user_id: a.co_evaluator_user_id || '',
          co_evaluator_name: coName,
          co_evaluator_position: co ? (co.position || '') : '',
          teacher_id: a.teacher_id,
          teacher_name: tchName,
          teacher_position: tch.position || 'Docente',
          planned_date: a.planned_date || a.effective_from || '',
          effective_from: a.effective_from || '',
          effective_to: a.effective_to || '',
          active: a.active
        };
      });
    } catch (e) {
      console.warn('EVALUATOR_ASSIGNMENTS unavailable: ' + e.message);
    }

    return {
      teachers: teachers,
      evaluators: evaluators,
      assignments: assignments,
      institutions: active_('INSTITUTIONS'),
      generalCriteria: active_('GENERAL_CRITERIA').sort(function (a,b) { return Number(a.sort_order)-Number(b.sort_order); }),
      rubricCriteria: active_('RUBRIC_CRITERIA').sort(function (a,b) { return Number(a.sort_order)-Number(b.sort_order); }),
      evidenceChecks: active_('EVIDENCE_CHECK_TYPES').sort(function (a,b) { return Number(a.sort_order)-Number(b.sort_order); }),
      aiEnabled: AppConfig.get().aiEnabled
    };
  }
  return { getAll: getAll };
})();
