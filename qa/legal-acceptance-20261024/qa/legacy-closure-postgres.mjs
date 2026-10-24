// NEW catalog/ACL cases only; does not replay the 27 accepted contract cases.
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {startFixture,sql,cleanup,assertNoResources} from '../../technical-closure-20261022/qa/pg-fixture.mjs';import {openOwnedSession} from '../../independent-controls-20261024/qa/owned-session.mjs';import {legacyReadinessSql} from '../legacy-readiness.mjs';
let id;const checks=[],pass=s=>{checks.push(s);console.log('PASS '+s);};const raw=q=>sql(id,'postgres',q),ready=()=>JSON.parse(raw(legacyReadinessSql)).ready;
const table='public.concierge_manager_signup_invites',fn='public.concierge_submit_manager_signup_request(text,text,text,text,boolean,boolean)';
async function deniedAs(role,q){const s=await openOwnedSession(id);try{await s.exec('set role '+role+';');await assert.rejects(s.exec(q),/QA_SESSION/);}finally{await s.close();}}
try{
 id=await startFixture('closed-target');
 raw(`create role anon nologin;create role authenticated nologin;create role service_role nologin;create role qa_legal_bridge nologin;create role qa_legacy_inherited nologin;
 create table public.concierge_manager_signup_invites(id int primary key,marker text);create table public.concierge_manager_signup_screenings(id int primary key,marker text);
 create function public.concierge_submit_manager_signup_request(text,text,text,text,boolean,boolean) returns text language plpgsql security definer set search_path=pg_catalog,public as $$begin insert into public.concierge_manager_signup_invites values(1,'FICTIONAL_BOOL_ONLY');return 'PENDING_REVIEW';end$$;
 create function public.concierge_record_manager_signup_screening(uuid,uuid,text) returns text language sql security definer set search_path=pg_catalog as $$select 'FICTIONAL_ONLY'::text$$;
 create function public.concierge_resolve_manager_signup_followup(uuid,uuid,text) returns text language sql security definer set search_path=pg_catalog as $$select 'FICTIONAL_ONLY'::text$$;
 revoke all on function ${fn},public.concierge_record_manager_signup_screening(uuid,uuid,text),public.concierge_resolve_manager_signup_followup(uuid,uuid,text) from public;
 grant execute on function ${fn},public.concierge_record_manager_signup_screening(uuid,uuid,text),public.concierge_resolve_manager_signup_followup(uuid,uuid,text) to service_role;
 grant insert,update on ${table} to service_role;grant update(marker) on ${table} to authenticated;
 `);
 assert.equal(ready(),false);{const s=await openOwnedSession(id);try{await s.exec('set role service_role;');await s.exec("select public.concierge_submit_manager_signup_request('FICTITIOUS','fake@example.invalid','FAKE','FAKE',true,true);");}finally{await s.close();}}assert.equal(raw('select count(*) from '+table),'1');pass('catalog_detects_legacy_boolean_RPC_and_direct_column_write_bypass_before_closure');
 raw("begin;set local cheveni.qa_mode='FICTIONAL_ONLY';"+readFileSync(new URL('../LEGACY-CLOSURE-FICTIONAL-DO-NOT-INSTALL.sql',import.meta.url),'utf8')+'\ncommit;');assert.equal(ready(),true);
 await deniedAs('service_role',"select public.concierge_submit_manager_signup_request('X','x@example.invalid','X','X',true,true);");await deniedAs('service_role',"insert into "+table+" values(2,'FICTIONAL');");await deniedAs('authenticated',"update "+table+" set marker='FICTIONAL';");assert.equal(raw('select count(*) from '+table),'1');pass('closure_removes_known_RPC_table_and_column_writes_including_service_role');
 raw(`grant execute on function ${fn} to public;`);assert.equal(ready(),false);raw(`revoke execute on function ${fn} from public;`);assert.equal(ready(),true);pass('PUBLIC_execute_regression_is_detected_even_without_direct_API_grant');
 raw(`grant insert(marker) on ${table} to qa_legacy_inherited;grant qa_legacy_inherited to service_role with inherit false,set true;`);assert.equal(ready(),false);raw(`revoke qa_legacy_inherited from service_role;revoke insert(marker) on ${table} from qa_legacy_inherited;`);assert.equal(ready(),true);pass('noninherited_SET_ROLE_path_to_column_writer_is_detected_not_silently_approved');
 raw('create table public.concierge_manager_signup_unexpected(id int);grant insert on public.concierge_manager_signup_unexpected to authenticated;');assert.equal(ready(),false);raw('revoke insert on public.concierge_manager_signup_unexpected from authenticated;');assert.equal(ready(),true);pass('new_table_in_known_signup_family_is_included_in_legacy_audit');
 raw('alter function public.concierge_resolve_manager_signup_followup(uuid,uuid,text) rename to missing_reviewed_signature;');assert.equal(ready(),false);pass('missing_reviewed_signature_is_incomplete_evidence_not_success');
}finally{if(id)cleanup(id);}
assertNoResources();pass('new_legacy_lab_cleans_all_owned_disposable_resources');
console.log(JSON.stringify({result:'LEGAL_LEGACY_CLOSURE_FICTIONAL_PASS',passed:checks.length,checks,realACLVerified:false,allWritersVerified:false,operationalApproval:false,beta:'NO_GO',historicalSuitesRepeated:false}));
