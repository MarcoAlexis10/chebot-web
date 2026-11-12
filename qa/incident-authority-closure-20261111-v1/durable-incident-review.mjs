// Proposed durable ports, exercised ONLY with explicit doubles. No driver/store default.
import {record,snapshot,createHeldIncidentCandidate} from '../domain-security-successor-20261111-v1/incident-successor.mjs';
import {createCurrentResolutionReview,timing,result,fail,isUuid,revisionKeys} from './current-resolution.mjs';
import {createHash} from 'node:crypto';
export const WRITER_LOGIN='cheveni_incident_writer_backend_v1';
export const READER_LOGIN='cheveni_incident_readback_backend_v1';
export const WRITE_SQL='select concierge_incident_private_v1.change_state_v1($1::uuid,$2::uuid,$3::bigint,$4::uuid,$5::uuid,$6::uuid,$7::uuid,$8::uuid,$9::uuid,$10::uuid,$11::uuid,$12::uuid,$13::text,$14::text,$15::bigint,$16::jsonb) as result';
export const READ_SQL='select concierge_incident_private_v1.read_effect_v1($1::uuid,$2::uuid,$3::bigint,$4::uuid,$5::uuid,$6::uuid,$7::uuid,$8::bigint,$9::jsonb) as result';
const digest=x=>createHash('sha256').update(x).digest('hex');
const bindingKeys=['userId','intentId','attemptId','sessionId','tokenExpiresAt','authorityVersion','restrictionVersion','dispatchId'];
const floorView=r=>Object.freeze(Object.fromEntries(revisionKeys.map(k=>[k,r[k]])));
const revisionBinding=r=>JSON.stringify(revisionKeys.map(k=>r[k]));
const immutableArgs=c=>JSON.stringify(c.p_arguments);
export function createHeldIncidentAuthorityCandidate(options){return createHeldIncidentCandidate(options);}
export function createDurableIncidentReview(options){
 if(options?.mode!=='OFFLINE_FIXTURE')fail();
 const {resolutionOptions,intents,writer,reader,clock,budgetMs}=options;
 if(![intents?.admit,intents?.loadOriginal,intents?.claimDispatch,writer?.dispatch,reader?.readback].every(x=>typeof x==='function')||writer.principal!==WRITER_LOGIN||reader.principal!==READER_LOGIN||writer.dispatch===reader.readback||reader.readOnly!==true)fail();
 const resolver=createCurrentResolutionReview(resolutionOptions),time=timing(clock,budgetMs),pending=new Map();
 async function current(token,c,deadline){const cap=await time.step(()=>resolver.resolve(token,c),deadline);return resolver.inspect(cap,token,c);}
 function checkedBinding(value,expected){
  const x=record(value,['state','originalRef',...bindingKeys]);
  if(!['NEW','KNOWN','DISPATCH_CLAIMED'].includes(x.state)||![x.originalRef,x.userId,x.intentId,x.attemptId,x.sessionId,x.dispatchId].every(isUuid)||!['tokenExpiresAt','authorityVersion','restrictionVersion'].every(k=>Number.isSafeInteger(x[k])&&x[k]>0))fail();
  // KNOWN describes the ORIGINAL binding. Never relabel its attempt/session
  // as the new request to make history appear compatible; it cannot dispatch.
  for(const k of (x.state==='KNOWN'?['userId','intentId']:bindingKeys))if(x[k]!==expected[k])fail();
  return Object.freeze(x);
 }
 function expected(c,r){return Object.freeze({userId:c.p_auth_user_id,intentId:c.p_intent_id,attemptId:c.p_request_id,sessionId:c.p_session_id,tokenExpiresAt:c.p_token_expires_at,authorityVersion:r.resolution.authorityVersion,restrictionVersion:r.resolution.restrictionVersion,dispatchId:c.p_request_id});}
 async function original(binding,c,r,deadline){
  const value=await time.step(()=>intents.loadOriginal(Object.freeze({userId:c.p_auth_user_id,intentId:c.p_intent_id,originalRef:binding.originalRef})),deadline);
  const o=record(value,['originalRef','userId','intentId','operation','accountId','memberId','propertyId','stayId','arguments']);
  if(o.originalRef!==binding.originalRef||o.userId!==c.p_auth_user_id||o.intentId!==c.p_intent_id||o.operation!==c.p_operation)fail();
  const a=record(o.arguments,['p_incident_id','p_account_member_id','p_new_status','p_event_summary']);
  const trusted=snapshot({...c,p_arguments:a});
  // Contradictory historical scope is unresolved evidence, not an argument
  // conflict. Do not turn that uncertainty into a terminal classification.
  if(!['accountId','memberId','propertyId','stayId'].every(k=>o[k]===r.resolution[k]))fail();
  return immutableArgs(trusted)===immutableArgs(c);
 }
 async function read(token,e,deadline){
  if(digest(token)!==e.bearerHash)fail();
  const before=await current(token,e.command,deadline);
  if(revisionBinding(before.revision)!==revisionBinding(e.current.revision)||JSON.stringify(before.resolution.memberRole)!==JSON.stringify(e.current.resolution.memberRole))fail();
  // A new call always revalidates relationships and original custody; never write.
  if(!await original(e.binding,e.command,before,deadline))fail();
  const c=e.command,b=e.binding,request=Object.freeze({text:READ_SQL,values:Object.freeze([b.userId,b.sessionId,b.tokenExpiresAt,b.intentId,b.attemptId,b.dispatchId,b.originalRef,b.authorityVersion,floorView(before.revision)]),readOnly:true});
  const v=record(await time.step(()=>reader.readback(request),deadline),['state','originalRef',...bindingKeys,'incidentId','resultingStatus','recoveryEpoch','observedAtMs','expiresAtMs']);
  for(const k of bindingKeys)if(v[k]!==b[k])fail();
  if(v.state!=='EFFECT_OBSERVED'||v.originalRef!==b.originalRef||v.incidentId!==c.p_arguments.p_incident_id||v.resultingStatus!==c.p_arguments.p_new_status||v.recoveryEpoch!==before.revision.recoveryEpoch||!Number.isSafeInteger(v.observedAtMs)||!Number.isSafeInteger(v.expiresAtMs)||v.observedAtMs<e.startedAt||v.observedAtMs>time.now()||v.expiresAtMs<=time.now()||v.expiresAtMs-v.observedAtMs>5000)fail();
  const after=await current(token,c,deadline);if(revisionBinding(after.revision)!==revisionBinding(before.revision))fail();
  return result('REVIEW_EFFECT_OBSERVED');
 }
 return Object.freeze({
  async execute(token,input){
   let admissionPossible=false;
   try{
    const c=snapshot(input),deadline=time.now()+time.budgetMs,first=await current(token,c,deadline),key=JSON.stringify([c.p_auth_user_id,c.p_intent_id]);
    const exp=expected(c,first);admissionPossible=true;
    const binding=checkedBinding(await time.step(()=>intents.admit(exp),deadline),exp);
    const matches=await original(binding,c,first,deadline);
    if(!matches)return result(binding.state==='KNOWN'?'CONFLICT':'UNKNOWN');
    // A durable source decides NEW. Memory absence is never admission evidence.
    if(binding.state!=='NEW'||pending.has(key))return result('UNKNOWN');
    const entry={command:c,binding,current:first,bearerHash:digest(token),startedAt:time.now()};pending.set(key,entry);
    const again=await current(token,c,deadline);if(revisionBinding(again.revision)!==revisionBinding(first.revision))fail();
    const a=c.p_arguments,r=again.resolution;
    if(a.p_new_status==='learning_pending'&&r.incidentStatus!=='resolved'||a.p_new_status==='closed'&&!['resolved','learning_pending'].includes(r.incidentStatus))fail();
    const claimed=checkedBinding(await time.step(()=>intents.claimDispatch(Object.freeze({...exp,originalRef:binding.originalRef})),deadline),exp);
    if(claimed.state!=='DISPATCH_CLAIMED'||claimed.originalRef!==binding.originalRef)fail();
    // Revalidate AGAIN after the durable claim await: revocation can win there.
    const fresh=await current(token,c,deadline);if(revisionBinding(fresh.revision)!==revisionBinding(first.revision))fail();
    const p=fresh.plan,request=Object.freeze({text:WRITE_SQL,values:Object.freeze([exp.userId,exp.sessionId,exp.tokenExpiresAt,exp.intentId,exp.attemptId,exp.dispatchId,binding.originalRef,r.accountId,r.memberId,r.propertyId,r.stayId,a.p_incident_id,a.p_new_status,a.p_event_summary,exp.authorityVersion,floorView(fresh.revision)]),readOnly:false});
    // Uses the shared compiler's exact business mapping, not create_stay/REST.
    if(p.parameters[7].summary!==a.p_event_summary||p.parameters[7].incidentId!==a.p_incident_id)fail();
    const ack=record(await time.step(()=>writer.dispatch(request),deadline),['dispatchId','transaction']);
    if(ack.dispatchId!==exp.dispatchId||ack.transaction!=='COMMIT')fail();
    return await read(token,entry,deadline);
   }catch{return result(admissionPossible?'UNKNOWN':'HELD');}
  },
  async reconcile(token,intentId){
   try{
    if(!isUuid(intentId))fail();
    // No recovered client snapshot or synthetic NEW after restart.
    const entries=[...pending.values()].filter(e=>e.command.p_intent_id===intentId&&e.bearerHash===digest(token));
    if(entries.length!==1)return result('UNKNOWN');
    return await read(token,entries[0],time.now()+time.budgetMs);
   }catch{return result('UNKNOWN');}
  }
 });
}
