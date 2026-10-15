'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.resolve(__dirname,'../../src/ui/App.html'),'utf8');

test('incluye el módulo de asignación de docentes a evaluadores con edición y filtrado de docentes asignados',()=>{
  assert.match(source,/Asignación de docentes a evaluadores/);
  assert.match(source,/id="as-evaluator"/);
  assert.match(source,/id="as-teacher"/);
  assert.match(source,/Api\.call\('apiSaveAssignment'/);
  assert.match(source,/toggle-assignment/);
  assert.match(source,/edit-assignment/);
  assert.match(source,/id="as-cancel-edit"/);
});

test('unifica el personal institucional y usuarios en una sola sección y maneja fecha planificada',()=>{
  assert.match(source,/Personal institucional y usuarios/);
  assert.match(source,/id="u-save"/);
  assert.match(source,/name="u-roles"/);
  assert.match(source,/class="light edit-user"/);
  assert.match(source,/id="as-planned-date"/);
  assert.doesNotMatch(source,/id="as-from"/);
  assert.doesNotMatch(source,/id="as-to"/);
  assert.doesNotMatch(source,/Log de auditor/);
});

test('incluye campo para configurar el logo institucional desde enlace de Drive',()=>{
  assert.match(source,/Logo de la institución \(enlace de Google Drive\)/);
  assert.match(source,/id="i-logo"/);
  assert.match(source,/logoDriveUrl:\s*\$\('#i-logo'\)\?\.value/);
  assert.match(source,/id="i-logo-file"/);
  assert.match(source,/apiUploadInstitutionLogo/);
  assert.match(source,/image\/png,image\/jpeg/);
});

test('organiza la administración en pestañas (asignaciones, usuarios, institución) y soporta refresco silencioso y caché en memoria',()=>{
  assert.match(source,/adminTab:'assignments'/);
  assert.match(source,/adminData:null/);
  assert.match(source,/data-adm-tab="assignments"/);
  assert.match(source,/data-adm-tab="users"/);
  assert.match(source,/data-adm-tab="institution"/);
  assert.match(source,/renderAdmin\(silent\s*=\s*false/);
  assert.match(source,/State\.adminData&&!forceFetch/);
  assert.match(source,/renderAdmin\(true/);
});

test('muestra un aviso persistente durante procesos que tardan',()=>{
  assert.match(source,/function processNotice/);
  assert.match(source,/setTimeout\(\(\)=>\{closeProcess=processNotice\(waitMessage\);\},450\)/);
  assert.match(source,/Cargando y validando el logo institucional/);
  assert.match(source,/Regenerando el expediente PDF/);
  assert.match(source,/Generando el expediente PDF/);
});

test('el encabezado del dashboard incluye contenedor de institución y estilo saas',()=>{
  const indexHtml = fs.readFileSync(path.resolve(__dirname,'../../src/ui/Index.html'),'utf8');
  const stylesHtml = fs.readFileSync(path.resolve(__dirname,'../../src/ui/Styles.html'),'utf8');
  assert.match(indexHtml, /id="header-institution"/);
  assert.match(indexHtml, /class="header-institution-badge"/);
  assert.match(stylesHtml, /header\{background:linear-gradient\(135deg,#0f172a 0%,#1e293b 100%\)/);
  assert.match(stylesHtml, /\.header-institution-badge/);
  assert.match(source, /function updateHeaderInstitution/);
  assert.match(source, /updateHeaderInstitution\(\)/);
});

test('AdminService.saveInstitution procesa enlace de Drive y almacena logo_drive_id',()=>{
  const vm=require('node:vm');
  const writes=[];
  let cacheRemovedKey = null;
  const context={
    console,
    Utilities:{getUuid:()=> 'inst-uuid-1'},
    Auth:{requireRoles:()=>({user_id:'admin-1'})},
    JsonUtil:{now:()=> '2026-10-08T00:00:00Z'},
    Validation:{
      required:(val)=>val,
      text:(val)=>val||''
    },
    Audit:{write:()=>{}},
    CacheService:{
      getScriptCache:()=>({
        remove:(k)=>{ cacheRemovedKey = k; }
      })
    },
    SheetsRepository:{
      find:()=>({institution_id:'inst-1',logo_drive_id:'old-logo-id'}),
      upsert:(table,keys,row)=>{ writes.push({table,row}); return row; }
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../../src/application/AdminService.gs'),'utf8'),context);

  const saved = context.AdminService.saveInstitution({
    institutionId: 'inst-1',
    name: 'Colegio Nacional',
    logoDriveUrl: 'https://drive.google.com/file/d/1XyZ9876543210_NEW-LOGO/view?usp=sharing'
  }, 'req-1');

  assert.equal(saved.logo_drive_id, '1XyZ9876543210_NEW-LOGO');
  assert.equal(saved.logo_drive_url, 'https://drive.google.com/file/d/1XyZ9876543210_NEW-LOGO/view?usp=sharing');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].row.logo_drive_id, '1XyZ9876543210_NEW-LOGO');
  assert.equal(cacheRemovedKey, 'LOGO_old-logo-id');
});

test('AdminService.uploadInstitutionLogo guarda una imagen validada en la carpeta administrada',()=>{
  const vm=require('node:vm');
  const writes=[];
  const created=[];
  const imageBytes=Buffer.alloc(6000,7);
  const file={getId:()=> 'managed-logo-1',getUrl:()=> 'https://drive.google.com/file/d/managed-logo-1/view'};
  const folder={createFile:(blob)=>{created.push(blob);return file;}};
  const context={
    console,
    Auth:{requireRoles:()=>({user_id:'admin-1'})},
    AppErrors:{validation:(m)=>Object.assign(new Error(m),{code:'VALIDATION_ERROR'}),notFound:(m)=>new Error(m)},
    Validation:{required:(v)=>v},
    JsonUtil:{now:()=> '2026-10-15T00:00:00Z'},
    Utilities:{base64Decode:(s)=>Buffer.from(s,'base64'),newBlob:(bytes,mime,name)=>({bytes,mime,name})},
    AppConfig:{validate:()=>({outputFolderId:'output-folder'})},
    DriveApp:{getFolderById:()=>({getFoldersByName:()=>({hasNext:()=>true,next:()=>folder}),createFolder:()=>folder})},
    SheetsRepository:{find:()=>({institution_id:'inst-1',name:'Colegio'}),upsert:(t,k,row)=>writes.push(row)},
    DocsGateway:{clearLogoCache:()=>{}},
    Audit:{write:()=>{}}
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../../src/application/AdminService.gs'),'utf8'),context);
  const result=context.AdminService.uploadInstitutionLogo({institutionId:'inst-1',fileName:'logo.png',mimeType:'image/png',base64:imageBytes.toString('base64')},'req-logo');
  assert.equal(created.length,1);
  assert.equal(created[0].bytes.length,6000);
  assert.equal(writes[0].logo_drive_id,'managed-logo-1');
  assert.equal(result.logo.url,'https://drive.google.com/file/d/managed-logo-1/view');
});

test('renderList integra asignaciones pendientes con boton de inicio rapido y bloqueo visual para docentes en borrador',()=>{
  assert.match(source,/start-assignment/);
  assert.match(source,/Iniciar borrador/);
  assert.match(source,/Pendiente de visita/);
  assert.match(source,/🔒 En preparación/);
  assert.match(source,/preselectedAssignmentId/);
});

test('renderList y App.html resuelven nombres de docentes y evaluadores y evitan mostrar UUIDs',()=>{
  assert.match(source,/resolveStaff/);
  assert.match(source,/isUuidOrCode/);
});

test('renderNew detecta evaluaciones activas existentes e impide duplicar borradores',()=>{
  assert.match(source,/findActiveVisitForTeacher/);
  assert.match(source,/Evaluación en curso existente/);
  assert.match(source,/Abrir borrador/);
  assert.match(source,/btn-open-active-visit/);
  assert.match(source,/No se permite crear un nuevo borrador mientras exista uno en proceso/);
});


