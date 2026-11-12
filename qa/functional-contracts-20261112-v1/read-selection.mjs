// Bridge of actual read DTO shapes to the proposed review ABI. No Auth or IO.
import {parseManagerPropertyReceipt} from '../../../backend/concierge-manager-property-receipt.js';
import {record,array,isUuid,instant,out} from '../functional-night-20261112-v1/core.mjs';
import {createDomainAbiReview} from './evidence-binding.mjs';
const propertyStates=['draft','ready_for_review','active','paused','archived'];
const stayStates=['draft','scheduled','active','completed','cancelled','revoked'];
const permissionFields={can_manage_stays:'manageStays',can_manage_incidents:'manageIncidents',can_approve_requests:'approveRequests',can_manage_knowledge:'manageKnowledge',can_manage_secrets:'manageSecrets',can_manage_team:'manageTeam'};
function supplement(v,domain){if(!v.boundInput||v.boundInput.domain!==domain)throw Error();const r=createDomainAbiReview(),p=r.compile(v.boundInput);if(!p.handle)throw Error();r.release(p.handle);return v.boundInput.request;}
function session(value,c){const s=record(value,['account_id','member_id','role']);if(s.account_id!==c.accountId||s.member_id!==c.memberId||s.role!==c.role)throw Error('SESSION_DTO_SCOPE');}
export function reviewPropertySelection(input){
 try{
  const v=record(input,['mode','response','selectedPropertyId','boundInput']);if(v.mode!=='OFFLINE_VECTOR')throw Error();if(v.boundInput===null)return out('WEB_PRIVATE_REVISION_SOURCE_MISSING',{revisionInvented:false});
  const request=supplement(v,'property');if(request.command.operation!=='property.read'||v.selectedPropertyId!==request.command.propertyId)throw Error('READ_ONLY_SELECTION_REQUIRED');
  const body=record(v.response,['ok','session','properties']);if(body.ok!==true)throw Error();session(body.session,request.context);
  const rows=parseManagerPropertyReceipt(array(body.properties,100),{memberRole:request.context.role});if(!rows)throw Error('HISTORICAL_DTO');if(rows.length>1)throw Error('SINGLE_PROPERTY_PILOT_DTO_CONTRADICTION');
  for(const r of rows)if(!propertyStates.includes(r.property_status)||!r.internal_name.isWellFormed()||!r.internal_name.trim()||[...r.internal_name.trim()].length>160)throw Error('PROPERTY_SHAPE');
  const chosen=rows.filter(r=>r.property_id===v.selectedPropertyId);if(chosen.length!==1||chosen[0].property_status!==request.snapshot.status||Object.keys(permissionFields).some(k=>chosen[0][k]!==request.context.propertyPermissions[permissionFields[k]]))throw Error('PROPERTY_CURRENT_BINDING');
  return out('WEB_PROPERTY_SELECTION_REVIEWED_HELD',{entityRevision:request.snapshot.revision,revisionFromDto:false,revisionSourceAccredited:false,propertyDtoAuthorizes:false,rawLabelReturned:false});
 }catch{return out('WEB_PROPERTY_SELECTION_HELD',{revisionInvented:false,propertyDtoAuthorizes:false});}
}
export function canonicalSqlTimestamp(value){
 if(typeof value!=='string')return null;
 const m=/^(?<year>20\d{2})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})(?:\.(?<fraction>\d{1,6}))?(?<zone>Z|[+-]\d{2}:\d{2})$/.exec(value);if(!m)return null;
 const g=m.groups,[y,mo,d,h,mi,s]=['year','month','day','hour','minute','second'].map(k=>Number(g[k]));
 if(mo<1||mo>12||d<1||d>31||h>23||mi>59||s>59||g.fraction?.slice(3).replace(/0/g,'').length)return null;
 const local=new Date(Date.UTC(y,mo-1,d,h,mi,s));if(local.getUTCFullYear()!==y||local.getUTCMonth()+1!==mo||local.getUTCDate()!==d)return null;
 const ms=Date.parse(value);if(!Number.isFinite(ms))return null;const iso=new Date(ms).toISOString();return instant(iso)?iso:null;
}
export function reviewStaySelection(input){
 try{
  const v=record(input,['mode','response','selectedStayId','boundInput']);if(v.mode!=='OFFLINE_VECTOR')throw Error();if(v.boundInput===null)return out('WEB_PRIVATE_REVISION_SOURCE_MISSING',{revisionInvented:false});
  const request=supplement(v,'stay'),s=request.snapshot;if(!s||v.selectedStayId!==s.stayId)throw Error();
  const body=record(v.response,['ok','session','stays']);if(body.ok!==true)throw Error();session(body.session,request.context);let chosen=null;const ids=new Set();
  for(const raw of array(body.stays,100)){
   const r=record(raw,['stay_id','property_id','property_internal_name','check_in_at','check_out_at','access_from','access_until','status','created_at','updated_at']);
   if(!isUuid(r.stay_id)||ids.has(r.stay_id)||r.property_id!==request.context.propertyId||typeof r.property_internal_name!=='string'||!r.property_internal_name.isWellFormed()||!stayStates.includes(r.status))throw Error('STAY_DTO_SCOPE');ids.add(r.stay_id);
   const t=Object.fromEntries(['check_in_at','check_out_at','access_from','access_until','created_at','updated_at'].map(k=>[k,canonicalSqlTimestamp(r[k])]));if(Object.values(t).some(x=>x===null))throw Error('UNREPRESENTABLE_TIMESTAMP');
   if(r.stay_id===v.selectedStayId)chosen={r,t};
  }
  if(!chosen||chosen.r.status!==s.status||chosen.t.check_in_at!==s.checkInAt||chosen.t.check_out_at!==s.checkOutAt||chosen.t.access_from!==s.accessFrom||chosen.t.access_until!==s.accessUntil)throw Error('CURRENT_STAY_DTO_MISMATCH');
  return out('WEB_STAY_SELECTION_REVIEWED_HELD',{entityRevision:s.revision,revisionFromUpdatedAt:false,guestBindingFromDto:false,revisionSourceAccredited:false,rawLabelReturned:false});
 }catch{return out('WEB_STAY_SELECTION_HELD',{revisionInvented:false,guestBindingFromDto:false});}
}
