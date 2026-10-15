var DocsGateway = (function () {
  var labels = {
    ACHIEVED: 'Logrado',
    IN_PROGRESS: 'En proceso',
    BEGINNING: 'En inicio',
    NOT_APPLICABLE: 'No aplica',
    FULLY_AGREE: 'Totalmente de acuerdo',
    DISAGREE: 'En desacuerdo'
  };

  var DocColors = {
    PURPLE_DARK: '#A02B93',
    PURPLE_MID: '#D86DCB',
    PURPLE_LIGHT: '#F2CEED',
    GRAY_HEADER: '#DDD9C3',
    BORDER: '#777777'
  };

  var MOMENT_CONFIG = [
    { key: 'INITIAL', title: 'MOMENTO INICIAL (ANTICIPACIÓN)', criteria: [1, 2] },
    { key: 'DEVELOPMENT', title: 'MOMENTO DE DESARROLLO (CONSTRUCCIÓN DEL CONOCIMIENTO)', criteria: [3, 4, 5, 6, 7, 8] },
    { key: 'CONSOLIDATION', title: 'MOMENTO DE CONSOLIDACIÓN Y EVALUACIÓN', criteria: [9, 10, 11] },
    { key: 'CLASSROOM_CLIMATE', title: 'CLIMA DE AULA', criteria: [12, 13, 14, 15] }
  ];

  function line_(values) {
    return (values || []).filter(function (v) { return v !== '' && v != null; }).join(' · ');
  }

  function cleanName_(name) {
    return String(name || '').replace(/\s*\([^)]*\)/g, '').trim();
  }

  function getEvaluatorRoleLabel_(nameSnapshot, explicitPosition) {
    var pos = explicitPosition || '';
    if (!pos && nameSnapshot) {
      var match = String(nameSnapshot).match(/\(([^)]+)\)/);
      if (match) pos = match[1].trim();
    }
    if (!pos) return 'DIRECTIVO O SU DELEGADO';

    var pLower = pos.toLowerCase();
    if (pLower.indexOf('docente') >= 0 || pLower.indexOf('profesor') >= 0) {
      return 'DELEGADO';
    }
    if (pLower.indexOf('vicerrec') >= 0) return 'VICERRECTOR';
    if (pLower.indexOf('rector') >= 0) return 'RECTOR';
    if (pLower.indexOf('dece') >= 0) return 'DECE';
    if (pLower.indexOf('coordinad') >= 0) return 'COORDINADOR DE ÁREA';
    if (pLower.indexOf('inspector') >= 0) return 'INSPECTOR GENERAL';
    if (pLower.indexOf('directiv') >= 0 || pLower.indexOf('autoridad') >= 0) return 'DIRECTIVO';
    if (pLower.indexOf('administrati') >= 0) return 'ADMINISTRATIVO';

    return pos.toUpperCase();
  }

  function signaturesBlock_(snapshot) {
    var rawEv1 = snapshot.evaluatorNameSnapshot || 'Evaluador / Directivo';
    var rawTeacher = snapshot.teacherNameSnapshot || 'Docente';
    var rawCo = snapshot.coEvaluatorNameSnapshot;
    var evRole = getEvaluatorRoleLabel_(rawEv1, snapshot.evaluatorPosition);
    var coRole = rawCo ? getEvaluatorRoleLabel_(rawCo, snapshot.coEvaluatorPosition) : '';
    var ev1 = cleanName_(rawEv1);
    var teacher = cleanName_(rawTeacher);
    var co = rawCo ? cleanName_(rawCo) : '';
    if (co) {
      return '\n\n____________________________          ____________________________          ____________________________\n' +
        evRole + ':                   ' + coRole + ':                     DOCENTE:\n' +
        ev1 + '                     ' + co + '                     ' + teacher;
    }
    return '\n\n____________________________                                ____________________________\n' +
      evRole + ':                                      DOCENTE:\n' +
      ev1 + '                                              ' + teacher;
  }

  function replacements(snapshot, type) {
    snapshot = snapshot || {};
    var general = (snapshot.generalResponses || []).map(function (r, i) {
      return (r.criterionCode || i + 1) + '. ' + (r.criterionText || '') + '\n' +
        (labels[r.result] || r.result) + (r.argument ? ' — ' + r.argument : '');
    }).join('\n\n');

    var rubric = (snapshot.rubricResponses || []).map(function (r, i) {
      return (r.criterionCode || i + 1) + '. ' + (r.criterionTitle || '') + '\n' +
        (labels[r.level] || r.level) +
        (r.descriptorSnapshot ? ' — ' + r.descriptorSnapshot : '') +
        (r.observation ? ' | Obs.: ' + r.observation : '');
    }).join('\n\n');

    var evidence = (snapshot.evidenceChecks || []).map(function (r) {
      return (r.isChecked ? '☒ ' : '☐ ') + (r.label || r.checkTypeId) + (r.observation ? ' — ' + r.observation : '');
    }).join('\n');

    return {
      DOCUMENT_TITLE: {
        ANNEX_1: 'ANEXO 1 — REGISTRO DE OBSERVACIÓN',
        ANNEX_2: 'ANEXO 2 — FICHA DE OBSERVACIÓN',
        ANNEX_3: 'ANEXO 3 — RÚBRICA',
        ANNEX_5: 'ANEXO 5 — RETROALIMENTACIÓN',
        FULL_PACKAGE: 'EXPEDIENTE DE OBSERVACIÓN — ANEXOS 1, 2, 3 Y 5'
      }[type],
      VISIT_ID: snapshot.visitCode || '',
      FORM_NUMBER: snapshot.formNumber || snapshot.visitCode || '',
      INSTITUTION_NAME: snapshot.institutionNameSnapshot || '',
      VISIT_DATE: snapshot.visitDate || '',
      CLASS_START_TIME: snapshot.classStartTime || '',
      TEACHER_NAME: cleanName_(snapshot.teacherNameSnapshot || ''),
      COURSE: line_([snapshot.gradeCourse, snapshot.parallel]),
      PARALLEL: snapshot.parallel || '',
      SUBLEVEL: snapshot.sublevel || '',
      AREA: snapshot.area || '',
      SUBJECT: snapshot.subject || '',
      CONTENT_TOPIC: snapshot.contentTopic || '',
      LOCATION: line_([snapshot.location, snapshot.zone, snapshot.district, snapshot.circuit]),
      ZONE: snapshot.zone || '',
      DISTRICT: snapshot.district || '',
      CIRCUIT: snapshot.circuit || '',
      ADDRESS: snapshot.institutionAddress || snapshot.location || '',
      SHIFT: snapshot.shift || 'Matutina',
      STUDENT_COUNT: snapshot.studentCount || '',
      OBSERVATION_RECORD: snapshot.observationRecord || 'Sin observaciones narrativas adicionales.',
      EVIDENCE_CHECKS: evidence || 'Sin verificación de evidencias documentales registradas.',
      GENERAL_CRITERIA_TABLE: general,
      RUBRIC_SELECTIONS_TABLE: rubric,
      STRENGTHS: snapshot.strengths || '',
      IMPROVEMENTS: snapshot.improvements || '',
      DIRECTIVE_COMMITMENTS: snapshot.directiveCommitments || '',
      TEACHER_COMMITMENTS: snapshot.teacherCommitments || '',
      FINAL_OBSERVATIONS: snapshot.finalObservations || '',
      EVALUATOR_NAME: cleanName_(snapshot.evaluatorNameSnapshot || ''),
      CO_EVALUATOR_NAME: cleanName_(snapshot.coEvaluatorNameSnapshot || ''),
      SIGNATURES_BLOCK: signaturesBlock_(snapshot)
    };
  }

  function applyTextStyle_(text, fontSize, isBold, textColor, isItalic) {
    if (!text) return;
    var value = text.getText ? text.getText() : '';
    var hasRange = value && value.length > 0;
    if (hasRange) {
      text.setFontFamily(0, value.length - 1, 'Arial');
      if (fontSize) text.setFontSize(0, value.length - 1, fontSize);
      if (isBold != null) text.setBold(0, value.length - 1, isBold);
      if (textColor) text.setForegroundColor(0, value.length - 1, textColor);
      if (isItalic != null) text.setItalic(0, value.length - 1, isItalic);
    } else {
      text.setFontFamily('Arial');
      if (fontSize) text.setFontSize(fontSize);
      if (isBold != null) text.setBold(isBold);
      if (textColor) text.setForegroundColor(textColor);
      if (isItalic != null) text.setItalic(isItalic);
    }
  }

  function replaceCellParagraphs_(cell, lines, fontSize, boldFirst, align, italic) {
    if (!cell || !cell.removeChild || !cell.appendParagraph) return false;
    while (cell.getNumChildren() > 0) cell.removeChild(cell.getChild(0));
    (lines && lines.length ? lines : ['']).forEach(function (line, index) {
      var p = cell.appendParagraph(String(line == null ? '' : line));
      if (align != null) p.setAlignment(align);
      applyTextStyle_(p.editAsText(), fontSize, boldFirst ? index === 0 : false, '#000000', italic === true);
    });
    return true;
  }

  function styleCell_(cell, bgColor, align, isBold, fontSize, textColor, padV, padH) {
    if (bgColor) cell.setBackgroundColor(bgColor);
    var pv = (padV != null) ? padV : 2.5;
    var ph = (padH != null) ? padH : 3.5;
    cell.setPaddingTop(pv);
    cell.setPaddingBottom(pv);
    cell.setPaddingLeft(ph);
    cell.setPaddingRight(ph);
    var numChildren = cell.getNumChildren();
    for (var i = 0; i < numChildren; i++) {
      var child = cell.getChild(i);
      if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
        var p = child.asParagraph();
        if (align != null) p.setAlignment(align);
        applyTextStyle_(p.editAsText(), fontSize, isBold, textColor, null);
      }
    }
  }

  function markSelectedCell_(cell, selected, fontSize) {
    if (!selected || !cell || !cell.appendParagraph) return;
    if (cell.setBackgroundColor) cell.setBackgroundColor('#F3E8FF');
    for (var i = cell.getNumChildren ? cell.getNumChildren() - 1 : -1; i >= 0; i--) {
      var child = cell.getChild(i);
      if (child.getType && child.getType() === DocumentApp.ElementType.PARAGRAPH) {
        var paragraph = child.asParagraph();
        if (paragraph.getText && paragraph.getText() === '') cell.removeChild(child);
      }
    }
    var marker = cell.appendParagraph('X');
    if (marker.setAlignment) marker.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    if (marker.setSpacingBefore) marker.setSpacingBefore(1);
    if (marker.setSpacingAfter) marker.setSpacingAfter(0);
    applyTextStyle_(marker.editAsText(), fontSize || 8.5, true, '#7E22CE', false);
  }

  function formatCell_(cell, fontSize, isBold, textColor, align, padV, padH) {
    var pv = (padV != null) ? padV : 2.5;
    var ph = (padH != null) ? padH : 3.5;
    cell.setPaddingTop(pv);
    cell.setPaddingBottom(pv);
    cell.setPaddingLeft(ph);
    cell.setPaddingRight(ph);
    var num = cell.getNumChildren();
    for (var i = 0; i < num; i++) {
      var child = cell.getChild(i);
      if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
        var p = child.asParagraph();
        if (align != null) p.setAlignment(align);
        applyTextStyle_(p.editAsText(), fontSize, isBold, textColor, null);
      }
    }
  }

  function formatLabelValueCell_(cell, fontSize, compact) {
    var sz = fontSize || 7.5;
    cell.setPaddingTop(compact ? 1.2 : 2).setPaddingBottom(compact ? 1.2 : 2).setPaddingLeft(3).setPaddingRight(3);
    if (cell.getText && replaceCellParagraphs_(cell, String(cell.getText() || '').split(/\r?\n/), sz, true, DocumentApp.HorizontalAlignment.LEFT, false)) {
      return;
    }
    var num = cell.getNumChildren();
    for (var i = 0; i < num; i++) {
      var child = cell.getChild(i);
      if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
        var p = child.asParagraph();
        applyTextStyle_(p.editAsText(), sz, i === 0, '#000000', false);
      }
    }
  }

  function appendSpacer_(body, pt) {
    try {
      var p = body.appendParagraph('');
      if (p.setFontSize) p.setFontSize(pt || 2);
      if (p.setSpacingBefore) p.setSpacingBefore(0);
      if (p.setSpacingAfter) p.setSpacingAfter(pt || 2);
      return p;
    } catch (e) {
      return body.appendParagraph('');
    }
  }

  var memBlobCache_ = {};

  function parseDriveFileId_(input) {
    if (!input || typeof input !== 'string') return '';
    var str = input.trim();
    var match = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    match = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    if (/^[a-zA-Z0-9_-]{20,}$/.test(str)) return str;
    return str;
  }

  function getLogoBlob_(logoId) {
    if (!logoId) return null;
    if (memBlobCache_[logoId]) return memBlobCache_[logoId];

    try {
      if (typeof CacheService !== 'undefined') {
        var scriptCache = CacheService.getScriptCache();
        var cached = scriptCache.get('LOGO_' + logoId);
        if (cached) {
          var parsed = JSON.parse(cached);
          var blobFromCache = Utilities.newBlob(Utilities.base64Decode(parsed.data), parsed.mimeType, 'logo');
          if (!/^image\/(png|jpeg)$/i.test(String(parsed.mimeType || ''))) return null;
          memBlobCache_[logoId] = blobFromCache;
          return blobFromCache;
        }
      }
    } catch (eCache) {
      console.warn('CacheService read failed: ' + eCache.message);
    }

    try {
      if (typeof DriveApp !== 'undefined') {
        var file = DriveApp.getFileById(logoId);
        var blob = file.getBlob();
        var mimeType = String(blob.getContentType ? blob.getContentType() : '').toLowerCase();
        var blobBytes = blob.getBytes ? blob.getBytes() : [];
        if (!/^image\/(png|jpeg)$/i.test(mimeType) && file.getName) {
          var fileName = String(file.getName() || '').toLowerCase();
          if (/\.png$/.test(fileName)) mimeType = 'image/png';
          if (/\.jpe?g$/.test(fileName)) mimeType = 'image/jpeg';
          if (/^image\/(png|jpeg)$/i.test(mimeType) && blob.setContentType) blob = blob.setContentType(mimeType);
        }
        if (!/^image\/(png|jpeg)$/i.test(mimeType) || !blobBytes.length) {
          console.warn('Institution logo is not a supported PNG/JPG image: ' + logoId);
          return null;
        }
        memBlobCache_[logoId] = blob;

        try {
          if (typeof CacheService !== 'undefined') {
            var bytes = blobBytes;
            if (bytes.length <= 75000) {
              var payload = JSON.stringify({
                mimeType: blob.getContentType(),
                data: Utilities.base64Encode(bytes)
              });
              CacheService.getScriptCache().put('LOGO_' + logoId, payload, 21600);
            }
          }
        } catch (eCacheWrite) {
          console.warn('CacheService write failed: ' + eCacheWrite.message);
        }

        return blob;
      }
    } catch (eDrive) {
      console.warn('DriveApp.getFileById failed for logo ' + logoId + ': ' + eDrive.message);
    }

    return null;
  }

  function clearLogoCache_(logoId) {
    if (logoId) {
      delete memBlobCache_[logoId];
      try {
        if (typeof CacheService !== 'undefined') {
          CacheService.getScriptCache().remove('LOGO_' + logoId);
        }
      } catch (e) {}
    } else {
      memBlobCache_ = {};
    }
  }

  function resolveInstitutionLogoId_(snapshot) {
    try {
      if (typeof SheetsRepository !== 'undefined') {
        var institutions = SheetsRepository.all('INSTITUTIONS');
        if (institutions && institutions.length > 0) {
          var institutionId = String(snapshot && (snapshot.institutionId || snapshot.institution_id) || '');
          var inst = institutions.filter(function (item) {
            return !institutionId || String(item.institution_id || '') === institutionId;
          })[0];
          if (inst) {
            var currentLogoId = parseDriveFileId_(inst.logo_drive_id || inst.logo_file_id || inst.logo_drive_url || '');
            if (currentLogoId) return currentLogoId;
          }
        }
      }
    } catch (e) {
      console.warn('Could not lookup institution logo from SheetsRepository: ' + e.message);
    }
    return parseDriveFileId_(snapshot && (snapshot.institutionLogoDriveId || snapshot.logoDriveId) || '');
  }

  function resolveMinistryLogoId_(snapshot) {
    try {
      if (typeof SheetsRepository !== 'undefined') {
        var institutions = SheetsRepository.all('INSTITUTIONS');
        if (institutions && institutions.length > 0) {
          var institutionId = String(snapshot && (snapshot.institutionId || snapshot.institution_id) || '');
          var inst = institutions.filter(function (item) {
            return !institutionId || String(item.institution_id || '') === institutionId;
          })[0];
          if (inst) {
            var currentLogoId = parseDriveFileId_(inst.ministry_logo_drive_id || inst.ministry_logo_file_id || inst.ministry_logo_drive_url || '');
            if (currentLogoId) return currentLogoId;
          }
        }
      }
    } catch (e) {
      console.warn('Could not lookup ministry logo from SheetsRepository: ' + e.message);
    }
    return parseDriveFileId_(snapshot && (snapshot.institutionMinistryLogoDriveId || snapshot.ministryLogoDriveId) || '');
  }

  function appendHeaderLogo_(cell, logoBlob, compact) {
    cell.setPaddingTop(compact ? 1 : 2).setPaddingBottom(compact ? 2 : 4).setPaddingLeft(8).setPaddingRight(8);
    cell.setWidth(100);
    if (!logoBlob) return false;
    try {
      var img = cell.appendImage(logoBlob);
      var origW = (img && img.getWidth) ? img.getWidth() : 100;
      var origH = (img && img.getHeight) ? img.getHeight() : 50;
      var ratio = Math.min((compact ? 74 : 76) / origW, (compact ? 54 : 64) / origH, 1);
      if (img && img.setWidth) img.setWidth(Math.round(origW * ratio));
      if (img && img.setHeight) img.setHeight(Math.round(origH * ratio));
      if (cell.getNumChildren() > 1 && cell.getChild(0).getType && cell.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH) {
        var firstP = cell.getChild(0).asParagraph();
        if (firstP.getText && firstP.getText() === '') firstP.removeFromParent();
      }
      if (cell.getNumChildren() && cell.getChild(0).getType && cell.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH) {
        cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
      if (cell.setVerticalAlignment && DocumentApp.VerticalAlignment) cell.setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER);
      return true;
    } catch (eImg) {
      console.warn('No se pudo insertar una imagen del encabezado: ' + eImg.message);
      return false;
    }
  }

  function appendInstitutionalHeader_(body, snapshot, logoBlob, ministryLogoBlob, compact) {
    var instName = String(snapshot.institutionNameSnapshot || 'INSTITUCIÓN EDUCATIVA').toUpperCase();
    var address = String(snapshot.institutionAddress || '').trim();
    var phone = String(snapshot.institutionPhone || '').trim();
    var email = String(snapshot.institutionEmail || '').trim();
    var placeParts = [snapshot.location, snapshot.institutionProvince].filter(function (value) { return String(value || '').trim(); });
    var place = placeParts.join(' - ').toUpperCase();

    var table = body.appendTable();
    table.setBorderColor('#FFFFFF');
    table.setBorderWidth(0);

    var row = table.appendTableRow();
    var cellText;

    if (logoBlob || ministryLogoBlob) {
      var cellMinistryLogo = row.appendTableCell();
      appendHeaderLogo_(cellMinistryLogo, ministryLogoBlob, compact);

      cellText = row.appendTableCell();
      cellText.setPaddingTop(compact ? 1 : 3).setPaddingBottom(compact ? 1 : 3).setPaddingLeft(0).setPaddingRight(0);
      cellText.setWidth(340);

      var cellInstitutionLogo = row.appendTableCell();
      appendHeaderLogo_(cellInstitutionLogo, logoBlob, compact);
    } else {
      cellText = row.appendTableCell();
      cellText.setPaddingTop(2).setPaddingBottom(4).setPaddingLeft(0).setPaddingRight(0);
      cellText.setWidth(540);
    }

    var pName = cellText.getChild(0).asParagraph();
    pName.setText(instName);
    pName.setFontFamily('Times New Roman').setFontSize(compact ? 12 : 13).setBold(true).setForegroundColor('#183153');
    pName.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

    if (address) {
      var pAddress = cellText.appendParagraph('Dirección: ' + address);
      pAddress.setFontFamily('Times New Roman').setFontSize(compact ? 7 : 7.5).setForegroundColor('#183153');
      pAddress.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    }

    var contactParts = [];
    if (phone) contactParts.push('Telf. ' + phone);
    if (email) contactParts.push('email: ' + email);
    if (contactParts.length) {
      var pContact = cellText.appendParagraph(contactParts.join('    '));
      pContact.setFontFamily('Times New Roman').setFontSize(compact ? 7 : 7.5).setForegroundColor('#183153');
      pContact.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    }

    if (place) {
      var pPlace = cellText.appendParagraph(place);
      pPlace.setFontFamily('Times New Roman').setFontSize(compact ? 8.5 : 9.5).setBold(true).setForegroundColor('#183153');
      pPlace.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    }

    try {
      var pDivider = body.appendParagraph('');
      if (pDivider.setFontSize) pDivider.setFontSize(2);
      if (pDivider.setSpacingAfter) pDivider.setSpacingAfter(compact ? 1 : 2);
      if (pDivider.setSpacingBefore) pDivider.setSpacingBefore(0);
    } catch (e) {}
  }

  function appendBannerBox_(body, title, subtitle) {
    var table = body.appendTable([
      [title + (subtitle ? ' ' + subtitle : '')]
    ]);
    table.setBorderColor(DocColors.PURPLE_DARK);
    table.setBorderWidth(0.5);
    var cell = table.getCell(0, 0);
    cell.setBackgroundColor(DocColors.PURPLE_DARK);
    cell.setPaddingTop(3.5);
    cell.setPaddingBottom(3.5);
    var p = cell.getChild(0).asParagraph();
    p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    var t = p.editAsText();
    t.setForegroundColor('#FFFFFF');
    t.setFontFamily('Arial');
    t.setFontSize(10);
    t.setBold(true);
    cell.setWidth(540);
  }

  function appendSectionHeader_(body, title, bgColor, textColor) {
    var table = body.appendTable([[title]]);
    table.setBorderColor(DocColors.BORDER);
    table.setBorderWidth(0.5);
    var cell = table.getCell(0, 0);
    cell.setBackgroundColor(bgColor || DocColors.GRAY_HEADER);
    cell.setPaddingTop(2.5);
    cell.setPaddingBottom(2.5);
    var p = cell.getChild(0).asParagraph();
    p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    var t = p.editAsText();
    t.setForegroundColor(textColor || '#000000');
    t.setFontFamily('Arial');
    t.setFontSize(8.5);
    t.setBold(true);
    cell.setWidth(540);
  }

  function buildGeneralCriteriaTable_(table, snapshot, compact) {
    var headerSize = compact ? 7.1 : 7.5;
    var rowSize = compact ? 6.7 : 7;
    var verticalPadding = compact ? 1.2 : 2;
    var hRow = table.appendTableRow();
    hRow.appendTableCell('CRITERIOS GENERALES\nEstos criterios se relacionan con los tres momentos de los procesos de enseñanza y aprendizaje (excepto el criterio No 1)');
    hRow.appendTableCell('Totalmente de acuerdo');
    hRow.appendTableCell('En desacuerdo\n(Argumente la respuesta)');
    styleCell_(hRow.getCell(0), DocColors.GRAY_HEADER, DocumentApp.HorizontalAlignment.LEFT, true, headerSize, '#000000', verticalPadding, 3);
    styleCell_(hRow.getCell(1), DocColors.GRAY_HEADER, DocumentApp.HorizontalAlignment.CENTER, true, headerSize, '#000000', verticalPadding, 3);
    styleCell_(hRow.getCell(2), DocColors.GRAY_HEADER, DocumentApp.HorizontalAlignment.CENTER, true, headerSize, '#000000', verticalPadding, 3);
    hRow.getCell(0).setWidth(300);
    hRow.getCell(1).setWidth(100);
    hRow.getCell(2).setWidth(140);
    if (compact && hRow.setMinimumHeight) { try { hRow.setMinimumHeight(25); } catch (eHeaderHeight) {} }

    var responses = snapshot.generalResponses || [];
    var seedGeneral = (typeof SeedData !== 'undefined' && SeedData.general) ? SeedData.general : [];
    for (var i = 0; i < 6; i++) {
      var r = responses[i] || {};
      var gText = r.criterionText || seedGeneral[i] || ('Criterio general ' + (i + 1));
      var row = table.appendTableRow();
      var cText = (i + 1) + '. ' + gText;
      var cAgree = '';
      var cDisagree = r.result === 'DISAGREE' ? (r.argument || '') : '';
      row.appendTableCell(cText);
      row.appendTableCell(cAgree);
      row.appendTableCell(cDisagree);
      styleCell_(row.getCell(0), null, DocumentApp.HorizontalAlignment.LEFT, false, rowSize, '#000000', verticalPadding, 3);
      styleCell_(row.getCell(1), null, DocumentApp.HorizontalAlignment.CENTER, r.result === 'FULLY_AGREE', compact ? 7 : 7.5, '#000000', verticalPadding, 3);
      styleCell_(row.getCell(2), null, DocumentApp.HorizontalAlignment.LEFT, false, rowSize, '#000000', verticalPadding, 3);
      markSelectedCell_(row.getCell(1), r.result === 'FULLY_AGREE', compact ? 8 : 8.5);
      markSelectedCell_(row.getCell(2), r.result === 'DISAGREE', compact ? 8 : 8.5);
      row.getCell(0).setWidth(300);
      row.getCell(1).setWidth(100);
      row.getCell(2).setWidth(140);
      if (compact && row.setMinimumHeight) { try { row.setMinimumHeight(20); } catch (eRowHeight) {} }
    }
  }

  function buildAnnex2RubricTable_(table, snapshot, compact) {
    var headerSize = compact ? 6.8 : 7;
    var sectionSize = compact ? 6.6 : 7;
    var titleSize = compact ? 6.3 : 6.6;
    var valueSize = compact ? 6.5 : 6.8;
    var verticalPadding = compact ? 0.7 : 0.8;
    var hRow = table.appendTableRow();
    hRow.appendTableCell('CRITERIOS');
    hRow.appendTableCell('LOGRADO');
    hRow.appendTableCell('EN PROCESO');
    hRow.appendTableCell('EN INICIO');
    hRow.appendTableCell('NO APLICA');
    hRow.appendTableCell('OBSERVACIÓN');
    for (var c = 0; c < 6; c++) {
      styleCell_(hRow.getCell(c), DocColors.PURPLE_LIGHT, DocumentApp.HorizontalAlignment.CENTER, true, headerSize, '#000000', compact ? 0.8 : 1, 3);
    }
    hRow.getCell(0).setWidth(220);
    hRow.getCell(1).setWidth(50);
    hRow.getCell(2).setWidth(50);
    hRow.getCell(3).setWidth(50);
    hRow.getCell(4).setWidth(50);
    hRow.getCell(5).setWidth(120);
    if (compact && hRow.setMinimumHeight) { try { hRow.setMinimumHeight(19); } catch (eRubHeaderHeight) {} }

    var responses = snapshot.rubricResponses || [];
    MOMENT_CONFIG.forEach(function (m) {
      var sRow = table.appendTableRow();
      sRow.appendTableCell(m.title);
      sRow.appendTableCell('');
      sRow.appendTableCell('');
      sRow.appendTableCell('');
      sRow.appendTableCell('');
      sRow.appendTableCell('');
      for (var k = 0; k < 6; k++) {
        styleCell_(sRow.getCell(k), DocColors.PURPLE_MID, DocumentApp.HorizontalAlignment.LEFT, true, sectionSize, '#FFFFFF', compact ? 0.7 : 1, 3);
      }
      if (compact && sRow.setMinimumHeight) { try { sRow.setMinimumHeight(14); } catch (eSectionHeight) {} }

      m.criteria.forEach(function (num) {
        var r = responses[num - 1] || {};
        var seedItem = (typeof SeedData !== 'undefined' && SeedData.rubric && SeedData.rubric[num - 1]) ? SeedData.rubric[num - 1] : null;
        var row = table.appendTableRow();
        var cTitle = num + '. ' + String(r.criterionTitle || (seedItem ? seedItem[2] : ('Criterio ' + num))).toUpperCase();
        row.appendTableCell(cTitle);
        row.appendTableCell('');
        row.appendTableCell('');
        row.appendTableCell('');
        row.appendTableCell('');
        row.appendTableCell(r.observation || '');

        styleCell_(row.getCell(0), null, DocumentApp.HorizontalAlignment.LEFT, true, titleSize, '#000000', verticalPadding, 3);
        styleCell_(row.getCell(1), null, DocumentApp.HorizontalAlignment.CENTER, r.level === 'ACHIEVED', valueSize, '#000000', verticalPadding, 3);
        styleCell_(row.getCell(2), null, DocumentApp.HorizontalAlignment.CENTER, r.level === 'IN_PROGRESS', valueSize, '#000000', verticalPadding, 3);
        styleCell_(row.getCell(3), null, DocumentApp.HorizontalAlignment.CENTER, r.level === 'BEGINNING', valueSize, '#000000', verticalPadding, 3);
        styleCell_(row.getCell(4), null, DocumentApp.HorizontalAlignment.CENTER, r.level === 'NOT_APPLICABLE', valueSize, '#000000', verticalPadding, 3);
        styleCell_(row.getCell(5), null, DocumentApp.HorizontalAlignment.LEFT, false, titleSize, '#000000', verticalPadding, 3);
        markSelectedCell_(row.getCell(1), r.level === 'ACHIEVED', compact ? 8 : 8.5);
        markSelectedCell_(row.getCell(2), r.level === 'IN_PROGRESS', compact ? 8 : 8.5);
        markSelectedCell_(row.getCell(3), r.level === 'BEGINNING', compact ? 8 : 8.5);
        markSelectedCell_(row.getCell(4), r.level === 'NOT_APPLICABLE', compact ? 8 : 8.5);

        row.getCell(0).setWidth(220);
        row.getCell(1).setWidth(50);
        row.getCell(2).setWidth(50);
        row.getCell(3).setWidth(50);
        row.getCell(4).setWidth(50);
        row.getCell(5).setWidth(120);
        if (compact && row.setMinimumHeight) { try { row.setMinimumHeight(14); } catch (eCriterionHeight) {} }
      });
    });
  }

  function buildAnnex3RubricTable_(table, snapshot, criterionNumbers) {
    var hRow = table.appendTableRow();
    hRow.appendTableCell('CRITERIOS');
    hRow.appendTableCell('LOGRADO');
    hRow.appendTableCell('EN PROCESO');
    hRow.appendTableCell('EN INICIO');
    hRow.appendTableCell('No aplica\na la clase observada');
    for (var c = 0; c < 5; c++) {
      styleCell_(hRow.getCell(c), DocColors.PURPLE_LIGHT, DocumentApp.HorizontalAlignment.CENTER, true, 7.5, '#000000', 2, 3);
    }
    hRow.getCell(0).setWidth(110);
    hRow.getCell(1).setWidth(135);
    hRow.getCell(2).setWidth(135);
    hRow.getCell(3).setWidth(110);
    hRow.getCell(4).setWidth(50);

    var responses = snapshot.rubricResponses || [];
    var selected = criterionNumbers && criterionNumbers.length ? criterionNumbers : null;
    MOMENT_CONFIG.forEach(function (m) {
      var visibleCriteria = m.criteria.filter(function (num) {
        return !selected || selected.indexOf(num) >= 0;
      });
      if (!visibleCriteria.length) return;
      var sRow = table.appendTableRow();
      sRow.appendTableCell(m.title);
      sRow.appendTableCell('');
      sRow.appendTableCell('');
      sRow.appendTableCell('');
      sRow.appendTableCell('');
      for (var k = 0; k < 5; k++) {
        styleCell_(sRow.getCell(k), DocColors.PURPLE_MID, DocumentApp.HorizontalAlignment.LEFT, true, 7.5, '#FFFFFF', 2, 3);
      }

      visibleCriteria.forEach(function (num) {
        var r = responses[num - 1] || {};
        var seedItem = (typeof SeedData !== 'undefined' && SeedData.rubric && SeedData.rubric[num - 1]) ? SeedData.rubric[num - 1] : null;
        var cTitle = num + '. ' + String(r.criterionTitle || (seedItem ? seedItem[2] : ('Criterio ' + num))).toUpperCase();

        var descAchieved = r.descriptorAchieved || (seedItem ? seedItem[3] : '');
        var descInProgress = r.descriptorInProgress || (seedItem ? seedItem[4] : '');
        var descBeginning = r.descriptorBeginning || (seedItem ? seedItem[5] : '');

        var achText = descAchieved || '';
        var progText = descInProgress || '';
        var begText = descBeginning || '';
        var naText = '';

        var row = table.appendTableRow();
        row.appendTableCell(cTitle);
        row.appendTableCell(achText);
        row.appendTableCell(progText);
        row.appendTableCell(begText);
        row.appendTableCell(naText);

        styleCell_(row.getCell(0), null, DocumentApp.HorizontalAlignment.LEFT, true, 7.2, '#000000', 2, 3);
        styleCell_(row.getCell(1), null, DocumentApp.HorizontalAlignment.LEFT, false, 7.2, '#000000', 2, 3);
        styleCell_(row.getCell(2), null, DocumentApp.HorizontalAlignment.LEFT, false, 7.2, '#000000', 2, 3);
        styleCell_(row.getCell(3), null, DocumentApp.HorizontalAlignment.LEFT, false, 7.2, '#000000', 2, 3);
        styleCell_(row.getCell(4), null, DocumentApp.HorizontalAlignment.CENTER, r.level === 'NOT_APPLICABLE', 7.2, '#000000', 2, 2);
        markSelectedCell_(row.getCell(1), r.level === 'ACHIEVED', 9);
        markSelectedCell_(row.getCell(2), r.level === 'IN_PROGRESS', 9);
        markSelectedCell_(row.getCell(3), r.level === 'BEGINNING', 9);
        markSelectedCell_(row.getCell(4), r.level === 'NOT_APPLICABLE', 9);

        if (row.setMinimumHeight) {
          try { row.setMinimumHeight(criterionNumbers && criterionNumbers.length === 7 ? 56 : 49); } catch (eHeight) {}
        }

        row.getCell(0).setWidth(110);
        row.getCell(1).setWidth(135);
        row.getCell(2).setWidth(135);
        row.getCell(3).setWidth(110);
        row.getCell(4).setWidth(50);
      });
    });
  }

  function buildSignaturesTable_(table, snapshot) {
    var rawEv1 = snapshot.evaluatorNameSnapshot || 'Evaluador / Directivo';
    var rawTeacher = snapshot.teacherNameSnapshot || 'Docente';
    var rawCo = snapshot.coEvaluatorNameSnapshot;

    var evRoleLabel = getEvaluatorRoleLabel_(rawEv1, snapshot.evaluatorPosition);
    var coRoleLabel = rawCo ? getEvaluatorRoleLabel_(rawCo, snapshot.coEvaluatorPosition) : '';

    var ev1Clean = cleanName_(rawEv1);
    var teacherClean = cleanName_(rawTeacher);
    var co = rawCo ? cleanName_(rawCo) : '';

    var cols = rawCo ? 3 : 2;
    var colWidth = rawCo ? 180 : 270;

    var hRow = table.appendTableRow();
    hRow.appendTableCell('FIRMAS');
    hRow.appendTableCell('');
    if (rawCo) hRow.appendTableCell('');
    for (var i = 0; i < cols; i++) {
      styleCell_(hRow.getCell(i), DocColors.GRAY_HEADER, DocumentApp.HorizontalAlignment.CENTER, true, 8, '#000000', 2, 3);
      hRow.getCell(i).setWidth(colWidth);
    }

    var rRoles = table.appendTableRow();
    if (rawCo) {
      rRoles.appendTableCell(evRoleLabel);
      rRoles.appendTableCell(coRoleLabel || 'SEGUNDO EVALUADOR');
      rRoles.appendTableCell('DOCENTE');
    } else {
      rRoles.appendTableCell(evRoleLabel);
      rRoles.appendTableCell('DOCENTE');
    }
    for (var j = 0; j < cols; j++) {
      styleCell_(rRoles.getCell(j), null, DocumentApp.HorizontalAlignment.CENTER, true, 7.5, '#000000', 2, 3);
      rRoles.getCell(j).setWidth(colWidth);
    }

    var rSign = table.appendTableRow();
    if (rSign.setMinimumHeight) {
      try { rSign.setMinimumHeight(40); } catch (e) {}
    }
    if (rawCo) {
      rSign.appendTableCell('');
      rSign.appendTableCell('');
      rSign.appendTableCell('');
    } else {
      rSign.appendTableCell('');
      rSign.appendTableCell('');
    }
    for (var s = 0; s < cols; s++) {
      styleCell_(rSign.getCell(s), null, DocumentApp.HorizontalAlignment.CENTER, false, 7, '#666666', 2, 3);
      rSign.getCell(s).setWidth(colWidth);
    }

    var rNames = table.appendTableRow();
    if (rawCo) {
      rNames.appendTableCell('NOMBRE: ' + ev1Clean);
      rNames.appendTableCell('NOMBRE: ' + co);
      rNames.appendTableCell('NOMBRE: ' + teacherClean);
    } else {
      rNames.appendTableCell('NOMBRE: ' + ev1Clean);
      rNames.appendTableCell('NOMBRE: ' + teacherClean);
    }
    for (var n = 0; n < cols; n++) {
      styleCell_(rNames.getCell(n), null, DocumentApp.HorizontalAlignment.LEFT, true, 7.5, '#000000', 2, 3);
      rNames.getCell(n).setWidth(colWidth);
    }
  }

  function buildAnnex1Section_(body, snapshot, logoBlob, ministryLogoBlob) {
    appendInstitutionalHeader_(body, snapshot, logoBlob, ministryLogoBlob);

    appendBannerBox_(body, 'REGISTRO DE LA OBSERVACIÓN DE CLASE');

    var courseStr = line_([snapshot.gradeCourse, snapshot.parallel]);
    var teacherNameClean = cleanName_(snapshot.teacherNameSnapshot || '');
    var infoTable = body.appendTable([
      ['Institución educativa: ' + (snapshot.institutionNameSnapshot || ''), 'Fecha: ' + (snapshot.visitDate || '')],
      ['Docente: ' + teacherNameClean, 'Grado o curso: ' + (courseStr || '')]
    ]);
    infoTable.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    for (var r = 0; r < infoTable.getNumRows(); r++) {
      var row = infoTable.getRow(r);
      for (var c = 0; c < row.getNumCells(); c++) {
        var cell = row.getCell(c);
        formatCell_(cell, 8, false, '#000000', DocumentApp.HorizontalAlignment.LEFT, 2.5, 2.5, 4, 4);
      }
      row.getCell(0).setWidth(330);
      row.getCell(1).setWidth(210);
    }

    var objTable = body.appendTable([
      ['OBJETIVO: Registrar información, fielmente recogida en el momento de la observación, como insumo para procesar la Rúbrica para la ficha de observación de clase y para la retroalimentación al docente observado.'],
      ['INSTRUCCIONES: Anotar en forma descriptiva, con objetividad y exactitud los hechos relevantes, relacionados con los criterios contenidos en la ficha de observación de clase y su correspondiente rúbrica.']
    ]);
    objTable.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    for (var ro = 0; ro < objTable.getNumRows(); ro++) {
      var cObj = objTable.getRow(ro).getCell(0);
      formatCell_(cObj, 7.5, false, '#000000', DocumentApp.HorizontalAlignment.LEFT, 2.5, 2.5, 4, 4);
      for (var io = 0; io < cObj.getNumChildren(); io++) {
        if (cObj.getChild(io).getType() === DocumentApp.ElementType.PARAGRAPH) {
          cObj.getChild(io).asParagraph().setItalic(true);
        }
      }
      cObj.setWidth(540);
    }

    appendSectionHeader_(body, 'REGISTRO NARRATIVO DESCRIPTIVO', DocColors.GRAY_HEADER);

    var textTable = body.appendTable([
      [(snapshot.observationRecord || 'Sin observaciones narrativas registradas.')]
    ]);
    textTable.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    if (textTable.getRow(0).setMinimumHeight) {
      try { textTable.getRow(0).setMinimumHeight(180); } catch (e) {}
    }
    var cNarr = textTable.getCell(0, 0);
    replaceCellParagraphs_(cNarr, String(snapshot.observationRecord || 'Sin observaciones narrativas registradas.').split(/\r?\n/), 8, false, DocumentApp.HorizontalAlignment.LEFT, false);
    formatCell_(cNarr, 8, false, '#000000', DocumentApp.HorizontalAlignment.LEFT, 4, 4, 5, 5);
    cNarr.setWidth(540);

  }

  function buildAnnex2Section_(body, snapshot, logoBlob, ministryLogoBlob) {
    appendInstitutionalHeader_(body, snapshot, logoBlob, ministryLogoBlob, true);

    var fNum = snapshot.formNumber || snapshot.visitCode || '';
    appendBannerBox_(body, 'FICHA DE OBSERVACIÓN DE CLASE', fNum ? ('No. ' + fNum) : '');

    appendSectionHeader_(body, 'DATOS INFORMATIVOS', DocColors.GRAY_HEADER);

    // Fila 1: Datos de la Institución (7 columnas)
    var tableInst = body.appendTable([
      [
        'NOMBRE DE LA INSTITUCIÓN:\n' + (snapshot.institutionNameSnapshot || ''),
        'CANTÓN:\n' + (snapshot.location || ''),
        'ZONA:\n' + (snapshot.zone || ''),
        'DISTRITO:\n' + (snapshot.district || ''),
        'CIRCUITO:\n' + (snapshot.circuit || ''),
        'DIRECCIÓN INSTITUCIÓN:\n' + (snapshot.institutionAddress || snapshot.location || ''),
        'JORNADA:\n' + (snapshot.shift || 'Matutina')
      ]
    ]);
    tableInst.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    var colWidthsInst = [140, 80, 45, 55, 50, 105, 65];
    for (var c1 = 0; c1 < 7; c1++) {
      var cell1 = tableInst.getRow(0).getCell(c1);
      formatLabelValueCell_(cell1, 7.1, true);
      cell1.setWidth(colWidthsInst[c1]);
    }

    // Fila 2: Docente, Contenido, Área, Asignatura y Fecha (5 columnas)
    var teacherClean = cleanName_(snapshot.teacherNameSnapshot || '');
    var tableDoc = body.appendTable([
      [
        'NOMBRE DEL DOCENTE:\n' + teacherClean,
        'CONTENIDO:\n' + (snapshot.contentTopic || ''),
        'ÁREA:\n' + (snapshot.area || ''),
        'ASIGNATURA:\n' + (snapshot.subject || ''),
        'FECHA:\n' + (snapshot.visitDate || '')
      ]
    ]);
    tableDoc.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    var colWidthsDoc = [150, 125, 90, 95, 80];
    for (var c2 = 0; c2 < 5; c2++) {
      var cell2 = tableDoc.getRow(0).getCell(c2);
      formatLabelValueCell_(cell2, 7.1, true);
      cell2.setWidth(colWidthsDoc[c2]);
    }

    // Fila 3: Grado o Curso, Paralelo, Subnivel y No. de Estudiantes (4 columnas)
    var tableGrade = body.appendTable([
      [
        'GRADO O CURSO:\n' + (snapshot.gradeCourse || ''),
        'PARALELO:\n' + (snapshot.parallel || ''),
        'SUBNIVEL:\n' + (snapshot.sublevel || ''),
        'No. DE ESTUDIANTES:\n' + (snapshot.studentCount || '')
      ]
    ]);
    tableGrade.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    var colWidthsGrade = [150, 70, 160, 160];
    for (var c3 = 0; c3 < 4; c3++) {
      var cell3 = tableGrade.getRow(0).getCell(c3);
      formatLabelValueCell_(cell3, 7.1, true);
      cell3.setWidth(colWidthsGrade[c3]);
    }

    var objTable = body.appendTable([
      ['OBJETIVO DE LA FICHA: Recolectar información de los procesos enseñanza y aprendizaje durante el período de clase.'],
      ['INSTRUCCIONES: Marque una x en el casillero que corresponda a su conformidad con alguno de los criterios enunciados.']
    ]);
    objTable.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    for (var ro = 0; ro < objTable.getNumRows(); ro++) {
      var cObj = objTable.getRow(ro).getCell(0);
      formatCell_(cObj, 7, ro === 0, '#000000', DocumentApp.HorizontalAlignment.LEFT, 1.4, 2.5, 4, 4);
      if (ro === 1) {
        for (var ic = 0; ic < cObj.getNumChildren(); ic++) {
          if (cObj.getChild(ic).getType() === DocumentApp.ElementType.PARAGRAPH) {
            cObj.getChild(ic).asParagraph().setItalic(true);
          }
        }
      }
      cObj.setWidth(540);
    }

    var genTable = body.appendTable();
    genTable.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    buildGeneralCriteriaTable_(genTable, snapshot, true);

    appendSectionHeader_(body, 'PROCESOS DE ENSEÑANZA Y APRENDIZAJE', DocColors.GRAY_HEADER);

    var pInst2 = body.appendParagraph('INSTRUCCIONES: Marque una x en el casillero que corresponda a su conformidad con alguno de los criterios enunciados.');
    pInst2.setFontFamily('Arial').setFontSize(6.7).setItalic(true);
    if (pInst2.setSpacingBefore) pInst2.setSpacingBefore(0);
    if (pInst2.setSpacingAfter) pInst2.setSpacingAfter(1);

    var rubTable = body.appendTable();
    rubTable.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    buildAnnex2RubricTable_(rubTable, snapshot, true);

  }

  function buildAnnex3Section_(body, snapshot, logoBlob, ministryLogoBlob) {
    appendInstitutionalHeader_(body, snapshot, logoBlob, ministryLogoBlob);

    appendBannerBox_(body, 'RÚBRICA PARA LA FICHA DE OBSERVACIÓN DE CLASE');

    var objTable = body.appendTable([
      ['OBJETIVO: Describir el grado de desempeño del docente en el aula, durante su práctica pedagógica.'],
      ['INSTRUCCIONES: Marque con una X la columna que corresponda al valor seleccionado para el criterio respectivo.']
    ]);
    objTable.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    for (var ro = 0; ro < objTable.getNumRows(); ro++) {
      var cObj = objTable.getRow(ro).getCell(0);
      formatCell_(cObj, 7.5, ro === 0, '#000000', DocumentApp.HorizontalAlignment.LEFT, 2.5, 2.5, 4, 4);
      if (ro === 1) {
        for (var ic = 0; ic < cObj.getNumChildren(); ic++) {
          if (cObj.getChild(ic).getType() === DocumentApp.ElementType.PARAGRAPH) {
            cObj.getChild(ic).asParagraph().setItalic(true);
          }
        }
      }
      cObj.setWidth(540);
    }

    appendSpacer_(body, 2);
    var rubTable = body.appendTable();
    rubTable.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    buildAnnex3RubricTable_(rubTable, snapshot, [1, 2, 3, 4, 5, 6, 7]);

    body.appendPageBreak();
    appendInstitutionalHeader_(body, snapshot, logoBlob, ministryLogoBlob);
    appendBannerBox_(body, 'RÚBRICA PARA LA FICHA DE OBSERVACIÓN DE CLASE', '(CONTINUACIÓN)');
    appendSpacer_(body, 2);
    var rubTableContinuation = body.appendTable();
    rubTableContinuation.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    buildAnnex3RubricTable_(rubTableContinuation, snapshot, [8, 9, 10, 11, 12, 13, 14, 15]);
  }

  function buildAnnex5Section_(body, snapshot, logoBlob, ministryLogoBlob) {
    appendInstitutionalHeader_(body, snapshot, logoBlob, ministryLogoBlob);

    appendBannerBox_(body, 'REGISTRO PARA LA REFLEXIÓN PEDAGÓGICA');

    var objTable = body.appendTable([
      ['OBJETIVO: Analizar en forma conjunta, docente y equipo de observadores, la información recolectada a través de la ficha de observación de clase y de la actividad de reflexión del docente, para el mejoramiento de la práctica pedagógica en aula.'],
      ['INSTRUMENTOS DE FUNDAMENTACIÓN:\n1. Ficha de observación de clase.      2. Rúbrica para la ficha de observación de clase.      3. Guion de reflexión.']
    ]);
    objTable.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    for (var ro = 0; ro < objTable.getNumRows(); ro++) {
      var cObj = objTable.getRow(ro).getCell(0);
      formatCell_(cObj, 7.5, ro === 1, '#000000', DocumentApp.HorizontalAlignment.LEFT, 2.5, 2.5, 4, 4);
      cObj.setWidth(540);
    }

    appendSectionHeader_(body, 'ANÁLISIS DEL DESARROLLO DEL PROCESO PEDAGÓGICO', DocColors.GRAY_HEADER);

    var pDesc = body.appendParagraph('En el espacio en blanco que se encuentra a continuación redacte brevemente las fortalezas y los aspectos a mejorar evidenciados durante la observación de la clase, que considere relevantes.');
    pDesc.setFontFamily('Arial').setFontSize(7).setItalic(true);
    if (pDesc.setSpacingBefore) pDesc.setSpacingBefore(1);
    if (pDesc.setSpacingAfter) pDesc.setSpacingAfter(2);

    var tableAnalysis = body.appendTable([
      ['FORTALEZAS', 'ASPECTOS A MEJORAR'],
      [(snapshot.strengths || 'Ninguna registrada.'), (snapshot.improvements || 'Ninguno registrado.')]
    ]);
    tableAnalysis.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    tableAnalysis.getRow(0).getCell(0).setBackgroundColor(DocColors.PURPLE_LIGHT);
    tableAnalysis.getRow(0).getCell(1).setBackgroundColor(DocColors.PURPLE_LIGHT);
    if (tableAnalysis.getRow(1).setMinimumHeight) {
      try { tableAnalysis.getRow(1).setMinimumHeight(48); } catch (e) {}
    }
    for (var r1 = 0; r1 < tableAnalysis.getNumRows(); r1++) {
      var row1 = tableAnalysis.getRow(r1);
      for (var c1 = 0; c1 < row1.getNumCells(); c1++) {
        var cell1 = row1.getCell(c1);
        if (r1 === 0) {
          formatCell_(cell1, 7.5, true, '#000000', DocumentApp.HorizontalAlignment.CENTER, 2.5, 2.5, 4, 4);
        } else {
          formatCell_(cell1, 7.5, false, '#000000', DocumentApp.HorizontalAlignment.LEFT, 3, 3, 4, 4);
        }
        cell1.setWidth(270);
      }
    }

    appendSectionHeader_(body, 'COMPROMISOS DEL DOCENTE Y DE LOS DIRECTIVOS DE LA INSTITUCIÓN EDUCATIVA', DocColors.GRAY_HEADER);

    var tableCompromisos = body.appendTable([
      ['DIRECTIVO', 'DOCENTE'],
      [(snapshot.directiveCommitments || 'Sin compromisos registrados.'), (snapshot.teacherCommitments || 'Sin compromisos registrados.')]
    ]);
    tableCompromisos.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    tableCompromisos.getRow(0).getCell(0).setBackgroundColor(DocColors.PURPLE_LIGHT);
    tableCompromisos.getRow(0).getCell(1).setBackgroundColor(DocColors.PURPLE_LIGHT);
    if (tableCompromisos.getRow(1).setMinimumHeight) {
      try { tableCompromisos.getRow(1).setMinimumHeight(45); } catch (e) {}
    }
    for (var r2 = 0; r2 < tableCompromisos.getNumRows(); r2++) {
      var row2 = tableCompromisos.getRow(r2);
      for (var c2 = 0; c2 < row2.getNumCells(); c2++) {
        var cell2 = row2.getCell(c2);
        if (r2 === 0) {
          formatCell_(cell2, 7.5, true, '#000000', DocumentApp.HorizontalAlignment.CENTER, 2.5, 2.5, 4, 4);
        } else {
          formatCell_(cell2, 7.5, false, '#000000', DocumentApp.HorizontalAlignment.LEFT, 3, 3, 4, 4);
        }
        cell2.setWidth(270);
      }
    }

    appendSectionHeader_(body, 'OBSERVACIONES', DocColors.GRAY_HEADER);

    var tableObs = body.appendTable([
      [(snapshot.finalObservations || 'Ninguna')]
    ]);
    tableObs.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    if (tableObs.getRow(0).setMinimumHeight) {
      try { tableObs.getRow(0).setMinimumHeight(28); } catch (e) {}
    }
    var cellObs = tableObs.getCell(0, 0);
    formatCell_(cellObs, 7.5, false, '#000000', DocumentApp.HorizontalAlignment.LEFT, 3, 3, 4, 4);
    cellObs.setWidth(540);

    appendSpacer_(body, 2);
    var sigTable = body.appendTable();
    sigTable.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
    buildSignaturesTable_(sigTable, snapshot);
  }

  function buildFullPackage_(body, snapshot, logoBlob, ministryLogoBlob) {
    buildAnnex1Section_(body, snapshot, logoBlob, ministryLogoBlob);
    body.appendPageBreak();
    buildAnnex2Section_(body, snapshot, logoBlob, ministryLogoBlob);
    body.appendPageBreak();
    buildAnnex3Section_(body, snapshot, logoBlob, ministryLogoBlob);
    body.appendPageBreak();
    buildAnnex5Section_(body, snapshot, logoBlob, ministryLogoBlob);
  }

  function buildDocument_(body, snapshot, type, logoBlob, ministryLogoBlob) {
    if (type === 'ANNEX_1') {
      buildAnnex1Section_(body, snapshot, logoBlob, ministryLogoBlob);
    } else if (type === 'ANNEX_2') {
      buildAnnex2Section_(body, snapshot, logoBlob, ministryLogoBlob);
    } else if (type === 'ANNEX_3') {
      buildAnnex3Section_(body, snapshot, logoBlob, ministryLogoBlob);
    } else if (type === 'ANNEX_5') {
      buildAnnex5Section_(body, snapshot, logoBlob, ministryLogoBlob);
    } else if (type === 'FULL_PACKAGE') {
      buildFullPackage_(body, snapshot, logoBlob, ministryLogoBlob);
    }
  }

  function setupDocumentFooter_(doc, snapshot, type) {
    if (!doc) return;
    try {
      var footer = (doc.getFooter && doc.getFooter()) || (doc.addFooter && doc.addFooter());
      if (footer) {
        if (footer.clear) footer.clear();
        var pSystem = footer.appendParagraph('SISTEMA DE GESTIÓN Y SEGUIMIENTO A LA PRÁCTICA PEDAGÓGICA');
        if (pSystem.setFontFamily) pSystem.setFontFamily('Arial');
        if (pSystem.setFontSize) pSystem.setFontSize(7.2);
        if (pSystem.setBold) pSystem.setBold(true);
        if (pSystem.setForegroundColor) pSystem.setForegroundColor('#166534');
        if (pSystem.setSpacingAfter) pSystem.setSpacingAfter(1);
        if (pSystem.setAlignment && typeof DocumentApp !== 'undefined' && DocumentApp.HorizontalAlignment) {
          pSystem.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        }
      }
    } catch (e) {
      console.warn('No se pudo configurar el pie de página: ' + e.message);
    }
  }

  function render(templateId, outputName, snapshot, type, tempFolderId, outputFolderId) {
    if (!templateId) throw AppErrors.document('No se configuró la plantilla para ' + type + '.');
    var copy = DriveApp.getFileById(templateId).makeCopy(outputName + '-TEMP', DriveApp.getFolderById(tempFolderId));
    var doc = DocumentApp.openById(copy.getId());
    var body = doc.getBody();

    body.clear();
    try {
      body.setMarginTop(36);
      body.setMarginBottom(36);
      body.setMarginLeft(36);
      body.setMarginRight(36);
    } catch (e) {}

    var logoId = resolveInstitutionLogoId_(snapshot);
    var logoBlob = getLogoBlob_(logoId);
    if (logoId && !logoBlob) {
      throw AppErrors.document('El logo institucional está configurado, pero no se pudo leer como imagen PNG o JPG. Vuelva a cargarlo desde Administración.');
    }
    var ministryLogoId = resolveMinistryLogoId_(snapshot);
    var ministryLogoBlob = getLogoBlob_(ministryLogoId);
    if (ministryLogoId && !ministryLogoBlob) {
      throw AppErrors.document('El logo ministerial estÃ¡ configurado, pero no se pudo leer como imagen PNG o JPG. Vuelva a cargarlo desde AdministraciÃ³n.');
    }

    buildDocument_(body, snapshot, type, logoBlob, ministryLogoBlob);

    if (body.getNumChildren() > 1 && body.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH) {
      var firstP = body.getChild(0).asParagraph();
      if (firstP.getText() === '') {
        firstP.removeFromParent();
      }
    }

    setupDocumentFooter_(doc, snapshot, type);

    doc.saveAndClose();
    var blob = copy.getAs(MimeType.PDF).setName(outputName);
    var file = DriveApp.getFolderById(outputFolderId).createFile(blob);
    try {
      if (file && file.setSharing) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      try {
        if (file && file.setSharing) file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e2) {}
    }
    copy.setTrashed(true);
    return file;
  }

  return {
    render: render,
    replacements: replacements,
    parseDriveFileId: parseDriveFileId_,
    getLogoBlob: getLogoBlob_,
    clearLogoCache: clearLogoCache_,
    resolveInstitutionLogoId: resolveInstitutionLogoId_,
    resolveMinistryLogoId: resolveMinistryLogoId_,
    appendInstitutionalHeader: appendInstitutionalHeader_,
    setupDocumentFooter: setupDocumentFooter_
  };
})();
