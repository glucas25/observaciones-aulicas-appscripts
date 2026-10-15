var ApiController = (function () {
  function invoke(action,payload){
    var requestId=Utilities.getUuid();
    try {
      var data=action(payload||{},requestId);
      return JsonUtil.clientSafe({ok:true,data:data,error:null,requestId:requestId,serverTime:JsonUtil.now()});
    } catch(e) {
      console.error(requestId+' '+(e.stack||e.message));
      var known=e&&e.code;
      var errObj;
      try {
        errObj={ok:false,data:null,error:{code:known?e.code:'INTERNAL_ERROR',message:known?e.message:'Ocurrió un error inesperado. Use el identificador de solicitud para soporte.',details:known?e.details:null},requestId:requestId,serverTime:JsonUtil.now()};
        return JsonUtil.clientSafe(errObj);
      } catch(e2) {
        return {ok:false,data:null,error:{code:'INTERNAL_ERROR',message:'Error interno del servidor.',details:null},requestId:requestId,serverTime:''};
      }
    }
  }
  return {invoke:invoke};
})();

function apiBootstrap(){return ApiController.invoke(function(){var user=Auth.current(),roles=String(user.role||'').split(',').map(function(r){return r.trim().toUpperCase();}),teacher=Auth.teacherForUser(user);return {user:{userId:user.user_id,teacherId:teacher?teacher.teacher_id:null,email:user.email,displayName:user.display_name,role:user.role,roles:roles,isAdmin:roles.indexOf('ADMIN')>=0,position:user.position||''},catalogs:CatalogService.getAll(),visits:VisitService.list({limit:100}),app:{version:AppConfig.get().version,environment:AppConfig.get().environment}};});}
function apiListVisits(payload){return ApiController.invoke(function(p){return VisitService.list(p.filters);},payload);}
function apiGetVisit(payload){return ApiController.invoke(function(p){return VisitService.get(p.visitId);},payload);}
function apiCreateVisit(payload){return ApiController.invoke(function(p,r){return VisitService.create(p.visit,r);},payload);}
function apiSaveVisit(payload){return ApiController.invoke(function(p,r){return VisitService.save(p.visitId,p.visit,p.expectedVersion,r);},payload);}
function apiSaveTeacherCommitment(payload){return ApiController.invoke(function(p,r){return VisitService.saveTeacherCommitment(p.visitId,p.teacherCommitment,p.expectedVersion,r);},payload);}
function apiChangeVisitStatus(payload){return ApiController.invoke(function(p,r){return FinalizationService.changeStatus(p.visitId,p.status,p.expectedVersion,r);},payload);}
function apiFinalizeVisit(payload){return ApiController.invoke(function(p,r){return FinalizationService.finalize(p.visitId,p.expectedVersion,r);},payload);}
function apiReopenVisit(payload){return ApiController.invoke(function(p,r){return FinalizationService.reopen(p.visitId,p.reason,r);},payload);}
function apiAnnulVisit(payload){return ApiController.invoke(function(p,r){return FinalizationService.annul(p.visitId,p.reason,r);},payload);}
function apiGenerateDocument(payload){return ApiController.invoke(function(p,r){return DocumentService.generate(p.visitId,p.type,p,r);},payload);}
function apiListDocuments(payload){return ApiController.invoke(function(p){return DocumentService.list(p.visitId);},payload);}
function apiDownloadDocument(payload){return ApiController.invoke(function(p){return DocumentService.getBlob(p.visitId,p.type);},payload);}
function apiGenerateAiDraft(payload){return ApiController.invoke(function(p,r){return AiDraftService.draft(p.visitId,r);},payload);}
function apiAcceptAiDraft(payload){return ApiController.invoke(function(p,r){return AiDraftService.accept(p.aiRequestId,p.humanEdited,r);},payload);}
function apiAdminData(){return ApiController.invoke(function(){return AdminService.data();});}
function apiSaveInstitution(payload){return ApiController.invoke(function(p,r){return AdminService.saveInstitution(p,r);},payload);}
function apiSaveUser(payload){return ApiController.invoke(function(p,r){return AdminService.saveUser(p,r);},payload);}
function apiSaveTeacher(payload){return ApiController.invoke(function(p,r){return AdminService.saveTeacher(p,r);},payload);}
function apiEnableTeacherEvaluator(payload){return ApiController.invoke(function(p,r){return AdminService.enableTeacherEvaluator(p,r);},payload);}
function apiSaveAssignment(payload){return ApiController.invoke(function(p,r){return AdminService.saveAssignment(p,r);},payload);}
function apiAdminAudit(payload){return ApiController.invoke(function(p){return AdminService.getAudit(p&&p.limit);},payload);}
function apiUpdateTemplates(payload){return ApiController.invoke(function(){return createStarterTemplates(true);});}
