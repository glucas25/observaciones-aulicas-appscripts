'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('PDF selections use a centered X and never render bracket placeholders', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../src/gateways/DocsGateway.gs'), 'utf8');
  assert.doesNotMatch(source, /\[ X \]|\[   \]|\[X\]|\[ \]/);
  assert.match(source, /function markSelectedCell_\(cell, selected, fontSize\)/);
  assert.match(source, /cell\.setBackgroundColor\('#F3E8FF'\)/);
  assert.match(source, /marker\.setAlignment\(DocumentApp\.HorizontalAlignment\.CENTER\)/);
});
