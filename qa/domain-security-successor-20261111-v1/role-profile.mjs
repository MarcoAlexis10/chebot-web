// Static, proposed profile comparator. It does not inspect PostgreSQL or grant rights.
import {record} from './incident-successor.mjs';
export const PROFILES=Object.freeze({
 historicalWriter:Object.freeze({sessionUser:'cheveni_writer_client_v1',definerOwner:'cheveni_writer_executor_v1'}),
 native17Writer:Object.freeze({sessionUser:'cheveni_writer_backend_v3',definerOwner:'cheveni_writer_executor_v1'}),
 proposedReadback:Object.freeze({sessionUser:'cheveni_writer_readback_backend_v4',definerOwner:'cheveni_writer_readback_owner_v4'}),
 incidentWriter:Object.freeze({sessionUser:'cheveni_service_manager_backend_v2',definerOwner:'cheveni_service_write_owner_v2'}),
 proposedIncidentReader:Object.freeze({sessionUser:'cheveni_incident_readback_backend_v1',definerOwner:'cheveni_incident_readback_owner_v1'})
});
export function compareReadbackProposal(input) {
 const x=record(input,['sessionUser','currentUserAtConnect','definerOwner','ownerCanLogin','superuser','bypassRls','memberships','loginTablePrivileges','ownerTablePrivileges','loginExecute','ownerExecute','publicReachableMutators','schemaCreate','ownsDataTables','rlsSelectPolicies','catalogComplete']);
 const errors=[];
 if(x.sessionUser!==PROFILES.proposedReadback.sessionUser || x.currentUserAtConnect!==x.sessionUser || x.definerOwner!==PROFILES.proposedReadback.definerOwner)errors.push('CALLER_PAIR');
 if(x.ownerCanLogin!==false || x.superuser!==false || x.bypassRls!==false || x.schemaCreate!==false || x.ownsDataTables!==false)errors.push('ROLE_ATTRIBUTES');
 for(const k of ['memberships','loginTablePrivileges','publicReachableMutators'])if(!Array.isArray(x[k]) || x[k].length)errors.push(k);
 const equals=(a,b)=>Array.isArray(a)&&new Set(a).size===a.length&&JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
 if(!equals(x.loginExecute,['concierge_readback_v3.readback_v3(bytea,bytea)']))errors.push('LOGIN_EXECUTE');
 if(!equals(x.ownerExecute,['concierge_readback_v3.scope_v3(uuid,uuid,bigint,uuid,uuid)','concierge_contract_v1.parse_v1(text,bytea)','concierge_contract_v1.digest_v1(text,text[])','concierge_contract_v1.frame_v1(text,text[])','concierge_contract_v1.validate_v1(text,text[])']))errors.push('OWNER_EXECUTE');
 if(!equals(x.ownerTablePrivileges,['bindings:SELECT_COLUMNS','intents:SELECT_COLUMNS','scope:SELECT_COLUMNS']))errors.push('OWNER_SELECT_ONLY');
 if(!equals(x.rlsSelectPolicies,['bindings:SELECT','intents:SELECT','scope:SELECT']))errors.push('RLS');
 if(x.catalogComplete!==true)errors.push('CATALOG_INCOMPLETE');
 return Object.freeze({state:errors.length?'HELD':'PROFILE_REVIEW_MATCHED',errors:Object.freeze(errors),nativeObserved:false,minimumPrivilegeAccredited:false,scopeImplemented:false,operationalApproval:false});
}
