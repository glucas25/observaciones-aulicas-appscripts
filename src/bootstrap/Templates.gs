var DocColors = {
  PURPLE_DARK: '#A02B93',
  PURPLE_MID: '#D86DCB',
  PURPLE_LIGHT: '#F2CEED',
  GRAY_HEADER: '#DDD9C3',
  GRAY_LIGHT: '#F3F4F6',
  BORDER: '#777777'
};

function createStarterTemplates(forceOverwrite) {
  var actor = Auth.requireRoles(['ADMIN']), props = PropertiesService.getScriptProperties(), config = AppConfig.get();
  var root = config.templatesFolderId ? DriveApp.getFolderById(config.templatesFolderId) : DriveApp.createFolder('Visitas Aulicas - Plantillas ' + config.environment);
  if (!config.templatesFolderId) props.setProperty('TEMPLATES_FOLDER_ID', root.getId());
  var output = config.outputFolderId ? DriveApp.getFolderById(config.outputFolderId) : DriveApp.createFolder('Visitas Aulicas - PDFs ' + config.environment);
  if (!config.outputFolderId) props.setProperty('OUTPUT_FOLDER_ID', output.getId());
  var temp = config.tempFolderId ? DriveApp.getFolderById(config.tempFolderId) : DriveApp.createFolder('Visitas Aulicas - Temporales ' + config.environment);
  if (!config.tempFolderId) props.setProperty('TEMP_FOLDER_ID', temp.getId());
  var keys = {
    ANNEX_1: 'ANNEX1_TEMPLATE_ID',
    ANNEX_2: 'ANNEX2_TEMPLATE_ID',
    ANNEX_3: 'ANNEX3_TEMPLATE_ID',
    ANNEX_5: 'ANNEX5_TEMPLATE_ID',
    FULL_PACKAGE: 'FULL_PACKAGE_TEMPLATE_ID'
  };
  Object.keys(keys).forEach(function (type) {
    var existingId = props.getProperty(keys[type]);
    var doc = null;
    if (existingId && !forceOverwrite) return;
    if (existingId && forceOverwrite) {
      try {
        doc = DocumentApp.openById(existingId);
      } catch (e) {
        doc = null;
      }
    }
    if (!doc) {
      doc = DocumentApp.create('Plantilla ' + type + ' ' + config.environment);
      var file = DriveApp.getFileById(doc.getId());
      file.moveTo(root);
      props.setProperty(keys[type], doc.getId());
    }
    var body = doc.getBody();
    body.clear();
    try {
      body.setMarginTop(36);
      body.setMarginBottom(36);
      body.setMarginLeft(36);
      body.setMarginRight(36);
    } catch (e) {}
    appendTemplateSection_(body, type);
    setupDocumentFooterTemplate_(doc, type);
    doc.saveAndClose();
  });
  Audit.write(actor, 'STARTER_TEMPLATES_CREATED', 'CONFIG', '', '', 'setup', 'SUCCESS', 'Plantillas oficiales actualizadas');
  return { templatesFolderId: root.getId(), outputFolderId: output.getId(), tempFolderId: temp.getId() };
}

function appendBannerBox_(body, title, subtitle) {
  var table = body.appendTable([
    [title + (subtitle ? ' ' + subtitle : '')]
  ]);
  table.setBorderColor(DocColors.PURPLE_DARK);
  table.setBorderWidth(0.5);
  var cell = table.getCell(0, 0);
  cell.setBackgroundColor(DocColors.PURPLE_DARK);
  cell.setPaddingTop(5);
  cell.setPaddingBottom(5);
  var p = cell.getChild(0).asParagraph();
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  var t = p.editAsText();
  t.setForegroundColor('#FFFFFF');
  t.setFontFamily('Arial');
  t.setFontSize(10.5);
  t.setBold(true);
}

function appendSectionHeader_(body, title, bgColor, textColor) {
  var table = body.appendTable([[title]]);
  table.setBorderColor(DocColors.BORDER);
  table.setBorderWidth(0.5);
  var cell = table.getCell(0, 0);
  cell.setBackgroundColor(bgColor || DocColors.GRAY_HEADER);
  cell.setPaddingTop(4);
  cell.setPaddingBottom(4);
  var p = cell.getChild(0).asParagraph();
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  var t = p.editAsText();
  t.setForegroundColor(textColor || '#000000');
  t.setFontFamily('Arial');
  t.setFontSize(9);
  t.setBold(true);
}

function appendInstitutionalHeaderTemplate_(body) {
  var table = body.appendTable([
    ['{{INSTITUTION_NAME}}\nSISTEMA DE GESTIÓN Y SEGUIMIENTO A LA PRÁCTICA PEDAGÓGICA']
  ]);
  table.setBorderColor('#FFFFFF');
  table.setBorderWidth(0);
  var cell = table.getCell(0, 0);
  cell.setPaddingTop(2).setPaddingBottom(4).setPaddingLeft(0).setPaddingRight(0);
  var p = cell.getChild(0).asParagraph();
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  var t = p.editAsText();
  t.setFontFamily('Arial').setFontSize(10.5).setBold(true);
  try {
    var pDivider = body.appendParagraph('');
    if (pDivider.setSpacingAfter) pDivider.setSpacingAfter(4);
    if (pDivider.setSpacingBefore) pDivider.setSpacingBefore(0);
  } catch (e) {}
}

function setupDocumentFooterTemplate_(doc, type) {
  var footerLabels = {
    ANNEX_1: 'Anexo 1: Registro de la observación de clase',
    ANNEX_2: 'Anexo 2: Ficha de observación de clase',
    ANNEX_3: 'Anexo 3: Rúbrica para la ficha de observación de clase',
    ANNEX_5: 'Anexo 5: Registro para la reflexión pedagógica',
    FULL_PACKAGE: 'Expediente Oficial de Observación de Clase (Anexos 1, 2, 3 y 5)'
  };
  var label = footerLabels[type] || 'Sistema de Observación de Clase';
  try {
    var footer = (doc.getFooter && doc.getFooter()) || (doc.addFooter && doc.addFooter());
    if (footer) {
      if (footer.clear) footer.clear();
      var p = footer.appendParagraph(label + ' · {{VISIT_ID}}');
      if (p.setFontFamily) p.setFontFamily('Arial');
      if (p.setFontSize) p.setFontSize(7.5);
      if (p.setForegroundColor) p.setForegroundColor('#64748B');
      if (p.setAlignment && typeof DocumentApp !== 'undefined' && DocumentApp.HorizontalAlignment) {
        p.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
      }
    }
  } catch (e) {}
}

function appendAnnex1_(body) {
  appendInstitutionalHeaderTemplate_(body);

  appendBannerBox_(body, 'REGISTRO DE LA OBSERVACIÓN DE CLASE');

  var infoTable = body.appendTable([
    ['Institución educativa: {{INSTITUTION_NAME}}', 'Fecha: {{VISIT_DATE}}'],
    ['Docente: {{TEACHER_NAME}}', 'Grado o curso: {{COURSE}}']
  ]);
  infoTable.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
  for (var r = 0; r < infoTable.getNumRows(); r++) {
    var row = infoTable.getRow(r);
    for (var c = 0; c < row.getNumCells(); c++) {
      var cell = row.getCell(c);
      cell.setPaddingTop(4).setPaddingBottom(4).setPaddingLeft(5).setPaddingRight(5);
      var p = cell.getChild(0).asParagraph();
      p.setFontFamily('Arial').setFontSize(8.5);
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
    cObj.setPaddingTop(4).setPaddingBottom(4).setPaddingLeft(5).setPaddingRight(5);
    var pObj = cObj.getChild(0).asParagraph();
    pObj.setFontFamily('Arial').setFontSize(8).setItalic(true);
    cObj.setWidth(540);
  }

  appendSectionHeader_(body, 'REGISTRO NARRATIVO DESCRIPTIVO', DocColors.GRAY_HEADER);

  var textTable = body.appendTable([
    ['{{OBSERVATION_RECORD}}']
  ]);
  textTable.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
  if (textTable.getRow(0).setMinimumHeight) {
    try { textTable.getRow(0).setMinimumHeight(240); } catch (e) {}
  }
  var cNarr = textTable.getCell(0, 0);
  cNarr.setPaddingTop(6).setPaddingBottom(6).setPaddingLeft(6).setPaddingRight(6);
  cNarr.getChild(0).asParagraph().setFontFamily('Arial').setFontSize(8.5);
  cNarr.setWidth(540);

  body.appendParagraph('');
  body.appendParagraph('{{SIGNATURES_BLOCK}}');
}

function appendAnnex2_(body) {
  appendInstitutionalHeaderTemplate_(body);

  appendBannerBox_(body, 'FICHA DE OBSERVACIÓN DE CLASE', 'No. {{FORM_NUMBER}}');

  appendSectionHeader_(body, 'DATOS INFORMATIVOS', DocColors.GRAY_HEADER);

  // Fila 1: Datos de la Institución (7 columnas)
  var tableInst = body.appendTable([
    [
      'NOMBRE DE LA INSTITUCIÓN:\n{{INSTITUTION_NAME}}',
      'CANTÓN:\n{{LOCATION}}',
      'ZONA:\n{{ZONE}}',
      'DISTRITO:\n{{DISTRICT}}',
      'CIRCUITO:\n{{CIRCUIT}}',
      'DIRECCIÓN INSTITUCIÓN:\n{{ADDRESS}}',
      'JORNADA:\n{{SHIFT}}'
    ]
  ]);
  tableInst.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
  var colWidthsInst = [140, 80, 45, 55, 50, 105, 65];
  for (var c1 = 0; c1 < 7; c1++) {
    var cell1 = tableInst.getRow(0).getCell(c1);
    cell1.setPaddingTop(3).setPaddingBottom(3).setPaddingLeft(3).setPaddingRight(3);
    cell1.getChild(0).asParagraph().setFontFamily('Arial').setFontSize(7.5);
    cell1.setWidth(colWidthsInst[c1]);
  }

  // Fila 2: Docente, Contenido, Área, Asignatura y Fecha (5 columnas)
  var tableDoc = body.appendTable([
    [
      'NOMBRE DEL DOCENTE:\n{{TEACHER_NAME}}',
      'CONTENIDO:\n{{CONTENT_TOPIC}}',
      'ÁREA:\n{{AREA}}',
      'ASIGNATURA:\n{{SUBJECT}}',
      'FECHA:\n{{VISIT_DATE}}'
    ]
  ]);
  tableDoc.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
  var colWidthsDoc = [150, 125, 90, 95, 80];
  for (var c2 = 0; c2 < 5; c2++) {
    var cell2 = tableDoc.getRow(0).getCell(c2);
    cell2.setPaddingTop(3).setPaddingBottom(3).setPaddingLeft(3).setPaddingRight(3);
    cell2.getChild(0).asParagraph().setFontFamily('Arial').setFontSize(7.5);
    cell2.setWidth(colWidthsDoc[c2]);
  }

  // Fila 3: Grado, Paralelo, Subnivel y No. de Estudiantes (4 columnas)
  var tableGrade = body.appendTable([
    [
      'GRADO O CURSO:\n{{COURSE}}',
      'PARALELO:\n{{PARALLEL}}',
      'SUBNIVEL:\n{{SUBLEVEL}}',
      'No. DE ESTUDIANTES:\n{{STUDENT_COUNT}}'
    ]
  ]);
  tableGrade.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
  var colWidthsGrade = [150, 70, 160, 160];
  for (var c3 = 0; c3 < 4; c3++) {
    var cell3 = tableGrade.getRow(0).getCell(c3);
    cell3.setPaddingTop(3).setPaddingBottom(3).setPaddingLeft(3).setPaddingRight(3);
    cell3.getChild(0).asParagraph().setFontFamily('Arial').setFontSize(7.5);
    cell3.setWidth(colWidthsGrade[c3]);
  }

  var objTable = body.appendTable([
    ['OBJETIVO DE LA FICHA: Recolectar información de los procesos enseñanza y aprendizaje durante el período de clase.'],
    ['INSTRUCCIONES: Marque una x en el casillero que corresponda a su conformidad con alguno de los criterios enunciados.']
  ]);
  objTable.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
  for (var ro = 0; ro < objTable.getNumRows(); ro++) {
    var cObj = objTable.getRow(ro).getCell(0);
    cObj.setPaddingTop(3).setPaddingBottom(3).setPaddingLeft(4).setPaddingRight(4);
    var pObjCell = cObj.getChild(0).asParagraph();
    pObjCell.setFontFamily('Arial').setFontSize(7.5);
    if (ro === 0) pObjCell.setBold(true);
    if (ro === 1) pObjCell.setItalic(true);
    cObj.setWidth(540);
  }

  body.appendParagraph('');
  body.appendParagraph('{{GENERAL_CRITERIA_TABLE}}');

  body.appendParagraph('');
  appendSectionHeader_(body, 'PROCESOS DE ENSEÑANZA Y APRENDIZAJE', DocColors.GRAY_HEADER);

  var pInst2 = body.appendParagraph('INSTRUCCIONES: Marque una x en el casillero que corresponda a su conformidad con alguno de los criterios enunciados.');
  pInst2.setFontFamily('Arial').setFontSize(7.5).setItalic(true);

  body.appendParagraph('{{RUBRIC_SELECTIONS_TABLE}}');

  body.appendParagraph('');
  body.appendParagraph('{{SIGNATURES_BLOCK}}');
}

function appendAnnex3_(body) {
  appendInstitutionalHeaderTemplate_(body);

  appendBannerBox_(body, 'RÚBRICA PARA LA FICHA DE OBSERVACIÓN DE CLASE');

  var objTable = body.appendTable([
    ['OBJETIVO: Describir el grado de desempeño del docente en el aula, durante su práctica pedagógica.'],
    ['INSTRUCCIONES: Marque con una X la columna que corresponda al valor seleccionado para el criterio respectivo.']
  ]);
  objTable.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
  for (var ro = 0; ro < objTable.getNumRows(); ro++) {
    var cObj = objTable.getRow(ro).getCell(0);
    cObj.setPaddingTop(3).setPaddingBottom(3).setPaddingLeft(4).setPaddingRight(4);
    var pObjCell = cObj.getChild(0).asParagraph();
    pObjCell.setFontFamily('Arial').setFontSize(7.5);
    if (ro === 0) pObjCell.setBold(true);
    if (ro === 1) pObjCell.setItalic(true);
    cObj.setWidth(540);
  }

  body.appendParagraph('');
  body.appendParagraph('{{RUBRIC_SELECTIONS_TABLE}}');

  body.appendParagraph('');
  body.appendParagraph('{{SIGNATURES_BLOCK}}');
}

function appendAnnex5_(body) {
  appendInstitutionalHeaderTemplate_(body);

  appendBannerBox_(body, 'REGISTRO PARA LA REFLEXIÓN PEDAGÓGICA');

  var objTable = body.appendTable([
    ['OBJETIVO: Analizar en forma conjunta, docente y equipo de observadores, la información recolectada a través de la ficha de observación de clase y de la actividad de reflexión del docente, para el mejoramiento de la práctica pedagógica en aula.'],
    ['INSTRUMENTOS DE FUNDAMENTACIÓN:\n1. Ficha de observación de clase.      2. Rúbrica para la ficha de observación de clase.      3. Guion de reflexión.']
  ]);
  objTable.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
  for (var ro = 0; ro < objTable.getNumRows(); ro++) {
    var cObj = objTable.getRow(ro).getCell(0);
    cObj.setPaddingTop(4).setPaddingBottom(4).setPaddingLeft(5).setPaddingRight(5);
    var pObjCell = cObj.getChild(0).asParagraph();
    pObjCell.setFontFamily('Arial').setFontSize(8);
    if (ro === 1) pObjCell.setBold(true);
    cObj.setWidth(540);
  }

  appendSectionHeader_(body, 'ANÁLISIS DEL DESARROLLO DEL PROCESO PEDAGÓGICO', DocColors.GRAY_HEADER);

  var pDesc = body.appendParagraph('En el espacio en blanco que se encuentra a continuación redacte brevemente las fortalezas y los aspectos a mejorar evidenciados durante la observación de la clase, que considere relevantes.');
  pDesc.setFontFamily('Arial').setFontSize(7.5).setItalic(true);

  var tableAnalysis = body.appendTable([
    ['FORTALEZAS', 'ASPECTOS A MEJORAR'],
    ['{{STRENGTHS}}', '{{IMPROVEMENTS}}']
  ]);
  tableAnalysis.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
  tableAnalysis.getRow(0).getCell(0).setBackgroundColor(DocColors.PURPLE_LIGHT);
  tableAnalysis.getRow(0).getCell(1).setBackgroundColor(DocColors.PURPLE_LIGHT);
  if (tableAnalysis.getRow(1).setMinimumHeight) {
    try { tableAnalysis.getRow(1).setMinimumHeight(130); } catch (e) {}
  }
  for (var r = 0; r < tableAnalysis.getNumRows(); r++) {
    var row = tableAnalysis.getRow(r);
    for (var c = 0; c < row.getNumCells(); c++) {
      var cell = row.getCell(c);
      cell.setPaddingTop(4).setPaddingBottom(4).setPaddingLeft(5).setPaddingRight(5);
      var p = cell.getChild(0).asParagraph();
      p.setFontFamily('Arial').setFontSize(8);
      if (r === 0) { p.setAlignment(DocumentApp.HorizontalAlignment.CENTER); p.setBold(true); }
      cell.setWidth(270);
    }
  }

  appendSectionHeader_(body, 'COMPROMISOS DEL DOCENTE Y DE LOS DIRECTIVOS DE LA INSTITUCIÓN EDUCATIVA', DocColors.GRAY_HEADER);

  var tableCompromisos = body.appendTable([
    ['DIRECTIVO', 'DOCENTE'],
    ['{{DIRECTIVE_COMMITMENTS}}', '{{TEACHER_COMMITMENTS}}']
  ]);
  tableCompromisos.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
  tableCompromisos.getRow(0).getCell(0).setBackgroundColor(DocColors.PURPLE_LIGHT);
  tableCompromisos.getRow(0).getCell(1).setBackgroundColor(DocColors.PURPLE_LIGHT);
  if (tableCompromisos.getRow(1).setMinimumHeight) {
    try { tableCompromisos.getRow(1).setMinimumHeight(100); } catch (e) {}
  }
  for (var r = 0; r < tableCompromisos.getNumRows(); r++) {
    var row = tableCompromisos.getRow(r);
    for (var c = 0; c < row.getNumCells(); c++) {
      var cell = row.getCell(c);
      cell.setPaddingTop(4).setPaddingBottom(4).setPaddingLeft(5).setPaddingRight(5);
      var p = cell.getChild(0).asParagraph();
      p.setFontFamily('Arial').setFontSize(8);
      if (r === 0) { p.setAlignment(DocumentApp.HorizontalAlignment.CENTER); p.setBold(true); }
      cell.setWidth(270);
    }
  }

  appendSectionHeader_(body, 'OBSERVACIONES', DocColors.GRAY_HEADER);

  var tableObs = body.appendTable([
    ['{{FINAL_OBSERVATIONS}}']
  ]);
  tableObs.setBorderColor(DocColors.BORDER).setBorderWidth(0.5);
  if (tableObs.getRow(0).setMinimumHeight) {
    try { tableObs.getRow(0).setMinimumHeight(70); } catch (e) {}
  }
  var cellObs = tableObs.getCell(0, 0);
  cellObs.setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(5).setPaddingRight(5);
  cellObs.getChild(0).asParagraph().setFontFamily('Arial').setFontSize(8);
  cellObs.setWidth(540);

  body.appendParagraph('');
  body.appendParagraph('{{SIGNATURES_BLOCK}}');
}

function appendTemplateSection_(body, type) {
  if (type === 'ANNEX_1') {
    appendAnnex1_(body);
  } else if (type === 'ANNEX_2') {
    appendAnnex2_(body);
  } else if (type === 'ANNEX_3') {
    appendAnnex3_(body);
  } else if (type === 'ANNEX_5') {
    appendAnnex5_(body);
  } else if (type === 'FULL_PACKAGE') {
    appendAnnex1_(body);
    body.appendPageBreak();
    appendAnnex2_(body);
    body.appendPageBreak();
    appendAnnex3_(body);
    body.appendPageBreak();
    appendAnnex5_(body);
  }
}
