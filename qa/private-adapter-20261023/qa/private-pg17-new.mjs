// Only new transport and six-table business recovery scenarios; no old suite.
import assert from 'node:assert/strict';
import {readFile,readdir,writeFile,rm,lstat} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';import {createHash} from 'node:crypto';import path from 'node:path';
import {startFixture,assertFixture,sql,cmd,cleanup,assertNoResources} from '../../technical-closure-20261022/qa/pg-fixture.mjs';
import {createRun,removeFictionalRun,safeEnv} from '../../technical-closure-20261022/approved/private-host.mjs';
import {openVerifiedFictionalEnvelope} from '../../technical-closure-20261022/envelope-v2.mjs';
import {ownedPrivateQASource,assertNoPrivateClients} from '../private-source.mjs';
import {capturePrivateQA} from '../capture-private-qa.mjs';
import {rebuildBusinessQuarantine,TABLES} from '../closed-business.mjs';
import {frontierFixture} from './frontier-fixture.mjs';
const checks=[],pass=s=>{checks.push(s);console.log('PASS '+s);},phrase='FICTIONAL_PRIVATE_CLIENT_RECOVERY_ONLY';
const A='11111111-1111-4111-8111-111111111111',M='22222222-2222-4222-8222-222222222222',B='33333333-3333-4333-8333-333333333333',P='44444444-4444-4444-8444-444444444444',K='55555555-5555-4555-8555-555555555555',V='66666666-6666-4666-8666-666666666666';
let sourceId,roots,writer,writerDone;const targets=[];
const schema=readFileSync(new URL('../../technical-closure-20261022/qa/a2-input/test/fixtures/concierge-runtime-dev-schema.sql',import.meta.url),'utf8');
const seed=`
insert into concierge_accounts(id,display_name,status,beta_started_at,beta_ends_at) values('${A}','snapshot-0','active','2026-10-01T00:00:00Z','2026-10-31T00:00:00Z');
insert into concierge_account_members(id,account_id,display_name,phone_hash,role,status) values('${M}','${A}','FICTIONAL MANAGER','FICTIONAL_HASH','owner','active');
insert into concierge_buildings(id,account_id,display_name,address,city) values('${B}','${A}','FICTIONAL BUILDING','FICTIONAL ADDRESS','Buenos Aires');
insert into concierge_properties(id,account_id,building_id,internal_name,address,city,status) values('${P}','${A}','${B}','snapshot-0','FICTIONAL PROPERTY ADDRESS','Buenos Aires','active');
insert into concierge_knowledge_items(id,account_id,scope_type,property_id,category,knowledge_key,status,current_version_id) values('${K}','${A}','property','${P}','general','fictional-guide','active','${V}');
insert into concierge_knowledge_versions(id,account_id,knowledge_item_id,version_number,content,source_type,status,created_by_member_id,approved_by_member_id) values('${V}','${A}','${K}',1,'FICTIONAL KNOWLEDGE','manager','approved','${M}','${M}');
create table auth.sessions(token text);insert into auth.sessions values('FICTIONAL STALE AUTH');
create schema storage;create table storage.objects(name text);insert into storage.objects values('FICTIONAL_METADATA_ONLY');
create schema vault;create table vault.secrets(ciphertext text);insert into vault.secrets values('FICTIONAL_NOT_REAL_VAULT');
`;
async function source(options){const s=await ownedPrivateQASource(sourceId,options);sql(sourceId,'fixture_source','grant usage on schema auth,storage,vault to private_reader;grant select on all tables in schema auth,storage,vault to private_reader;');return s;}
async function target(){const id=await startFixture('closed-target');targets.push(id);return id;}
function forbiddenCount(id){return sql(id,'postgres',"select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where (n.nspname in ('auth','vault','storage') or (n.nspname='public' and c.relname not in ("+TABLES.map(t=>"'"+t+"'").join(',')+"))) and c.relkind in ('r','p');");}
try{
 sourceId=await startFixture();roots=await createRun();sql(sourceId,'fixture_source',schema+seed);
 let inspected=0;
 const src=await source({beforeStart:({inspection:c})=>{
  const text=JSON.stringify(c.Config);assert.ok(!text.includes('FICTIONAL-PGPASS-'));assert.ok(!c.Config.Env.some(x=>x.startsWith('PGPASSWORD=')));
  assert.equal(c.HostConfig.ReadonlyRootfs,true);assert.ok(c.Mounts.every(x=>x.Type==='tmpfs'));inspected++;
 }});
 const n=assertFixture(sourceId);
 writer=spawn('docker',['exec','-i',n.container,'psql','-X','-qAt','--username=postgres','--dbname=fixture_source','--set','ON_ERROR_STOP=1'],{env:safeEnv(),stdio:['pipe','pipe','pipe']});writer.stderr.resume();
 const begun=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('NEW_WRITER_NOT_STARTED')),5000);writer.stdout.on('data',b=>{if(b.toString().includes('PRIVATE_WRITER_STARTED')){clearTimeout(timer);resolve();}});});
 writerDone=new Promise(resolve=>{writer.once('close',resolve);writer.once('error',()=>resolve(-1));});
 writer.stdin.end("select 'PRIVATE_WRITER_STARTED';\n"+Array.from({length:45},(_,i)=>`begin;update concierge_accounts set display_name='snapshot-${i+1}';update concierge_properties set internal_name='snapshot-${i+1}';commit;select pg_sleep(0.08);`).join('\n'));
 await begun;
 const saved=await capturePrivateQA({roots,source:src,basename:'private-client',passphrase:phrase});
 assert.equal(await writerDone,0);assert.ok(inspected>=3);assert.equal(saved.dumpExitZero,true);assertNoPrivateClients();
 pass('new_stdin_PGPASSFILE_client_real_TLS_channel_binding_readonly_dump_with_no_secret_in_inspect');
 const archive=await openVerifiedFictionalEnvelope({...saved,passphrase:phrase});
 try{const toc=cmd(['exec','-i',n.container,'pg_restore','--list'],archive).toString();for(const name of ['TABLE DATA auth sessions','TABLE DATA storage objects','TABLE DATA vault secrets',...TABLES.map(t=>'TABLE DATA public '+t)])assert.ok(toc.includes(name));}finally{archive.fill(0);}
 pass('unfiltered_single_dump_contains_visible_business_Auth_and_managed_metadata_without_claiming_service_restore');
 const old=await readFile(saved.dataFile),key=await readFile(saved.keyFile),t=await target();
 const frontier=frontierFixture();const rebuilt=await rebuildBusinessQuarantine({targetId:t,...saved,passphrase:phrase,frontier});assert.equal(rebuilt.businessTablesQuarantined,6);
 assert.equal(sql(t,'postgres','select (select display_name from concierge_accounts)=(select internal_name from concierge_properties);'),'t');
 pass('new_client_snapshot_preserves_cross_table_atomic_pair_during_concurrent_fictional_writes');
 assert.equal(sql(t,'postgres',"select beta_started_at='2026-10-01T00:00:00Z' and beta_ends_at='2026-10-31T00:00:00Z' from concierge_accounts;"),'t');
 assert.equal(sql(t,'postgres',"select content from concierge_knowledge_versions;"),'FICTIONAL KNOWLEDGE');
 assert.equal(sql(t,'postgres',"select (select status='testing' from concierge_accounts) and (select status='revoked' and revoked_at is not null from concierge_account_members) and (select status='draft' from concierge_properties) and (select status='review' from concierge_knowledge_items) and (select status='draft' from concierge_knowledge_versions);"),'t');
 pass('six_real_model_tables_keep_clock_and_content_but_quarantine_accounts_members_properties_and_knowledge');
 assert.equal(forbiddenCount(t),'0');assert.equal(rebuilt.sourceAuthOrAccessImported,false);
 assert.equal(sql(t,'postgres',"select count(*) from pg_roles where rolname in ('anon','authenticated','service_role','private_reader');"),'0');
 assert.equal(sql(t,'postgres',"select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity;"),'6');
 pass('closed_business_target_has_forced_RLS_no_source_roles_Auth_sessions_invites_outbox_or_temporary_access');
 await assert.rejects(rebuildBusinessQuarantine({targetId:t,...saved,passphrase:phrase,frontier:frontierFixture()}),/EMPTY_QUARANTINE/);
 assert.equal(sql(t,'postgres','select count(*) from concierge_properties;'),'1');pass('existing_quarantine_cannot_be_overwritten');
 const corrupt=Buffer.from(old);corrupt[corrupt.length-20]^=1;const corruptFile=path.join(roots.data,'corrupt.cva');await writeFile(corruptFile,corrupt,{mode:0o600});const empty=await target();
 await assert.rejects(rebuildBusinessQuarantine({targetId:empty,...saved,dataFile:corruptFile,passphrase:phrase,frontier:frontierFixture()}),/INTEGRITY/);await rm(corruptFile);
 assert.equal(sql(empty,'postgres',"select count(*) from pg_tables where schemaname='public';"),'0');pass('new_business_path_authenticates_entire_archive_before_target_DDL');
 const rollback=frontierFixture();rollback.minimumHead.sequence++;
 await assert.rejects(rebuildBusinessQuarantine({targetId:empty,...saved,passphrase:phrase,frontier:rollback}),/NONROLLBACK/);assert.equal(sql(empty,'postgres',"select count(*) from pg_tables where schemaname='public';"),'0');pass('new_business_path_requires_external_current_post_capture_nonrollback_journal_before_DDL');
 for(const options of [{wrongCA:true},{wrongHost:true}]){
  await assert.rejects(capturePrivateQA({roots,source:await source(options),basename:'tls-denied',passphrase:phrase}),/PRIVATE_TLS_OR_SOURCE_PROBE_FAILED/);assertNoPrivateClients();
 }
 pass('new_PGPASS_client_wrong_CA_or_hostname_denied_and_all_client_tmpfs_destroyed');
 const collision=await source();await assert.rejects(capturePrivateQA({roots,source:collision,basename:'private-client',passphrase:phrase}),/EXISTING_BACKUP_PRESERVED/);assert.throws(()=>collision.dump(),/DISPOSED/);pass('name_collision_keeps_existing_pair_and_disposes_private_credential_before_any_dump');
 const denied=await source();sql(sourceId,'fixture_source','create table fixture.new_denied_table(value text);revoke all on fixture.new_denied_table from private_reader;');
 await assert.rejects(capturePrivateQA({roots,source:denied,basename:'permission-denied',passphrase:phrase}),/PG_DUMP_FAILED/);sql(sourceId,'fixture_source','drop table fixture.new_denied_table;');assertNoPrivateClients();
 pass('new_client_permission_failure_aborts_without_schema_excludes_or_credential_residue');
 // Poisoned cross-tenant data remains isolated and is rejected after import.
 sql(sourceId,'fixture_source',"update concierge_properties set account_id='99999999-9999-4999-8999-999999999999';");
 const poison=await capturePrivateQA({roots,source:await source(),basename:'cross-tenant',passphrase:phrase}),badTarget=await target();
 await assert.rejects(rebuildBusinessQuarantine({targetId:badTarget,...poison,passphrase:phrase,frontier:frontierFixture()}),/TENANT_OR_REFERENCE/);
 assert.equal(sql(badTarget,'postgres',"select count(*) from pg_tables where schemaname='public';"),'0');pass('cross_tenant_restored_reference_denied_and_only_new_target_tables_removed');
 assert.deepEqual(await readFile(saved.dataFile),old);assert.deepEqual(await readFile(saved.keyFile),key);
 assert.deepEqual((await readdir(roots.root)).filter(x=>x.startsWith('.provisional-pending-')),[]);pass('all_new_failures_preserve_preexisting_cipher_pair_and_remove_owned_pending_material');
}finally{
 if(writer?.exitCode===null){writer.kill();if(writerDone)await writerDone;}
 try{assertNoPrivateClients();}finally{try{for(const id of targets)cleanup(id);}finally{try{if(sourceId)cleanup(sourceId);}finally{if(roots)await removeFictionalRun(roots.root);}}}
}
assertNoResources();assertNoPrivateClients();if(roots)await assert.rejects(lstat(roots.root),{code:'ENOENT'});pass('independent_cleanup_no_owned_clients_networks_volumes_targets_or_private_directories');
console.log(JSON.stringify({result:'PRIVATE_CLIENT_AND_BUSINESS_QUARANTINE_QA_PASS',passed:checks.length,checks,realCaptureExecuted:false,remoteConnectionEnabled:false,integralRecoveryVerified:false,closedOperationalControls:[]}));
