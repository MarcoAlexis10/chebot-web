import {isDeepStrictEqual} from 'node:util';
// Focused property_create ABI review. No provider, writer, SQL or durable store.
import {record,array,isUuid,positive,out} from '../functional-night-20261112-v1/core.mjs';
import {createDomainAbiReview} from '../functional-contracts-20261112-v1/evidence-binding.mjs';
import {reviewPropertyCapture} from '../functional-contracts-20261112-v1/property-capture-adapter.mjs';
const issuer='https://tjdgrzzeuuihhqnzvaox.supabase.co/auth/v1';
export const CAPTURE_ABI='first-property-review/1';
const fields=['p_user','p_session','p_expiry','p_member','p_role','p_revision','p_account','p_intent','p_key','p_address','p_floor'];
function checked(input){
 const v=record(input,['mode','captureVector','authorityRequest','authorityRows','founder','mutationKey','providerToken']);if(v.mode!=='OFFLINE_VECTOR')throw Error('OFFLINE_ONLY');
 if(reviewPropertyCapture(v.captureVector).state!=='PROPERTY_CAPTURE_BUSINESS_SUBSET_REVIEWED_HELD')throw Error('CAPTURE_COMPATIBILITY');
 const b=v.captureVector.boundInput,c=b.request.context,q=b.request.command,p=b.observations.provider;
 const a=record(v.authorityRequest,['userId','sessionId','tokenExpiresAtSeconds','propertyId','operation']);
 if(p.issuer!==issuer||a.userId!==p.userId||a.sessionId!==c.sessionId||a.propertyId!==null||a.operation!=='property_create'||typeof a.tokenExpiresAtSeconds!=='string'||!/^[1-9]\d*$/.test(a.tokenExpiresAtSeconds)||!Number.isSafeInteger(Number(a.tokenExpiresAtSeconds))||Number(a.tokenExpiresAtSeconds)>253402300799||Number(a.tokenExpiresAtSeconds)<=Math.floor(b.request.nowMs/1000)||typeof v.mutationKey!=='string'||!/^[a-f0-9]{64}$/.test(v.mutationKey))throw Error('AUTHORITY_REQUEST');
 const token=record(v.providerToken,['kind','issuer','userId','sessionId','sessionRevision','issuedAtSeconds','expiresAtSeconds']);
 const seconds=x=>typeof x==='string'&&/^[1-9]\d*$/.test(x)&&Number.isSafeInteger(Number(x))&&Number(x)<=253402300799;
 if(token.kind!=='SYNTHETIC_NOT_VERIFIED'||token.issuer!==issuer||token.userId!==a.userId||token.sessionId!==a.sessionId||token.sessionRevision!==c.sessionRevision||!seconds(token.issuedAtSeconds)||!seconds(token.expiresAtSeconds)||Number(token.issuedAtSeconds)>Math.floor(b.request.nowMs/1000)||Number(token.issuedAtSeconds)>=Number(token.expiresAtSeconds)||token.expiresAtSeconds!==a.tokenExpiresAtSeconds)throw Error('PROVIDER_TOKEN_EXPIRY_BINDING');
 const rows=array(v.authorityRows,2);if(rows.length!==1)throw Error('UNIQUE_PROPERTY_CREATE_AUTHORITY_REQUIRED');
 const native=record(rows[0],['account_id','member_id','member_role','authority_revision']);
 if(native.account_id!==c.accountId||native.member_id!==c.memberId||native.member_role!=='owner'||c.role!=='owner'||native.authority_revision!==c.authorityRevision)throw Error('NATIVE_AUTHORITY_TUPLE');
 const f=record(v.founder,['userId','sessionId','memberId','accountId','state','scopeRevision','quotaRevision','jurisdictionRevision','datasetId','recoveryEpoch','observedAtMs','expiresAtMs']);
 if(f.userId!==a.userId||f.sessionId!==a.sessionId||f.memberId!==c.memberId||f.accountId!==c.accountId||f.state!=='CANDIDATE_NOT_AUTHORIZED'||!positive(f.scopeRevision)||f.quotaRevision!==b.observations.quota.revision||f.jurisdictionRevision!==b.observations.jurisdiction.revision||f.datasetId!==b.observations.restrictions.datasetId||f.recoveryEpoch!==b.observations.restrictions.recoveryEpoch||!Number.isSafeInteger(f.observedAtMs)||f.observedAtMs<0||f.observedAtMs>b.request.nowMs||!positive(f.expiresAtMs)||f.expiresAtMs<=b.request.nowMs||f.expiresAtMs-f.observedAtMs>5000)throw Error('FOUNDER_BINDING');
 return {v,b,c,q,a,f,token};
}
export function reviewFirstProperty(input){try{const x=checked(input);return out('FIRST_PROPERTY_ABI_REVIEWED_HELD',{abi:CAPTURE_ABI,nativeOperation:x.a.operation,nativeArgumentNames:Object.freeze([...fields]),role:'owner',propertyTarget:null,authorityTupleModelMatched:true,founderAccredited:false,slotGuaranteeAccredited:false,jurisdictionAccredited:false,nativeAttemptArgumentPresent:false,protectedOriginalAvailable:false,nativeProducerReturnsZeroRows:true,privateArgumentsReturned:false,writerDescriptor:null});}catch{return out('FIRST_PROPERTY_ABI_INCOMPATIBLE_HELD',{writerDescriptor:null,protectedOriginalAvailable:false});}}
export function compareIntentReview(original,candidate){
 const domain=createDomainAbiReview();let handle;
 try{const a=checked(original),b=checked(candidate),compiled=domain.compile(a.v.captureVector.boundInput);handle=compiled.handle;
  const founderKeys=['userId','sessionId','memberId','accountId','state','scopeRevision','quotaRevision','jurisdictionRevision','datasetId','recoveryEpoch'];
  const same=handle&&domain.compareArguments(handle,b.v.captureVector.boundInput).state==='ARGUMENT_BINDING_MODEL_MATCH_HELD'&&isDeepStrictEqual(a.a,b.a)&&isDeepStrictEqual(a.token,b.token)&&founderKeys.every(k=>a.f[k]===b.f[k])&&a.v.mutationKey===b.v.mutationKey&&isDeepStrictEqual(a.v.captureVector.privateCapture,b.v.captureVector.privateCapture);
  return out(same?'SAME_SYNTHETIC_CAPTURE_REVIEW_HELD':'CAPTURE_BINDING_DIFFERENCE_HELD',{durableOriginalTrusted:false,sqlConflictAccredited:false,automaticRetryAllowed:false});
 }catch{return out('CAPTURE_BINDING_DIFFERENCE_HELD',{durableOriginalTrusted:false,sqlConflictAccredited:false});}finally{if(handle)domain.release(handle);}
}
export function createProtectedFirstProperty(){const held=async()=>out('PROPERTY_CREATE_AUTHORITY_SOURCE_UNAVAILABLE',{receipt:null,writerDescriptor:null});return Object.freeze({prepare:held,write:held,read:async()=>out('UNKNOWN',{reconciliationRequired:true,protectedOriginalAvailable:false})});}
