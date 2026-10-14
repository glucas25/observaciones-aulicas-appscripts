'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');

test('setupFromConfig inicializa propiedades, institución y administrador desde JSON', () => {
  const store = {};
  const tables = {
    INSTITUTIONS: [],
    USERS: []
  };

  const context = {
    console,
    Date,
    JSON,
    Utilities: {
      getUuid: () => 'uuid-1234'
    },
    JsonUtil: {
      now: () => '2026-10-13T12:00:00.000Z'
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => store,
        getProperty: (key) => store[key] || null,
        setProperty: (key, val) => { store[key] = String(val); },
        setProperties: (props) => { Object.assign(store, props); }
      })
    },
    SheetsRepository: {
      all: (name) => tables[name] || [],
      upsert: (name, keys, obj) => {
        const arr = tables[name] || (tables[name] = []);
        const idx = arr.findIndex(item => keys.every(k => item[k] === obj[k]));
        if (idx >= 0) {
          arr[idx] = Object.assign({}, arr[idx], obj);
          return arr[idx];
        }
        arr.push(obj);
        return obj;
      }
    },
    AppConfig: {
      get: () => ({ environment: 'PROD' })
    }
  };
  vm.createContext(context);
  for (const rel of ['src/domain/Errors.gs', 'src/bootstrap/Setup.gs']) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
  }
  context.setupProject = () => ({ spreadsheetId: 'sheet-mock-1', url: 'https://sheets.google.com/mock' });

  const sampleConfig = {
    institution: {
      institutionCode: 'INS-999',
      name: 'Colegio Experimental Modelo',
      location: 'Quito',
      zone: 'Zona 9',
      district: '17D01',
      circuit: '17D01C01',
      address: 'Calle Ficticia 123',
      defaultShift: 'Vespertina',
      logoDriveUrl: 'https://drive.google.com/file/d/logo-drive-file-abc12345/view'
    },
    initialAdmin: {
      email: 'rector@ejemplo.edu.ec',
      displayName: 'Directora General',
      position: 'Rectora Titular'
    },
    properties: {
      TIMEZONE: 'America/Guayaquil',
      SUPPORT_EMAIL: 'soporte@ejemplo.edu.ec',
      APP_ENV: 'PROD'
    }
  };

  const result = context.setupFromConfig(sampleConfig);

  assert.equal(result.ok, true);
  assert.equal(result.spreadsheetId, 'sheet-mock-1');
  assert.equal(result.adminEmail, 'rector@ejemplo.edu.ec');

  // Verifica propiedades
  assert.equal(store.TIMEZONE, 'America/Guayaquil');
  assert.equal(store.SUPPORT_EMAIL, 'soporte@ejemplo.edu.ec');

  // Verifica institución en tabla
  assert.equal(tables.INSTITUTIONS.length, 1);
  const inst = tables.INSTITUTIONS[0];
  assert.equal(inst.name, 'Colegio Experimental Modelo');
  assert.equal(inst.institution_code, 'INS-999');
  assert.equal(inst.logo_drive_id, 'logo-drive-file-abc12345');

  // Verifica administrador
  assert.equal(tables.USERS.length, 1);
  const admin = tables.USERS[0];
  assert.equal(admin.email, 'rector@ejemplo.edu.ec');
  assert.equal(admin.display_name, 'Directora General');
  assert.equal(admin.position, 'Rectora Titular');
  assert.equal(admin.role, 'ADMIN,EVALUATOR');
  assert.equal(admin.institution_id, inst.institution_id);
});

test('setupFromConfig valida entradas inválidas',()=>{
  const context = {
    console,
    JSON,
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => null })
    }
  };
  vm.createContext(context);
  for (const rel of ['src/domain/Errors.gs', 'src/bootstrap/Setup.gs']) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
  }

  assert.throws(() => context.setupFromConfig('{json-invalido'), /JSON/);
  assert.throws(() => context.setupFromConfig(null), /configuración/);
});

test('enableGeminiAi y checkAiConfig activan y consultan las propiedades de IA correctamente', () => {
  const store = {};
  const context = {
    console,
    Logger: { log: () => {} },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => store,
        getProperty: (key) => store[key] || null,
        setProperty: (key, val) => { store[key] = String(val); },
        setProperties: (props) => { Object.assign(store, props); }
      })
    }
  };
  vm.createContext(context);
  for (const rel of ['src/domain/Errors.gs', 'src/bootstrap/Setup.gs']) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
  }

  const initial = context.checkAiConfig();
  assert.equal(initial.aiEnabled, false);
  assert.equal(initial.hasApiKey, false);

  const activated = context.enableGeminiAi('AIzaSy_test_123');
  assert.equal(activated.ok, true);
  assert.equal(activated.aiEnabled, true);
  assert.equal(activated.provider, 'GEMINI');
  assert.equal(activated.model, 'gemini-3.8-flash');
  assert.equal(activated.hasApiKey, true);

  const status = context.checkAiConfig();
  assert.equal(status.aiEnabled, true);
  assert.equal(status.provider, 'GEMINI');
  assert.equal(status.model, 'gemini-3.8-flash');
  assert.equal(status.hasApiKey, true);
  assert.equal(store.AI_API_KEY, 'AIzaSy_test_123');
});
