import {record,array,isUuid,positive,instant,out} from './core.mjs';
import {reviewContext} from './property-lifecycle.mjs';
import time from '../property-stay-prearrival-20261112-v1/time-review.cjs';
export const stayAbi='stay-lifecycle-review/1';
export const operations=Object.freeze(['stay.draft.create','stay.guest.bind','stay.confirm','stay.dates.change','stay.cancel','stay.checkout','stay.history.read']);
const statuses=Object.freeze(['draft','scheduled','active','completed','cancelled','revoked']);
const windowKeys=['checkInLocal','checkOutLocal','accessFromLocal','accessUntilLocal'];
function windows(value){const p=record(value,windowKeys);const a=windowKeys.map(k=>time.localToIso(p[k]));if(a.some(x=>x===null))throw Error('CALENDAR');const [ci,co,af,au]=a;if(!(ci<co&&af<au&&af<co&&au>ci))throw Error('WINDOW');return Object.freeze({checkInAt:ci,checkOutAt:co,accessFrom:af,accessUntil:au});}
function staySnapshot(value,c){const s=record(value,['stayId','accountId','propertyId','revision','status','guestBindingRef','checkInAt','checkOutAt','accessFrom','accessUntil']);if(!isUuid(s.stayId)||s.accountId!==c.accountId||s.propertyId!==c.propertyId||!positive(s.revision)||!statuses.includes(s.status)||s.guestBindingRef!==null&&!isUuid(s.guestBindingRef)||!['checkInAt','checkOutAt','accessFrom','accessUntil'].every(k=>instant(s[k]))||!(s.checkInAt<s.checkOutAt&&s.accessFrom<s.accessUntil&&s.accessFrom<s.checkOutAt&&s.accessUntil>s.checkInAt))throw Error('STAY_SNAPSHOT');return s;}
export function reviewInventory(value,c,target=null,window=null){
 const rows=array(value,100),ids=new Set();let overlaps=0;
 for(const x of rows){const s=staySnapshot(x,c);if(ids.has(s.stayId))throw Error('DUPLICATE_INVENTORY');ids.add(s.stayId);if(target&&s.stayId===target.stayId){if(Object.keys(s).some(k=>s[k]!==target[k]))throw Error('INVENTORY_CONTRADICTS_TARGET');continue;}if(window&&['scheduled','active'].includes(s.status)&&window.accessFrom<s.accessUntil&&s.accessFrom<window.accessUntil)overlaps++;}
 if(target&&!ids.has(target.stayId))throw Error('INCOMPLETE_TARGET_INVENTORY');
 return overlaps;
}
export function reviewStayLifecycle(input){
 try{
  const v=record(input,['mode','nowMs','command','context','snapshot','inventory']);if(v.mode!=='OFFLINE_VECTOR')throw Error('OFFLINE_ONLY');
  const q=record(v.command,['abi','operation','intentId','attemptId','propertyId','stayId','expectedRevision','expectedAuthorityRevision','expectedRestrictionsRevision','expectedInventoryRevision','payload']);
  if(q.abi!==stayAbi||!operations.includes(q.operation)||!isUuid(q.intentId)||!isUuid(q.attemptId)||!isUuid(q.propertyId))throw Error('COMMAND');
  const c=reviewContext(v.context,v.nowMs);if(c.propertyId!==q.propertyId||c.cohortCount!==1||q.expectedAuthorityRevision!==c.authorityRevision||q.expectedRestrictionsRevision!==c.restrictionsRevision||q.expectedInventoryRevision!==c.inventoryRevision||c.role==='co_manager'&&!c.propertyPermissions.manageStays)throw Error('CURRENT_PERMISSION_OR_REVISION');
  const create=q.operation==='stay.draft.create';let s=null,from=null,to=null,w=null;
  if(create){if(v.snapshot!==null||q.stayId!==null||q.expectedRevision!==null)throw Error('NEW_STAY_SHAPE');w=windows(q.payload);to='draft';}
  else{s=staySnapshot(v.snapshot,c);if(q.stayId!==s.stayId||q.expectedRevision!==s.revision)throw Error('STALE_STAY');from=s.status;to=from;
   if(q.operation==='stay.dates.change'){if(!['draft','scheduled'].includes(from))throw Error('DATES_STATE');w=windows(q.payload);}
   else if(q.operation==='stay.guest.bind'){const p=record(q.payload,['protectedGuestBindingRef']);if(!isUuid(p.protectedGuestBindingRef)||s.guestBindingRef!==null||from!=='draft')throw Error('GUEST_BINDING');}
   else{record(q.payload,[]);
    if(q.operation==='stay.confirm'){if(from!=='draft'||s.guestBindingRef===null||v.nowMs>=Date.parse(s.checkInAt))throw Error('CONFIRMATION');to='scheduled';w=s;}
    if(q.operation==='stay.cancel'){if(!['draft','scheduled'].includes(from)||v.nowMs>=Date.parse(s.checkInAt))throw Error('CANCEL_STATE_OR_TIME');to='cancelled';}
    if(q.operation==='stay.checkout'){if(!['scheduled','active'].includes(from)||v.nowMs<Date.parse(s.checkOutAt))throw Error('CHECKOUT_STATE_OR_TIME');to='completed';}
   }
  }
  if(w&&v.nowMs>=Date.parse(w.checkInAt))throw Error('PAST_REVISED_START');
  const overlaps=reviewInventory(v.inventory,c,s,w);if(overlaps)return out('STAY_CONFLICT_REVIEW_HELD',{reason:'POSSIBLE_ACCESS_WINDOW_OVERLAP',sqlExclusionAccredited:false,receipt:null});
  return out('STAY_TRANSITION_REVIEWED_HELD',{abi:stayAbi,operation:q.operation,from,to,proposalOnly:true,window:w?Object.freeze({checkInAt:w.checkInAt,checkOutAt:w.checkOutAt,accessFrom:w.accessFrom,accessUntil:w.accessUntil}):null,sourceProducerPresent:false,sqlExclusionAccredited:false,guestDataRetained:false,receipt:null,revocationRequired:['stay.cancel','stay.checkout'].includes(q.operation)});
 }catch{return out('STAY_REVIEW_REJECTED',{receipt:null});}
}
export function createStayPorts(){return Object.freeze(Object.fromEntries(operations.map(k=>[k,async()=>out('STAY_PORT_HELD',{receipt:null,protectedProducerMissing:true})])));}
