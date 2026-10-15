'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.resolve(__dirname, '../../src/ui/App.html'), 'utf8');

test('la descarga y visualizacion del PDF usan Drive directamente y evitan Base64', () => {
  assert.match(app, /#btn-download-pdf, #btn-view-pdf/);
  assert.match(app, /drive\.google\.com\/uc\?export=download&id=/);
  assert.match(app, /Visualizaci[oó]n abierta directamente en Google Drive/);
  assert.match(app, /event\.stopImmediatePropagation\(\)/);
  assert.match(app, /Descarga directa iniciada desde Google Drive/);
});
