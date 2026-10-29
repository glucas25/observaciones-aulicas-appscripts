'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');

test('SheetsRepository.appendBatch inserta múltiples filas en una sola operación setValues y respeta skipFlush', () => {
  let flushCount = 0;
  let setValuesCalls = [];
  const rows = [
    ['col1', 'col2']
  ];

  const mockSheet = {
    getLastColumn: () => 2,
    getLastRow: () => rows.length,
    getRange: (r, c, numRows, numCols) => {
      if (arguments.length === 2 || (numRows === undefined && numCols === undefined)) {
        return {
          getValues: () => rows
        };
      }
      return {
        getValues: () => rows.slice(r - 1, r - 1 + (numRows || 1)),
        setValues: (matrix) => {
          setValuesCalls.push({ r, c, numRows, numCols, matrix });
          matrix.forEach(row => rows.push(row));
        }
      };
    },
    appendRow: (row) => rows.push(row)
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

  // Batch append 3 items with skipFlush = true
  context.SheetsRepository.appendBatch('TEST', [
    { col1: 'a', col2: '1' },
    { col1: 'b', col2: '2' },
    { col1: 'c', col2: '3' }
  ], true);

  assert.equal(flushCount, 0, 'No debe invocar flush si skipFlush es true');
  assert.equal(setValuesCalls.length, 1, 'Debe haber llamado a setValues exactamente una vez');
  assert.equal(setValuesCalls[0].matrix.length, 3, 'La matriz debe contener las 3 filas');

  // Now appendBatch with skipFlush = false (default)
  context.SheetsRepository.appendBatch('TEST', [
    { col1: 'd', col2: '4' }
  ]);
  assert.equal(flushCount, 1, 'Debe invocar flush si skipFlush es false');
});

test('SheetsRepository.all almacena en caché en memoria durante la ejecución', () => {
  let readCount = 0;
  const rows = [
    ['id', 'name'],
    ['1', 'Alpha'],
    ['2', 'Beta']
  ];

  const mockSheet = {
    getLastColumn: () => 2,
    getLastRow: () => rows.length,
    getRange: (r) => {
      readCount++;
      if (r === 1) return { getValues: () => [rows[0]] };
      return {
        getValues: () => rows.slice(1)
      };
    },
    appendRow: (row) => rows.push(row)
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
      flush: () => {}
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/repositories/sheets/SheetsRepository.gs'), 'utf8'), context);

  // First read -> fetches header and rows from sheet (2 getRange calls)
  const first = context.SheetsRepository.all('ITEMS');
  assert.equal(readCount, 2, 'Primera lectura ejecuta 2 getRange (header + rows)');
  assert.equal(first.length, 2);

  // Second read -> must hit memory cache (0 additional getRange calls)
  const second = context.SheetsRepository.all('ITEMS');
  assert.equal(readCount, 2, 'No debe volver a leer de getRange en la misma ejecución');
  assert.equal(second.length, 2);

  // Modifying via append should invalidate cache
  context.SheetsRepository.append('ITEMS', { id: '3', name: 'Gamma' });
  const third = context.SheetsRepository.all('ITEMS');
  assert.equal(readCount, 5, 'Debe invalidar caché y leer nuevamente tras una inserción');
  assert.equal(third.length, 3);
});

test('Auth.teacherForUser memoiza el docente asociado al usuario y canListVisit hace short-circuit si es evaluador', () => {
  let filterCalls = 0;
  const teachers = [
    { teacher_id: 't-1', user_id: 'u-1', email: 'teacher@test.com', full_name: 'Docente Uno', active: true }
  ];

  const context = {
    console,
    Date,
    AppErrors: { forbidden: (m) => new Error(m || 'Forbidden') },
    SheetsRepository: {
      filter: (name, fn) => {
        if (name === 'TEACHERS') {
          filterCalls++;
          return teachers.filter(fn);
        }
        return [];
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/infrastructure/Auth.gs'), 'utf8'), context);

  const user = { user_id: 'u-1', email: 'teacher@test.com', role: 'TEACHER', roles: ['TEACHER'], display_name: 'Docente Uno' };

  // First call
  const t1 = context.Auth.teacherForUser(user);
  assert.equal(t1.teacher_id, 't-1');
  assert.equal(filterCalls, 1);

  // Second call on same user object -> must use memoized user._cachedTeacher
  const t2 = context.Auth.teacherForUser(user);
  assert.equal(t2.teacher_id, 't-1');
  assert.equal(filterCalls, 1, 'Debe reutilizar user._cachedTeacher sin volver a llamar a SheetsRepository.filter');

  // Test evaluator short-circuit in canListVisit
  const evalUser = { user_id: 'eval-99', roles: ['EVALUATOR'] };
  const visitAsEvaluator = { evaluator_user_id: 'eval-99', visit_id: 'v-1' };

  const canList = context.Auth.canListVisit(evalUser, visitAsEvaluator);
  assert.equal(canList, true);
  assert.equal(filterCalls, 1, 'No debe invocar teacherForUser si el usuario es el evaluador de la visita');
});

test('App.html implementa navegación instantánea en Volver sin bloquear con spinner', () => {
  const html = fs.readFileSync(path.join(root, 'src/ui/App.html'), 'utf8');

  // Verify #back sets State.visit = null and immediately calls renderList()
  assert.ok(html.includes("State.visit=null;renderList()"), 'El botón Volver debe resetear la visita y renderizar la lista de inmediato');

  // Verify saveVisit syncs State.boot.visits
  assert.ok(html.includes("if(State.boot&&State.boot.visits){const idx=State.boot.visits.findIndex(x=>x.visitId===State.visit.visitId);"), 'saveVisit debe sincronizar State.boot.visits');
});
