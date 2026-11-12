// QA only. No imports from product code, drivers, keys, transport or durable store.
import {createHash} from 'node:crypto';
import {createSdkIdentityBoundary,verifiedIdentity} from '../private-writer-composition-20261111-v1/vendor/qa/writer-gateway-v2/sdk-identity.mjs';
import {managerLegalAdmissionReady} from '../private-writer-composition-20261111-v1/vendor/backend/concierge-manager-legal-admission-guard.js';
import {conciergePrelegalSensitiveHold} from '../private-writer-composition-20261111-v1/vendor/qa/backend-candidates/concierge-prelegal-sensitive-hold-qa.js';

export const OP = 'concierge_manager_set_incident_state';
export const SERVICE_SQL = 'select concierge_service_qa_v1.manager_action($1::uuid,$2::uuid,$3::bigint,$4::uuid,$5::uuid,$6::uuid,$7::text,$8::jsonb) as result';
export const QA_ISSUER = 'https://tjdgrzzeuuihhqnzvaox.supabase.co/auth/v1';
const uuid = x => typeof x === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(x);
const states = new Set(['resolving','waiting_guest','escalated','waiting_manager','learning_pending','closed']);
const hash = x => createHash('sha256').update(x).digest('hex');
const fail = reason => { throw Error(reason); };
const frozen = x => { if (x && typeof x === 'object') { Object.values(x).forEach(frozen); Object.freeze(x); } return x; };
// Reject accessors, extra keys and prototype ambiguity; snapshot before the first await.
export function record(x, keys) {
 if (!x || Object.getPrototypeOf(x) !== Object.prototype || Reflect.ownKeys(x).length !== keys.length) fail('ARGUMENTS');
 const out = {};
 for (const k of keys) { const d = Object.getOwnPropertyDescriptor(x,k); if (!d || !Object.hasOwn(d,'value')) fail('ARGUMENTS'); out[k] = d.value; }
 return out;
}
export function snapshot(command) {
 const c = record(command,['p_auth_user_id','p_session_id','p_request_id','p_intent_id','p_operation','p_arguments','p_token_expires_at']);
 if (![c.p_auth_user_id,c.p_session_id,c.p_request_id,c.p_intent_id].every(uuid) || !Number.isSafeInteger(c.p_token_expires_at) || c.p_operation !== OP) fail('OPERATION_OR_IDENTITY_UNMAPPED');
 const a = record(c.p_arguments,['p_incident_id','p_account_member_id','p_new_status','p_event_summary']);
 if (![a.p_incident_id,a.p_account_member_id].every(uuid) || !states.has(a.p_new_status) || typeof a.p_event_summary !== 'string' || a.p_event_summary.includes('\0') || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(a.p_event_summary)) fail('INCIDENT_ARGUMENTS');
 // PostgreSQL trim(text) removes ASCII spaces; JS trim() also removes tabs/NBSP.
 const normalized = a.p_event_summary.replace(/^ +| +$/g,'');
 if ([...normalized].length < 1 || [...normalized].length > 4000) fail('INCIDENT_SUMMARY');
 c.p_arguments = a;
 return frozen(c);
}
const resolutionKeys = ['issuer','userId','sessionId','accountId','memberId','memberRole','propertyId','stayId','incidentId','incidentStatus','active','manageIncidents','authorityVersion','restrictionVersion','observedAtMs','expiresAtMs'];
function resolution(value,c,id,now) {
 const r = record(value,resolutionKeys);
 if (r.issuer !== QA_ISSUER || r.userId !== id.userId || r.sessionId !== id.sessionId || c.p_auth_user_id !== id.userId || c.p_session_id !== id.sessionId || String(c.p_token_expires_at) !== id.tokenExpiresAt || r.memberId !== c.p_arguments.p_account_member_id || r.incidentId !== c.p_arguments.p_incident_id || ![r.accountId,r.memberId,r.propertyId,r.stayId,r.incidentId].every(uuid) || !['owner','manager','co_manager'].includes(r.memberRole) || r.active !== true || r.manageIncidents !== true || !Number.isSafeInteger(r.authorityVersion) || r.authorityVersion < 1 || !Number.isSafeInteger(r.restrictionVersion) || r.restrictionVersion < 1 || !Number.isSafeInteger(r.observedAtMs) || !Number.isSafeInteger(r.expiresAtMs) || r.observedAtMs > now || r.expiresAtMs <= now || r.expiresAtMs - r.observedAtMs > 5000) fail('CURRENT_AUTHORITY_REQUIRED');
 return frozen(r);
}
const stable = r => JSON.stringify([r.issuer,r.userId,r.sessionId,r.accountId,r.memberId,r.memberRole,r.propertyId,r.stayId,r.incidentId,r.authorityVersion,r.restrictionVersion]);
function plan(c,r) {
 const a = c.p_arguments;
 // Local comparison fingerprint ONLY; NOT CBF1, JSONB's SQL digest or a receipt.
 const argsFingerprint = hash(JSON.stringify([OP,r.accountId,r.memberId,r.propertyId,r.stayId,a.p_incident_id,a.p_new_status,a.p_event_summary]));
 return frozen({operation:OP,intentId:c.p_intent_id,attemptId:c.p_request_id,userId:r.userId,sessionId:r.sessionId,authorityVersion:r.authorityVersion,restrictionVersion:r.restrictionVersion,argsFingerprint,
  // Native17 request is the stable intent key, NEVER the changing attempt ID.
  nativeCommandId:c.p_intent_id,sql:SERVICE_SQL,parameters:[r.userId,r.sessionId,c.p_token_expires_at,r.propertyId,r.stayId,c.p_intent_id,'incident_state',{incidentId:a.p_incident_id,status:a.p_new_status,summary:a.p_event_summary}],
  sourceAbi:'Native17 manager_action@ce5c747c',requiredEvidenceAbi:'INCIDENT_EVIDENCE_SUCCESSOR_NOT_INSTALLED',effect:{incident_id:a.p_incident_id,resulting_status:a.p_new_status}});
}
// Shared compiler for successors. A decoded/client identity is never sufficient.
export function prepareIncidentServicePlan(token,input,proof,current,now) {
 const id=verifiedIdentity(proof,token,now),c=snapshot(input);
 return plan(c,resolution(current,c,id,now));
}
const outcome = (status,reason) => frozen({status,reason,held:true,fixtureOnly:true,actualProviderVerified:false,actualSqlVerified:false,actualJournalVerified:false,operationalApproval:false,betaDecision:'NO-GO'});
export function createHeldIncidentCandidate(options) {
 // Original guards run before reading options, token or command. No bypass flag.
 const held = () => !managerLegalAdmissionReady() || conciergePrelegalSensitiveHold();
 return Object.freeze({execute:async () => held() ? outcome('HELD','LEGAL_AND_PRELEGAL') : outcome('HELD','SUCCESSOR_NOT_ACCREDITED'),reconcile:async () => outcome('HELD','SUCCESSOR_NOT_ACCREDITED')});
}
export function createIncidentContractReview(options) {
 if (options?.mode !== 'OFFLINE_FIXTURE') fail('OFFLINE_REVIEW_ONLY');
 const {getClaims,resolveCurrent,writer,reader,clock=Date.now,budgetMs=500} = options;
 if (![getClaims,resolveCurrent,writer?.dispatch,reader?.readback,clock].every(x => typeof x === 'function') || writer.dispatch === reader.readback || writer.principal !== 'cheveni_service_manager_backend_v2' || reader.principal !== 'cheveni_incident_readback_backend_v1' || writer.principal === reader.principal || reader.readOnly !== true || !Number.isSafeInteger(budgetMs) || budgetMs<1 || budgetMs>2000) fail('SEPARATE_PROPOSED_PORTS_REQUIRED');
 const sdk = createSdkIdentityBoundary({getClaims}), pending = new Map();
 let floor = 0;
 function now() { const n=clock(); if (!Number.isSafeInteger(n) || n<floor) fail('CLOCK_REGRESSION'); floor=n; return n; }
 async function bounded(fn,deadline) { const ms=deadline-now(); if(ms<=0) fail('DEADLINE'); let t; try { return await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{t=setTimeout(()=>reject(Error('DEADLINE')),ms);})]); } finally { clearTimeout(t); } }
 async function live(token,c,deadline) {
  const id=await bounded(()=>sdk.verify(token,{now:now()}),deadline);
  const r=resolution(await bounded(()=>resolveCurrent(id,c.p_arguments.p_incident_id),deadline),c,id,now());
  verifiedIdentity(id,token,now());
  return {id,r};
 }
 async function read(token,entry,deadline) {
  if(hash(token)!==entry.tokenFingerprint) fail('NEW_BEARER_REQUIRES_NEW_BINDING');
  const {r} = await live(token,entry.command,deadline);
  if (stable(r)!==stable(entry.authority)) fail('AUTHORITY_CHANGED');
  const e=record(await bounded(()=>reader.readback(entry.plan),deadline),['status','intentId','attemptId','userId','sessionId','operation','argsFingerprint','authorityVersion','restrictionVersion','dispatchId','commitId','journalRecordId','witnessRecordId','observedAtMs','expiresAtMs','effect']);
  for (const k of ['intentId','attemptId','userId','sessionId','operation','argsFingerprint','authorityVersion','restrictionVersion']) if(e[k]!==entry.plan[k]) fail('READBACK_CORRELATION');
  if(e.status!=='COMMITTED' || e.dispatchId!==entry.dispatchId || ![e.dispatchId,e.commitId,e.journalRecordId,e.witnessRecordId].every(uuid) || e.journalRecordId===e.witnessRecordId || !Number.isSafeInteger(e.observedAtMs) || !Number.isSafeInteger(e.expiresAtMs) || e.observedAtMs<entry.startedAt || e.observedAtMs>now() || e.expiresAtMs<=now() || e.expiresAtMs-e.observedAtMs>5000) fail('READBACK_EVIDENCE_INCOMPLETE');
  const effect=record(e.effect,['incident_id','resulting_status']);
  if(effect.incident_id!==entry.plan.effect.incident_id || effect.resulting_status!==entry.plan.effect.resulting_status) fail('EFFECT_MISMATCH');
  const final=await live(token,entry.command,deadline); if(stable(final.r)!==stable(entry.authority)) fail('AUTHORITY_CHANGED');
  return outcome('REVIEW_MATCHED','UNSIGNED_MODEL_EVIDENCE_ONLY');
 }
 return Object.freeze({
  async execute(token,input) {
   let entry;
   try {
    const c=snapshot(input), deadline=now()+budgetMs;
    const {r}=await live(token,c,deadline), p=plan(c,r), key=JSON.stringify([p.userId,p.intentId]);
    const prior=pending.get(key);
    if(prior) return outcome(prior.plan.argsFingerprint===p.argsFingerprint?'UNKNOWN':'CONFLICT','NO_AUTOMATIC_RESEND');
    // Reserve before another await, including the second current-authority check.
    entry={command:c,authority:r,plan:p,tokenFingerprint:hash(token),startedAt:now(),dispatchId:c.p_request_id,dispatched:false}; pending.set(key,entry);
    const again=await live(token,c,deadline); if(stable(again.r)!==stable(r)) fail('AUTHORITY_CHANGED_BEFORE_DISPATCH');
    if(c.p_arguments.p_new_status==='learning_pending' && again.r.incidentStatus!=='resolved') fail('INCIDENT_TRANSITION');
    if(c.p_arguments.p_new_status==='closed' && !['resolved','learning_pending'].includes(again.r.incidentStatus)) fail('INCIDENT_TRANSITION');
    entry.dispatched=true;
    // ACK alone NEVER establishes COMMIT; lost/invalid ACK remains UNKNOWN.
    const ack=record(await bounded(()=>writer.dispatch(p),deadline),['nativeCommandId','attemptId','dispatchId','transaction']);
    if(ack.nativeCommandId!==p.nativeCommandId || ack.attemptId!==p.attemptId || ack.dispatchId!==entry.dispatchId || ack.transaction!=='COMMIT') fail('ACK_UNCERTAIN');
    return await read(token,entry,deadline);
   } catch { return outcome(entry?.dispatched?'UNKNOWN':'HELD',entry?.dispatched?'RECONCILIATION_REQUIRED':'PRE_DISPATCH_CONTRACT_HELD'); }
  },
  async reconcile(token,intentId) {
   try {
    if(!uuid(intentId)) fail('INTENT');
    const deadline=now()+budgetMs, id=await bounded(()=>sdk.verify(token,{now:now()}),deadline);
    const entry=pending.get(JSON.stringify([id.userId,intentId]));
    if(!entry?.dispatched) return outcome('UNKNOWN','TRUSTED_SNAPSHOT_UNAVAILABLE');
    return await read(token,entry,deadline);
   } catch { return outcome('UNKNOWN','RECONCILIATION_UNAUTHORIZED_OR_UNRESOLVED'); }
  }
 });
}
