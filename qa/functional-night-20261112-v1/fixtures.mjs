// Synthetic model inputs only. Never proof of protected authority or persistence.
import {id,property,stay} from '../property-stay-prearrival-20261112-v1/fixtures.mjs';
export {id,property,stay};
export const NOW=Date.parse('2027-01-10T15:00:00.000Z');
export const context=()=>({accountId:id(3),memberId:id(4),sessionId:id(2),sessionRevision:2,role:'owner',status:'active',authorityRevision:7,restrictionsRevision:9,verifiedAtMs:NOW-10,expiresAtMs:NOW+60000,revoked:false,propertyId:id(5),jurisdiction:'CABA_ATTESTATION_REQUIRED',cohortCount:1,inventoryRevision:11,propertyPermissions:{viewProperty:true,manageStays:true,manageIncidents:true,approveRequests:true,manageKnowledge:true}});
export const propSnapshot=(status='draft')=>({propertyId:id(5),accountId:id(3),buildingId:null,buildingAccountId:null,status,revision:4,activatedAt:status==='active'?'2027-01-09T15:00:00.000Z':null});
export function propertyCase(operation='property.configure',status='draft'){
 const create=operation==='property.draft.create';let payload={};if(create||operation==='property.configure')payload={configuration:property(),buildingId:null};if(operation==='property.decision')payload={decision:'approve',reviewRef:id(44),reviewedRevision:4};
 return {mode:'OFFLINE_VECTOR',nowMs:NOW,command:{abi:'property-lifecycle-review/1',operation,intentId:id(1),attemptId:id(6),propertyId:create?null:id(5),expectedRevision:create?null:4,expectedAuthorityRevision:7,expectedRestrictionsRevision:9,payload},context:{...context(),...(create?{propertyId:null,cohortCount:0}:{})},snapshot:create?null:propSnapshot(status)};
}
export const staySnapshot=(status='draft')=>({stayId:id(8),accountId:id(3),propertyId:id(5),revision:4,status,guestBindingRef:null,checkInAt:'2027-01-12T18:00:00.000Z',checkOutAt:'2027-01-13T13:00:00.000Z',accessFrom:'2027-01-12T18:00:00.000Z',accessUntil:'2027-01-13T13:00:00.000Z'});
export const windowPayload=()=>{const p=stay();return Object.fromEntries(['checkInLocal','checkOutLocal','accessFromLocal','accessUntilLocal'].map(k=>[k,p[k]]))};
export function stayCase(operation='stay.dates.change',status='draft'){
 const create=operation==='stay.draft.create',snapshot=create?null:staySnapshot(status);let payload={};if(create||operation==='stay.dates.change')payload=windowPayload();if(operation==='stay.guest.bind')payload={protectedGuestBindingRef:id(66)};
 return{mode:'OFFLINE_VECTOR',nowMs:NOW,command:{abi:'stay-lifecycle-review/1',operation,intentId:id(1),attemptId:id(6),propertyId:id(5),stayId:create?null:id(8),expectedRevision:create?null:4,expectedAuthorityRevision:7,expectedRestrictionsRevision:9,expectedInventoryRevision:11,payload},context:context(),snapshot,inventory:snapshot?[{...snapshot}]:[]};
}
