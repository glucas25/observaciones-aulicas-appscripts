'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'../..');
const evaluator={user_id:'ev-1',email:'evaluador@example.com',role:'EVALUATOR',institution_id:'inst-1',active:true};
const observedTeacherUser={user_id:'user-t1',email:'docente1@example.com',role:'TEACHER',institution_id:'inst-1',active:true};
const otherTeacherUser={user_id:'user-t2',email:'docente2@example.com',role:'TEACHER',institution_id:'inst-1',active:true};

const teachers=[
  {teacher_id:'teacher-1',email:'docente1@example.com',institution_id:'inst-1',user_id:'user-t1',active:true},
  {teacher_id:'teacher-2',email:'docente2@example.com',institution_id:'inst-1',user_id:'user-t2',active:true}
];

const visitDraft={
  visit_id:'v-1',
  teacher_id:'teacher-1',
  evaluator_user_id:'ev-1',
  status:'DRAFT',
  institution_id:'inst-1'
};

const visitInReview={
  visit_id:'v-2',
  teacher_id:'teacher-1',
  evaluator_user_id:'ev-1',
  status:'IN_REVIEW',
  institution_id:'inst-1'
};

const visitFinalized={
  visit_id:'v-3',
  teacher_id:'teacher-1',
  evaluator_user_id:'ev-1',
  status:'FINALIZED',
  institution_id:'inst-1'
};

const tables={
  TEACHERS:teachers,
  USERS:[evaluator, observedTeacherUser, otherTeacherUser],
  VISITS:[visitDraft, visitInReview, visitFinalized],
  VISIT_GENERAL_RESPONSES:[],
  VISIT_RUBRIC_RESPONSES:[],
  VISIT_EVIDENCE_CHECKS:[]
};
let activeEmail = evaluator.email;
const context={
  console,
  Date,
  Session:{getActiveUser:()=>({getEmail:()=>activeEmail})},
  JsonUtil:{now:()=>'2026-10-14T12:00:00Z'},
  SheetsRepository:{
    find:(name,field,value)=>(tables[name]||[]).find(row=>String(row[field])===String(value))||null,
    filter:(name,predicate)=>(tables[name]||[]).filter(predicate)
  }
};
vm.createContext(context);
for(const rel of ['src/domain/Errors.gs','src/domain/VisitState.gs','src/infrastructure/Auth.gs','src/application/VisitService.gs']){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),context,{filename:rel});
}

test('el docente evaluado solo ve la evaluacion a partir de IN_REVIEW',()=>{
  assert.equal(context.Auth.canViewVisit(observedTeacherUser, visitDraft), false, 'No debe ver borrador inicial');
  assert.equal(context.Auth.canViewVisit(observedTeacherUser, visitInReview), true, 'Debe ver cuando pasa a IN_REVIEW para colaboracion');
  assert.equal(context.Auth.canViewVisit(observedTeacherUser, visitFinalized), true, 'Debe ver cuando está finalizada');
});

test('el docente evaluado ve la fila en su listado incluso en borrador pero no puede abrirla',()=>{
  assert.equal(context.Auth.canListVisit(observedTeacherUser, visitDraft), true, 'Debe aparecer en la lista aunque esté en borrador');
  assert.equal(context.Auth.canViewVisit(observedTeacherUser, visitDraft), false, 'No debe tener permiso para ver detalles del borrador');
  assert.throws(
    () => context.Auth.assertVisit(observedTeacherUser, visitDraft, false),
    err => err.message.includes('en fase de preparación')
  );
  assert.doesNotThrow(() => context.Auth.assertVisit(observedTeacherUser, visitInReview, false));
});

test('un docente ajeno no puede ver ni listar la visita en ningun estado',()=>{
  assert.equal(context.Auth.canListVisit(otherTeacherUser, visitDraft), false);
  assert.equal(context.Auth.canListVisit(otherTeacherUser, visitInReview), false);
  assert.equal(context.Auth.canViewVisit(otherTeacherUser, visitDraft), false);
  assert.equal(context.Auth.canViewVisit(otherTeacherUser, visitInReview), false);
  assert.equal(context.Auth.canViewVisit(otherTeacherUser, visitFinalized), false);
});

test('identifica correctamente al docente observado',()=>{
  assert.equal(context.Auth.isObservedTeacher(observedTeacherUser, visitInReview), true);
  assert.equal(context.Auth.isObservedTeacher(otherTeacherUser, visitInReview), false);
  assert.equal(context.Auth.isObservedTeacher(evaluator, visitInReview), false);
});

test('identifica al docente observado incluso con cargos en parentesis o nombres ordenados',()=>{
  const userWithPosition = {user_id:'usr-99',display_name:'PEREZ ALVAREZ JUAN CARLOS (Docente)',email:'docente@example.com',role:'TEACHER'};
  const visitWithSnapshot = {teacher_id:'other-id',teacher_name_snapshot:'Juan Carlos Perez Alvarez',status:'IN_REVIEW'};
  assert.equal(context.Auth.isObservedTeacher(userWithPosition, visitWithSnapshot), true);
});

test('el evaluador mantiene acceso total en borrador y revision',()=>{
  assert.equal(context.Auth.canViewVisit(evaluator, visitDraft), true);
  assert.equal(context.Auth.canViewVisit(evaluator, visitInReview), true);
  assert.equal(context.Auth.canEditVisit(evaluator, visitDraft), true);
  assert.equal(context.Auth.canEditVisit(evaluator, visitInReview), true);
  assert.equal(context.Auth.canEditVisit(observedTeacherUser, visitInReview), false, 'El docente observado edita via saveTeacherCommitment, no sobreescribe la visita completa');
});

test('VisitService.list incluye borrador para el docente observado y get bloquea detalles en borrador',()=>{
  activeEmail = observedTeacherUser.email;
  const teacherList = context.VisitService.list();
  assert.equal(teacherList.length, 3, 'El docente ve las 3 visitas en su lista');
  assert.ok(teacherList.some(v => v.visitId === 'v-1' && v.status === 'DRAFT'));

  assert.throws(
    () => context.VisitService.get('v-1'),
    err => err.message.includes('en fase de preparación')
  );

  const openedReview = context.VisitService.get('v-2');
  assert.equal(openedReview.visitId, 'v-2');

  activeEmail = otherTeacherUser.email;
  const otherList = context.VisitService.list();
  assert.equal(otherList.length, 0, 'Un docente ajeno no recibe visitas en su lista');
});

