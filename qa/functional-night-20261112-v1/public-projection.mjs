// Missing protected public catalog producer remains missing. Model-only validator.
import {record,isUuid,positive,out} from './core.mjs';
import {previewPrearrivalVector,freeGuidePreview} from '../property-stay-prearrival-20261112-v1/prearrival.mjs';
const refs=['itemId','versionId','contentRevision','approvalRevision','revocationRevision'];
const projectionKeys=['accountId','propertyId',...refs,'state','observedAtMs','expiresAtMs','templateKey'];
export function reviewPublicProjection(input){
 try{
  const v=record(input,['mode','reservationVector','expectedCatalog','projection']);if(v.mode!=='OFFLINE_VECTOR')throw Error();
  // Reuses prior exact seven-way reservation/session/version/expiry boundary.
  const prior=previewPrearrivalVector(v.reservationVector);
  if(prior.screen!=='PREARRIVAL_PUBLIC_TEXT_REVIEW_ONLY')return out('PUBLIC_PROJECTION_HELD',{copy:null,privateAccessEnabled:false,sourceApprovalAccredited:false});
  const p=record(v.projection,projectionKeys),expected=record(v.expectedCatalog,refs);
  if(!['itemId','versionId'].every(k=>isUuid(p[k]))||!['contentRevision','approvalRevision','revocationRevision'].every(k=>positive(p[k]))||refs.some(k=>expected[k]!==p[k])||p.accountId!==v.reservationVector.request.accountId||p.propertyId!==v.reservationVector.request.propertyId||p.state!=='PROPOSED_PUBLIC_TEMPLATE_ONLY'||!Number.isSafeInteger(p.observedAtMs)||p.observedAtMs<0||p.observedAtMs>v.reservationVector.nowMs||!positive(p.expiresAtMs)||p.expiresAtMs<=v.reservationVector.nowMs||p.templateKey!=='public_guide')throw Error();
  // Projection has NO content field. A private knowledge category/status is not
  // a public classification, and a client approval boolean is never accepted.
  return out('PUBLIC_TEMPLATE_PROJECTION_REVIEWED_HELD',{copy:prior.copy,privateAccessEnabled:false,sourceApprovalAccredited:false,producerPresent:false,contentStored:false});
 }catch{return out('PUBLIC_PROJECTION_HELD',{copy:null,privateAccessEnabled:false,sourceApprovalAccredited:false});}
}
export function createPublicCatalogPort(){return Object.freeze({read:async()=>out('PUBLIC_CATALOG_PRODUCER_MISSING',{copy:null,sourceApprovalAccredited:false,privateAccessEnabled:false}),free:()=>freeGuidePreview()});}
