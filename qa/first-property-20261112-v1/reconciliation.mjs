// Synthetic ABI review only. No driver, callbacks, durable original or verifier.
import {isDeepStrictEqual} from 'node:util';
import {record,isUuid,positive,out} from '../functional-night-20261112-v1/core.mjs';
export const READER_ABI='property-capture-independent-read/2';
export const proposedReaderProfile=Object.freeze({
 abi:READER_ABI,sessionUser:'cheveni_property_capture_reader_backend_v2',
 currentUser:'cheveni_property_capture_read_owner_v2',ownerLogin:false,
 entry:'concierge_invite_private.read_property_capture_v2',installed:false,
 directTableAccess:false,writeExecute:false,writeRoleMembership:false,
 legacyReceiptCompatible:false,nativeReadOnlyAccredited:false
});
const bindingFields=['userId','sessionId','accountId','memberId','role','operation','intentId','attemptId','originalRef','mutationKey','authorityRevision','founderRevision','quotaRevision','jurisdictionRevision','datasetId','recoveryEpoch','restrictionsRevision','inventoryRevision','inventoryDigest','restrictionDigest','restrictionJournalId','bootstrapProvenanceRef','authorityCommitRef'];
function binding(raw){const b=record(raw,bindingFields);for(const k of ['userId','sessionId','accountId','memberId','intentId','attemptId','originalRef'])if(!isUuid(b[k]))throw Error('BINDING_ID');
 for(const k of ['authorityRevision','founderRevision','quotaRevision','jurisdictionRevision','recoveryEpoch','restrictionsRevision','inventoryRevision'])if(!positive(b[k]))throw Error('REVISION');
 if(b.role!=='owner'||b.operation!=='property_create'||typeof b.datasetId!=='string'||!/^[a-f0-9]{64}$/.test(b.datasetId)||typeof b.mutationKey!=='string'||!/^[a-f0-9]{64}$/.test(b.mutationKey))throw Error('BINDING');for(const k of ['inventoryDigest','restrictionDigest'])if(typeof b[k]!=='string'||!/^[a-f0-9]{64}$/.test(b[k]))throw Error('FLOOR_DIGEST');if(typeof b.restrictionJournalId!=='string'||!/^qa_[a-z_]{1,64}$/.test(b.restrictionJournalId)||!isUuid(b.bootstrapProvenanceRef)||!isUuid(b.authorityCommitRef))throw Error('PROVENANCE');return b;}
const unknown=(reason,extra={})=>out('UNKNOWN',{abi:READER_ABI,reason,propertyId:null,configurationReady:false,externalCommitVerified:false,protectedOriginalAvailable:false,privateResultExposed:false,reconciliationRequired:true,...extra});
// A SQL function result/ACK has six historical fields and cannot attest attempt,
// session, COMMIT or journal. This parser deliberately never settles an effect.
export function reviewFunctionReceipt(raw){try{const r=record(raw,['version','key','intentId','accountId','state','propertyId']);if(r.version!=='CHEVENI_PROPERTY_CAPTURE_1'||typeof r.key!=='string'||!/^[a-f0-9]{64}$/.test(r.key)||!isUuid(r.intentId)||!isUuid(r.accountId)||!['COMMITTED','UNKNOWN','HELD','DENIED_NO_EFFECT'].includes(r.state)||!(r.state==='COMMITTED'?isUuid(r.propertyId):r.propertyId===null))throw Error();return unknown('FUNCTION_RESULT_IS_NOT_EXTERNAL_COMMIT',{historicalState:r.state});}catch{return unknown('INVALID_FUNCTION_RESULT');}}
export function reviewReconciliation(raw){try{
 const v=record(raw,['mode','binding','nowMs','authority','original','dispatch','commit','effect','journal','readback']);if(v.mode!=='OFFLINE_VECTOR'||!positive(v.nowMs))throw Error();const b=binding(v.binding);
 const a=record(v.authority,['binding','state','observedAtMs','expiresAtMs','tokenExpiresAtMs']);
 if(!isDeepStrictEqual(binding(a.binding),b)||a.state!=='SYNTHETIC_CURRENT_NOT_VERIFIED'||!positive(a.observedAtMs)||a.observedAtMs>v.nowMs||!positive(a.expiresAtMs)||a.expiresAtMs<=v.nowMs||a.expiresAtMs-a.observedAtMs>5000||!positive(a.tokenExpiresAtMs)||a.tokenExpiresAtMs<=v.nowMs)return unknown('CURRENT_AUTHORITY_UNAVAILABLE');
 const original=record(v.original,['binding','custody']);if(!isDeepStrictEqual(binding(original.binding),b)||original.custody!=='SYNTHETIC_NOT_TRUSTED')return unknown('ORIGINAL_UNAVAILABLE');
 const roles={dispatch:'DISPATCH_MODEL',commit:'EXTERNAL_COMMIT_MODEL',effect:'EFFECT_ROW_MODEL',journal:'JOURNAL_MODEL',readback:'INDEPENDENT_READBACK_MODEL'};
 const validated=[];for(const [k,kind]of Object.entries(roles)){
  const e=record(v[k],['kind','binding','propertyId','observedAtMs','expiresAtMs']);
  if(e.kind!==kind||!isDeepStrictEqual(binding(e.binding),b)||!isUuid(e.propertyId)||!positive(e.observedAtMs)||e.observedAtMs>v.nowMs||!positive(e.expiresAtMs)||e.expiresAtMs<=v.nowMs||e.expiresAtMs-e.observedAtMs>5000)return unknown('INCOMPLETE_OR_CONTRADICTORY_EVIDENCE');
  validated.push(e);
 }
 if(validated.some(e=>e.propertyId!==validated[0].propertyId))return unknown('INCOMPLETE_OR_CONTRADICTORY_EVIDENCE');
 return unknown('SYNTHETIC_CHAIN_NOT_ACCREDITED',{syntheticFieldsConsistent:true});
 }catch{return unknown('INCOMPLETE_OR_UNTRUSTED_EVIDENCE');}}
// Missing protected source/custody/verifiers cannot be supplied by caller options.
export function createProtectedCaptureReader(){return Object.freeze({read:async()=>unknown('PROTECTED_READER_AND_ORIGINAL_UNAVAILABLE')});}
