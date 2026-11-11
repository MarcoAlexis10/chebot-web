// Unregistered server-side candidate and an explicit OFFLINE contract reviewer.
// The review never returns business CONFIRMED, creates signatures or opens HOLD.
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {record,PROJECT,isUuid,frame,parse,digest,digestOf} from './vendor/qa/contract-v1/codec.mjs';
import {createSdkIdentityBoundary,verifiedIdentity} from './vendor/qa/writer-gateway-v2/sdk-identity.mjs';
import {createClosedAuthorityReview} from './vendor/qa/cheveni-beta-release-candidate-v1/writer-auth-closure-v1/authority-ports.mjs';
import {createStayCommandReview} from './vendor/qa/concierge-stay-command-review-v1/stay-command.mjs';
import {conciergePrelegalSensitiveHold} from './vendor/qa/backend-candidates/concierge-prelegal-sensitive-hold-qa.js';
import {managerLegalAdmissionReady} from './vendor/backend/concierge-manager-legal-admission-guard.js';
import {SQL_STATEMENTS} from './vendor/qa/writer-gateway-v2/gateway.mjs';
import {createIndependentWriterPorts} from './independent-ports.mjs';

const flags=Object.freeze({fixtureOnly:true,operationalApproval:false,actualProviderVerified:false,
 actualSqlVerified:false,actualJournalVerified:false,automaticRetryAllowed:false,betaDecision:'NO-GO'});
const result=(state,code)=>Object.freeze({state,code,reconciliationRequired:state!=='REVIEW_MATCHED',...flags});
const closed=()=>result('HELD','PREVENTIVE_HOLD_UNCHANGED');
const fail=()=>{throw Error('CONTRACT_COMPOSITION_HELD');};
const envelopeKeys=['p_auth_user_id','p_session_id','p_request_id','p_intent_id','p_operation','p_arguments','p_token_expires_at'];
const argumentKeys=['p_member_id','p_property_id','p_guest_phone_hash','p_guest_display_name','p_check_in_at',
 'p_check_out_at','p_access_from','p_access_until','p_language'];
const scopeKeys=['userId','accountId','memberId','propertyId','role','revision','readInviteReceipts','manageStays'];
export const SUPPORTED_OPERATION='concierge_manager_create_stay';

// A real candidate calls the existing private gateway with the original HOLD.
// No caller may supply a held override, REST fallback or custom success mapper.
export function createHeldPrivateStayCandidate(options){
 let candidate;
 const get=()=>{
  if(!candidate){
   const o=record(options,['writer','reader','getClaims','getRestrictions','journal','policy']);
   candidate=createStayCommandReview({sql:createIndependentWriterPorts({writer:o.writer,reader:o.reader}),getClaims:o.getClaims,
    getRestrictions:o.getRestrictions,journal:o.journal,policy:o.policy});
  }
  return candidate;
 };
 return Object.freeze({
  async create(token,command){if(!managerLegalAdmissionReady()||conciergePrelegalSensitiveHold())return closed();return get().create(token,command);},
  async reconcile(token,command){if(!managerLegalAdmissionReady()||conciergePrelegalSensitiveHold())return closed();return get().reconcile(token,command);}
 });
}

function snapshotEnvelope(input){
 const e=record(input,envelopeKeys);
 if(e.p_operation!==SUPPORTED_OPERATION)throw Error('NO_REVIEWED_PRIVATE_OPERATION_MAPPING');
 if(![e.p_auth_user_id,e.p_session_id,e.p_request_id,e.p_intent_id].every(isUuid)
  ||!Number.isSafeInteger(e.p_token_expires_at)||e.p_token_expires_at<1)fail();
 return Object.freeze({...e,p_arguments:record(e.p_arguments,argumentKeys)});
}
function sameScope(a,b){return scopeKeys.every(k=>a[k]===b[k]);}
function makeIntent(e,auth,scope){
 const a=e.p_arguments;
 if(e.p_auth_user_id!==auth.userId||e.p_session_id!==auth.sessionId
  ||String(e.p_token_expires_at)!==auth.tokenExpiresAt||a.p_member_id!==scope.memberId
  ||a.p_property_id!==scope.propertyId)fail();
 // Validate the EXACT CBF1 representation. No implicit date normalization,
 // field dropping, hash substitution or invented legacy-to-CBF1 equivalence.
 return parse('intent',frame('intent',{projectRef:PROJECT,intentId:e.p_intent_id,operation:e.p_operation,
  userId:auth.userId,accountId:scope.accountId,memberId:scope.memberId,memberRole:scope.role,
  propertyId:scope.propertyId,guestPhoneHash:a.p_guest_phone_hash,guestDisplayName:a.p_guest_display_name,
  checkInAt:a.p_check_in_at,checkOutAt:a.p_check_out_at,accessFrom:a.p_access_from,
  accessUntil:a.p_access_until,language:a.p_language}));
}

// Explicit double-driven contract review. This is NOT an operational gateway:
// no journal signature is manufactured or considered verified and no outcome
// here can authorize release. The real gateway above still refuses all traffic.
export function createPrivateWriterContractReview(options={}){
 if(Object.getOwnPropertyDescriptor(options,'mode')?.value!=='OFFLINE_FIXTURE')
  return Object.freeze({review:async()=>closed(),reconcile:async()=>closed()});
 const o=record(options,['mode','getClaims','readManagerSource','writer','reader','now','newId','budgetMs']);
 if(typeof o.now!=='function'||typeof o.newId!=='function'||!Number.isSafeInteger(o.budgetMs)||o.budgetMs<1||o.budgetMs>4000)fail();
 let wallFloor=-1;
 const wall=()=>{const n=o.now();if(!Number.isSafeInteger(n)||n<wallFloor)fail();wallFloor=n;return n;};
 const sdk=createSdkIdentityBoundary({getClaims:o.getClaims});
 const authority=createClosedAuthorityReview({mode:'OFFLINE_FIXTURE',getClaims:o.getClaims,
  readManagerSource:o.readManagerSource,wall,newRequestId:o.newId,deadlineMs:Math.min(o.budgetMs,3000)});
 const sql=createIndependentWriterPorts({writer:o.writer,reader:o.reader});
 const pending=new Map();
 async function bounded(signal,work,fallback){
  if(signal!==undefined&&!(signal instanceof AbortSignal))return fallback;
  const controller=new AbortController();let timer,onAbort;
  const deadline=performance.now()+o.budgetMs;
  const check=()=>{if(controller.signal.aborted||signal?.aborted||performance.now()>=deadline)fail();};
  const step=async callback=>{check();const value=await callback(controller.signal);check();return value;};
  try{
   const alarm=new Promise((_,reject)=>{onAbort=()=>{controller.abort();reject(Error('REVIEW_CANCELLED_OR_EXPIRED'));};
    signal?.addEventListener('abort',onAbort,{once:true});timer=setTimeout(onAbort,o.budgetMs);if(signal?.aborted)onAbort();});
   return await Promise.race([alarm,Promise.resolve().then(()=>work({step,signal:controller.signal,check}))]);
  }catch{return typeof fallback==='function'?fallback():fallback;}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);controller.abort();}
 }
 async function live(token,propertyId,timing){
  const proof=await timing.step(()=>sdk.verify(token,{now:wall()}));
  const auth=verifiedIdentity(proof,token,wall());
  const observed=await timing.step(signal=>authority.manager(token,{propertyId,operation:'stay_create'},signal));
  if(observed.state!=='CURRENT_MANAGER_REVIEW_MATCHED'||observed.operationalApproval!==false
   ||observed.scope.userId!==auth.userId||observed.scope.sessionId!==auth.sessionId)fail();
  verifiedIdentity(proof,token,wall());return {auth,scope:observed.scope};
 }
 function attempt(op,auth,mode){
  // UNSIGNED synthetic context, never passed off as a verified journal proof.
  return parse('attempt',frame('attempt',{projectRef:PROJECT,intentDigest:digestOf('intent',op),
   sessionId:auth.sessionId,tokenExpiresAt:auth.tokenExpiresAt,requestId:o.newId(),
   restrictionJournalId:'unsigned_contract_review',restrictionSequence:'0',restrictionDigest:'0'.repeat(64),
   dispatchId:o.newId(),mode}));
 }
 async function inspect(op,current,timing){
  const requestId=o.newId(),since=wall();
  const r=record(await timing.step(signal=>sql.inspect({text:SQL_STATEMENTS.inspect,
   values:[current.auth.userId,current.auth.sessionId,Number(current.auth.tokenExpiresAt),op.propertyId,requestId],signal})),['frame','digest']);
  const bytes=Buffer.from(r.frame,'hex'),s=parse('scope',bytes);
  if(r.digest!==digest(bytes)||s.projectRef!==PROJECT||s.requestId!==requestId||s.userId!==op.userId
   ||s.sessionId!==current.auth.sessionId||s.tokenExpiresAt!==current.auth.tokenExpiresAt
   ||s.accountId!==op.accountId||s.memberId!==op.memberId||s.memberRole!==op.memberRole||s.propertyId!==op.propertyId
   ||Number(s.checkedAtMs)<since||Number(s.checkedAtMs)>wall())fail();
 }
 function checkReceipt(raw,rec,a){
  const r=record(raw,['status','intentDigest','intentKeyDigest','checkedAttemptDigest','dispatchAttemptDigest','effectFrame','effectDigest']);
  const op=rec.op;
  if(!['COMMITTED','DENIED'].includes(r.status)||r.intentDigest!==digestOf('intent',op)
   ||r.intentKeyDigest!==digestOf('intent_key',{projectRef:PROJECT,userId:op.userId,intentId:op.intentId})
   ||r.checkedAttemptDigest!==digestOf('attempt',a)||r.dispatchAttemptDigest!==rec.dispatchDigest)fail();
  const bytes=Buffer.from(r.effectFrame,'hex'),effect=parse('effect',bytes);
  if(r.effectDigest!==digest(bytes)||effect.intentDigest!==r.intentDigest||effect.state!==r.status)fail();
  return r.effectDigest;
 }
 async function readback(token,rec,timing,expectedAuth=null){
  const current=await live(token,rec.op.propertyId,timing);
  if(expectedAuth&&Object.keys(expectedAuth).some(k=>expectedAuth[k]!==current.auth[k]))fail();
  if(!sameScope(rec.scope,current.scope))fail();
  await inspect(rec.op,current,timing);
  const a=attempt(rec.op,current.auth,'READBACK');
  const raw=await timing.step(signal=>sql.readback({text:SQL_STATEMENTS.readback,
   values:[frame('intent',rec.op),frame('attempt',a)],signal}));
  const effect=checkReceipt(raw,rec,a);
  if(rec.effectDigest!==null&&effect!==rec.effectDigest)fail();
  const final=await live(token,rec.op.propertyId,timing);
  if(!sameScope(rec.scope,final.scope)||Object.keys(current.auth).some(k=>current.auth[k]!==final.auth[k]))fail();
  return result('REVIEW_MATCHED','INDEPENDENT_READBACK_CONTRACT_ONLY_NOT_SIGNED');
 }
 return Object.freeze({
  async review(token,input,{signal}={}){
   let dispatched=false;
   return bounded(signal,async timing=>{
    const e=snapshotEnvelope(input);
    const current=await live(token,e.p_arguments.p_property_id,timing),op=makeIntent(e,current.auth,current.scope);
    const key=op.userId+':'+op.intentId,old=pending.get(key);
    if(old)return result(digestOf('intent',old.op)===digestOf('intent',op)?'UNKNOWN':'CONFLICT','EXISTING_INTENT_READBACK_ONLY');
    await inspect(op,current,timing);
    const dispatchAuth=await live(token,op.propertyId,timing);
    if(!sameScope(current.scope,dispatchAuth.scope)||Object.keys(current.auth).some(k=>current.auth[k]!==dispatchAuth.auth[k]))fail();
    // Reserve atomically after all admission awaits, BEFORE any write await.
    if(pending.has(key))return result('UNKNOWN','CONCURRENT_INTENT_READBACK_ONLY');
    const a=attempt(op,current.auth,'DISPATCH'),rec={op,scope:current.scope,dispatchDigest:digestOf('attempt',a),effectDigest:null};
    pending.set(key,rec);dispatched=true;
    const raw=await timing.step(signal=>sql.write({text:SQL_STATEMENTS.write,
     values:[frame('intent',op),frame('attempt',a)],signal}));
    rec.effectDigest=checkReceipt(raw,rec,a);
    return readback(token,rec,timing,current.auth);
   },()=>result(dispatched?'UNKNOWN':'HELD',dispatched?'ACK_OR_AUTHORITY_UNCERTAIN_NO_RESEND':'AUTHORITY_OR_ABI_NOT_REVIEWED'));
  },
  async reconcile(token,input,{signal}={}){
   return bounded(signal,async timing=>{
    const {intentId}=record(input,['intentId']);if(!isUuid(intentId))fail();
    const proof=await timing.step(()=>sdk.verify(token,{now:wall()})),auth=verifiedIdentity(proof,token,wall());
    const rec=pending.get(auth.userId+':'+intentId);
    if(!rec)return result('UNKNOWN','NO_TRUSTED_SNAPSHOT_ABSENCE_IS_NOT_ROLLBACK');
    return readback(token,rec,timing);
   },result('UNKNOWN','READBACK_UNVERIFIED_NO_RESEND'));
  }
 });
}
