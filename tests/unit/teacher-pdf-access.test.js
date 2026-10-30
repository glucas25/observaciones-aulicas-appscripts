'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.resolve(__dirname, '../../src/ui/App.html'), 'utf8');

test('el docente observado tiene acceso directo al PDF desde su listado de evaluaciones recibidas', () => {
  // Verifica el botón rápido de PDF en la tabla
  assert.match(app, /class="btn-quick-pdf"/);
  assert.match(app, /📄 Ver PDF/);
  assert.match(app, /viewOrDownloadVisitPdf/);

  // Verifica que para visitas finalizadas el botón de la ficha abra directamente en el paso 6 (documentación)
  assert.match(app, /data-step="5"/);
});

test('renderEditor muestra banner destacado de expediente oficial PDF para visitas finalizadas', () => {
  assert.match(app, /Expediente Oficial PDF Disponible/);
  assert.match(app, /btn-banner-view-pdf/);
  assert.match(app, /btn-banner-download-pdf/);
  assert.match(app, /Expediente PDF 📄/);
});

test('reviewHtml muestra estado de finalización y no estado en revisión cuando la visita está finalizada', () => {
  assert.match(app, /Evaluación finalizada y expediente oficial emitido/);
  assert.match(app, /El archivo PDF aún no ha sido renderizado en Drive/);
});
