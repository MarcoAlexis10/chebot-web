// Semantic effects only. No SQL text, endpoint, driver or executable dispatch plan.
import {record,positive,out} from '../functional-night-20261112-v1/core.mjs';
import {createDomainAbiReview} from './evidence-binding.mjs';
const effects=Object.freeze({
 'property.draft.create':['ENTITY_CREATE','ATOMIC_FOUNDER_SLOT','AUDIT'],
 'property.read':['CURRENT_PRIVATE_READ'],
 'property.configure':['ENTITY_CAS','CONFIGURATION_REVISION','PUBLIC_APPROVAL_INVALIDATION','AUDIT'],
 'property.submit':['ENTITY_CAS','REVIEW_REQUEST','AUDIT'],
 'property.decision':['ENTITY_CAS','CURRENT_DECISION','READINESS_RECHECK','AUDIT'],
 'property.pause':['ENTITY_CAS','REVOKE_PROPERTY_ACCESS','WITHDRAW_PUBLIC_CATALOG','PUBLISH_REVOCATION_FLOOR','AUDIT'],
 'property.archive':['ENTITY_CAS','REVOKE_PROPERTY_ACCESS','WITHDRAW_PUBLIC_CATALOG','PRESERVE_HISTORY_AND_SLOT','PUBLISH_REVOCATION_FLOOR','AUDIT'],
 'stay.draft.create':['ENTITY_CREATE','AUDIT'],
 'stay.guest.bind':['ENTITY_CAS','CURRENT_GUEST_IDENTITY_BINDING','AUDIT'],
 'stay.confirm':['ENTITY_CAS','ACCESS_EXCLUSION','CURRENT_GUEST_IDENTITY_BINDING','REVIEW_INVITE_BINDINGS','AUDIT'],
 'stay.dates.change':['ENTITY_CAS','ACCESS_EXCLUSION','INVALIDATE_PRIOR_STAY_BINDINGS','RECONCILE_EXISTING_INVITES','PUBLISH_REVOCATION_FLOOR','AUDIT'],
 'stay.cancel':['ENTITY_CAS','REVOKE_STAY_ACCESS','REVOKE_INVITES','PUBLISH_REVOCATION_FLOOR','AUDIT'],
 'stay.checkout':['ENTITY_CAS','REVOKE_PROPERTY_ACCESS_FOR_STAY','REVOKE_INVITES','AUTHORIZED_POSTCHECKOUT_CASE_ONLY','PUBLISH_REVOCATION_FLOOR','AUDIT'],
 'stay.history.read':['CURRENT_PRIVATE_READ']
});
export function reviewEffects(input){
 const review=createDomainAbiReview(),p=review.compile(input);if(!p.handle)return out('EFFECT_CONTRACT_INCOMPATIBLE_HELD',{effects:Object.freeze([])});
 try{const d=review.describe(p.handle),list=effects[d.operation];if(!list)throw Error();const revocationRequired=list.some(x=>/REVOKE_|INVALIDATE_|REVOCATION_FLOOR|WITHDRAW_/.test(x));return out('EFFECT_CONTRACT_REVIEWED_HELD',{operation:d.operation,effects:Object.freeze([...list]),proposedRevision:d.proposedRevision,revocationRequired,accessGrantAllowed:false,invitationSendAllowed:false,implicitGuestCreationAllowed:false,sqlExclusionAccredited:false,effectReceipt:null});}
 catch{return out('EFFECT_CONTRACT_INCOMPATIBLE_HELD',{effects:Object.freeze([])});}finally{review.release(p.handle);}
}
export function reviewPrivatePrimitive(operation){
 if(operation==='property.pause')return out('NATIVE_SUSPEND_NOT_PROPERTY_PAUSE',{nativeOperation:'suspend',actualTarget:'launch_control',requiredTarget:'concierge_properties',mappingAllowed:false});
 if(operation==='stay.checkout')return out('NATIVE_CHECKOUT_ABI_SUCCESSOR_REQUIRED',{businessOperationExists:true,expectedRevisionRepresentable:false,independentReadbackPresent:false,mappingAllowed:false});
 return out('PRIVATE_PRIMITIVE_NOT_MAPPED',{mappingAllowed:false});
}
export function reviewNativeCheckout(input){
 try{
  const v=record(input,['mode','boundInput','identityContract']);if(v.mode!=='OFFLINE_VECTOR'||v.boundInput.request.command.operation!=='stay.checkout')throw Error();
  const r=createDomainAbiReview(),c=r.compile(v.boundInput);if(!c.handle)throw Error();r.release(c.handle);
  const i=record(v.identityContract,['userId','sessionId','tokenExpiresAtSeconds']),q=v.boundInput.request.command,o=v.boundInput.observations;
  if(i.userId!==o.provider.userId||i.sessionId!==q.expectedSessionId||typeof i.tokenExpiresAtSeconds!=='string'||!/^[1-9]\d*$/.test(i.tokenExpiresAtSeconds)||!Number.isSafeInteger(Number(i.tokenExpiresAtSeconds))||Number(i.tokenExpiresAtSeconds)>253402300799||Number(i.tokenExpiresAtSeconds)<=Math.floor(v.boundInput.request.nowMs/1000))throw Error();
  // Token exp is seconds from a verified provider contract in the future.
  // Observation expiresAtMs is a different clock and must never fill p_exp.
  return out('NATIVE_CHECKOUT_BUSINESS_PROJECTION_ONLY_HELD',{nativeEntry:'concierge_service_qa_v1.manager_action(uuid,uuid,bigint,uuid,uuid,uuid,text,jsonb)',semanticProjection:Object.freeze({commandId:q.intentId,attemptIdNotUsedAsCommand:true,tokenExpiresAtSeconds:i.tokenExpiresAtSeconds,propertyId:q.propertyId,stayId:q.stayId,operation:'checkout',valueShape:'EMPTY_OBJECT'}),unrepresentedFields:Object.freeze(['entityRevision','sessionRevision','authorityRevision','restrictionsRevision','inventoryRevision','originalProtectedRef','attemptId','independentCommitReadbackBinding']),dispatchPlan:null,mappingAllowed:false,actualProviderVerified:false});
 }catch{return out('NATIVE_CHECKOUT_BINDING_INCOMPATIBLE_HELD',{dispatchPlan:null,mappingAllowed:false});}
}
