var AppConfig = (function () {
  var REQUIRED = ['APP_ENV', 'SPREADSHEET_ID', 'OUTPUT_FOLDER_ID', 'TEMP_FOLDER_ID'];

  function properties_() {
    return PropertiesService.getScriptProperties().getProperties();
  }

  function get() {
    var p = properties_();
    return {
      environment: p.APP_ENV || 'DEV',
      version: p.APP_VERSION || '1.0.0',
      spreadsheetId: p.SPREADSHEET_ID || '',
      outputFolderId: p.OUTPUT_FOLDER_ID || '',
      tempFolderId: p.TEMP_FOLDER_ID || '',
      templatesFolderId: p.TEMPLATES_FOLDER_ID || '',
      templateIds: {
        ANNEX_1: p.ANNEX1_TEMPLATE_ID || '',
        ANNEX_2: p.ANNEX2_TEMPLATE_ID || '',
        ANNEX_3: p.ANNEX3_TEMPLATE_ID || '',
        ANNEX_5: p.ANNEX5_TEMPLATE_ID || '',
        FULL_PACKAGE: p.FULL_PACKAGE_TEMPLATE_ID || ''
      },
      templateVersion: (p.TEMPLATE_VERSION || '2.1.0') + '-layout-4.1.0',
      aiEnabled: String(p.AI_ENABLED || p.AI_ENABLE).toLowerCase() === 'true',
      aiProvider: (p.AI_PROVIDER || 'GEMINI').toUpperCase(),
      aiModel: p.AI_MODEL || ((p.AI_PROVIDER || '').toUpperCase() === 'OPENAI' ? 'gpt-4o-mini' : 'gemini-3.8-flash'),
      aiPromptVersion: p.AI_PROMPT_VERSION || '1.0.0',
      aiApiKey: p.AI_API_KEY || '',
      aiEndpoint: p.AI_ENDPOINT || '',
      timezone: p.TIMEZONE || 'America/Guayaquil',
      retentionDays: Number(p.RETENTION_DAYS || 365),
      supportEmail: p.SUPPORT_EMAIL || ''
    };
  }

  function validate() {
    var p = properties_();
    var missing = REQUIRED.filter(function (key) { return !p[key]; });
    if (missing.length) throw AppErrors.validation('Faltan propiedades de configuración.', { fields: missing });
    return get();
  }

  return { get: get, validate: validate };
})();

