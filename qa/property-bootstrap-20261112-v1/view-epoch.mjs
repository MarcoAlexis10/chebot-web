// QA-only view generation barrier, following original manager authGeneration.
// No IO, tokens, storage, property data, mutation, authorization or durable intent.
import {record,isUuid,positive,out} from '../functional-night-20261112-v1/core.mjs';
export function createBootstrapView(){let generation=0,readSequence=0,scope=null,possibleEffect=false,viewState='HELD';const tickets=new WeakMap();
 const snapshot=()=>out(viewState,{operationState:possibleEffect?'UNKNOWN':'HELD',propertyId:null,privateDataAvailable:false,reconciliationRequired:possibleEffect});
 const invalidate=()=>{generation++;scope=null;viewState='HELD';};
 return Object.freeze({
  select(raw){invalidate();try{const s=record(raw,['mode','sessionId','sessionRevision','accountId','propertyId']);if(s.mode!=='OFFLINE_VECTOR'||!isUuid(s.sessionId)||!positive(s.sessionRevision)||!isUuid(s.accountId)||s.propertyId!==null&&!isUuid(s.propertyId))throw Error();scope=Object.freeze({...s});}catch{}return snapshot();},
  beginRead(){if(!scope)return null;const ticket=Object.freeze({kind:'BOOTSTRAP_QA_VIEW_TICKET'});tickets.set(ticket,{generation,scope,readSequence:++readSequence});return ticket;},
  markPossibleEffect(){possibleEffect=true;return snapshot();},
  apply(ticket,raw){const pending=tickets.get(ticket);tickets.delete(ticket);if(!pending||pending.generation!==generation||pending.readSequence!==readSequence||pending.scope!==scope||scope===null)return out('STALE_VIEW_IGNORED',{propertyId:null,operationState:possibleEffect?'UNKNOWN':'HELD'});
   try{const r=record(raw,['transport','status']);if(r.transport==='UNREADABLE'&&r.status===null)viewState='VIEW_UNREADABLE';else if(r.transport==='SYNTHETIC_HTTP_READABLE'&&[401,403,429,503].includes(r.status)){viewState=({401:'VIEW_ACCESS_DENIED',403:'VIEW_PERMISSION_DENIED',429:'VIEW_RATE_LIMITED',503:'VIEW_UNCONFIRMED'})[r.status];if(r.status===401){generation++;scope=null;}}else viewState='HELD';}catch{viewState='VIEW_UNCONFIRMED';}return snapshot();},
  clear(){invalidate();return snapshot();},inspect:snapshot
 });}
