// Candidate projection producer, no trusted catalog/approval/withdrawal source.
import {record,isUuid,positive,out} from '../functional-night-20261112-v1/core.mjs';
import {reviewPublicProjection,createPublicCatalogPort} from '../functional-night-20261112-v1/public-projection.mjs';
const keys=['itemId','versionId','contentRevision','approvalRevision','revocationRevision'];
function fresh(x,fields,now){const r=record(x,[...fields,'observedAtMs','expiresAtMs']);if(!Number.isSafeInteger(r.observedAtMs)||r.observedAtMs<0||r.observedAtMs>now||!positive(r.expiresAtMs)||r.expiresAtMs<=now||r.expiresAtMs-r.observedAtMs>5000)throw Error();return r;}
export function producePublicCatalogReview(input){
 try{
  const v=record(input,['mode','reservationVector','source','review','withdrawal','expected']);if(v.mode!=='OFFLINE_VECTOR')throw Error();
  const now=v.reservationVector.nowMs;if(!Number.isSafeInteger(now)||now<0)throw Error();
  const expected=record(v.expected,[...keys,'sourceRevision','reviewRef','approvalAuthorityRevision']);
  const s=fresh(v.source,['accountId','propertyId','itemId','versionId','contentRevision','sourceRevision','templateKey'],now);
  const a=fresh(v.review,['accountId','propertyId','itemId','versionId','reviewedContentRevision','approvalRevision','reviewRef','state','authorityRevision'],now);
  const w=fresh(v.withdrawal,['accountId','propertyId','itemId','withdrawalRevision','withdrawn','currentApprovalRevision','currentContentRevision'],now);
  if(!['accountId','propertyId','itemId','versionId'].every(k=>isUuid(s[k]))||!isUuid(a.reviewRef)||!['contentRevision','sourceRevision'].every(k=>positive(s[k]))||!positive(a.approvalRevision)||!positive(a.authorityRevision)||!positive(w.withdrawalRevision)||s.templateKey!=='public_guide'||a.state!=='PUBLIC_TEMPLATE_REVIEW_CANDIDATE'||w.withdrawn!==false)throw Error();
  if(!['accountId','propertyId','itemId','versionId'].every(k=>s[k]===a[k])||!['accountId','propertyId','itemId'].every(k=>s[k]===w[k])||a.reviewedContentRevision!==s.contentRevision||w.currentContentRevision!==s.contentRevision||w.currentApprovalRevision!==a.approvalRevision)throw Error();
  if(expected.itemId!==s.itemId||expected.versionId!==s.versionId||expected.contentRevision!==s.contentRevision||expected.sourceRevision!==s.sourceRevision||expected.approvalRevision!==a.approvalRevision||expected.reviewRef!==a.reviewRef||expected.approvalAuthorityRevision!==a.authorityRevision||expected.revocationRevision!==w.withdrawalRevision)throw Error();
  const projection={accountId:s.accountId,propertyId:s.propertyId,itemId:s.itemId,versionId:s.versionId,contentRevision:s.contentRevision,approvalRevision:a.approvalRevision,revocationRevision:w.withdrawalRevision,state:'PROPOSED_PUBLIC_TEMPLATE_ONLY',observedAtMs:Math.max(s.observedAtMs,a.observedAtMs,w.observedAtMs),expiresAtMs:Math.min(s.expiresAtMs,a.expiresAtMs,w.expiresAtMs),templateKey:s.templateKey};
  const preview=reviewPublicProjection({mode:'OFFLINE_VECTOR',reservationVector:v.reservationVector,expectedCatalog:Object.fromEntries(keys.map(k=>[k,expected[k]])),projection});
  if(preview.state!=='PUBLIC_TEMPLATE_PROJECTION_REVIEWED_HELD')throw Error();
  // Internal model projection is consumed by the existing validator, not
  // returned as a public DTO. Only its fixed global public copy is returned.
  return out('PUBLIC_CATALOG_CANDIDATE_REVIEWED_HELD',{copy:preview.copy,projectionFields:Object.freeze(Object.keys(projection)),sourceApprovalAccredited:false,protectedProducerPresent:false,rawContentStored:false,privateAccessEnabled:false});
 }catch{return out('PUBLIC_CATALOG_CANDIDATE_HELD',{copy:null,sourceApprovalAccredited:false,protectedProducerPresent:false,privateAccessEnabled:false});}
}
export function createProtectedPublicCatalogProducer(){const prior=createPublicCatalogPort();return Object.freeze({produce:async()=>out('PUBLIC_CATALOG_PRODUCER_MISSING',{copy:null,sourceApprovalAccredited:false,protectedProducerPresent:false}),free:()=>prior.free()});}
