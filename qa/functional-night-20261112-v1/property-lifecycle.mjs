import {record,array,isUuid,positive,instant,out} from './core.mjs';
import {reviewPropertyShape} from '../property-stay-prearrival-20261112-v1/contracts.mjs';
export const propertyAbi='property-lifecycle-review/1';
export const operations=Object.freeze(['property.draft.create','property.read','property.configure','property.submit','property.decision','property.pause','property.archive']);
export const contextKeys=Object.freeze(['accountId','memberId','sessionId','sessionRevision','role','status','authorityRevision','restrictionsRevision','verifiedAtMs','expiresAtMs','revoked','propertyId','jurisdiction','cohortCount','inventoryRevision','propertyPermissions']);
export function reviewContext(value,nowMs){
 const c=record(value,contextKeys);
 if(!Number.isSafeInteger(nowMs)||nowMs<0||!['accountId','memberId','sessionId'].every(k=>isUuid(c[k]))||c.propertyId!==null&&!isUuid(c.propertyId)||!['owner','manager','co_manager'].includes(c.role)||c.status!=='active'||c.revoked!==false||!['sessionRevision','authorityRevision','restrictionsRevision','inventoryRevision'].every(k=>positive(c[k]))||!Number.isSafeInteger(c.verifiedAtMs)||c.verifiedAtMs<0||c.verifiedAtMs>nowMs||!positive(c.expiresAtMs)||c.expiresAtMs<=nowMs||c.jurisdiction!=='CABA_ATTESTATION_REQUIRED'||!Number.isSafeInteger(c.cohortCount)||c.cohortCount<0)throw Error('CURRENT_CONTEXT_UNAVAILABLE');
 const p=record(c.propertyPermissions,['viewProperty','manageStays','manageIncidents','approveRequests','manageKnowledge','manageSecrets','manageTeam']);if(!Object.values(p).every(x=>typeof x==='boolean'))throw Error('PERMISSIONS_SHAPE');
 return Object.freeze({...c,propertyPermissions:p});
}
export function propertySnapshot(value,c){
 const s=record(value,['propertyId','accountId','buildingId','buildingAccountId','status','revision','activatedAt']);
 if(!isUuid(s.propertyId)||s.accountId!==c.accountId||s.propertyId!==c.propertyId||!positive(s.revision)||!['draft','ready_for_review','active','paused','archived'].includes(s.status)||s.activatedAt!==null&&!instant(s.activatedAt)||s.status==='active'&&s.activatedAt===null||s.buildingId===null&&s.buildingAccountId!==null||s.buildingId!==null&&(!isUuid(s.buildingId)||s.buildingAccountId!==c.accountId))throw Error('PROPERTY_SCOPE_OR_REVISION');return s;
}
export function reviewPropertyLifecycle(input){
 try{
  const v=record(input,['mode','nowMs','command','context','snapshot']);if(v.mode!=='OFFLINE_VECTOR')throw Error('OFFLINE_ONLY');
  const q=record(v.command,['abi','operation','intentId','attemptId','expectedSessionId','expectedSessionRevision','propertyId','expectedRevision','expectedAuthorityRevision','expectedRestrictionsRevision','payload']);
  if(q.abi!==propertyAbi||!operations.includes(q.operation)||!isUuid(q.intentId)||!isUuid(q.attemptId))throw Error('COMMAND_SHAPE');
  const c=reviewContext(v.context,v.nowMs);if(q.expectedSessionId!==c.sessionId||q.expectedSessionRevision!==c.sessionRevision||q.expectedAuthorityRevision!==c.authorityRevision||q.expectedRestrictionsRevision!==c.restrictionsRevision)throw Error('STALE_AUTHORITY');
  const create=q.operation==='property.draft.create';let from=null,to=null,current=null;
  if(create){if(v.snapshot!==null||q.propertyId!==null||q.expectedRevision!==null||c.propertyId!==null||c.cohortCount!==0||c.role!=='owner')throw Error('FOUNDER_COHORT_OR_ROLE');to='draft';}
  else{const s=propertySnapshot(v.snapshot,c);if(q.propertyId!==s.propertyId||q.expectedRevision!==s.revision||c.cohortCount!==1)throw Error('PROPERTY_VERSION_OR_COHORT');current=s;from=s.status;to=from;
   if(q.operation==='property.read'){if(c.role==='co_manager'&&!c.propertyPermissions.viewProperty)throw Error('PROPERTY_PERMISSION');}
   else if(c.role!=='owner')throw Error('PROPERTY_LIFECYCLE_PERMISSION_UNSPECIFIED');
  }
  if(['property.draft.create','property.configure'].includes(q.operation)){
   const p=record(q.payload,['configuration','buildingId']);const configuration=record(p.configuration,['internalName','propertyType','address','floorOrUnit','cityLabel','language','defaultCheckIn','defaultCheckOut']);if(!Object.values(configuration).every(x=>x===null||typeof x==='string'&&x.isWellFormed()))throw Error('PROPERTY_UNICODE');if(p.buildingId!==null&&!isUuid(p.buildingId)||reviewPropertyShape(p.configuration).shapeReviewed!==true)throw Error('PROPERTY_CONFIGURATION');
   if(!create&&(from!=='draft'||p.buildingId!==current.buildingId))throw Error('CONFIGURE_STATE_OR_BUILDING_REBINDING');
   // A UUID does not certify that a new building belongs to this account.
  }else if(q.operation==='property.decision'){
   const p=record(q.payload,['decision','reviewRef','reviewedRevision']);if(!['approve','return_to_draft'].includes(p.decision)||!isUuid(p.reviewRef)||p.reviewedRevision!==q.expectedRevision||from!=='ready_for_review')throw Error('DECISION_REVIEW');to=p.decision==='approve'?'active':'draft';
  }else{
   record(q.payload,[]);
   if(q.operation==='property.submit'){if(from!=='draft')throw Error('SUBMIT_STATE');to='ready_for_review';}
   if(q.operation==='property.pause'){if(from!=='active')throw Error('PAUSE_STATE');to='paused';}
   if(q.operation==='property.archive'){if(!['draft','ready_for_review','active','paused'].includes(from))throw Error('ARCHIVE_STATE');to='archived';}
  }
  return out('PROPERTY_TRANSITION_REVIEWED_HELD',{abi:propertyAbi,operation:q.operation,from,to,proposalOnly:true,sourceProducerPresent:false,cohortGuarantee:false,receipt:null,revocationRequired:['property.pause','property.archive'].includes(q.operation),privatePayloadRetained:false});
 }catch{return out('PROPERTY_REVIEW_REJECTED',{receipt:null,privatePayloadRetained:false});}
}
export function createPropertyPorts(){return Object.freeze(Object.fromEntries(operations.map(k=>[k,async()=>out('PROPERTY_PORT_HELD',{receipt:null,protectedProducerMissing:true})])));}
