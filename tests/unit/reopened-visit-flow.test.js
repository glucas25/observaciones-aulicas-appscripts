'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');

test('VisitState permite la transición directa de REOPENED a FINALIZED y a IN_REVIEW', () => {
  const context = { console, Set, Date };
  vm.createContext(context);
  for (const rel of ['src/domain/Errors.gs', 'src/domain/VisitState.gs']) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context);
  }

  assert.doesNotThrow(() => context.VisitState.assertTransition('REOPENED', 'FINALIZED'));
  assert.doesNotThrow(() => context.VisitState.assertTransition('REOPENED', 'IN_REVIEW'));
  assert.doesNotThrow(() => context.VisitState.assertTransition('REOPENED', 'ANNULLED'));
  assert.equal(context.VisitState.isEditable('REOPENED'), true);
});

test('FinalizationService.reopen incrementa data_version y marca como obsoletos los documentos anteriores', () => {
  const adminUser = { user_id: 'admin-1', role: 'ADMIN', active: true };
  let savedVisit = null;
  const docsInDb = [
    { document_id: 'doc-v1', visit_id: 'v-100', data_version: 1, document_type: 'FULL_PACKAGE', status: 'READY', superseded_at: '' }
  ];

  const context = {
    console,
    Date,
    Utilities: { getUuid: () => 'uuid-1' },
    JsonUtil: { now: () => '2026-11-05T12:00:00Z', hash: () => 'h1' },
    Auth: {
      requireRoles: () => adminUser
    },
    Validation: {
      required: (val) => val
    },
    VisitState: {
      values: { REOPENED: 'REOPENED', FINALIZED: 'FINALIZED' },
      assertTransition: () => true
    },
    Audit: { write: () => {} },
    SheetsRepository: {
      filter: (table, pred) => {
        if (table === 'DOCUMENTS') return docsInDb.filter(pred);
        return [];
      },
      upsert: (table, keys, row) => {
        if (table === 'VISITS') savedVisit = Object.assign({}, row);
        if (table === 'DOCUMENTS') {
          const idx = docsInDb.findIndex(d => d.document_id === row.document_id);
          if (idx >= 0) docsInDb[idx] = Object.assign({}, row);
        }
      }
    },
    VisitService: {
      raw: () => ({
        visit_id: 'v-100',
        status: 'FINALIZED',
        data_version: 1,
        row_version: 2
      }),
      aggregate: (row) => Object.assign({}, row)
    }
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/application/FinalizationService.gs'), 'utf8'), context);

  const res = context.FinalizationService.reopen('v-100', 'Corrección solicitada', 'req-1');
  assert.equal(savedVisit.status, 'REOPENED');
  assert.equal(savedVisit.data_version, 2, 'data_version debe incrementarse a 2');
  assert.equal(savedVisit.reopen_reason, 'Corrección solicitada');
  assert.equal(docsInDb[0].superseded_at, '2026-11-05T12:00:00Z', 'Documento anterior debe quedar marcado como obsoleto');
});

test('FinalizationService.finalize permite finalizar directamente una visita en estado REOPENED', () => {
  const evaluatorUser = { user_id: 'ev-1', role: 'EVALUATOR', active: true };
  let savedVisit = null;
  let snapshotSaved = null;

  const context = {
    console,
    Date,
    Utilities: { getUuid: () => 'snap-uuid' },
    JsonUtil: { now: () => '2026-11-05T12:30:00Z', hash: () => 'new-hash-v2' },
    Auth: {
      requireRoles: () => evaluatorUser,
      assertVisit: () => true
    },
    Validation: {
      validateForFinalization: () => true
    },
    VisitState: {
      values: { DRAFT: 'DRAFT', REVIEW: 'IN_REVIEW', FINALIZED: 'FINALIZED', REOPENED: 'REOPENED' },
      assertTransition: () => true,
      isEditable: (st) => st === 'REOPENED'
    },
    LockService: {
      getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} })
    },
    Audit: { write: () => {} },
    SheetsRepository: {
      filter: (table) => {
        if (table === 'VISIT_SNAPSHOTS') return [];
        return [];
      },
      all: (table) => {
        if (table === 'GENERAL_CRITERIA') return Array.from({ length: 6 }, (_, i) => ({ general_criterion_id: 'g' + i, catalog_version: '1', criterion_code: 'G' + i, text: 'T' + i }));
        if (table === 'RUBRIC_CRITERIA') return Array.from({ length: 15 }, (_, i) => ({ criterion_id: 'r' + i, rubric_version_id: '1', criterion_code: 'R' + i, title: 'Tit' + i, descriptor_achieved: 'A', descriptor_in_progress: 'B', descriptor_beginning: 'C', group_code: 'G', sort_order: i }));
        if (table === 'EVIDENCE_CHECK_TYPES') return [];
        return [];
      },
      append: (table, row) => {
        if (table === 'VISIT_SNAPSHOTS') snapshotSaved = Object.assign({}, row);
      },
      upsert: (table, keys, row) => {
        if (table === 'VISITS') savedVisit = Object.assign({}, row);
      }
    },
    VisitService: {
      raw: () => ({
        visit_id: 'v-100',
        status: 'REOPENED',
        data_version: 2,
        row_version: 3,
        general_catalog_version: '1',
        rubric_version_id: '1',
        evidence_catalog_version: '1'
      }),
      aggregate: (row) => ({
        visitId: row.visit_id,
        status: row.status,
        rowVersion: row.row_version,
        dataVersion: row.data_version,
        generalResponses: Array.from({ length: 6 }, (_, i) => ({ generalCriterionId: 'g' + i })),
        rubricResponses: Array.from({ length: 15 }, (_, i) => ({ criterionId: 'r' + i })),
        evidenceChecks: []
      })
    }
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/application/FinalizationService.gs'), 'utf8'), context);

  const res = context.FinalizationService.finalize('v-100', 3, null, 'req-2');
  assert.equal(savedVisit.status, 'FINALIZED');
  assert.equal(savedVisit.data_version, 2);
  assert.equal(snapshotSaved.data_version, 2, 'El snapshot debe pertenecer a la versión 2');
  assert.equal(snapshotSaved.snapshot_hash, 'new-hash-v2');
});

test('DocumentService.list y getBlob no retornan documentos de versiones previas tras reapertura', () => {
  const docsTable = [
    { document_id: 'doc-v1', visit_id: 'v-1', data_version: 1, document_type: 'FULL_PACKAGE', status: 'READY', superseded_at: '2026-11-05T12:00:00Z', drive_file_id: 'drive-v1' },
    { document_id: 'doc-v2', visit_id: 'v-1', data_version: 2, document_type: 'FULL_PACKAGE', status: 'READY', superseded_at: '', drive_file_id: 'drive-v2' }
  ];

  const docContext = {
    AppErrors: { document: (m) => new Error(m) },
    Auth: { current: () => ({ user_id: 'u-1' }), assertVisit: () => true },
    VisitService: {
      raw: () => ({ visit_id: 'v-1', data_version: 2, status: 'FINALIZED' })
    },
    SheetsRepository: {
      filter: (table, pred) => {
        if (table === 'DOCUMENTS') return docsTable.filter(pred);
        return [];
      }
    },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' },
      Permission: { VIEW: 'VIEW' },
      getFileById: (id) => ({
        getName: () => 'VIS_001_v2.pdf',
        setSharing: () => {},
        getBlob: () => ({ getBytes: () => Buffer.from('v2 content') })
      })
    },
    Utilities: {
      base64Encode: (b) => Buffer.from(b).toString('base64')
    }
  };

  vm.createContext(docContext);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/application/DocumentService.gs'), 'utf8'), docContext);

  const listDocs = docContext.DocumentService.list('v-1');
  assert.equal(listDocs.length, 1);
  assert.equal(listDocs[0].document_id, 'doc-v2', 'Solo debe listar documentos de la versión 2 vigente');

  const blob = docContext.DocumentService.getBlob('v-1', 'FULL_PACKAGE');
  assert.equal(Buffer.from(blob.base64, 'base64').toString('utf8'), 'v2 content');
});

test('App.html declara canFullEdit en bindStepActions e invalida documentCache al finalizar o reabrir', () => {
  const appHtml = fs.readFileSync(path.join(root, 'src/ui/App.html'), 'utf8');

  // Verifica que bindStepActions recibe canFullEdit y no editable
  assert.match(appHtml, /function bindStepActions\(\s*canFullEdit/, 'bindStepActions debe recibir canFullEdit');
  assert.match(appHtml, /canFullEdit\s*=\s*Boolean\(canFullEdit\)/, 'canFullEdit debe asegurarse como booleano');
  assert.doesNotMatch(appHtml, /function bindStepActions\(\s*editable/, 'no debe declarar el parámetro como editable');

  // Verifica que se invalida documentCache al reabrir y al finalizar
  assert.match(appHtml, /apiReopenVisit[\s\S]*?delete State\.documentCache\[State\.visit\.visitId\]/, 'debe invalidar documentCache al reabrir');
  assert.match(appHtml, /apiFinalizeVisit[\s\S]*?delete State\.documentCache\[State\.visit\.visitId\]/, 'debe invalidar documentCache al finalizar');

  // Verifica que el botón pasar a revisión está habilitado para DRAFT y REOPENED
  assert.match(appHtml, /\['DRAFT',\s*'REOPENED'\]\.includes\(v\.status\)/, 'debe permitir pasar a revisión desde DRAFT o REOPENED');

  // Verifica el banner explicativo de visita reabierta
  assert.match(appHtml, /Evaluación Reabierta \(Versión/, 'debe mostrar banner claro de visita reabierta');
});
