'use strict';
// Static traceability, syntax and retained-artifact check, not another test suite.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),review=path.join(root,'qa/reviews/founder-journey-20261112');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function check(){
 const pins=json(path.join(review,'SOURCE-PINS.json')),matrix=json(path.join(review,'JOURNEY-MATRIX.json')),pilot=json(path.join(review,'PILOT-CHECKLIST.json')),a2=json(path.join(review,'A2-INVENTORY.json'));
 for(const [kind,dir] of [['webInputs',root],['backendInputs',path.resolve(root,'../backend')]])for(const p of pins[kind]){
  if(sha(fs.readFileSync(path.join(dir,p.path)))!==p.sha256)throw Error('SOURCE_DRIFT '+p.path);
 }
 for(const row of matrix.rows){
  for(const [side,dir] of [['web',root],['backend',path.resolve(root,'../backend')]]){
   const ref=row[side];if(!fs.readFileSync(path.join(dir,ref.path),'utf8').includes(ref.anchor))throw Error('MATRIX_ANCHOR_MISSING '+row.id);
  }
  if(row.operational!=='HELD'||row.nativeOrManagedEvidenceHere!==false)throw Error('MATRIX_MUST_REMAIN_HELD');
 }
 if(pilot.cohort.foundingManagers!==1||pilot.cohort.properties!==1||pilot.cohort.city!=='CABA'||pilot.cohort.freeTrialDays!==30||pilot.cohort.automaticBilling!==false||pilot.activationAuthorized!==false||pilot.checks.length!==16)throw Error('PILOT_CONTRACT_CHANGED');
 if(pilot.checks.some(c=>c.operationalAcceptance!==false||!matrix.rows.some(r=>r.id===c.journeyId)))throw Error('CHECKLIST_UNSUPPORTED');
 if(a2.components.length!==8||a2.restoreOrSigningExecuted!==false||a2.currentFloorFromBackupAllowed!==false||a2.components.some(c=>c.executedHere||c.observedOperationally||c.restoreAuthorized))throw Error('A2_MUST_REMAIN_INVENTORY_ONLY');
 for(const component of a2.components){const ref=component.source,dir=ref.repository==='web'?root:path.resolve(root,'../backend');if(!fs.readFileSync(path.join(dir,ref.path),'utf8').includes(ref.anchor))throw Error('A2_SOURCE_ANCHOR_MISSING '+component.id);}
 const generated=json(path.join(__dirname,'GENERATED-MANIFEST.json'));
 let scripts=0,pages=0;
 for(const item of generated.files){
  const file=path.join(__dirname,item.path),data=fs.readFileSync(file),s=data.toString();if(sha(data)!==item.sha256)throw Error('GENERATED_HASH_MISMATCH');
  if(file.endsWith('.js')){new vm.Script(s,{filename:item.path});scripts++;}
  if(file.endsWith('.html')){
   pages++;if(!s.includes("connect-src 'none'")||/<link[^>]+href="https?:/i.test(s)||[...s.matchAll(/<form\b[^>]*>/g)].some(m=>!m[0].includes(' inert ')))throw Error('OFFLINE_ARTIFACT_MUST_REMAIN_CLOSED');
   for(const m of s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim()){new vm.Script(m[1],{filename:item.path+':inline'});scripts++;}
  }
 }
 const signup=fs.readFileSync(path.join(__dirname,'generated/manager/activar/index.html'),'utf8');
 if(!signup.includes('CONCIERGE_SIGNUP_LEGAL_PUBLICATION_APPROVED = false')||!signup.includes('30 días gratuitos desde la primera estadía real verificada')||!signup.includes('No hay facturación ni conversión a pago automáticas'))throw Error('COMMERCIAL_OR_LEGAL_GUARD_CHANGED');
 return {classification:'STATIC_ONLY',webInputs:pins.webInputs.length,backendInputs:pins.backendInputs.length,journeyRows:matrix.rows.length,pilotChecks:16,a2Components:8,generatedFiles:generated.files.length,htmlPages:pages,scriptsParsedOnly:scripts,legalPublication:false,browserExecuted:false,sqlExecuted:false,authManagedVerified:false,operationalApproval:false,betaDecision:'NO-GO'};
}
if(require.main===module)console.log(JSON.stringify(check(),null,2));module.exports={check};
