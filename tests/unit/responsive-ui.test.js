'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.resolve(__dirname, '../../src/ui/App.html'), 'utf8');
const styles = fs.readFileSync(path.resolve(__dirname, '../../src/ui/Styles.html'), 'utf8');

test('la rúbrica integra cada selector con su descriptor', () => {
  assert.match(app, /class="rubric-options"/);
  assert.match(app, /class="rubric-option/);
  assert.match(app, /El criterio no corresponde a la clase observada/);
  assert.match(styles, /\.rubric-option:has\(input:checked\)/);
});

test('el compromiso docente conserva el orden natural y una ayuda breve', () => {
  const start = app.indexOf('function renderAnnex5Step_');
  const end = app.indexOf('const stepHtmlBase_', start);
  const annex = app.slice(start, end);
  assert.ok(annex.indexOf("directiveCommitments") < annex.indexOf('teacher-commitment'));
  assert.ok(annex.indexOf('teacher-commitment') < annex.indexOf("finalObservations"));
  assert.match(annex, /Puede dejarse vacío para que el docente lo redacte/);
  assert.match(annex, /debe validarla con el docente antes de finalizar/);
});

test('la interfaz incluye adaptaciones para tablet y móvil', () => {
  assert.match(styles, /@media\(max-width:980px\)/);
  assert.match(styles, /@media\(max-width:720px\)/);
  assert.match(styles, /@media\(max-width:440px\)/);
  assert.match(styles, /nav\{overflow-x:auto/);
  assert.match(styles, /\.table-wrap table\{min-width:680px\}/);
  assert.match(styles, /\.rubric-options\{grid-template-columns:1fr\}/);
});
