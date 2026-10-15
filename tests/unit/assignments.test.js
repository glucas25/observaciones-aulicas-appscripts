'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'../..');
const evaluator={user_id:'ev-1',email:'evaluador@example.com',role:'EVALUATOR',institution_id:'inst-1',active:true};
const teachers=[
  {teacher_id:'teacher-1',email:'docente@example.com',institution_id:'inst-1',active:true},
  {teacher_id:'teacher-2',email:'otro@example.com',institution_id:'inst-1',active:true}
];
const assignments=[
  {evaluator_user_id:'ev-1',teacher_id:'teacher-1',planned_date:'2026-10-15',active:true},
  {evaluator_user_id:'ev-1',teacher_id:'teacher-2',planned_date:'2026-10-15',active:false}
];
const tables={TEACHERS:teachers,EVALUATOR_ASSIGNMENTS:assignments,INSTITUTIONS:[],GENERAL_CRITERIA:[],RUBRIC_CRITERIA:[],EVIDENCE_CHECK_TYPES:[]};
const context={
  console,
  Date,
  Session:{getActiveUser:()=>({getEmail:()=>evaluator.email})},
  SheetsRepository:{
    find:(name,field,value)=>(tables[name]||[evaluator]).find(row=>String(row[field])===String(value))||null,
    filter:(name,predicate)=>(name==='USERS'?[evaluator]:(tables[name]||[])).filter(predicate)
  },
  AppConfig:{get:()=>({aiEnabled:false})}
};
vm.createContext(context);
for(const rel of ['src/domain/Errors.gs','src/infrastructure/Auth.gs','src/application/CatalogService.gs']){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),context,{filename:rel});
}

test('autoriza solo asignaciones activas',()=>{
  assert.equal(context.Auth.hasActiveAssignment(evaluator,teachers[0],'2026-10-15'),true);
  assert.equal(context.Auth.hasActiveAssignment(evaluator,teachers[1],'2026-10-15'),false);
});

test('el catálogo del evaluador contiene solo sus docentes asignados',()=>{
  const result=context.CatalogService.getAll();
  assert.deepEqual(Array.from(result.teachers,t=>t.teacher_id),['teacher-1']);
});

test('CatalogService enriquece assignments con nombres de evaluador y docente',()=>{
  const result=context.CatalogService.getAll();
  assert.equal(result.assignments.length, 1);
  assert.equal(result.assignments[0].teacher_id, 'teacher-1');
  assert.ok(result.assignments[0].evaluator_name);
  assert.ok(result.assignments[0].teacher_name);
});

