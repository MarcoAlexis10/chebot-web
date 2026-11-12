// Pure QA reviews. No HTTP, SQL driver, writer, storage or authority producer.
import {record,array,isUuid,snapshot,frame,parse} from '../private-writer-composition-20261111-v1/vendor/qa/contract-v1/codec.mjs';
import {createStayCommandReview} from '../private-writer-composition-20261111-v1/vendor/qa/concierge-stay-command-review-v1/stay-command.mjs';
import time from './time-review.cjs';
const flags=Object.freeze({held:true,fixtureOnly:true,actualAuthVerified:false,actualSqlVerified:false,operationalApproval:false,automaticRetryAllowed:false,betaDecision:'NO-GO'});
const result=(state,extra={})=>Object.freeze({state,...extra,...flags});
const text=(s,max)=>typeof s==='string'&&s.trim().length>0&&[...s.trim()].length<=max&&!/[\u0000-\u001f\u007f-\u009f]/.test(s);
const stamp=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
const clock=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export function reviewPropertyShape(input){
 try{
  const p=record(input,['internalName','propertyType','address','floorOrUnit','cityLabel','language','defaultCheckIn','defaultCheckOut']);
  if(!text(p.internalName,160)||!['apartment','house','room','studio','other'].includes(p.propertyType)||!text(p.address,500)||p.floorOrUnit!==null&&!text(p.floorOrUnit,80)||p.cityLabel!=='CABA'||!['es','en','it','pt'].includes(p.language)||!clock(p.defaultCheckIn)||!clock(p.defaultCheckOut))throw Error();
  // CABA display is not automatically the exact legacy DB city Buenos Aires.
  return result('HELD_PROPERTY_LIFECYCLE_ABI_MISSING',{shapeReviewed:true,cityAttestationRequired:true,duplicateGuarantee:false,payloadRetained:false});
 }catch{return result('INVALID_PROPERTY_REVIEW_INPUT',{payloadRetained:false});}
}
export function reviewDuplicateHint(input,rows){
 try{
  const p=record(input,['accountId','address','floorOrUnit']);if(!isUuid(p.accountId)||!text(p.address,500)||p.floorOrUnit!==null&&!text(p.floorOrUnit,80))throw Error();
  const norm=x=>x===null?'':x.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es-AR');let matches=0;const seen=new Set();
  for(const x of array(rows,100)){
   const r=record(x,['id','accountId','address','floorOrUnit']);if(!isUuid(r.id)||!isUuid(r.accountId)||seen.has(r.id)||!text(r.address,500)||r.floorOrUnit!==null&&!text(r.floorOrUnit,80))throw Error();seen.add(r.id);
   if(r.accountId===p.accountId&&norm(r.address)===norm(p.address)&&norm(r.floorOrUnit)===norm(p.floorOrUnit))matches++;
  }
  return result('LOCAL_DUPLICATE_HINT_ONLY',{hint:matches?'POSSIBLE_DUPLICATE':'NONE_IN_SUPPLIED_VECTOR',sqlUniquenessAccredited:false});
 }catch{return result('LOCAL_DUPLICATE_HINT_UNAVAILABLE');}
}
export function reviewStayPlan(input,existing=[]){
 try{
  const p=record(input,['propertyId','checkInLocal','checkOutLocal','accessFromLocal','accessUntilLocal','language','guestAssociation']);
  if(!isUuid(p.propertyId)||!['es','en','it','pt'].includes(p.language)||p.guestAssociation!=='LINK_LATER')throw Error();
  const values=['checkInLocal','checkOutLocal','accessFromLocal','accessUntilLocal'].map(k=>time.localToIso(p[k]));
  if(values.some(x=>x===null))throw Error();const [ci,co,af,au]=values;if(!(ci<co&&af<au&&af<co&&au>ci))throw Error();
  let overlaps=0;const seen=new Set();
  for(const x of array(existing,100)){
   const r=record(x,['id','propertyId','accessFrom','accessUntil','status']);if(!isUuid(r.id)||!isUuid(r.propertyId)||seen.has(r.id)||!stamp(r.accessFrom)||!stamp(r.accessUntil)||r.accessFrom>=r.accessUntil||!['scheduled','active','completed','cancelled'].includes(r.status))throw Error();seen.add(r.id);
   if(r.propertyId===p.propertyId&&['scheduled','active'].includes(r.status)&&af<r.accessUntil&&r.accessFrom<au)overlaps++;
  }
  return result('HELD_STAY_WITHOUT_GUEST_ABI_MISSING',{window:Object.freeze({checkInAt:ci,checkOutAt:co,accessFrom:af,accessUntil:au}),overlapHint:overlaps?'POSSIBLE_OVERLAP':'NONE_IN_SUPPLIED_VECTOR',sqlExclusionAccredited:false,guestAssociationPerformed:false});
 }catch{return result('INVALID_OR_INCOMPLETE_STAY_REVIEW');}
}
export function reviewCbf1Compatibility(input){
 let bytes;
 try{
  const x=record(input,['mode','intent']);if(x.mode!=='OFFLINE_VECTOR')throw Error();
  const original=snapshot('intent',x.intent);bytes=frame('intent',original);const got=parse('intent',bytes);
  if(Object.keys(original).some(k=>got[k]!==original[k]))throw Error();
  return result('CBF1_FORMAT_REVIEWED_HELD',{operation:got.operation,guestBindingRequired:true,framePersisted:false,dispatchPerformed:false});
 }catch{return result('CBF1_INCOMPATIBLE_HELD',{framePersisted:false,dispatchPerformed:false});}
 finally{bytes?.fill(0);}
}
export function comparePendingAndCbf1(input){
 try{
  const x=record(input,['pending','intent']),i=snapshot('intent',x.intent),p=record(x.pending,['p_operation_id','p_manager_id','p_account_id','p_property_id','p_received_at','p_guest_phone_hash','p_guest_display_name','p_check_in_at','p_check_out_at','p_language']);
  if(!isUuid(p.p_operation_id)||!stamp(p.p_received_at))throw Error();
  const pairs=[['p_manager_id','memberId'],['p_account_id','accountId'],['p_property_id','propertyId'],['p_guest_phone_hash','guestPhoneHash'],['p_guest_display_name','guestDisplayName'],['p_check_in_at','checkInAt'],['p_check_out_at','checkOutAt'],['p_language','language']];
  if(pairs.some(([a,b])=>p[a]!==i[b]))return result('PENDING_ARGUMENTS_NOT_EQUIVALENT');
  // Legacy draft explicitly sets access_from/check_in and access_until/check_out.
  if(i.accessFrom!==i.checkInAt||i.accessUntil!==i.checkOutAt)return result('PENDING_ACCESS_WINDOW_NOT_REPRESENTABLE');
  return result('PENDING_FIELDS_MATCH_ONLY_HELD',{operationIdMappedToIntentId:false,webIdentityProvenanceMissing:true,originalCustodyMissing:true,dispatchPerformed:false});
 }catch{return result('PENDING_ARGUMENTS_INCOMPATIBLE');}
}
export function createHeldLifecycleCandidate(){
 // Reuse the existing stay gateway ONLY with its missing-adapter/held defaults.
 const existing=createStayCommandReview();
 return Object.freeze({property:async()=>result('HELD_PROPERTY_LIFECYCLE_ABI_MISSING'),stay:async()=>existing.reconcile(undefined,undefined),
  modify:async()=>result('HELD_STAY_LIFECYCLE_ABI_MISSING'),cancel:async()=>result('HELD_STAY_LIFECYCLE_ABI_MISSING'),checkout:async()=>result('HELD_STAY_LIFECYCLE_ABI_MISSING'),
  reconcile:async()=>result('UNKNOWN',{reconciliationRequired:true}),prearrival:async()=>result('HELD_PREARRIVAL_SOURCE_MISSING')});
}
