'use strict';
// QA test parses the exact browser source, not a rewritten copy of the guard.
// Requires a complete checkout. Never generates pages or calls a service.
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const {resolve}=require('node:path');
const vm=require('node:vm');
const path=resolve(__dirname,'../../manager-signup-admin-v1.js');
const bytes=readFileSync(path);
const gitSha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const expectedGitSha='6a2b4cdfc0a4b27a6987e913a596ea14b19dfe88';
const source=bytes.toString('utf8');
const originalGuard=source.match(/function knownDenial\(status,code\)\{[\s\S]*?\n\}/g)||[];
const changedClassification=source.match(/   var releaseHeld=[\s\S]*?\n   var denied=[\s\S]*?;/g)||[];
if(gitSha!==expectedGitSha || originalGuard.length!==1 || changedClassification.length!==1)
 throw Error('SIGNUP_ADMIN_UI_SOURCE_NOT_PINNED');
const classifier=vm.runInNewContext(
  originalGuard[0]+
  '\nfunction classify(resp,data) {'+
  "\n var valid=data&&typeof data==='object'&&!Array.isArray(data)&&data.reconciliation_required!==true;\n"+
  changedClassification[0]+'\n return Boolean(denied);\n}\nclassify;',
  Object.create(null),{timeout:1000});
test('original administrator UI source is pinned, classifier extracted once',()=>{
 assert.equal(gitSha,expectedGitSha);assert.equal(typeof classifier,'function');
 assert.equal(originalGuard.length,1);assert.equal(changedClassification.length,1);
});
// All cases use fictional receipts; original guard emits ONLY {ok:false,error:...}.
const cases=[
 ['exact 503 held before dispatch',503,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED'},true],
 ['prior admin closed 503',503,{ok:false,code:'INVITATION_ADMIN_CLOSED'},true],
 ['prior legal 503',503,{ok:false,code:'MANAGER_BETA_VERIFIED_LEGAL_ADMISSION_NOT_CONNECTED'},true],
 ['prior unconfigured 503',503,{ok:false,code:'INVITATION_ADMIN_NOT_CONFIGURED'},true],
 ['prior approval 503',503,{ok:false,code:'INVITATION_LEGAL_APPROVAL_REQUIRED'},true],
 ['held with reconciliation required remains unknown',503,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED',reconciliation_required:true},false],
 ['held with recognized old code uses unchanged code classification',503,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED',code:'INVITATION_ADMIN_CLOSED'},true],
 ['held with extra debug field remains unknown',503,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED',debug:'1'},false],
 ['held with reconciliation false extra field remains unknown',503,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED',reconciliation_required:false},false],
 ['held without error remains unknown',503,{ok:false},false],
 ['held without ok remains unknown',503,{error:'MANAGER_OPERATIONS_NOT_RELEASED'},false],
 ['held body says ok true remains unknown',503,{ok:true,error:'MANAGER_OPERATIONS_NOT_RELEASED'},false],
 ['held response 502 remains unknown',502,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED'},false],
 ['held response 500 remains unknown',500,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED'},false],
 ['held response 403 remains unknown',403,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED'},false],
 ['lookalike 503 code remains unknown',503,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED_EXTRA'},false],
 ['unknown 503 remains unknown',503,{ok:false,error:'UNEXPECTED'},false],
 ['null body remains unknown',503,null,false],
 ['string body remains unknown',503,'NO',false],
 ['array body remains unknown',503,[{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED'}],false],
 ['status 503 with fetch response ok true remains unknown',503,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED'},false,true],
 ['prior owner denial 403',403,{ok:false,code:'OWNER_ACCESS_REQUIRED'},true],
 ['prior reviewed conflict 409',409,{ok:false,code:'APPLICATION_ALREADY_SCREENED'},true],
 ['prior input denial 400',400,{ok:false,code:'INVALID_REQUEST'},true],
 ['prior unauthorized 401',401,{ok:false,code:'LOGIN_REQUIRED'},true],
 ['unknown 403 remains unknown',403,{ok:false,code:'WRONG'},false],
 ['unknown 409 remains unknown',409,{ok:false,code:'WRONG'},false],
 ['reviewed 409 with reconciliation remains unknown',409,{ok:false,code:'APPLICATION_ALREADY_SCREENED',reconciliation_required:true},false],
 ['recognized status with ok=true must not clear intent',403,{ok:true,code:'OWNER_ACCESS_REQUIRED'},false],
 ['legacy reviewed denial missing ok retains existing behavior',403,{code:'OWNER_ACCESS_REQUIRED'},true],
];
for(const [name,status,data,expected,ok=false] of cases){
 test('original signup-admin UI: '+name,()=>assert.equal(classifier({status,ok},data),expected));
}
