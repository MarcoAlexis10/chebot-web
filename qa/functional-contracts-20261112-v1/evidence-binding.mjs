import {isDeepStrictEqual} from 'node:util';
// Contract review only. No observer callback, provider, SQL, custody or dispatch.
import {record,array,isUuid,positive,out} from '../functional-night-20261112-v1/core.mjs';
import {reviewPropertyLifecycle} from '../functional-night-20261112-v1/property-lifecycle.mjs';
import {reviewStayLifecycle} from '../functional-night-20261112-v1/stay-lifecycle.mjs';
const QA_ISSUER='https://tjdgrzzeuuihhqnzvaox.supabase.co/auth/v1';
const timing=['observedAtMs','expiresAtMs'];
function fresh(value,keys,now){const r=record(value,[...keys,...timing]);if(!Number.isSafeInteger(now)||now<0||!Number.isSafeInteger(r.observedAtMs)||r.observedAtMs<0||r.observedAtMs>now||!positive(r.expiresAtMs)||r.expiresAtMs<=now||r.expiresAtMs-r.observedAtMs>5000)throw Error('SOURCE_STALE');return Object.freeze(r);}
const same=(a,b,keys)=>keys.every(k=>a[k]===b[k]);
function checked(input){
 const v=record(input,['mode','domain','request','observations']);if(v.mode!=='OFFLINE_VECTOR'||!['property','stay'].includes(v.domain))throw Error('OFFLINE_REVIEW_ONLY');
 // Clone only strict JSON-shaped synthetic inputs, after the original validators
 // reject unknown fields/accessors. This is NOT a trusted original or recovery.
 const verdict=v.domain==='property'?reviewPropertyLifecycle(v.request):reviewStayLifecycle(v.request);
 if(!['PROPERTY_TRANSITION_REVIEWED_HELD','STAY_TRANSITION_REVIEWED_HELD'].includes(verdict.state))throw Error('DOMAIN_REVIEW');
 const c=v.request.context,q=v.request.command,now=v.request.nowMs;if(!q.operation.endsWith('.read')&&q.expectedRevision!==null&&q.expectedRevision>=Number.MAX_SAFE_INTEGER)throw Error('REVISION_OVERFLOW');
 const o=record(v.observations,['provider','memberships','restrictions','floor','jurisdiction','quota','building','decision','guestBinding']);
 const p=fresh(o.provider,['issuer','userId','sessionId','sessionRevision','revoked'],now);
 if(p.issuer!==QA_ISSUER||!isUuid(p.userId)||p.sessionId!==c.sessionId||p.sessionRevision!==c.sessionRevision||p.revoked!==false)throw Error('PROVIDER_BINDING');
 const ms=array(o.memberships,2);if(ms.length!==1)throw Error('UNIQUE_MEMBERSHIP_REQUIRED');
 const m=fresh(ms[0],['userId','sessionId','accountId','memberId','role','accountStatus','memberStatus','identityStatus','authorityRevision','restrictionsRevision'],now);
 if(m.userId!==p.userId||m.sessionId!==p.sessionId||!same(m,c,['accountId','memberId','role','authorityRevision','restrictionsRevision'])||!['active','testing'].includes(m.accountStatus)||m.memberStatus!=='active'||m.identityStatus!=='active')throw Error('CURRENT_RELATION');
 const revKeys=['accountId','propertyId','authorityRevision','restrictionsRevision','datasetId','recoveryEpoch','inventoryRevision'];
 const r=fresh(o.restrictions,[...revKeys,'blocked'],now),f=fresh(o.floor,revKeys,now);
 if(r.blocked!==false||!same(r,f,revKeys)||!same(r,c,['accountId','propertyId','authorityRevision','restrictionsRevision','inventoryRevision'])||!isUuid(r.datasetId)||!positive(r.recoveryEpoch))throw Error('INDEPENDENT_FLOOR');
 const j=fresh(o.jurisdiction,['accountId','propertyId','designation','revision'],now),quota=fresh(o.quota,['accountId','allocatedCount','inventoryRevision','revision'],now);
 if(!same(j,c,['accountId','propertyId'])||j.designation!=='CABA'||!positive(j.revision)||quota.accountId!==c.accountId||quota.allocatedCount!==c.cohortCount||quota.inventoryRevision!==c.inventoryRevision||!positive(quota.revision))throw Error('JURISDICTION_OR_QUOTA');
 const buildingId=v.domain==='property'?(q.payload.buildingId??v.request.snapshot?.buildingId??null):null;
 if(buildingId===null){if(o.building!==null)throw Error('UNEXPECTED_BUILDING');}
 else{const b=fresh(o.building,['buildingId','accountId','status','revision'],now);if(b.buildingId!==buildingId||b.accountId!==c.accountId||b.status!=='active'||!positive(b.revision))throw Error('BUILDING_SOURCE');}
 if(q.operation==='property.decision'){
  const d=fresh(o.decision,['reviewRef','accountId','propertyId','reviewedRevision','decision','authorityRevision','reviewerMemberId'],now);
  if(!same(d,c,['accountId','propertyId','authorityRevision'])||d.reviewRef!==q.payload.reviewRef||d.reviewedRevision!==q.expectedRevision||d.decision!==q.payload.decision||!isUuid(d.reviewerMemberId))throw Error('DECISION_SOURCE');
 }else if(o.decision!==null)throw Error('UNEXPECTED_DECISION');
 const guestRef=q.operation==='stay.guest.bind'?q.payload.protectedGuestBindingRef:q.operation==='stay.confirm'?v.request.snapshot.guestBindingRef:null;
 if(guestRef===null){if(o.guestBinding!==null)throw Error('UNEXPECTED_GUEST_BINDING');}
 else{const g=fresh(o.guestBinding,['ref','accountId','propertyId','stayId','identityGeneration','status'],now);if(g.ref!==guestRef||!same(g,c,['accountId','propertyId'])||g.stayId!==q.stayId||!positive(g.identityGeneration)||g.status!=='current')throw Error('GUEST_BINDING_SOURCE');}
 const binding=Object.freeze({userId:p.userId,sessionId:p.sessionId,sessionRevision:p.sessionRevision,accountId:c.accountId,memberId:c.memberId,role:c.role,propertyId:c.propertyId,authorityRevision:c.authorityRevision,restrictionsRevision:c.restrictionsRevision,datasetId:r.datasetId,recoveryEpoch:r.recoveryEpoch,inventoryRevision:r.inventoryRevision,jurisdictionRevision:j.revision,quotaRevision:quota.revision,buildingIdObserved:o.building?.buildingId??null,buildingRevision:o.building?.revision??null,decisionRef:o.decision?.reviewRef??null,decisionReviewer:o.decision?.reviewerMemberId??null,decisionReviewedRevision:o.decision?.reviewedRevision??null,guestRef:o.guestBinding?.ref??null,guestGeneration:o.guestBinding?.identityGeneration??null});
 return {v,verdict,binding};
}
export function createDomainAbiReview(){
 const plans=new WeakMap();
 return Object.freeze({
  compile(input){try{const x=checked(input),q=x.v.request.command;const handle=Object.freeze({kind:'OFFLINE_DOMAIN_ABI_REVIEW_HANDLE'});plans.set(handle,{input:structuredClone(x.v),binding:x.binding,operation:q.operation,intentId:q.intentId,attemptId:q.attemptId,entityRevision:q.expectedRevision,from:x.verdict.from,to:x.verdict.to});return out('DOMAIN_ABI_REVIEW_HELD',{handle,protectedProducerPresent:false,rawArgumentsReturned:false,originalTrusted:false});}catch{return out('DOMAIN_ABI_INCOMPATIBLE_HELD',{handle:null,protectedProducerPresent:false,originalTrusted:false});}},
  describe(handle){const p=plans.get(handle);if(!p)return out('UNKNOWN',{originalTrusted:false});return out('DOMAIN_ABI_REVIEW_HELD',{operation:p.operation,argumentFields:Object.freeze(Object.keys(p.input.request.command.payload)),expectedRevision:p.entityRevision,proposedRevision:p.operation.endsWith('.read')?p.entityRevision:p.entityRevision===null?1:p.entityRevision+1,from:p.from,to:p.to,originalTrusted:false,rawArgumentsReturned:false});},
  compareArguments(handle,candidate){try{const p=plans.get(handle);if(!p)return out('UNKNOWN',{originalTrusted:false});const x=checked(candidate);const equal=isDeepStrictEqual(x.v.request.command,p.input.request.command)&&same(x.binding,p.binding,Object.keys(p.binding));return out(equal?'ARGUMENT_BINDING_MODEL_MATCH_HELD':'ARGUMENT_BINDING_MISMATCH_HELD',{originalTrusted:false,sqlConflictAccredited:false});}catch{return out('ARGUMENT_BINDING_MISMATCH_HELD',{originalTrusted:false,sqlConflictAccredited:false});}},
  revalidate(handle,observations,nowMs){try{const p=plans.get(handle);if(!p)throw Error();const x=checked({...p.input,request:{...p.input.request,nowMs},observations});if(!same(x.binding,p.binding,Object.keys(p.binding)))throw Error();return out('DOMAIN_SOURCES_MODEL_STILL_MATCH_HELD',{protectedProducerPresent:false});}catch{return out('DOMAIN_SOURCES_CHANGED_HELD',{protectedProducerPresent:false});}},
  inspectReceipt(handle,receipt){try{const p=plans.get(handle);if(!p)throw Error();const r=record(receipt,['intentId','attemptId','operation','userId','sessionId','sessionRevision','accountId','memberId','propertyId','authorityRevision','restrictionsRevision','entityRevision','originalRef','dispatchRef','commitRef','readbackRef','journalRef','witnessRef']);const sameBinding=same(r,p.binding,['userId','sessionId','sessionRevision','accountId','memberId','propertyId','authorityRevision','restrictionsRevision'])&&r.intentId===p.intentId&&r.attemptId===p.attemptId&&r.operation===p.operation&&r.entityRevision===p.entityRevision&&['originalRef','dispatchRef','commitRef','readbackRef','journalRef','witnessRef'].every(k=>isUuid(r[k]))&&r.journalRef!==r.witnessRef;return out('UNKNOWN',{untrustedReceiptShapeMatches:sameBinding,externalCommitVerified:false,originalTrusted:false,reconciliationRequired:true});}catch{return out('UNKNOWN',{untrustedReceiptShapeMatches:false,externalCommitVerified:false,originalTrusted:false,reconciliationRequired:true});}},
  release(handle){plans.delete(handle);return out('REVIEW_ARGUMENTS_RELEASED',{originalTrusted:false});}
 });
}
// Missing protected producer: not configurable by caller, never reads arguments.
export function createProtectedDomainPorts(){const held=async()=>out('PROTECTED_DOMAIN_PRODUCER_MISSING',{receipt:null,protectedProducerPresent:false});return Object.freeze({property:held,stay:held,reconcile:async()=>out('UNKNOWN',{originalTrusted:false,reconciliationRequired:true})});}
