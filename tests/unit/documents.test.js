'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../../src/gateways/DocsGateway.gs'),'utf8'),context);
test('proyecta una selección idéntica para anexos 2 y 3',()=>{const snapshot={visitCode:'VIS-2026-000001',institutionNameSnapshot:'Colegio',visitDate:'2026-01-01',teacherNameSnapshot:'Docente',generalResponses:[],evidenceChecks:[],rubricResponses:[{criterionCode:'CRI-01',criterionTitle:'Motivación',level:'ACHIEVED',descriptorSnapshot:'Descriptor oficial'}]};const a=context.DocsGateway.replacements(snapshot,'ANNEX_2');const b=context.DocsGateway.replacements(snapshot,'ANNEX_3');assert.equal(a.RUBRIC_SELECTIONS_TABLE,b.RUBRIC_SELECTIONS_TABLE);assert.match(a.RUBRIC_SELECTIONS_TABLE,/Descriptor oficial/);});
test('el expediente excluye Anexo 4',()=>{const title=context.DocsGateway.replacements({generalResponses:[],rubricResponses:[],evidenceChecks:[]},'FULL_PACKAGE').DOCUMENT_TITLE;assert.doesNotMatch(title,/ANEXO 4/);});

test('DocumentService reutiliza documento existente de Drive cuando force es false',()=>{
  const docContext={
    AppErrors:{validation:msg=>new Error(msg),document:msg=>new Error(msg)},
    Auth:{current:()=>({user_id:'user-1'}),assertVisit:()=>true},
    VisitService:{raw:()=>({visit_id:'v-1',data_version:1,status:'FINALIZED',row_version:1})},
    VisitState:{values:{FINALIZED:'FINALIZED',DOCUMENTS:'DOCUMENTS_GENERATED'}},
    AppConfig:{validate:()=>({templateVersion:'tpl-1',templateIds:{FULL_PACKAGE:'t-1'}})},
    SheetsRepository:{
      filter:(table,pred)=>{
        if(table==='VISIT_SNAPSHOTS')return [{visit_id:'v-1',data_version:1,snapshot_hash:'hash-1',snapshot_json:'{}'}];
        if(table==='DOCUMENTS')return [{
          document_id:'doc-1',
          visit_id:'v-1',
          data_version:1,
          document_type:'FULL_PACKAGE',
          template_version:'tpl-1',
          snapshot_hash:'hash-1',
          status:'READY',
          drive_file_id:'file-drive-123',
          superseded_at:''
        }].filter(pred);
        return [];
      },
      upsert:()=>{}
    },
    DriveApp:{
      getFileById:(id)=>({getUrl:()=>`https://drive.google.com/file/d/${id}/view`})
    },
    Utilities:{getUuid:()=>'uuid-test'},
    JsonUtil:{now:()=>'2026-10-07T00:00:00Z'},
    Audit:{write:()=>{}},
    DocsGateway:{render:()=>{throw new Error('No debe llamar a render si existe en Drive');}},
    MimeType:{PDF:'application/pdf'}
  };
  vm.createContext(docContext);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../../src/application/DocumentService.gs'),'utf8'),docContext);
  const result=docContext.DocumentService.generate('v-1','FULL_PACKAGE',{force:false});
  assert.equal(result.reused,true);
  assert.equal(result.drive_file_id,'file-drive-123');
  assert.equal(result.url,'https://drive.google.com/file/d/file-drive-123/view');
});

test('DocumentService.getBlob retorna base64 y asegura permisos de visualización',()=>{
  let sharedAccess = null;
  let sharedPerm = null;
  const docContext = {
    AppErrors: { validation: msg => new Error(msg), document: msg => new Error(msg) },
    Auth: { current: () => ({ user_id: 'user-1' }), assertVisit: () => true },
    VisitService: { raw: () => ({ visit_id: 'v-1' }) },
    SheetsRepository: {
      filter: (table, pred) => {
        if (table === 'DOCUMENTS') {
          return [{
            document_id: 'doc-1',
            visit_id: 'v-1',
            document_type: 'FULL_PACKAGE',
            status: 'READY',
            drive_file_id: 'drive-file-999',
            file_name: 'VIS_001_FULL.pdf',
            superseded_at: ''
          }].filter(pred);
        }
        return [];
      }
    },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' },
      Permission: { VIEW: 'VIEW' },
      getFileById: (id) => ({
        getName: () => 'VIS_001_FULL.pdf',
        setSharing: (acc, perm) => { sharedAccess = acc; sharedPerm = perm; },
        getBlob: () => ({
          getBytes: () => Buffer.from('%PDF-1.4 mock content')
        })
      })
    },
    Utilities: {
      base64Encode: (bytes) => Buffer.from(bytes).toString('base64')
    }
  };
  vm.createContext(docContext);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../../src/application/DocumentService.gs'), 'utf8'), docContext);
  const blobData = docContext.DocumentService.getBlob('v-1', 'FULL_PACKAGE');
  assert.equal(blobData.fileName, 'VIS_001_FULL.pdf');
  assert.equal(blobData.mimeType, 'application/pdf');
  assert.equal(Buffer.from(blobData.base64, 'base64').toString('utf8'), '%PDF-1.4 mock content');
  assert.equal(sharedAccess, 'ANYONE_WITH_LINK');
  assert.equal(sharedPerm, 'VIEW');
});

test('DocsGateway.parseDriveFileId extrae el ID de diversos formatos de enlace de Drive',()=>{
  const parse=context.DocsGateway.parseDriveFileId;
  assert.equal(parse('https://drive.google.com/file/d/1AbC_123-XYZ9876543210/view?usp=sharing'),'1AbC_123-XYZ9876543210');
  assert.equal(parse('https://drive.google.com/file/d/1AbC_123-XYZ9876543210/view'),'1AbC_123-XYZ9876543210');
  assert.equal(parse('https://drive.google.com/open?id=1AbC_123-XYZ9876543210'),'1AbC_123-XYZ9876543210');
  assert.equal(parse('https://drive.google.com/uc?export=download&id=1AbC_123-XYZ9876543210'),'1AbC_123-XYZ9876543210');
  assert.equal(parse('1AbC_123-XYZ9876543210'),'1AbC_123-XYZ9876543210');
  assert.equal(parse('   https://drive.google.com/file/d/FILE_ID_12345/edit   '),'FILE_ID_12345');
  assert.equal(parse(''),'');
  assert.equal(parse(null),'');
});

test('DocsGateway.getLogoBlob utiliza caché en memoria y CacheService para evitar múltiples llamadas a Drive',()=>{
  let driveFetchCount = 0;
  const mockCacheStore = {};
  const logoContext = {
    console: { warn: () => {} },
    Utilities: {
      base64Encode: (bytes) => Buffer.from(bytes).toString('base64'),
      base64Decode: (str) => Buffer.from(str, 'base64'),
      newBlob: (bytes, mime, name) => ({
        getBytes: () => bytes,
        getContentType: () => mime,
        getName: () => name,
        isBlob: true
      })
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => mockCacheStore[k] || null,
        put: (k, v) => { mockCacheStore[k] = v; },
        remove: (k) => { delete mockCacheStore[k]; }
      })
    },
    DriveApp: {
      getFileById: (id) => {
        driveFetchCount++;
        return {
          getBlob: () => ({
            getBytes: () => Buffer.from('fake-image-bytes'),
            getContentType: () => 'image/png',
            getName: () => 'logo.png',
            isBlob: true
          })
        };
      }
    }
  };

  vm.createContext(logoContext);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../../src/gateways/DocsGateway.gs'),'utf8'), logoContext);

  // 1ra llamada: consulta DriveApp y guarda en memoria + CacheService
  const blob1 = logoContext.DocsGateway.getLogoBlob('file-logo-1');
  assert.equal(driveFetchCount, 1);
  assert.ok(blob1 && blob1.isBlob);
  assert.ok(mockCacheStore['LOGO_file-logo-1']);

  // 2da llamada: responde desde memoria de ejecución (DriveApp no incrementa)
  const blob2 = logoContext.DocsGateway.getLogoBlob('file-logo-1');
  assert.equal(driveFetchCount, 1);
  assert.equal(blob1, blob2);

  // Limpiar memoria: debe responder desde CacheService sin consultar DriveApp
  logoContext.DocsGateway.clearLogoCache();
  const blob3 = logoContext.DocsGateway.getLogoBlob('file-logo-1');
  assert.equal(driveFetchCount, 1); // ¡Aún 1! Lo tomó de CacheService
  assert.ok(blob3 && blob3.isBlob);

  // Invalidación total
  logoContext.DocsGateway.clearLogoCache('file-logo-1');
  assert.equal(mockCacheStore['LOGO_file-logo-1'], undefined);
  const blob4 = logoContext.DocsGateway.getLogoBlob('file-logo-1');
  assert.equal(driveFetchCount, 2); // Ahora sí volvió a DriveApp
  assert.ok(blob4 && blob4.isBlob);
});

test('DocsGateway.appendInstitutionalHeader renderiza tabla con logo y texto institucional',()=>{
  function createMockBody() {
    let createdTable = null;
    return {
      appendTable: () => {
        const rows = [];
        const table = {
          setBorderColor: () => table,
          setBorderWidth: () => table,
          appendTableRow: () => {
            const cells = [];
            const row = {
              appendTableCell: () => {
                const paragraphMock = {
                  setText: (t) => { textContent.push(t); return paragraphMock; },
                  setFontFamily: () => paragraphMock,
                  setFontSize: () => paragraphMock,
                  setBold: () => paragraphMock,
                  setForegroundColor: () => paragraphMock,
                  setAlignment: () => paragraphMock
                };
                const children = [{
                  getType: () => 1, // PARAGRAPH
                  asParagraph: () => paragraphMock,
                  asText: () => ({ getText: () => '' })
                }];
                let cellWidth = 0;
                const cell = {
                  setPaddingTop: () => cell,
                  setPaddingBottom: () => cell,
                  setPaddingLeft: () => cell,
                  setPaddingRight: () => cell,
                  setWidth: (w) => { cellWidth = w; return cell; },
                  getWidth: () => cellWidth,
                  getNumChildren: () => children.length,
                  getChild: (i) => children[i],
                  appendImage: (blob) => ({
                    getWidth: () => 300,
                    getHeight: () => 150,
                    setWidth: () => {},
                    setHeight: () => {}
                  }),
                  appendParagraph: (txt) => {
                    textContent.push(txt);
                    return paragraphMock;
                  }
                };
                cells.push(cell);
                return cell;
              },
              getCells: () => cells
            };
            rows.push(row);
            return row;
          },
          getRows: () => rows
        };
        createdTable = table;
        return table;
      },
      appendParagraph: () => ({
        setSpacingAfter: () => {},
        setSpacingBefore: () => {}
      }),
      getTable: () => createdTable
    };
  }

  const textContent = [];
  const bodyWithLogo = createMockBody();
  const snapshot = {
    institutionNameSnapshot: 'Unidad Educativa Modelo',
    district: '09D01',
    circuit: '09D01C01',
    zone: 'Zona 8'
  };

  context.DocumentApp = {
    ElementType: { PARAGRAPH: 1 },
    HorizontalAlignment: { CENTER: 1 }
  };

  // Con logo
  context.DocsGateway.appendInstitutionalHeader(bodyWithLogo, snapshot, { fakeBlob: true });
  const table = bodyWithLogo.getTable();
  const row = table.getRows()[0];
  assert.equal(row.getCells().length, 2);
  assert.equal(row.getCells()[0].getWidth(), 105);
  assert.equal(row.getCells()[1].getWidth(), 435);
  assert.ok(textContent.includes('UNIDAD EDUCATIVA MODELO'));

  // Sin logo: tabla de 1 sola columna de 540pt
  const bodyWithoutLogo = createMockBody();
  context.DocsGateway.appendInstitutionalHeader(bodyWithoutLogo, snapshot, null);
  const tableNoLogo = bodyWithoutLogo.getTable();
  const rowNoLogo = tableNoLogo.getRows()[0];
  assert.equal(rowNoLogo.getCells().length, 1);
  assert.equal(rowNoLogo.getCells()[0].getWidth(), 540);
});

test('DocsGateway.setupDocumentFooter configura el pie de página con la referencia del anexo y código',()=>{
  let footerParagraphText = '';
  const mockDoc = {
    getFooter: () => null,
    addFooter: () => ({
      clear: () => {},
      appendParagraph: (txt) => {
        footerParagraphText = txt;
        return {
          setFontFamily: () => ({ setFontSize: () => ({ setForegroundColor: () => ({ setAlignment: () => {} }) }) })
        };
      }
    })
  };

  context.DocumentApp.HorizontalAlignment.RIGHT = 2;

  // Anexo 1
  context.DocsGateway.setupDocumentFooter(mockDoc, { visitCode: 'VIS-2026-000001' }, 'ANNEX_1');
  assert.equal(footerParagraphText, 'Anexo 1: Registro de la observación de clase · VIS-2026-000001');

  // Anexo 2
  context.DocsGateway.setupDocumentFooter(mockDoc, { visitCode: 'VIS-2026-000001' }, 'ANNEX_2');
  assert.equal(footerParagraphText, 'Anexo 2: Ficha de observación de clase · VIS-2026-000001');

  // Anexo 3
  context.DocsGateway.setupDocumentFooter(mockDoc, { visitCode: 'VIS-2026-000001' }, 'ANNEX_3');
  assert.equal(footerParagraphText, 'Anexo 3: Rúbrica para la ficha de observación de clase · VIS-2026-000001');

  // Anexo 5
  context.DocsGateway.setupDocumentFooter(mockDoc, { visitCode: 'VIS-2026-000001' }, 'ANNEX_5');
  assert.equal(footerParagraphText, 'Anexo 5: Registro para la reflexión pedagógica · VIS-2026-000001');

  // Full package
  context.DocsGateway.setupDocumentFooter(mockDoc, { visitCode: 'VIS-2026-000001' }, 'FULL_PACKAGE');
  assert.equal(footerParagraphText, 'Expediente Oficial de Observación de Clase (Anexos 1, 2, 3 y 5) · VIS-2026-000001');
});


