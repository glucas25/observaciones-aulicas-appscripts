'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('la ficha reserva ancho y margen para no dividir el criterio 15', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../src/gateways/DocsGateway.gs'),
    'utf8'
  );

  assert.match(source, /hRow\.getCell\(0\)\.setWidth\(220\)/);
  assert.match(source, /hRow\.getCell\(5\)\.setWidth\(120\)/);
  assert.match(source, /row\.getCell\(0\)\.setWidth\(220\)/);
  assert.match(source, /row\.setMinimumHeight\(14\)/);
});
