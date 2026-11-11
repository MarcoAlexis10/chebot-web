'use strict';
// QA regression: extracts and executes the exact function embedded in the REAL
// incident-actions browser generator. Never performs network or builds/deploys.
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const vm=require('node:vm');

const source=readFileSync(require('node:path').resolve(__dirname,'../../manager-incident-actions-v1.js'));
const gitBlob=createHash('sha1').update('blob '+source.length+'\0').update(source).digest('hex');
const expectedBlob='de4e788b944f3c8d3f8ba115e4c54ace6ddecf70';
const expression=/      const knownPreDispatchDenial = \(response, body\) => \{[\s\S]*?\n      \};/g;
const snippets=[...source.toString('utf8').matchAll(expression)];
if(gitBlob!==expectedBlob || snippets.length!==1)
  throw Error('INCIDENT_UI_SOURCE_DRIFT');
const classify=vm.runInNewContext(snippets[0][0]+'\nknownPreDispatchDenial;',Object.create(null),{timeout:1000});
if(typeof classify!=='function')throw Error('CLASSIFIER_NOT_FUNCTION');

// Each scenario uses synthetic receipts, no real user context or credentials.
const cases=[
 ['exact 503 pre-dispatch hold',503,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED'},true],
 ['503 hold but reconciliation required',503,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED',reconciliation_required:true},false],
 ['503 hold but body says success',503,{ok:true,error:'MANAGER_OPERATIONS_NOT_RELEASED'},false],
 ['503 hold but learning needs reconciliation',503,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED',learning:{reconciliation_required:true}},false],
 ['different 503 write denial',503,{ok:false,error:'MANAGER_WRITE_DENIED'},false],
 ['503 prefix/lookalike rejected',503,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED_EXTRA'},false],
 ['502 hold code remains uncertain',502,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED'},false],
 ['500 hold code remains uncertain',500,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED'},false],
 ['400 known invalid incident id',400,{ok:false,error:'INCIDENT_ID_INVALID'},true],
 ['401 known invalid token',401,{ok:false,error:'AUTH_TOKEN_INVALID'},true],
 ['403 known denied manager',403,{ok:false,error:'MANAGER_ACCESS_DENIED'},true],
 ['404 known out of scope',404,{ok:false,error:'RESOURCE_OUT_OF_SCOPE'},true],
 ['409 known no resolution to learn',409,{ok:false,error:'NO_MANAGER_RESOLUTION_TO_LEARN'},true],
 ['400 marked uncertain must remain held',400,{ok:false,error:'INCIDENT_ID_INVALID',reconciliation_required:true},false],
 ['409 learning marked uncertain must remain held',409,{ok:false,error:'INCIDENT_NOT_READY_FOR_LEARNING',learning:{reconciliation_required:true}},false],
 ['409 known learning pre-dispatch error',409,{ok:false,error:'INCIDENT_NOT_READY_FOR_LEARNING',learning:{reason:'INCIDENT_NOT_READY_FOR_LEARNING'}},true],
 ['missing body',503,null,false],
 ['200 success cannot be considered known denial',200,{ok:true,error:'MANAGER_OPERATIONS_NOT_RELEASED'},false],
 ['unrelated invite 503 remains uncertain',503,{ok:false,error:'GUEST_INVITE_PRIVACY_HOLD'},false],
 ['400 unknown code remains uncertain',400,{ok:false,error:'UNEXPECTED_UNCERTAIN'},false]
];
test('source is the pinned, unique incident UI classifier',()=>{
 assert.equal(gitBlob,expectedBlob);
 assert.equal(snippets.length,1);
 assert.match(snippets[0][0],/MANAGER_OPERATIONS_NOT_RELEASED/);
 assert.match(snippets[0][0],/reconciliation_required !== true/);
});
for(const [label,status,body,expected] of cases){
 test('incident response classifier: '+label,()=>{
  assert.equal(Boolean(classify({status},body)),expected);
 });
}
