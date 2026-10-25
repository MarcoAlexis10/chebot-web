// New negative role guards only; do not rerun the approved postcommit cases.
import assert from 'node:assert/strict';import {readdir} from 'node:fs/promises';
import {startFixture,sql,cleanup,assertNoResources} from '../../technical-closure-20261022/qa/pg-fixture.mjs';
import {createRun,removeFictionalRun} from '../../technical-closure-20261022/approved/private-host.mjs';
import {prepareCheckpoint} from '../a2-checkpoint.mjs';import {awaitFinalPostmaster} from './owned-final-postmaster.mjs';
let id,roots;const checks=[],pass=s=>{checks.push(s);console.log('PASS '+s);};
try{
 id=await startFixture('closed-target');await awaitFinalPostmaster(id);roots=await createRun();
 sql(id,'postgres',"create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema qa_checkpoint;create table qa_checkpoint.business(id int);create table public.concierge_accounts(id int);alter role anon rename to qa_unexpected;");
 await assert.rejects(prepareCheckpoint({sourceId:id,roots}),/FIXED_FICTIONAL_ROLES_REQUIRED/);assert.deepEqual(await readdir(roots.data),[]);assert.deepEqual(await readdir(roots.keys),[]);pass('three_roles_with_wrong_name_or_missing_expected_role_cannot_mint_checkpoint');
 sql(id,'postgres','alter role qa_unexpected rename to anon;alter role authenticated login;');await assert.rejects(prepareCheckpoint({sourceId:id,roots}),/FIXED_FICTIONAL_ROLES_REQUIRED/);assert.deepEqual(await readdir(roots.data),[]);pass('login_capable_fixture_role_is_rejected_before_dump_or_encryption');
 sql(id,'postgres','alter role authenticated nologin;grant pg_read_all_data to anon;');await assert.rejects(prepareCheckpoint({sourceId:id,roots}),/UNEXPECTED_ROLE_MEMBERSHIP_DENIED/);assert.deepEqual(await readdir(roots.data),[]);assert.deepEqual(await readdir(roots.keys),[]);pass('membership_in_builtin_privileged_role_is_not_hidden_by_pg_prefix_filter');
 sql(id,'postgres','revoke pg_read_all_data from anon;create role pgx_shadow nologin;');await assert.rejects(prepareCheckpoint({sourceId:id,roots}),/FIXED_FICTIONAL_ROLES_REQUIRED/);assert.deepEqual(await readdir(roots.data),[]);pass('pgx_user_role_cannot_hide_behind_a_wildcard_managed_role_prefix');
}finally{if(id)cleanup(id);if(roots)await removeFictionalRun(roots.root);}
assertNoResources();pass('new_role_negative_lab_removes_owned_resources');console.log(JSON.stringify({result:'A2_ROLE_BOUNDARY_NEW_PASS',passed:checks.length,checks,prior21Repeated:false,operationalApproval:false,beta:'NO_GO'}));
