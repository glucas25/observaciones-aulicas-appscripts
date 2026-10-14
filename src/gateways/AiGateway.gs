var AiGateway = (function () {
  var outputSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      strengths: { type: 'string' },
      improvements: { type: 'string' },
      directiveCommitments: { type: 'string' },
      teacherCommitments: { type: 'string' },
      finalObservations: { type: 'string' },
      warnings: { type: 'array', items: { type: 'string' } }
    },
    required: ['strengths', 'improvements', 'directiveCommitments', 'teacherCommitments', 'finalObservations', 'warnings']
  };

  var geminiResponseSchema = {
    type: 'OBJECT',
    properties: {
      strengths: { type: 'STRING' },
      improvements: { type: 'STRING' },
      directiveCommitments: { type: 'STRING' },
      teacherCommitments: { type: 'STRING' },
      finalObservations: { type: 'STRING' },
      warnings: { type: 'ARRAY', items: { type: 'STRING' } }
    },
    required: ['strengths', 'improvements', 'directiveCommitments', 'teacherCommitments', 'finalObservations', 'warnings']
  };

  function extractOpenAi_(response) {
    if (response.output_text) return response.output_text;
    var output = response.output || [];
    for (var i = 0; i < output.length; i++) {
      for (var j = 0; j < (output[i].content || []).length; j++) {
        if (output[i].content[j].text) return output[i].content[j].text;
      }
    }
    if (response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content) {
      return response.choices[0].message.content;
    }
    throw AppErrors.ai('El proveedor OpenAI no devolvió contenido utilizable.');
  }

  function extractGemini_(response) {
    if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
      var parts = response.candidates[0].content.parts;
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].text) return parts[i].text;
      }
    }
    if (response.promptFeedback && response.promptFeedback.blockReason) {
      throw AppErrors.ai('La solicitud fue bloqueada por políticas de seguridad de Gemini: ' + response.promptFeedback.blockReason);
    }
    throw AppErrors.ai('El proveedor Gemini no devolvió candidatos utilizables.');
  }

  function buildSystemInstruction_() {
    return 'Eres el evaluador pedagógico institucional y directivo que realizó la observación de aula presencial (Ministerio de Educación).\n' +
      'Tu labor es redactar una retroalimentación formativa profesional, clara, motivadora y BREVE, dirigida directamente a la labor docente observada.\n\n' +
      'REGLAS OBLIGATORIAS DE ROL, TONO Y EXTENSIÓN:\n' +
      '1. ASUME EL ROL DIRECTO DE EVALUADOR/OBSERVADOR PRESENCIAL:\n' +
      '   - Habla como el profesional evaluador que presenció la sesión en el aula ("En base a lo observado en la clase...", "Durante la sesión se apreció...").\n' +
      '   - TERMINANTEMENTE PROHIBIDO usar frases meta como "En el registro proporcionado...", "En los datos suministrados no se señalan...", "No se registraron datos suficientes para concluir". Eres el observador in situ; evalúa lo observado en el aula, no el formulario ni la base de datos.\n' +
      '2. ASPECTOS A MEJORAR CUANDO TODO ESTÁ LOGRADO O NO HAY DEBILIDADES:\n' +
      '   - Si el docente obtuvo nivel Logrado en los criterios evaluados y no se detectaron dificultades pedagógicas, NUNCA digas que "faltan datos en el registro".\n' +
      '   - En "improvements" debes redactar exactamente o de forma muy similar:\n' +
      '     "En base a lo observado en la clase, no se detectaron aspectos a mejorar. Se sugiere continuar consolidando las buenas prácticas pedagógicas y el ambiente de aprendizaje alcanzado."\n' +
      '   - Si hubo algún criterio en proceso o inicio, señala puntualmente y con respeto el aspecto concreto a fortalecer.\n' +
      '3. OBSERVACIONES FINALES Y FELICITACIONES (finalObservations):\n' +
      '   - Cuando no se detecten aspectos a mejorar o el desempeño haya sido destacado/logrado, DEBES incluir felicitaciones explícitas y cálidas al docente en "finalObservations" (ejemplo: "¡Felicitaciones por la excelente labor pedagógica y el clima de aula participativo y respetuoso demostrado durante la sesión! Se reconoce su dedicación y compromiso con los aprendizajes de los estudiantes.").\n' +
      '4. BREVEDAD, CLARIDAD Y SÍNTESIS PEDAGÓGICA:\n' +
      '   - Redacción concisa y directa (máximo 2 a 3 oraciones breves por campo). Sin párrafos extensos ni listas interminables.\n' +
      '   - En "strengths" (Fortalezas): Sintetiza las principales virtudes observadas (dominio didáctico, participación estudiantil, dinamismo) en 2 o 3 oraciones fluidas. NO enumeres los 15 criterios.\n' +
      '   - En "directiveCommitments" (Compromiso del directivo): 1 a 2 oraciones breves con el apoyo institucional (acompañamiento pedagógico continuo, respaldo con recursos o talleres formativos).\n' +
      '   - En "teacherCommitments" (Compromiso del docente): DEBES DEVOLVER CADENA VACÍA (""). Este espacio lo redacta y guarda exclusivamente el docente evaluado.\n' +
      '5. TERMINOLOGÍA:\n' +
      '   - PROHIBIDO usar términos en inglés o identificadores técnicos como "ACHIEVED", "FULLY_AGREE", etc. Usa siempre términos pedagógicos en español.\n' +
      '6. Devuelve única y exclusivamente un objeto JSON válido según el esquema solicitado.';
  }

  function buildPrompt_(input) {
    var narr = input.observationRecord || input.narrativaObservacion || '';
    var materia = input.subject ? ('Asignatura: ' + input.subject + '. ') : '';
    var curso = input.gradeCourse ? ('Curso: ' + input.gradeCourse + '. ') : '';
    var tema = input.contentTopic ? ('Tema: "' + input.contentTopic + '". ') : '';

    return 'Como evaluador pedagógico que observó la sesión (' + materia + curso + tema + '), redacta la retroalimentación formativa para el docente en formato JSON.\n\n' +
      'Pautas de redacción:\n' +
      '1. Redacción clara, profesional, directa al docente y BREVE (máximo 2 a 3 oraciones por bloque).\n' +
      '2. Asume tu rol de evaluador presencial: jamás menciones "el registro proporcionado" ni "falta de datos en el archivo".\n' +
      '3. Si todos los criterios evaluados están en nivel Logrado y no se observaron aspectos negativos:\n' +
      '   - En improvements: "En base a lo observado en la clase, no se detectaron aspectos a mejorar. Se sugiere continuar consolidando..."\n' +
      '   - En finalObservations: Incluye felicitaciones explícitas y cálidas al docente por su labor pedagógica y el clima de aula logrado.\n' +
      '4. En teacherCommitments: Devuelve siempre cadena vacía ("").\n\n' +
      (narr ? 'Registro descriptivo de lo observado en clase (Anexo 1):\n' + narr + '\n\n' : '') +
      'Evidencia pedagógica evaluada:\n' + JSON.stringify(input, null, 2);
  }

  function sanitizePedagogicalText_(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/['"]?\bACHIEVED\b['"]?/gi, 'Logrado')
      .replace(/['"]?\bIN_PROGRESS\b['"]?/gi, 'En proceso')
      .replace(/['"]?\bBEGINNING\b['"]?/gi, 'En inicio')
      .replace(/['"]?\bNOT_APPLICABLE\b['"]?/gi, 'No aplica')
      .replace(/['"]?\bFULLY_AGREE\b['"]?/gi, 'Totalmente de acuerdo')
      .replace(/['"]?\bDISAGREE\b['"]?/gi, 'En desacuerdo')
      .replace(/en nivel\s+['"]?Logrado['"]?/gi, 'en nivel de logro')
      .replace(/calificado todos los criterios como\s+['"]?Logrado['"]?/gi, 'todos los criterios evaluados con nivel de logro')
      .replace(/las respuestas generales como\s+['"]?Totalmente de acuerdo['"]?/gi, 'las respuestas generales con total acuerdo')
      // Sanitizar frases meta o excusas de falta de datos hacia el rol de evaluador
      .replace(/En el registro proporcionado no se señalan áreas de mejora(?: ni descriptores)?[^.]*\./gi, 'En base a lo observado en la clase, no se detectaron aspectos a mejorar.')
      .replace(/En el registro proporcionado no se señalan áreas de mejora/gi, 'En base a lo observado no se detectaron aspectos a mejorar')
      .replace(/En el registro proporcionado no constan áreas de mejora/gi, 'En base a lo observado no se detectaron aspectos a mejorar')
      .replace(/no se registraron datos que permitan[^.]*\./gi, 'en base a lo observado no se detectaron aspectos a mejorar.')
      .replace(/En el registro proporcionado/gi, 'En base a lo observado en la clase')
      .replace(/En el registro provisto/gi, 'En base a lo observado en la clase')
      .replace(/En los datos proporcionados/gi, 'En base a lo observado en la clase')
      .replace(/En la información provista/gi, 'En base a lo observado en la clase')
      .replace(/según el registro proporcionado/gi, 'según lo observado en la clase');
  }

  function generate(input) {
    var config = AppConfig.get();
    if (!config.aiEnabled) throw AppErrors.ai('La asistencia de IA está desactivada.');
    if (!config.aiApiKey) throw AppErrors.ai('La asistencia de IA no está configurada. Falta AI_API_KEY.');

    var provider = String(config.aiProvider || 'GEMINI').toUpperCase();
    var prompt = buildPrompt_(input);
    var url = '';
    var options = {};

    var response = null;

    if (provider === 'GEMINI') {
      var rawModel = String(config.aiModel || '').trim().replace(/^models\//i, '');
      // Utilizar directamente el modelo configurado en las propiedades del proyecto
      // Si se ingresó un alias como "3.8" o "gemini-3.8", resolver al nombre de API "gemini-3.8-flash"
      if (rawModel === '3.8' || rawModel.toLowerCase() === 'gemini-3.8') {
        rawModel = 'gemini-3.8-flash';
      } else if (rawModel === '3.5' || rawModel.toLowerCase() === 'gemini-3.5') {
        rawModel = 'gemini-3.5-flash';
      } else if (!rawModel || ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash', 'gemini-2', 'gemini'].indexOf(rawModel.toLowerCase()) >= 0) {
        rawModel = 'gemini-3.8-flash';
      }
      var primaryModel = rawModel;
      var candidateModels = [primaryModel];
      var fallbacks = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
      for (var f = 0; f < fallbacks.length; f++) {
        if (candidateModels.indexOf(fallbacks[f]) < 0) candidateModels.push(fallbacks[f]);
      }

      var geminiPayload = {
        systemInstruction: {
          parts: [{ text: buildSystemInstruction_() }]
        },
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: geminiResponseSchema,
          temperature: 0.2
        }
      };

      for (var mIdx = 0; mIdx < candidateModels.length; mIdx++) {
        var currentModel = candidateModels[mIdx];
        url = config.aiEndpoint || ('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(currentModel) + ':generateContent?key=' + encodeURIComponent(config.aiApiKey));
        options = {
          method: 'post',
          contentType: 'application/json',
          headers: {
            'x-goog-api-key': config.aiApiKey
          },
          payload: JSON.stringify(geminiPayload),
          muteHttpExceptions: true
        };

        response = UrlFetchApp.fetch(url, options);
        var code = response.getResponseCode();

        if (code >= 200 && code < 300) {
          if (mIdx > 0) {
            console.warn('Modelo Gemini ' + primaryModel + ' devolvió 404. Se utilizó el modelo de respaldo ' + currentModel + ' con éxito.');
          }
          break;
        }

        // Si devuelve 404 (modelo no disponible o nombre incompleto), probar la siguiente alternativa
        if (code === 404 && mIdx < candidateModels.length - 1) {
          console.warn('Modelo Gemini ' + currentModel + ' devolvió 404. Probando alternativa ' + candidateModels[mIdx + 1] + '...');
          continue;
        }

        if (code === 429 || code >= 500) {
          if (typeof Utilities !== 'undefined' && Utilities.sleep) Utilities.sleep(500);
          response = UrlFetchApp.fetch(url, options);
          if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) break;
        }

        break;
      }
    } else if (provider === 'OPENAI') {
      var oaiModel = config.aiModel || 'gpt-4o-mini';
      url = config.aiEndpoint || 'https://api.openai.com/v1/responses';
      var oaiPayload = {
        model: oaiModel,
        store: false,
        input: [
          { role: 'system', content: 'Eres un asistente de redacción pedagógica prudente. Devuelve solo el JSON solicitado.' },
          { role: 'user', content: prompt }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'pedagogical_draft',
            strict: true,
            schema: outputSchema
          }
        }
      };
      options = {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + config.aiApiKey },
        payload: JSON.stringify(oaiPayload),
        muteHttpExceptions: true
      };

      for (var attempt = 0; attempt < 2; attempt++) {
        response = UrlFetchApp.fetch(url, options);
        var oaiCode = response.getResponseCode();
        if (oaiCode >= 200 && oaiCode < 300) break;
        if (attempt === 0 && (oaiCode === 429 || oaiCode >= 500)) {
          if (typeof Utilities !== 'undefined' && Utilities.sleep) Utilities.sleep(500);
          continue;
        }
        break;
      }
    } else {
      throw AppErrors.ai('Proveedor de IA no reconocido: ' + provider + '. Valores soportados: GEMINI, OPENAI.');
    }

    var statusCode = response.getResponseCode();
    if (statusCode < 200 || statusCode >= 300) {
      var errText = response.getContentText() || '';
      var detailMsg = '';
      try {
        var errJson = JSON.parse(errText);
        if (errJson && errJson.error && errJson.error.message) {
          detailMsg = ': ' + errJson.error.message;
        }
      } catch (_) {}
      var hint = '';
      if (statusCode === 404 && provider === 'GEMINI') {
        hint = ' Sugerencia: compruebe que su API Key tenga acceso al modelo configurado (modelos actuales: gemini-3.8-flash o gemini-3.5-flash-lite).';
      }
      console.error('AI Error (' + provider + ' HTTP ' + statusCode + '): ' + errText);
      throw AppErrors.ai('El proveedor de IA (' + provider + ') rechazó la solicitud (HTTP ' + statusCode + ')' + detailMsg + '.' + hint);
    }

    var rawText = response.getContentText();
    var parsed = JSON.parse(rawText);
    var textContent = provider === 'GEMINI' ? extractGemini_(parsed) : extractOpenAi_(parsed);
    var result = JSON.parse(textContent);

    var obs = result.finalObservations || result.observations || '';
    result.finalObservations = obs;
    result.observations = obs;

    ['strengths', 'improvements', 'directiveCommitments', 'finalObservations', 'observations'].forEach(function (k) {
      result[k] = sanitizePedagogicalText_(Validation.text(result[k] || '', 5000));
    });
    // El compromiso del docente lo redacta exclusivamente el docente evaluado; la IA nunca debe llenarlo
    result.teacherCommitments = '';
    result.warnings = Array.isArray(result.warnings) ? result.warnings.map(function (v) { return Validation.text(v, 500); }) : [];
    return result;
  }

  return { generate: generate };
})();
