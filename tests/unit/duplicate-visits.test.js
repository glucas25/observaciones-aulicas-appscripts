'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');

function buildContext(initialVisits) {
  const evaluator = {
    user_id: 'ev-1',
    display_name: 'Evaluador Principal',
    email: 'evaluador@example.com',
    role: 'EVALUATOR',
    institution_id: 'inst-1',
    active: true
  };
  const teacherUser = {
    user_id: 'usr-palma',
    display_name: 'PALMA ANCHUNDIA NURY MONSERRATE',
    email: 'nury.palma@example.com',
    role: 'TEACHER',
    institution_id: 'inst-1',
    active: true
  };
  const teacherRecord = {
    teacher_id: 'tch-palma',
    user_id: 'usr-palma',
    full_name: 'PALMA ANCHUNDIA NURY MONSERRATE',
    email: 'nury.palma@example.com',
    institution_id: 'inst-1',
    active: true
  };
  const institution = {
    institution_id: 'inst-1',
    name: 'Unidad Educativa Fiscal',
    location: 'Manta',
    zone: 'Zona 4',
    district: '13D02',
    circuit: '13D02C01'
  };
  const assignments = [
    {
      assignment_id: 'asg-1',
      evaluator_user_id: 'ev-1',
      teacher_id: 'tch-palma',
      planned_date: '2026-10-15',
      active: true
    }
  ];

  const visits = [...(initialVisits || [])];
  const auditLogs = [];

  const tables = {
    USERS: [evaluator, teacherUser],
    TEACHERS: [teacherRecord],
    INSTITUTIONS: [institution],
    EVALUATOR_ASSIGNMENTS: assignments,
    VISITS: visits,
    VISIT_GENERAL_RESPONSES: [],
    VISIT_RUBRIC_RESPONSES: [],
    VISIT_EVIDENCE_CHECKS: []
  };

  const context = {
    console,
    Date,
    Session: { getActiveUser: () => ({ getEmail: () => evaluator.email }) },
    JsonUtil: { now: () => '2026-10-14T12:00:00Z' },
    Utilities: {
      getUuid: () => 'uuid-' + Math.random().toString(36).slice(2, 8),
      formatDate: (d) => '2026-10-15'
    },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => true,
        releaseLock: () => true
      })
    },
    Audit: {
      write: (actor, action, targetType, targetId, version, reqId, status, details) => {
        auditLogs.push({ action, targetType, targetId, status, details });
      }
    },
    SheetsRepository: {
      find: (name, field, value) => {
        const rows = tables[name] || [];
        return rows.find(r => String(r[field]) === String(value)) || null;
      },
      filter: (name, predicate) => {
        return (tables[name] || []).filter(predicate);
      },
      append: (name, row) => {
        if (!tables[name]) tables[name] = [];
        tables[name].push(row);
        return row;
      },
      upsert: (name, keys, row) => {
        if (!tables[name]) tables[name] = [];
        const idx = tables[name].findIndex(r => keys.every(k => String(r[k]) === String(row[k])));
        if (idx >= 0) tables[name][idx] = Object.assign({}, tables[name][idx], row);
        else tables[name].push(row);
        return row;
      },
      nextSequence: () => 1
    }
  };

  vm.createContext(context);
  const files = [
    'src/domain/Errors.gs',
    'src/domain/VisitState.gs',
    'src/domain/Validation.gs',
    'src/infrastructure/Auth.gs',
    'src/application/VisitService.gs'
  ];
  for (const rel of files) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
  }

  return { context, tables, evaluator, teacherRecord, teacherUser };
}

test('VisitService.create rechaza crear una nueva visita si el docente ya tiene un borrador (DRAFT)', () => {
  const existingDraft = {
    visit_id: 'v-draft-1',
    visit_code: 'VIS-2026-000001',
    teacher_id: 'usr-palma',
    teacher_name_snapshot: 'PALMA ANCHUNDIA NURY MONSERRATE',
    evaluator_user_id: 'ev-1',
    status: 'DRAFT',
    institution_id: 'inst-1'
  };
  const { context } = buildContext([existingDraft]);

  assert.throws(
    () => {
      context.VisitService.create({
        teacherId: 'tch-palma',
        evaluatorUserId: 'ev-1',
        visitDate: '2026-10-15',
        shift: 'Matutina'
      }, 'req-duplicate-draft');
    },
    err => {
      assert.match(err.message, /El docente ya tiene una evaluación en curso/i);
      assert.match(err.message, /VIS-2026-000001/);
      assert.match(err.message, /Borrador/);
      return true;
    }
  );
});

test('VisitService.create rechaza crear una nueva visita si el docente está en estado En Revisión (IN_REVIEW)', () => {
  const existingReview = {
    visit_id: 'v-review-1',
    visit_code: 'VIS-2026-000002',
    teacher_id: 'tch-palma',
    teacher_name_snapshot: 'PALMA ANCHUNDIA NURY MONSERRATE',
    evaluator_user_id: 'ev-1',
    status: 'IN_REVIEW',
    institution_id: 'inst-1'
  };
  const { context } = buildContext([existingReview]);

  assert.throws(
    () => {
      context.VisitService.create({
        teacherId: 'usr-palma',
        evaluatorUserId: 'ev-1',
        visitDate: '2026-10-15',
        shift: 'Matutina'
      }, 'req-duplicate-review');
    },
    err => {
      assert.match(err.message, /El docente ya tiene una evaluación en curso/i);
      assert.match(err.message, /VIS-2026-000002/);
      assert.match(err.message, /En Revisión/);
      return true;
    }
  );
});

test('VisitService.create detecta el docente repetido por teacher_name_snapshot', () => {
  const existingDraftByName = {
    visit_id: 'v-draft-2',
    visit_code: 'VIS-2026-000003',
    teacher_id: 'different-legacy-id',
    teacher_name_snapshot: 'PALMA ANCHUNDIA NURY MONSERRATE (Docente)',
    evaluator_user_id: 'ev-1',
    status: 'DRAFT',
    institution_id: 'inst-1'
  };
  const { context } = buildContext([existingDraftByName]);

  assert.throws(
    () => {
      context.VisitService.create({
        teacherId: 'tch-palma',
        evaluatorUserId: 'ev-1',
        visitDate: '2026-10-15',
        shift: 'Matutina'
      }, 'req-by-name');
    },
    err => {
      assert.match(err.message, /El docente ya tiene una evaluación en curso/i);
      return true;
    }
  );
});

test('VisitService.create permite crear una nueva visita si la visita anterior fue anulada (ANNULLED)', () => {
  const annulledVisit = {
    visit_id: 'v-annulled-1',
    visit_code: 'VIS-2026-000004',
    teacher_id: 'tch-palma',
    teacher_name_snapshot: 'PALMA ANCHUNDIA NURY MONSERRATE',
    evaluator_user_id: 'ev-1',
    status: 'ANNULLED',
    institution_id: 'inst-1'
  };
  const { context, tables } = buildContext([annulledVisit]);

  const created = context.VisitService.create({
    teacherId: 'tch-palma',
    evaluatorUserId: 'ev-1',
    visitDate: '2026-10-15',
    shift: 'Matutina'
  }, 'req-after-annul');

  assert.ok(created);
  assert.equal(created.status, 'DRAFT');
  assert.equal(tables.VISITS.length, 2);
});
