// Reuses existing identity/capability boundaries. No transport, keys or Auth default.
import {randomUUID} from 'node:crypto';
import {record,snapshot} from '../domain-security-successor-20261111-v1/incident-successor.mjs';
import {createSdkIdentityBoundary,verifiedIdentity} from '../private-writer-composition-20261111-v1/vendor/qa/writer-gateway-v2/sdk-identity.mjs';
import {timing,isUuid,result,revisionKeys} from '../incident-authority-closure-20261111-v1/current-resolution.mjs';
const fail=()=>{throw Error('PROVIDER_DISPATCH_BINDING_HELD');};
const bindKeys=['requestId','providerBindingRef','userId','sessionId','tokenExpiresAt','intentId','attemptId','dispatchId','originalRef','authorityVersion','restrictionVersion','datasetId','recoveryEpoch','inventoryDigest','restrictionJournalId','restrictionDigest','observedAtMs','expiresAtMs'];
const version=r=>JSON.stringify(revisionKeys.map(k=>r[k]));
export function createProviderDispatchBinding(){return Object.freeze({prepare:async()=>result('HELD_PROVIDER_BINDING_SOURCE_MISSING'),claim:async()=>result('UNKNOWN')});}
export function createProviderBindingReview(options){
 if(options?.mode!=='OFFLINE_FIXTURE')fail();
 const {getClaims,resolver,attestor,clock,budgetMs,newRequestId=randomUUID}=options;
 if(![getClaims,resolver?.resolve,resolver?.inspect,attestor?.originalReference,attestor?.register,attestor?.claim,newRequestId].every(x=>typeof x==='function'))fail();
 const sdk=createSdkIdentityBoundary({getClaims}),time=timing(clock,budgetMs),caps=new WeakMap(),requests=new Set();
 function response(value,expected,now){
  const r=record(value,bindKeys);
  if(!isUuid(r.providerBindingRef))fail();
  for(const k of bindKeys.filter(k=>!['providerBindingRef','observedAtMs','expiresAtMs'].includes(k)))if(r[k]!==expected[k])fail();
  if(!Number.isSafeInteger(r.observedAtMs)||!Number.isSafeInteger(r.expiresAtMs)||r.observedAtMs<0||r.observedAtMs>now||r.expiresAtMs<=now||r.expiresAtMs-r.observedAtMs>5000)fail();return Object.freeze(r);
 }
 async function current(token,c,deadline){const cap=await time.step(()=>resolver.resolve(token,c),deadline);return resolver.inspect(cap,token,c);}
 return Object.freeze({
  async prepare(token,input){
   try{
    const c=snapshot(input);const deadline=time.now()+time.budgetMs;
    const proof=await time.step(()=>sdk.verify(token,{now:time.now()}),deadline),before=await current(token,c,deadline);
    const requestId=newRequestId();if(!isUuid(requestId)||requests.has(requestId))fail();requests.add(requestId);
    const id=verifiedIdentity(proof,token,time.now());if(id.userId!==c.p_auth_user_id||id.sessionId!==c.p_session_id||id.tokenExpiresAt!==String(c.p_token_expires_at))fail();
    const original=record(await time.step(()=>attestor.originalReference(Object.freeze({requestId,userId:id.userId,intentId:c.p_intent_id})),deadline),['requestId','userId','intentId','originalRef']);
    if(original.requestId!==requestId||original.userId!==id.userId||original.intentId!==c.p_intent_id||!isUuid(original.originalRef))fail();
    const originalRef=original.originalRef;verifiedIdentity(proof,token,time.now());
    const v=before.revision,request=Object.freeze({requestId,userId:id.userId,sessionId:id.sessionId,tokenExpiresAt:Number(id.tokenExpiresAt),intentId:c.p_intent_id,attemptId:c.p_request_id,dispatchId:c.p_request_id,originalRef,authorityVersion:v.authorityVersion,restrictionVersion:v.restrictionVersion,datasetId:v.datasetId,recoveryEpoch:v.recoveryEpoch,inventoryDigest:v.inventoryDigest,restrictionJournalId:v.restrictionJournalId,restrictionDigest:v.restrictionDigest});
    // A private in-process proof capability, not serializable JWT metadata.
    // No token or bearer digest is placed in the durable request. External
    // attestor transport/provenance remains an unimplemented held dependency.
    let active=true,used=false;
    const proofPort=Object.freeze({useVerifiedIdentity(){if(!active||used)fail();used=true;return verifiedIdentity(proof,token,time.now());}});
    let bound;try{bound=response(await time.step(()=>attestor.register(request,proofPort),deadline),request,time.now());}finally{active=false;}
    if(!used)fail();verifiedIdentity(proof,token,time.now());
    const after=await current(token,c,deadline);if(version(before.revision)!==version(after.revision)||before.resolution.memberRole!==after.resolution.memberRole)fail();
    const cap=Object.freeze({kind:'OFFLINE_PROVIDER_BINDING_REVIEW',held:true,fixtureOnly:true,actualProviderVerified:false,actualSqlVerified:false,operationalApproval:false});
    caps.set(cap,{command:c,proof,request,bound,revision:after.revision,role:after.resolution.memberRole,claimed:false});return cap;
   }catch{return result('HELD_PROVIDER_BINDING');}
  },
  async claim(cap,token,input){
   let possiblyClaimed=false;
   try{
    const e=caps.get(cap),c=snapshot(input);if(!e||e.claimed||JSON.stringify(c)!==JSON.stringify(e.command))fail();
    verifiedIdentity(e.proof,token,time.now());if(e.bound.expiresAtMs<=time.now())fail();
    const deadline=time.now()+time.budgetMs,before=await current(token,c,deadline);
    if(version(before.revision)!==version(e.revision)||before.resolution.memberRole!==e.role)fail();
    // Reserve before awaiting the custodian; no replay after uncertain ACK.
    e.claimed=true;possiblyClaimed=true;
    const got=response(await time.step(()=>attestor.claim(Object.freeze({...e.request,providerBindingRef:e.bound.providerBindingRef})),deadline),e.request,time.now());
    if(got.providerBindingRef!==e.bound.providerBindingRef)fail();verifiedIdentity(e.proof,token,time.now());
    const after=await current(token,c,deadline);if(version(after.revision)!==version(e.revision)||after.resolution.memberRole!==e.role)fail();
    return Object.freeze({state:'REVIEW_BOUND_CLAIM',providerBindingRef:got.providerBindingRef,context:e.request,held:true,fixtureOnly:true,actualProviderVerified:false,actualSqlVerified:false,actualJournalVerified:false,operationalApproval:false,betaDecision:'NO-GO'});
   }catch{return result(possiblyClaimed?'UNKNOWN':'HELD_PROVIDER_BINDING');}
  }
 });
}
