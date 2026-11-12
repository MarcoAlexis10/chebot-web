// No provider/SQL implementation is supplied. Positive paths are OFFLINE review only.
import {randomUUID,createHash} from 'node:crypto';
import {createSdkIdentityBoundary,verifiedIdentity} from '../private-writer-composition-20261111-v1/vendor/qa/writer-gateway-v2/sdk-identity.mjs';
import {record,snapshot,prepareIncidentServicePlan} from '../domain-security-successor-20261111-v1/incident-successor.mjs';
export const isUuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(x);
export const fail=()=>{throw Error('PROTECTED_INCIDENT_CONTRACT_HELD');};
const hash=x=>createHash('sha256').update(x).digest('hex');
export const flags=Object.freeze({held:true,fixtureOnly:true,actualProviderVerified:false,actualSqlVerified:false,actualJournalVerified:false,operationalApproval:false,betaDecision:'NO-GO'});
export const result=state=>Object.freeze({state,...flags});
export function createProtectedCurrentResolution(){return Object.freeze({resolve:async()=>result('HELD_PROTECTED_SOURCE_MISSING')});}
export function timing(clock=Date.now,budgetMs=1000){
 if(typeof clock!=='function'||!Number.isSafeInteger(budgetMs)||budgetMs<1||budgetMs>2000)fail();
 let floor=0;const now=()=>{const n=clock();if(!Number.isSafeInteger(n)||n<floor)fail();floor=n;return n;};
 return {now,async step(fn,deadline){const left=deadline-now();if(left<=0)fail();let timer;try{const v=await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('DEADLINE')),left);})]);if(now()>=deadline)fail();return v;}finally{clearTimeout(timer);}},budgetMs};
}
const rowKeys=['userId','sessionId','sessionUserId','sessionLive','emailConfirmed','accountId','accountStatus','identityMemberId','identityAccountId','identityStatus','identityRevokedAt','memberId','memberAccountId','memberRole','memberStatus','propertyId','propertyAccountId','propertyStatus','city','stayId','stayAccountId','stayPropertyId','incidentId','incidentAccountId','incidentPropertyId','incidentStayId','incidentStatus','canManageIncidents'];
export const revisionKeys=['userId','sessionId','accountId','memberId','propertyId','stayId','incidentId','authorityVersion','restrictionVersion','datasetId','recoveryEpoch','inventoryDigest','restrictionJournalId','restrictionDigest'];
const sameScope=['userId','sessionId','accountId','memberId','propertyId','stayId','incidentId'];
function fresh(o,requestId,now){
 if(o.requestId!==requestId||!Number.isSafeInteger(o.observedAtMs)||!Number.isSafeInteger(o.expiresAtMs)||o.observedAtMs<0||o.observedAtMs>now||o.expiresAtMs<=now||o.expiresAtMs-o.observedAtMs>5000)fail();
}
function one(value,requestId,now){
 const x=record(value,['requestId','rows','observedAtMs','expiresAtMs']);fresh(x,requestId,now);
 if(!Array.isArray(x.rows)||Object.getPrototypeOf(x.rows)!==Array.prototype||Reflect.ownKeys(x.rows).length!==2||x.rows.length!==1)fail();
 const d=Object.getOwnPropertyDescriptor(x.rows,'0');if(!d||!Object.hasOwn(d,'value'))fail();
 return {row:record(d.value,rowKeys),expiresAtMs:x.expiresAtMs};
}
function validateRow(r,id,c){
 if(r.userId!==id.userId||r.sessionId!==id.sessionId||r.sessionUserId!==id.userId||!r.sessionLive||r.sessionLive!==true||r.emailConfirmed!==true||r.incidentId!==c.p_arguments.p_incident_id||r.memberId!==c.p_arguments.p_account_member_id||!sameScope.every(k=>isUuid(r[k])))fail();
 if(r.identityMemberId!==r.memberId||r.identityAccountId!==r.accountId||r.memberAccountId!==r.accountId||r.propertyAccountId!==r.accountId||r.stayAccountId!==r.accountId||r.stayPropertyId!==r.propertyId||r.incidentAccountId!==r.accountId||r.incidentPropertyId!==r.propertyId||r.incidentStayId!==r.stayId)fail();
 if(r.identityStatus!=='active'||r.identityRevokedAt!==null||r.memberStatus!=='active'||r.propertyStatus!=='active'||!['active','testing'].includes(r.accountStatus)||!['CABA','Buenos Aires'].includes(r.city)||!['owner','manager','co_manager'].includes(r.memberRole)||r.canManageIncidents!==true||!['open','resolving','waiting_guest','escalated','waiting_manager','learning_pending','closed','resolved'].includes(r.incidentStatus))fail();
}
function revision(value,requestId,row,now){
 const x=record(value,['requestId',...revisionKeys,'observedAtMs','expiresAtMs']);fresh(x,requestId,now);
 for(const k of sameScope)if(x[k]!==row[k])fail();
 for(const k of ['authorityVersion','restrictionVersion','recoveryEpoch'])if(!Number.isSafeInteger(x[k])||x[k]<1)fail();
 for(const k of ['datasetId','inventoryDigest','restrictionDigest'])if(typeof x[k]!=='string'||!/^[0-9a-f]{64}$/.test(x[k]))fail();
 if(typeof x.restrictionJournalId!=='string'||!/^[a-z0-9_]{1,64}$/.test(x.restrictionJournalId))fail();
 return x;
}
const versionBinding=x=>JSON.stringify(revisionKeys.map(k=>x[k]));
export function createCurrentResolutionReview(options){
 if(options?.mode!=='OFFLINE_FIXTURE')fail();
 const {getClaims,observeRows,readRevisions,readCurrentFloor,newRequestId=randomUUID,clock,budgetMs}=options;
 if(![getClaims,observeRows,readRevisions,readCurrentFloor,newRequestId].every(x=>typeof x==='function')||readRevisions===readCurrentFloor)fail();
 const sdk=createSdkIdentityBoundary({getClaims}),time=timing(clock,budgetMs),caps=new WeakMap(),floors=new Map();
 async function resolve(token,input){
  try{
   const c=snapshot(input),deadline=time.now()+time.budgetMs,id=await time.step(()=>sdk.verify(token,{now:time.now()}),deadline);
   if(c.p_auth_user_id!==id.userId||c.p_session_id!==id.sessionId||String(c.p_token_expires_at)!==id.tokenExpiresAt)fail();
   const requestId=newRequestId();if(!isUuid(requestId))fail();
   const request=Object.freeze({requestId,userId:id.userId,sessionId:id.sessionId,tokenExpiresAt:id.tokenExpiresAt,incidentId:c.p_arguments.p_incident_id});
   const first=one(await time.step(()=>observeRows(request),deadline),requestId,time.now());validateRow(first.row,id,c);
   const scopeRequest=Object.freeze({...request,accountId:first.row.accountId,memberId:first.row.memberId,propertyId:first.row.propertyId,stayId:first.row.stayId});
   const floorBefore=revision(await time.step(()=>readCurrentFloor(scopeRequest),deadline),requestId,first.row,time.now());
   const rev=revision(await time.step(()=>readRevisions(scopeRequest),deadline),requestId,first.row,time.now());
   const second=one(await time.step(()=>observeRows(request),deadline),requestId,time.now());validateRow(second.row,id,c);
   if(JSON.stringify(rowKeys.map(k=>first.row[k]))!==JSON.stringify(rowKeys.map(k=>second.row[k])))fail();
   const floorAfter=revision(await time.step(()=>readCurrentFloor(scopeRequest),deadline),requestId,second.row,time.now());
   if(versionBinding(floorBefore)!==versionBinding(rev)||versionBinding(rev)!==versionBinding(floorAfter))fail();
   const key=JSON.stringify(sameScope.map(k=>second.row[k])),prior=floors.get(key);
   if(prior&&(rev.recoveryEpoch<prior.recoveryEpoch||rev.authorityVersion<prior.authorityVersion||rev.restrictionVersion<prior.restrictionVersion||rev.datasetId!==prior.datasetId))fail();
   if(prior&&rev.authorityVersion===prior.authorityVersion&&second.row.memberRole!==prior.memberRole)fail();
   verifiedIdentity(id,token,time.now());
   const expiresAtMs=Math.min(first.expiresAtMs,second.expiresAtMs,rev.expiresAtMs,floorBefore.expiresAtMs,floorAfter.expiresAtMs,Number(id.tokenExpiresAt)*1000);
   if(expiresAtMs<=time.now())fail();
   const row=second.row,r=Object.freeze({issuer:'https://tjdgrzzeuuihhqnzvaox.supabase.co/auth/v1',userId:id.userId,sessionId:id.sessionId,accountId:row.accountId,memberId:row.memberId,memberRole:row.memberRole,propertyId:row.propertyId,stayId:row.stayId,incidentId:row.incidentId,incidentStatus:row.incidentStatus,active:true,manageIncidents:true,authorityVersion:rev.authorityVersion,restrictionVersion:rev.restrictionVersion,observedAtMs:time.now(),expiresAtMs});
   floors.set(key,{...rev,memberRole:second.row.memberRole});
   const capability=Object.freeze({kind:'OFFLINE_CURRENT_RESOLUTION_REVIEW',...flags});
   caps.set(capability,{proof:id,resolution:r,revision:Object.freeze({...rev}),command:c,tokenHash:hash(token),expiresAtMs});return capability;
  }catch{return result('HELD_CURRENT_RESOLUTION');}
 }
 function inspect(cap,token,input){
  const saved=caps.get(cap),c=snapshot(input);if(!saved||hash(token)!==saved.tokenHash||JSON.stringify(c)!==JSON.stringify(saved.command)||time.now()>=saved.expiresAtMs)fail();
  verifiedIdentity(saved.proof,token,time.now());
  return Object.freeze({plan:prepareIncidentServicePlan(token,c,saved.proof,saved.resolution,time.now()),resolution:saved.resolution,revision:saved.revision});
 }
 return Object.freeze({resolve,inspect});
}
