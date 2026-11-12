// Minimal relation/status projection; never summary, event body or guest PII.
import {record,array,isUuid,positive,out} from './core.mjs';
import {reviewContext} from './property-lifecycle.mjs';
import {createHeldIncidentAuthorityCandidate} from '../incident-authority-closure-20261111-v1/durable-incident-review.mjs';
import {createHeldLifecycleCandidate} from '../property-stay-prearrival-20261112-v1/contracts.mjs';
import {createPropertyPorts} from './property-lifecycle.mjs';import {createStayPorts} from './stay-lifecycle.mjs';import {createPublicCatalogPort} from './public-projection.mjs';
const incidentStates=['new','resolving','waiting_guest','escalated','waiting_manager','resolved','learning_pending','closed'];
const requestStates=['new','waiting_manager','approved','rejected','communicated','completed','cancelled'];
export function reviewWorkItems(input){
 try{
  const v=record(input,['mode','nowMs','context','stayScope','incidents','requests']);if(v.mode!=='OFFLINE_VECTOR')throw Error();const c=reviewContext(v.context,v.nowMs);
  const s=record(v.stayScope,['stayId','accountId','propertyId','revision','expectedRevision','checkoutAtMs']);if(!isUuid(s.stayId)||s.accountId!==c.accountId||s.propertyId!==c.propertyId||!positive(s.revision)||s.expectedRevision!==s.revision||!positive(s.checkoutAtMs)||v.nowMs>=s.checkoutAtMs)throw Error();
  if(c.role==='co_manager'&&(!c.propertyPermissions.manageIncidents||!c.propertyPermissions.approveRequests))throw Error();
  const seen=new Set(),incidents=[],requests=[];
  for(const raw of array(v.incidents,100)){
   const r=record(raw,['id','accountId','propertyId','stayId','status','revision','guestConfirmedResolved','knowledgeItemId']);
   if(!isUuid(r.id)||seen.has('i'+r.id)||r.accountId!==s.accountId||r.propertyId!==s.propertyId||r.stayId!==s.stayId||!positive(r.revision)||!incidentStates.includes(r.status)||![null,true,false].includes(r.guestConfirmedResolved)||r.knowledgeItemId!==null&&!isUuid(r.knowledgeItemId))throw Error();seen.add('i'+r.id);
   incidents.push(Object.freeze({status:r.status,awaitingGuest:r.status==='waiting_guest',learningProposalReviewOnly:r.status==='learning_pending'&&r.guestConfirmedResolved===true,automaticActivationAllowed:false}));
  }
  for(const raw of array(v.requests,100)){
   const r=record(raw,['id','accountId','propertyId','stayId','status','revision']);if(!isUuid(r.id)||seen.has('r'+r.id)||r.accountId!==s.accountId||r.propertyId!==s.propertyId||r.stayId!==s.stayId||!positive(r.revision)||!requestStates.includes(r.status))throw Error();seen.add('r'+r.id);requests.push(Object.freeze({status:r.status,decisionPending:['new','waiting_manager'].includes(r.status),writeAllowed:false}));
  }
  return out('WORK_ITEM_RELATION_REVIEWED_HELD',{incidents:Object.freeze(incidents),requests:Object.freeze(requests),privateDetailsIncluded:false,authorityAccredited:false});
 }catch{return out('WORK_ITEMS_HELD',{incidents:Object.freeze([]),requests:Object.freeze([]),privateDetailsIncluded:false});}
}
export function createFunctionalHeldCandidate(){
 const original=createHeldLifecycleCandidate(),incident=createHeldIncidentAuthorityCandidate();
 return Object.freeze({property:createPropertyPorts(),stay:createStayPorts(),catalog:createPublicCatalogPort(),incident,
  request:async()=>out('REQUEST_PRIVATE_OPERATION_UNMAPPED_HELD',{receipt:null}),reconcile:async()=>original.reconcile(),reconcileIncident:async()=>original.reconcile()});
}
