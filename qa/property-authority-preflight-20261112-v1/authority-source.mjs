// Narrow source/ABI compatibility adapter. Does not resolve actual authority.
import fs from 'node:fs';
import {out} from '../functional-night-20261112-v1/core.mjs';
import {createProtectedFirstProperty} from '../first-property-20261112-v1/capture-contract.mjs';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
function between(src,name){const from=src.indexOf('function '+name+'('),to=src.indexOf('$$;',from);if(from<0||to<from)throw Error('PINNED_ABI_DRIFT');return src.slice(from,to+3);}
export function reviewAuthoritySourceComposition(){try{
 const service=read('service.source.txt'),capture=read('capture.source.txt');
 const launch=between(service,'concierge_service_qa_v1.launch'),scope=between(service,'concierge_writer_contract_v2.scope_v2'),manager=between(service,'concierge_service_qa_v1.manager_scope'),auth=between(service,'concierge_service_qa_v1.auth_live'),fence=between(service,'concierge_service_qa_v1.fence');
 const source=between(capture,'concierge_invite_private.private_mutation_authority_v1'),writer=between(capture,'concierge_invite_private.write_property_capture_v1'),reader=between(capture,'concierge_invite_private.property_receipt_v1');
 if(!source.includes('where false')||!launch.includes("p.status='active'")||!launch.includes('x.beta_started_at<=clock_timestamp()')||!scope.includes('or p is null')||!scope.includes("p,'manage_stays'")||!manager.includes('launch(p_property,p_review)')||!writer.includes("p_account,null,'property_create'")||!reader.includes("p_account,null,'property_create'")||!fence.includes('pg_advisory_xact_lock(1129728581,1)'))throw Error('PINNED_ABI_DRIFT');
 return out('PROPERTY_AUTHORITY_COMPOSITION_HELD',{
  operation:'property_create',propertyTarget:null,requiredRole:'owner',
  protectedProducerPresent:false,scopeV2Reusable:false,launchReusable:false,
  sourceComponents:Object.freeze(['auth.users/auth.sessions current-session query','manager web identity/member/account relation','common fence 1129728581/1','exact authority tuple checker','draft capture writer and slot transaction']),
  incompatibilities:Object.freeze(['EMPTY_PROPERTY_AUTHORITY_SOURCE','ACTIVE_PROPERTY_REQUIRED_BY_SCOPE_V2','MANAGE_STAYS_IS_NOT_PROPERTY_CREATE','LAUNCH_REQUIRES_EXISTING_ACTIVE_PROPERTY_AND_STARTED_TRIAL','PRIVATE_CAPTURE_CALLERS_ABSENT_FROM_SERVICE_AUTH_AND_FENCE_PAIRS','AUTHORITY_REVISION_FOUNDER_JURISDICTION_PRODUCERS_MISSING','POST_CAPTURE_READER_CANNOT_REQUIRE_FREE_SLOT']),
  privateReaderCallerAcceptedByAuthSource:auth.includes("'cheveni_property_capture_reader_backend_v2'"),
  privateWriterCallerAcceptedByFenceSource:fence.includes("'cheveni_private_mutation_backend_v1'"),
  installedCatalogObserved:false,dispatchPlan:null
 });
 }catch{return out('PROPERTY_SOURCE_ABI_DRIFT_HELD',{protectedProducerPresent:false,dispatchPlan:null});}}
// Reuse the existing operational boundary. No replacement callback or grant.
export function createProtectedPropertyAuthority(){const original=createProtectedFirstProperty();return Object.freeze({resolve:original.prepare,admit:original.prepare});}
