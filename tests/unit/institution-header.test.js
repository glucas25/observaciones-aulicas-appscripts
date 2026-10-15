'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('institution header data is editable and stored in INSTITUTIONS', () => {
  const schema = fs.readFileSync(path.resolve(__dirname, '../../src/repositories/sheets/Schema.gs'), 'utf8');
  const admin = fs.readFileSync(path.resolve(__dirname, '../../src/application/AdminService.gs'), 'utf8');
  const ui = fs.readFileSync(path.resolve(__dirname, '../../src/ui/App.html'), 'utf8');
  ['phone', 'email', 'province'].forEach(field => assert.match(schema, new RegExp("'" + field + "'")));
  ['ministry_logo_drive_id', 'ministry_logo_drive_url'].forEach(field => assert.match(schema, new RegExp("'" + field + "'")));
  assert.match(admin, /dto\.address/);
  assert.match(admin, /dto\.phone/);
  assert.match(admin, /dto\.email/);
  assert.match(admin, /dto\.province/);
  ['i-address', 'i-phone', 'i-email', 'i-province'].forEach(id => assert.match(ui, new RegExp('id="' + id + '"')));
  ['i-ministry-logo', 'i-ministry-logo-file'].forEach(id => assert.match(ui, new RegExp('id="' + id + '"')));
  assert.match(ui, /logoKind:'MINISTRY'/);
});

test('PDF header uses current institution contact data without hardcoded values', () => {
  const docs = fs.readFileSync(path.resolve(__dirname, '../../src/gateways/DocsGateway.gs'), 'utf8');
  const service = fs.readFileSync(path.resolve(__dirname, '../../src/application/DocumentService.gs'), 'utf8');
  assert.match(docs, /snapshot\.institutionAddress/);
  assert.match(docs, /snapshot\.institutionPhone/);
  assert.match(docs, /snapshot\.institutionEmail/);
  assert.match(docs, /snapshot\.institutionProvince/);
  assert.match(service, /currentInstitution_\(visit\)/);
  assert.match(docs, /resolveMinistryLogoId_/);
  assert.match(docs, /appendInstitutionalHeader_\(body, snapshot, logoBlob, ministryLogoBlob\)/);
  assert.doesNotMatch(docs, /0994541033|grecia\.mendoza@educacion\.gob\.ec|Subcentro de Salud/);
});
