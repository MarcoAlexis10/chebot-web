import {record,isUuid,positive,out} from './core.mjs';
import {reviewContext} from './property-lifecycle.mjs';
import {previewPrearrivalVector} from '../property-stay-prearrival-20261112-v1/prearrival.mjs';
const actions=Object.freeze({view_property:'viewProperty',manage_stays:'manageStays',manage_incidents:'manageIncidents',approve_requests:'approveRequests',manage_knowledge:'manageKnowledge',manage_secrets:'manageSecrets',manage_team:'manageTeam'});
export function reviewPermissionScope(input){
 try{
  const v=record(input,['mode','nowMs','action','target','expectedAuthorityRevision','expectedRestrictionsRevision','subject']);if(v.mode!=='OFFLINE_VECTOR')throw Error();
  const t=record(v.target,['accountId','propertyId','stayId','taskId','personId']);if(!isUuid(t.accountId)||!isUuid(t.propertyId)||!['stayId','taskId','personId'].every(k=>t[k]===null||isUuid(t[k])))throw Error();
  const subject=record(v.subject,['kind','vector']);
  if(subject.kind==='manager'){
   const c=reviewContext(subject.vector,v.nowMs);if(t.accountId!==c.accountId||t.propertyId!==c.propertyId||v.expectedAuthorityRevision!==c.authorityRevision||v.expectedRestrictionsRevision!==c.restrictionsRevision||!Object.hasOwn(actions,v.action)||c.role==='co_manager'&&!c.propertyPermissions[actions[v.action]])throw Error();
  }else if(subject.kind==='operational'){
   if(v.action!=='operational_secret_access'||t.stayId!==null)throw Error();
   const s=record(subject.vector,['personId','personStatus','accountId','propertyId','propertyStatus','taskId','taskStatus','accessFromMs','accessUntilMs','authorityRevision','restrictionsRevision','revoked','observedAtMs','expiresAtMs']);
   if(s.personId!==t.personId||s.taskId!==t.taskId||!isUuid(s.personId)||!isUuid(s.taskId)||s.accountId!==t.accountId||s.propertyId!==t.propertyId||s.propertyStatus!=='active'||s.personStatus!=='active'||!['scheduled','active'].includes(s.taskStatus)||s.revoked!==false||s.authorityRevision!==v.expectedAuthorityRevision||s.restrictionsRevision!==v.expectedRestrictionsRevision||!positive(s.authorityRevision)||!positive(s.restrictionsRevision)||!Number.isSafeInteger(v.nowMs)||!Number.isSafeInteger(s.observedAtMs)||s.observedAtMs<0||s.observedAtMs>v.nowMs||!Number.isSafeInteger(s.expiresAtMs)||s.expiresAtMs<=v.nowMs||!Number.isSafeInteger(s.accessFromMs)||s.accessFromMs<0||!Number.isSafeInteger(s.accessUntilMs)||!(s.accessFromMs<=v.nowMs&&v.nowMs<s.accessUntilMs))throw Error();
   // This relation model deliberately does not supply the independent access
   // point policy, explicit authorization, Vault or task custody. Still HELD.
  }else if(subject.kind==='guest'){
   const p=subject.vector,r=previewPrearrivalVector(p);if(v.action!=='guest_private_view'||r.screen!=='PRIVATE_WINDOW_PORT_HELD'||v.nowMs!==p.nowMs||t.accountId!==p.request.accountId||t.propertyId!==p.request.propertyId||t.stayId!==p.request.stayId||!positive(v.expectedAuthorityRevision)||!positive(v.expectedRestrictionsRevision))throw Error();
   // The original preview never authorizes the private window.
  }else throw Error();
  return out('ROLE_RELATION_MODEL_MATCHED_HELD',{accessAllowed:false,protectedPermissionProducerPresent:false,privateResult:null});
 }catch{return out('ROLE_SCOPE_REVIEW_REJECTED',{accessAllowed:false,privateResult:null});}
}
