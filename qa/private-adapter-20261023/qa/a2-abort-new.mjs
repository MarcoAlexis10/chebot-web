// New failure-before-COMMIT scenario only; not the previous A2 suites.
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {startFixture,sql,cleanup,assertNoResources} from '../../technical-closure-20261022/qa/pg-fixture.mjs';
const file=p=>readFileSync(new URL('../../technical-closure-20261022/qa/a2-input/'+p,import.meta.url),'utf8');
const checks=[],pass=x=>{checks.push(x);console.log('PASS '+x);};let id;
const catalog=`select json_build_object(
 'relations',(select json_agg(json_build_object('schema',n.nspname,'name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,'acl',c.relacl) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname !~ '^pg_' and n.nspname<>'information_schema'),
 'functions',(select json_agg(json_build_object('schema',n.nspname,'name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'body',p.prosrc,'acl',p.proacl,'security',p.prosecdef,'config',p.proconfig) order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname !~ '^pg_' and n.nspname<>'information_schema'),
 'policies',(select json_agg(row_to_json(p) order by schemaname,tablename,policyname) from pg_policies p),
 'roles',(select json_agg(json_build_object('name',rolname,'super',rolsuper,'bypass',rolbypassrls,'login',rolcanlogin,'inherit',rolinherit,'config',rolconfig) order by rolname) from pg_roles),
 'memberships',(select json_agg(json_build_object('role',r.rolname,'member',m.rolname,'admin',a.admin_option) order by r.rolname,m.rolname) from pg_auth_members a join pg_roles r on r.oid=a.roleid join pg_roles m on m.oid=a.member),
 'schemas',(select json_agg(json_build_object('name',nspname,'acl',nspacl) order by nspname) from pg_namespace where nspname !~ '^pg_' and nspname<>'information_schema')
);`;
try{
 id=await startFixture('closed-target');
 for(const p of ['test/fixtures/concierge-runtime-dev-schema.sql','test/fixtures/concierge-runtime-dev-functions.sql','test/fixtures/concierge-runtime-dev-indexes-triggers.sql'])sql(id,'postgres',file(p));
 sql(id,'postgres',"grant usage on schema public to anon,authenticated,service_role;grant select,insert,update,delete on all tables in schema public to service_role;insert into concierge_accounts(id,display_name,status,beta_started_at,beta_ends_at) values('11111111-1111-4111-8111-111111111111','FICTIONAL ABORT SENTINEL','testing','2026-10-01T00:00:00Z','2026-10-31T00:00:00Z');");
 const before=sql(id,'postgres',catalog),dataBefore=sql(id,'postgres','select row_to_json(a) from concierge_accounts a;');
 const bundle=file('ops/drafts/BA-BETA-ATOMIC-ACL-BUNDLE-PRELEGAL-DO-NOT-APPLY.sql');assert.equal(createHash('sha256').update(bundle).digest('hex'),'f12b5b10f3120eeda3bbbc6d48604a894b63169c6ed66743f2895d499a516846');
 if(!/commit;\s*$/i.test(bundle))throw Error('ONE_FINAL_COMMIT_REQUIRED');
 const failing=bundle.replace(/commit;\s*$/i,'select 1/0;\ncommit;\n');
 assert.throws(()=>sql(id,'postgres',failing),/FIXTURE_DOCKER_FAILED/);pass('intentional_failure_after_entire_pinned_A2_DDL_prevents_COMMIT');
 assert.equal(sql(id,'postgres',catalog),before);pass('aborted_A2_restores_exact_logical_catalog_roles_RLS_policies_functions_and_ACL');
 assert.equal(sql(id,'postgres','select row_to_json(a) from concierge_accounts a;'),dataBefore);pass('aborted_A2_preserves_existing_business_row_and_trial_window_without_backup_restore');
 assert.equal(sql(id,'postgres',"select to_regnamespace('concierge_private') is null and not exists(select from pg_roles where rolname like 'cheveni_%');"),'t');pass('no_private_schema_or_boundary_roles_survive_failed_transaction');
}finally{if(id)cleanup(id);}
assertNoResources();pass('new_abort_scenario_removes_only_its_owned_disposable_cluster');
console.log(JSON.stringify({result:'A2_PRECOMMIT_ABORT_ONLY_PASS',passed:checks.length,checks,postCommitRollbackVerified:false,liveWritersIsolated:false,operationalApproval:false}));
