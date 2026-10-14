'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');

function createAiContext(configOverrides, fetchMock) {
  const store = Object.assign({
    AI_ENABLED: 'true',
    AI_PROVIDER: 'GEMINI',
    AI_MODEL: 'gemini-3.8-flash',
    AI_API_KEY: 'mock-gemini-key'
  }, configOverrides);

  const context = {
    console,
    JSON,
    Date,
    encodeURIComponent,
    Validation: {
      text: (s, max) => String(s || '').slice(0, max)
    },
    AppConfig: {
      get: () => ({
        aiEnabled: String(store.AI_ENABLED).toLowerCase() === 'true',
        aiProvider: (store.AI_PROVIDER || 'GEMINI').toUpperCase(),
        aiModel: store.AI_MODEL || 'gemini-3.8-flash',
        aiApiKey: store.AI_API_KEY || '',
        aiEndpoint: store.AI_ENDPOINT || ''
      })
    },
    CacheService: {
      getScriptCache: () => ({
        get: () => null,
        put: () => {}
      })
    },
    UrlFetchApp: {
      fetch: fetchMock
    }
  };

  vm.createContext(context);
  for (const rel of ['src/domain/Errors.gs', 'src/gateways/AiGateway.gs']) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
  }
  return context;
}

test('AiGateway genera borrador exitosamente con Gemini (gemini-3.8-flash)', () => {
  let capturedUrl = '';
  let capturedOptions = null;

  const mockGeminiOutput = {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            strengths: 'Excelente dinamismo en clase',
            improvements: 'Reforzar el uso del tiempo al cierre',
            directiveCommitments: 'Facilitar recursos audiovisuales',
            teacherCommitments: 'Planificar actividades de cierre',
            observations: 'Clase participativa',
            warnings: []
          })
        }]
      }
    }]
  };

  const context = createAiContext({
    AI_PROVIDER: 'GEMINI',
    AI_MODEL: 'gemini-3.8-flash',
    AI_API_KEY: 'test-api-key-123'
  }, (url, opts) => {
    capturedUrl = url;
    capturedOptions = opts;
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify(mockGeminiOutput)
    };
  });

  const result = context.AiGateway.generate({
    observationRecord: 'El docente inició puntual',
    generalResponses: [],
    rubricResponses: []
  });

  assert.match(capturedUrl, /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.8-flash:generateContent\?key=test-api-key-123/);
  assert.equal(capturedOptions.method, 'post');
  const payload = JSON.parse(capturedOptions.payload);
  assert.equal(payload.generationConfig.responseMimeType, 'application/json');
  assert.equal(payload.generationConfig.responseSchema.type, 'OBJECT');

  assert.equal(result.strengths, 'Excelente dinamismo en clase');
  assert.equal(result.improvements, 'Reforzar el uso del tiempo al cierre');
});

test('AiGateway soporta proveedor OpenAI como fallback', () => {
  let capturedOptions = null;
  const mockOpenAiOutput = {
    choices: [{
      message: {
        content: JSON.stringify({
          strengths: 'Fortaleza OpenAI',
          improvements: 'Mejora OpenAI',
          directiveCommitments: 'Compromiso directivo',
          teacherCommitments: 'Compromiso docente',
          observations: 'Observación',
          warnings: []
        })
      }
    }]
  };

  const context = createAiContext({
    AI_PROVIDER: 'OPENAI',
    AI_MODEL: 'gpt-4o-mini',
    AI_API_KEY: 'sk-mock-key'
  }, (url, opts) => {
    capturedOptions = opts;
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify(mockOpenAiOutput)
    };
  });

  const result = context.AiGateway.generate({ observationRecord: 'Prueba' });
  assert.equal(capturedOptions.headers.Authorization, 'Bearer sk-mock-key');
});

test('AiGateway se recupera automáticamente con gemini-3.8-flash cuando el modelo inicial da 404', () => {
  const triedUrls = [];
  const mockGeminiOutput = {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            strengths: 'Fortaleza recuperada',
            improvements: 'Mejora recuperada',
            directiveCommitments: 'Compromiso directivo',
            teacherCommitments: 'Compromiso docente',
            observations: 'Observación',
            warnings: []
          })
        }]
      }
    }]
  };

  const context = createAiContext({
    AI_PROVIDER: 'GEMINI',
    AI_MODEL: 'custom-experimental-model',
    AI_API_KEY: 'test-api-key-123'
  }, (url) => {
    triedUrls.push(url);
    if (url.includes('custom-experimental-model')) {
      return {
        getResponseCode: () => 404,
        getContentText: () => JSON.stringify({ error: { message: 'models/custom-experimental-model is not found' } })
      };
    }
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify(mockGeminiOutput)
    };
  });

  const result = context.AiGateway.generate({ observationRecord: 'Prueba fallback' });
  assert.equal(result.strengths, 'Fortaleza recuperada');
  assert.equal(triedUrls.length, 2);
  assert.match(triedUrls[0], /custom-experimental-model/);
  assert.match(triedUrls[1], /gemini-3\.8-flash/);
});

test('AiGateway sanitiza palabras clave internas de base de datos como ACHIEVED y FULLY_AGREE', () => {
  const mockLeakedOutput = {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            strengths: "Se evidencia cumplimiento en nivel 'ACHIEVED' en los descriptores.",
            improvements: "No se señalan áreas de mejora, habiéndose calificado como 'ACHIEVED' y 'FULLY_AGREE'.",
            directiveCommitments: 'Seguimiento',
            teacherCommitments: 'Compromiso docente que la IA no debería llenar',
            finalObservations: '¡Felicitaciones por la excelente clase!',
            warnings: []
          })
        }]
      }
    }]
  };

  const context = createAiContext({
    AI_PROVIDER: 'GEMINI',
    AI_MODEL: 'gemini-3.8-flash',
    AI_API_KEY: 'test-api-key-123'
  }, () => {
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify(mockLeakedOutput)
    };
  });

  const result = context.AiGateway.generate({ observationRecord: 'Prueba' });
  assert.equal(result.strengths.includes('ACHIEVED'), false);
  assert.equal(result.improvements.includes('ACHIEVED'), false);
  assert.equal(result.improvements.includes('FULLY_AGREE'), false);
  assert.match(result.strengths, /nivel de logro/);
  assert.equal(result.teacherCommitments, '');
  assert.equal(result.finalObservations, '¡Felicitaciones por la excelente clase!');
  assert.equal(result.observations, '¡Felicitaciones por la excelente clase!');
});

test('AiGateway asume rol de evaluador y sanitiza meta-frases de falta de datos en el registro', () => {
  const mockMetaOutput = {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            strengths: 'Clase dinámica con participación activa.',
            improvements: 'En el registro proporcionado no se señalan áreas de mejora ni descriptores específicos.',
            directiveCommitments: 'Acompañamiento continuo.',
            teacherCommitments: 'Compromiso que debe eliminarse',
            finalObservations: '¡Felicitaciones por la excelente labor pedagógica y el clima de aula!',
            warnings: []
          })
        }]
      }
    }]
  };

  const context = createAiContext({
    AI_PROVIDER: 'GEMINI',
    AI_MODEL: 'gemini-3.8-flash',
    AI_API_KEY: 'test-api-key-123'
  }, () => {
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify(mockMetaOutput)
    };
  });

  const result = context.AiGateway.generate({ observationRecord: 'Prueba meta' });
  assert.equal(result.improvements.includes('En el registro proporcionado'), false);
  assert.match(result.improvements, /En base a lo observado en la clase, no se detectaron aspectos a mejorar/);
  assert.equal(result.teacherCommitments, '');
  assert.match(result.finalObservations, /Felicitaciones/);
});

// Prueba de compatibilidad: Simula intencionalmente que un usuario antiguo tenga configurado 'gemini-1.5-flash'
// para verificar que AiGateway lo intercepte y lo migre transparentemente a 'gemini-3.8-flash' en lugar de fallar con HTTP 404.
test('AiGateway sustituye automáticamente modelos retirados (gemini-1.5-flash) por gemini-3.8-flash', () => {
  let capturedUrl = '';
  const mockGeminiOutput = {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            strengths: 'OK',
            improvements: 'OK',
            directiveCommitments: 'OK',
            teacherCommitments: 'OK',
            observations: 'OK',
            warnings: []
          })
        }]
      }
    }]
  };

  const context = createAiContext({
    AI_PROVIDER: 'GEMINI',
    AI_MODEL: 'gemini-1.5-flash',
    AI_API_KEY: 'test-api-key-123'
  }, (url) => {
    capturedUrl = url;
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify(mockGeminiOutput)
    };
  });

  const result = context.AiGateway.generate({ observationRecord: 'Prueba' });
  assert.equal(result.strengths, 'OK');
  assert.match(capturedUrl, /gemini-3\.8-flash/);
});

test('AiGateway utiliza directamente el modelo 3.8 configurado en propiedades del proyecto mapeándolo a gemini-3.8-flash', () => {
  let callCount = 0;
  let capturedUrl = '';
  const mockGeminiOutput = {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            strengths: 'Fortaleza directa',
            improvements: 'Aspecto a mejorar',
            directiveCommitments: 'Acompañamiento',
            teacherCommitments: '',
            finalObservations: 'Felicitaciones',
            warnings: []
          })
        }]
      }
    }]
  };

  const context = createAiContext({
    AI_PROVIDER: 'GEMINI',
    AI_MODEL: '3.8',
    AI_API_KEY: 'test-api-key-123'
  }, (url) => {
    callCount++;
    capturedUrl = url;
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify(mockGeminiOutput)
    };
  });

  const result = context.AiGateway.generate({ observationRecord: 'Prueba modelo 3.8' });
  assert.equal(result.strengths, 'Fortaleza directa');
  assert.equal(callCount, 1);
  assert.match(capturedUrl, /models\/gemini-3\.8-flash:generateContent/);
});

test('AiGateway lanza error cuando la IA está desactivada o falta la clave', () => {
  const disabledContext = createAiContext({ AI_ENABLED: 'false' }, () => {});
  assert.throws(() => disabledContext.AiGateway.generate({}), /desactivada/);

  const noKeyContext = createAiContext({ AI_ENABLED: 'true', AI_API_KEY: '' }, () => {});
  assert.throws(() => noKeyContext.AiGateway.generate({}), /AI_API_KEY/);
});

test('AiDraftService exige obligatoriamente Anexo 1 y los 15 criterios de la rúbrica', () => {
  let mockVisit = {
    status: 'DRAFT',
    observationRecord: '',
    rubricResponses: []
  };

  const context = {
    console,
    JSON,
    Date,
    Auth: {
      requireRoles: () => ({ user_id: 'user-1' })
    },
    VisitService: {
      get: () => mockVisit
    },
    VisitState: {
      isEditable: (st) => st === 'DRAFT'
    }
  };
  vm.createContext(context);
  for (const rel of ['src/domain/Errors.gs', 'src/application/AiDraftService.gs']) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
  }

  // Falta tanto Anexo 1 como rúbrica
  assert.throws(
    () => context.AiDraftService.draft('v-1', 'req-1'),
    /Anexo 1.*15 criterios de la rúbrica/
  );

  // Solo Anexo 1 completo, rúbrica incompleta (10 de 15)
  mockVisit.observationRecord = 'Registro de clase completo';
  mockVisit.rubricResponses = Array(10).fill({ level: 'ACHIEVED' });
  assert.throws(
    () => context.AiDraftService.draft('v-1', 'req-1'),
    /15 criterios de la rúbrica \(10\/15 evaluados/
  );

  // Solo rúbrica completa (15 de 15), Anexo 1 vacío
  mockVisit.observationRecord = '   ';
  mockVisit.rubricResponses = Array(15).fill({ level: 'ACHIEVED' });
  assert.throws(
    () => context.AiDraftService.draft('v-1', 'req-1'),
    /Anexo 1/
  );
});
