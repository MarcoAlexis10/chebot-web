// Specific read/2 compatibility review. Never current authority or settlement.
import {isDeepStrictEqual} from 'node:util';
import {reviewRevisionCut} from '../incident-native17-review-20261111-v1/revision-cut.mjs';
import {record,isUuid,positive,out} from '../functional-night-20261112-v1/core.mjs';
import {createProtectedCaptureReader,proposedReaderProfile} from '../first-property-20261112-v1/reconciliation.mjs';
const issuer='https://tjdgrzzeuuihhqnzvaox.supabase.co/auth/v1';
const unknown=(reason,consistent=false)=>out('UNKNOWN',{reason,currentReadModelConsistent:consistent,propertyId:null,privateResultExposed:false,externalCommitVerified:false,originalTrusted:false,automaticRetryAllowed:false});
const seconds=x=>typeof x==='string'&&/^[1-9]\d*$/.test(x)&&Number.isSafeInteger(Number(x))&&Number(x)<=253402300799;
const originalKeys=['kind','userId','accountId','memberId','operation','intentId','attemptId','originalRef','originalSessionId','originalAuthorityRevision'];
const requestKeys=['readRequestId','userId','sessionId','sessionRevision','issuer','tokenIssuedAtSeconds','tokenExpiresAtSeconds','accountId','memberId','intentId','attemptId','originalRef','operation'];
const cutKeys=['kind','readRequestId','userId','sessionId','sessionRevision','accountId','memberId','role','permission','authorityRevision','restrictionsRevision','datasetId','recoveryEpoch','inventoryDigest','restrictionJournalId','restrictionDigest','bootstrapProvenanceRef','authorityCommitRef','revoked','identityStatus','memberStatus','accountStatus','propertyCount','slotCount','resolvedPropertyId','slotPropertyId','propertyAccountId','slotAccountId','propertyStatus','observedAtMs','expiresAtMs'];
function cut(raw,q,now){const c=record(raw,cutKeys);
 if(c.kind!=='SYNTHETIC_NOT_VERIFIED'||!['readRequestId','userId','sessionId','sessionRevision','accountId','memberId'].every(k=>c[k]===q[k])||c.role!=='owner'||c.permission!=='SYNTHETIC_PROPERTY_CAPTURE_READ'||c.revoked!==false||c.identityStatus!=='active'||c.memberStatus!=='active'||!['active','testing'].includes(c.accountStatus)||!['authorityRevision','restrictionsRevision','recoveryEpoch'].every(k=>positive(c[k]))||typeof c.datasetId!=='string'||!/^[a-f0-9]{64}$/.test(c.datasetId)||c.propertyCount!==1||c.slotCount!==1||!isUuid(c.resolvedPropertyId)||c.slotPropertyId!==c.resolvedPropertyId||c.propertyAccountId!==q.accountId||c.slotAccountId!==q.accountId||!['draft','active'].includes(c.propertyStatus)||!positive(c.observedAtMs)||c.observedAtMs>now||!positive(c.expiresAtMs)||c.expiresAtMs<=now||c.expiresAtMs-c.observedAtMs>5000)throw Error('CURRENT_READ_SCOPE');return c;}
export function reviewPostCaptureRead(raw){try{
 const v=record(raw,['mode','startedAtMs','checkedAtMs','request','original','before','after','beforeFloor','afterFloor']);if(v.mode!=='OFFLINE_VECTOR'||!positive(v.startedAtMs)||!positive(v.checkedAtMs)||v.checkedAtMs<v.startedAtMs||v.checkedAtMs-v.startedAtMs>5000)throw Error();
 const q=record(v.request,requestKeys),o=record(v.original,originalKeys);
 if(!['readRequestId','userId','sessionId','accountId','memberId','intentId','attemptId','originalRef'].every(k=>isUuid(q[k]))||!positive(q.sessionRevision)||q.issuer!==issuer||q.operation!=='property_capture_read'||!seconds(q.tokenIssuedAtSeconds)||!seconds(q.tokenExpiresAtSeconds)||Number(q.tokenIssuedAtSeconds)*1000>v.startedAtMs||Number(q.tokenExpiresAtSeconds)*1000<=v.checkedAtMs)throw Error('CURRENT_TOKEN');
 if(o.kind!=='SYNTHETIC_NOT_TRUSTED'||o.operation!=='property_create'||!['userId','accountId','memberId','intentId','attemptId','originalRef'].every(k=>o[k]===q[k])||!isUuid(o.originalSessionId)||!positive(o.originalAuthorityRevision))throw Error('ORIGINAL');
 const before=cut(v.before,q,v.startedAtMs),after=cut(v.after,q,v.checkedAtMs);
 // Historical authority/session are not a current read permission. Freeze only
 // the current read cut across awaits; do not rewrite the original's revision.
 for(const [cutValue,floorValue,now] of [[before,v.beforeFloor,v.startedAtMs],[after,v.afterFloor,v.checkedAtMs]]){
  const f=record(floorValue,['kind','datasetId','recoveryEpoch','authorityVersion','restrictionVersion','inventoryDigest','restrictionJournalId','restrictionDigest','authorityCommitRef','observedAtMs','expiresAtMs']);
  const c=cutValue;if(f.kind!=='SYNTHETIC_INDEPENDENT_FLOOR_NOT_ACCREDITED'||f.restrictionVersion!==c.restrictionsRevision||!['inventoryDigest','restrictionJournalId','restrictionDigest','authorityCommitRef'].every(k=>f[k]===c[k])||reviewRevisionCut({datasetId:c.datasetId,recoveryEpoch:c.recoveryEpoch,authorityVersion:c.authorityRevision,bootstrapProvenanceRef:c.bootstrapProvenanceRef},f,now).state!=='REVIEW_CUT_MATCHED')throw Error('INDEPENDENT_FLOOR');
 }
 const timing=new Set(['observedAtMs','expiresAtMs']);if(!cutKeys.filter(k=>!timing.has(k)).every(k=>isDeepStrictEqual(before[k],after[k])))throw Error('CURRENT_READ_CHANGED');
 return unknown('CURRENT_READ_MODEL_BOUND_SEPARATELY_FROM_HISTORY',true);
 }catch{return unknown('CURRENT_READ_OR_ORIGINAL_UNAVAILABLE');}}
export function readAbi(){return Object.freeze({
 version:'property-capture-independent-read/2',entry:proposedReaderProfile.entry,
 sessionUser:proposedReaderProfile.sessionUser,currentUser:proposedReaderProfile.currentUser,
 exactProposedArguments:Object.freeze([
  ['p_read_request','uuid'],['p_user','uuid'],['p_session','uuid'],['p_expiry','bigint'],['p_session_revision','bigint'],['p_issuer','text'],['p_issued_at','bigint'],['p_member','uuid'],['p_role','text'],['p_authority_revision','bigint'],['p_restrictions_revision','bigint'],['p_inventory_revision','bigint'],['p_founder_revision','bigint'],['p_quota_revision','bigint'],['p_jurisdiction_revision','bigint'],['p_dataset','bytea'],['p_recovery_epoch','bigint'],['p_inventory_digest','bytea'],['p_restriction_digest','bytea'],['p_restriction_journal','text'],['p_bootstrap','uuid'],['p_authority_commit','uuid'],['p_original_ref','uuid'],['p_intent','uuid'],['p_attempt','uuid'],['p_key','bytea']
 ].map(x=>Object.freeze(x))),
 historicalSqlSignatureCompatible:false,installed:false,statementGenerated:false,
 dependencies:Object.freeze(['verified provider binding','current property_capture_read authority','ordered shared fence and revokers','protected original comparator/custody','RLS current-read context','effect projection','external COMMIT verifier','independent journal and witness']),
 dependenciesGranted:false,originalFromClientAccepted:false,returnsAddress:false,
 result:'PROVISIONAL_ONLY; default UNKNOWN; no settlement implemented'
 });}
export function createIndependentReadBoundary(){const closed=createProtectedCaptureReader();const read=async()=>Object.freeze({...await closed.read(),originalTrusted:false,currentReadModelConsistent:false});return Object.freeze({read,recover:read});}
