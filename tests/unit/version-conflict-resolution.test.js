'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');

test('SheetsRepository invoca SpreadsheetApp.flush() al escribir', () => {
  let flushCount = 0;
  const mockSheet = {
    getLastColumn: () => 2,
    getLastRow: () => 1,
    getRange: () => ({
      getValues: () => [['col1', 'col2']],
      setValues: () => {}
    }),
    appendRow: () => {}
  };
  const mockSs = {
    getSheetByName: () => mockSheet
  };
  const context = {
    console,
    Date,
    AppConfig: { get: () => ({ spreadsheetId: 'test-ss-id' }) },
    AppErrors: { validation: (m) => new Error(m), notFound: (m) => new Error(m) },
    Validation: { safeCell: (v) => String(v || '') },
    SpreadsheetApp: {
      openById: () => mockSs,
      flush: () => { flushCount++; }
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/repositories/sheets/SheetsRepository.gs'), 'utf8'), context);

  context.SheetsRepository.append('TEST', { col1: 'a', col2: 'b' });
  assert.equal(flushCount, 1, 'append debe llamar a flush');

  context.SheetsRepository.upsert('TEST', ['col1'], { col1: 'a', col2: 'b' });
  assert.equal(flushCount, 2, 'upsert debe llamar a flush');
});

test('VisitService preserva compromiso docente existente si el borrador del evaluador lo envía vacío', () => {
  const evaluatorUser = { user_id: 'ev-1', email: 'eval@test.com', role: 'EVALUATOR', institution_id: 'inst-1', active: true };
  const baseVisit = {
    visit_id: 'v-100',
    row_version: 2,
    data_version: 1,
    status: 'IN_REVIEW',
    teacher_commitments: 'Compromiso redactado previamente por el docente'
  };

  const context = {
    console,
    Date,
    JsonUtil: { now: () => '2026-10-28T12:00:00Z' },
    Session: { getActiveUser: () => ({ getEmail: () => evaluatorUser.email }) },
    Auth: {
      requireRoles: () => evaluatorUser,
      assertVisit: () => true
    },
    Validation: {
      validateVisitDraft: () => true
    },
    AppErrors: {
      conflict: () => { const e = new Error('VERSION_CONFLICT'); e.code = 'VERSION_CONFLICT'; return e; },
      validation: (m) => new Error(m)
    },
    VisitState: {
      isEditable: () => true
    },
    SheetsRepository: {
      all: () => [],
      find: (t, f, v) => (t === 'VISITS' && v === 'v-100' ? Object.assign({}, baseVisit) : null),
      removeWhere: () => {},
      append: () => {},
      upsert: () => {}
    },
    LockService: {
      getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} })
    },
    Audit: { write: () => {} }
  };
  vm.createContext(context);
  for (const rel of ['src/domain/Errors.gs', 'src/domain/VisitState.gs', 'src/application/VisitService.gs']) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
  }

  // Evaluador envía guardado con teacherCommitments en blanco/espacios
  const dto = {
    visitDate: '2026-10-28',
    strengths: 'Nuevas fortalezas',
    teacherCommitments: '' // Evaluador no escribió nada
  };

  const applied = context.VisitService.applyDraft('v-100', dto, evaluatorUser, '2026-10-28T12:00:00Z', Object.assign({}, baseVisit));
  assert.equal(applied.teacher_commitments, 'Compromiso redactado previamente por el docente', 'No debe borrar el compromiso que el docente ya guardó');
});

test('FinalizationService.finalize realiza finalización atómica con visitDto en un solo paso', () => {
  const evaluatorUser = { user_id: 'ev-1', email: 'eval@test.com', role: 'EVALUATOR', institution_id: 'inst-1', active: true };
  let savedRow = null;
  const initialRow = {
    visit_id: 'v-200',
    data_version: 1,
    row_version: 3,
    status: 'IN_REVIEW',
    institution_id: 'inst-1',
    teacher_id: 't-1',
    evaluator_user_id: 'ev-1',
    general_catalog_version: '1',
    rubric_version_id: '1',
    evidence_catalog_version: '1'
  };

  const context = {
    console,
    Date,
    Utilities: { getUuid: () => 'uuid-123' },
    JsonUtil: { now: () => '2026-10-28T12:00:00Z', hash: () => 'hash-test' },
    Auth: {
      requireRoles: () => evaluatorUser,
      assertVisit: () => true
    },
    Validation: {
      validateVisitDraft: () => true,
      validateForFinalization: () => true
    },
    VisitState: {
      values: { DRAFT: 'DRAFT', REVIEW: 'IN_REVIEW', FINALIZED: 'FINALIZED', DOCUMENTS: 'DOCUMENTS_GENERATED', REOPENED: 'REOPENED' },
      assertTransition: () => true,
      isEditable: () => true
    },
    AppErrors: {
      conflict: () => { const e = new Error('VERSION_CONFLICT'); e.code = 'VERSION_CONFLICT'; return e; },
      validation: (m) => new Error(m)
    },
    LockService: {
      getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} })
    },
    Audit: { write: () => {} },
    SheetsRepository: {
      filter: (name) => {
        if (name === 'VISIT_SNAPSHOTS') return [];
        return [];
      },
      all: (name) => {
        if (name === 'GENERAL_CRITERIA') return Array.from({ length: 6 }, (_, i) => ({ general_criterion_id: 'g' + i, catalog_version: '1', criterion_code: 'G' + i, text: 'T' + i }));
        if (name === 'RUBRIC_CRITERIA') return Array.from({ length: 15 }, (_, i) => ({ criterion_id: 'r' + i, rubric_version_id: '1', criterion_code: 'R' + i, title: 'Tit' + i, descriptor_achieved: 'A', descriptor_in_progress: 'B', descriptor_beginning: 'C', group_code: 'G', sort_order: i }));
        if (name === 'EVIDENCE_CHECK_TYPES') return [];
        return [];
      },
      append: () => {},
      upsert: (name, keys, row) => {
        if (name === 'VISITS') savedRow = Object.assign({}, row);
      }
    },
    VisitService: {
      raw: () => Object.assign({}, initialRow),
      applyDraft: (visitId, dto, actor, now, row) => Object.assign({}, row, { strengths: dto.strengths }),
      aggregate: (row) => ({
        visitId: row.visit_id,
        status: row.status,
        rowVersion: row.row_version,
        generalResponses: Array.from({ length: 6 }, (_, i) => ({ generalCriterionId: 'g' + i })),
        rubricResponses: Array.from({ length: 15 }, (_, i) => ({ criterionId: 'r' + i })),
        evidenceChecks: []
      })
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/application/FinalizationService.gs'), 'utf8'), context);

  // Llamada atómica pasando visitDto y expectedVersion 3
  const result = context.FinalizationService.finalize('v-200', 3, { strengths: 'Excelentes clases' }, 'req-1');
  assert.equal(savedRow.status, 'FINALIZED');
  assert.equal(savedRow.row_version, 4, 'La versión solo se incrementa una vez para toda la finalización atómica');
  assert.equal(savedRow.strengths, 'Excelentes clases', 'Los datos del borrador se aplican en la misma transacción');
  assert.equal(result.snapshotHash, 'hash-test');
});

test('FinalizationService.finalize lanza VERSION_CONFLICT si la versión esperada no coincide', () => {
  const evaluatorUser = { user_id: 'ev-1', email: 'eval@test.com', role: 'EVALUATOR', institution_id: 'inst-1', active: true };
  const context = {
    console,
    Date,
    Auth: {
      requireRoles: () => evaluatorUser,
      assertVisit: () => true
    },
    LockService: {
      getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} })
    },
    Audit: { write: () => {} },
    VisitState: { values: { FINALIZED: 'FINALIZED', DOCUMENTS: 'DOCUMENTS_GENERATED' } },
    AppErrors: {
      conflict: () => { const e = new Error('VERSION_CONFLICT'); e.code = 'VERSION_CONFLICT'; return e; }
    },
    VisitService: {
      raw: () => ({ visit_id: 'v-300', row_version: 5, data_version: 1, status: 'IN_REVIEW' })
    },
    SheetsRepository: {
      filter: () => []
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/application/FinalizationService.gs'), 'utf8'), context);

  assert.throws(() => {
    context.FinalizationService.finalize('v-300', 4, null, 'req-2');
  }, (e) => e.code === 'VERSION_CONFLICT');
});

