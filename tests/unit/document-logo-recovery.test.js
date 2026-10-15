'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('DocumentService recovers the managed logo and keeps only the current PDF', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../src/application/DocumentService.gs'), 'utf8');
  assert.match(source, /function latestManagedLogo_\(config\)/);
  assert.match(source, /getFilesByType\(MimeType\.PNG\)/);
  assert.match(source, /getFilesByType\(MimeType\.JPEG\)/);
  assert.match(source, /DriveApp\.searchFiles\("title contains 'logo' and trashed = false"\)/);
  assert.match(source, /if\(!\/logo\/i\.test\(name\)\)continue/);
  assert.match(source, /old\.superseded_at=generatedAt/);
  assert.match(source, /String\(b\.generated_at\|\|''\)\.localeCompare\(String\(a\.generated_at\|\|''\)\)/);
});
