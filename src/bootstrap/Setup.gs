function setupProject(options) {
  options = options || {};

  var props = PropertiesService.getScriptProperties();

  if (options.properties) props.setProperties(options.properties, false);

  var config = AppConfig.get();
  var ss = config.spreadsheetId ? SpreadsheetApp.openById(config.spreadsheetId) : SpreadsheetApp.create('Visitas Aulicas - ' + config.environment);
  if (!config.spreadsheetId) props.setProperty('SPREADSHEET_ID', ss.getId());
  upgradeSheetSchema();
  var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Hoja 1');
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);
  seedCatalogs();
  return { spreadsheetId: ss.getId(), url: ss.getUrl() };
}

function upgradeSheetSchema() {
  var config = AppConfig.get();
  if (!config.spreadsheetId) throw AppErrors.validation('Configure SPREADSHEET_ID antes de migrar el esquema.');
  var ss = SpreadsheetApp.openById(config.spreadsheetId);
  var report = {};
  SheetSchema.names().forEach(function (name) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    var expected = SheetSchema.all[name];
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, expected.length).setValues([expected]).setFontWeight('bold');
      sheet.setFrozenRows(1);
      report[name] = 'Creada con ' + expected.length + ' columnas';
    } else {
      var actual = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var missing = expected.filter(function (col) { return actual.indexOf(col) < 0; });
      if (missing.length > 0) {
        var startCol = actual.length + 1;
        sheet.getRange(1, startCol, 1, missing.length).setValues([missing]).setFontWeight('bold');
        report[name] = 'Agregadas: ' + missing.join(', ');
      } else {
        report[name] = 'Al día';
      }
    }
  });
  return report;
}

function migrateProjectSchema() {
  Auth.requireRoles(['ADMIN']);
  SheetSchema.names().forEach(function (name) { SheetsRepository.ensureColumns(name, SheetSchema.all[name]); });
  return { migrated: true, schemaVersion: 2 };
}

function bootstrapAdmin(email, displayName) {
  var normalized = String(email || '').trim().toLowerCase();
  if (!normalized) throw AppErrors.validation('Indique el correo del administrador.');
  var institutions = SheetsRepository.all('INSTITUTIONS');
  var institution = institutions[0] || {
    institution_id: Utilities.getUuid(), institution_code: 'INS-001', name: 'Institución por configurar', active: true,
    created_at: JsonUtil.now(), updated_at: JsonUtil.now()
  };
  SheetsRepository.upsert('INSTITUTIONS', ['institution_id'], institution);
  return SheetsRepository.upsert('USERS', ['email'], {
    user_id: Utilities.getUuid(), email: normalized, display_name: displayName || normalized, role: 'ADMIN,EVALUATOR', position: 'Rector / Rectora',
    institution_id: institution.institution_id, active: true, created_at: JsonUtil.now(), updated_at: JsonUtil.now()
  });
}

function setupFromConfig(configInput) {
  var config = configInput;
  if (!config) {
    var raw = PropertiesService.getScriptProperties().getProperty('INSTITUTION_CONFIG');
    if (raw) {
      try { config = JSON.parse(raw); } catch (e) {
        throw AppErrors.validation('La propiedad INSTITUTION_CONFIG no contiene un JSON válido: ' + e.message);
      }
    }
  } else if (typeof config === 'string') {
    try { config = JSON.parse(config); } catch (e) {
      throw AppErrors.validation('El parámetro provisto no es un JSON válido: ' + e.message);
    }
  }

  if (!config || typeof config !== 'object') {
    throw AppErrors.validation('Debe proporcionar un objeto de configuración o la propiedad INSTITUTION_CONFIG.');
  }

  var props = PropertiesService.getScriptProperties();
  if (config.properties && typeof config.properties === 'object') {
    props.setProperties(config.properties, false);
  }

  var project = setupProject();

  var instData = config.institution || {};
  var institutions = SheetsRepository.all('INSTITUTIONS');
  var institutionId = (institutions[0] && institutions[0].institution_id) || Utilities.getUuid();
  var rawLogo = instData.logoDriveUrl || instData.logoDriveId || '';
  var logoId = '';
  if (rawLogo && typeof rawLogo === 'string') {
    var trimmed = rawLogo.trim();
    var match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    logoId = match ? match[1] : (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed) ? trimmed : '');
  }
  var rawMinistryLogo = instData.ministryLogoDriveUrl || instData.ministryLogoDriveId || '';
  var ministryLogoId = '';
  if (rawMinistryLogo && typeof rawMinistryLogo === 'string') {
    var ministryTrimmed = rawMinistryLogo.trim();
    var ministryMatch = ministryTrimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || ministryTrimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    ministryLogoId = ministryMatch ? ministryMatch[1] : (/^[a-zA-Z0-9_-]{20,}$/.test(ministryTrimmed) ? ministryTrimmed : '');
  }

  var institutionRow = {
    institution_id: institutionId,
    institution_code: instData.institutionCode || (institutions[0] && institutions[0].institution_code) || 'INS-001',
    name: instData.name || (institutions[0] && institutions[0].name) || 'Institución Educativa',
    location: instData.location || (institutions[0] && institutions[0].location) || '',
    zone: instData.zone || (institutions[0] && institutions[0].zone) || '',
    district: instData.district || (institutions[0] && institutions[0].district) || '',
    circuit: instData.circuit || (institutions[0] && institutions[0].circuit) || '',
    address: instData.address || (institutions[0] && institutions[0].address) || '',
    phone: instData.phone || (institutions[0] && institutions[0].phone) || '',
    email: instData.email || (institutions[0] && institutions[0].email) || '',
    province: instData.province || (institutions[0] && institutions[0].province) || '',
    default_shift: instData.defaultShift || (institutions[0] && institutions[0].default_shift) || 'Matutina',
    active: instData.active !== false,
    logo_drive_id: logoId,
    logo_drive_url: rawLogo,
    ministry_logo_drive_id: ministryLogoId,
    ministry_logo_drive_url: rawMinistryLogo,
    created_at: (institutions[0] && institutions[0].created_at) || JsonUtil.now(),
    updated_at: JsonUtil.now()
  };
  SheetsRepository.upsert('INSTITUTIONS', ['institution_id'], institutionRow);

  var adminData = config.initialAdmin || config.admin || {};
  var adminUser = null;
  if (adminData.email) {
    var adminEmail = String(adminData.email).trim().toLowerCase();
    adminUser = SheetsRepository.upsert('USERS', ['email'], {
      user_id: Utilities.getUuid(),
      email: adminEmail,
      display_name: adminData.displayName || adminEmail,
      role: 'ADMIN,EVALUATOR',
      position: adminData.position || 'Rector / Rectora',
      institution_id: institutionId,
      active: true,
      created_at: JsonUtil.now(),
      updated_at: JsonUtil.now()
    });
  }

  return {
    ok: true,
    spreadsheetId: project.spreadsheetId,
    spreadsheetUrl: project.url,
    institution: institutionRow,
    adminEmail: adminUser ? adminUser.email : null,
    environment: AppConfig.get().environment
  };
}

function enableGeminiAi(apiKey) {
  var props = PropertiesService.getScriptProperties();
  var key = apiKey || props.getProperty('AI_API_KEY') || props.getProperty('GEMINI_API_KEY') || '';
  props.setProperties({
    AI_ENABLED: 'true',
    AI_PROVIDER: 'GEMINI',
    AI_MODEL: 'gemini-3.8-flash',
    AI_API_KEY: key
  }, false);
  Logger.log('IA Gemini activada con exito: AI_ENABLED=true, AI_PROVIDER=GEMINI, AI_MODEL=gemini-3.8-flash');
  return {
    ok: true,
    aiEnabled: true,
    provider: 'GEMINI',
    model: 'gemini-3.8-flash',
    hasApiKey: Boolean(key)
  };
}

function checkAiConfig() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var info = {
    aiEnabled: String(props.AI_ENABLED || props.AI_ENABLE).toLowerCase() === 'true',
    provider: props.AI_PROVIDER || 'GEMINI',
    model: props.AI_MODEL || 'gemini-3.8-flash',
    hasApiKey: Boolean(props.AI_API_KEY || props.GEMINI_API_KEY)
  };
  Logger.log('Configuracion actual de IA: ' + JSON.stringify(info));
  return info;
}

function testGeminiConnection() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var key = props.AI_API_KEY || props.GEMINI_API_KEY || '';
  if (!key) {
    Logger.log('ERROR: No hay clave AI_API_KEY configurada en Script Properties.');
    return { ok: false, error: 'Falta AI_API_KEY' };
  }
  var url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(key);
  var res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'x-goog-api-key': key },
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  Logger.log('Respuesta de Google al listar modelos (HTTP ' + code + ')');
  if (code === 200) {
    var data = JSON.parse(res.getContentText());
    var models = (data.models || []).map(function (m) { return (m.name || '').replace('models/', ''); });
    Logger.log('Modelos disponibles para tu clave: ' + models.slice(0, 15).join(', '));
    return { ok: true, models: models };
  } else {
    Logger.log('Detalle de error de Google: ' + res.getContentText());
    return { ok: false, status: code, response: res.getContentText() };
  }
}

