import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,rm,lstat} from 'node:fs/promises';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';import path from 'node:path';
import {startFixture,assertFixture,sql,cmd,cleanup,assertNoResources} from './pg-fixture.mjs';
import {createRun,removeFictionalRun} from '../approved/private-host.mjs';
import {pgFixtureSource} from '../source-capability.mjs';
import {captureFictional} from '../capture-adapter.mjs';
import {createClosedTarget} from './closed-target.mjs';
import {rebuildFictional} from '../reconstruction.mjs';
import {freshChallenge,eventDigest} from '../journal.mjs';
const checks=[],pass=s=>{checks.push(s);console.log('PASS '+s);};
let sourceId,closedId,roots;const phrase='FICTIONAL_TLS_ADAPTER_NEW_LAB_ONLY';
function witness(){const now=Date.now(),{publicKey,privateKey}=generateKeyPairSync('ed25519'),journal={kind:'CHEVENI_INDEPENDENT_REVOCATIONS_V1',id:'fictional-independent',baselineComplete:true,events:[{sequence:1,subject:'subject-aaaaaaaaaaaaaaaa',action:'REVOKE',at:new Date(now-1000).toISOString()}]},challenge=freshChallenge(),baseline=createHash('sha256').update(JSON.stringify(['BASELINE',journal.id])).digest('hex');
 const head={journalId:journal.id,sequence:1,digest:eventDigest(baseline,journal.events[0]),observedAt:new Date(now).toISOString(),challenge};return {journal,head,signature:sign(null,Buffer.from(JSON.stringify(head)),privateKey).toString('base64'),publicKey,challenge,now};}
try{
 sourceId=await startFixture();roots=await createRun();
 sql(sourceId,'fixture_source',"create table fixture.business(id integer primary key,tenant text not null,property text not null,value text not null);insert into fixture.business values(1,'tenant-a','property-a','FICTIONAL-BUSINESS');create schema auth;create table auth.sessions(token text);insert into auth.sessions values('FICTIONAL-STALE-SESSION');create table fixture.outbox(payload text);insert into fixture.outbox values('FICTIONAL-UNSENT');create table fixture.invitations(token text);insert into fixture.invitations values('FICTIONAL-INVITE');grant usage on schema auth to fixture_reader;grant select on all tables in schema auth to fixture_reader;grant select on all tables in schema fixture to fixture_reader;");
 const source=await pgFixtureSource(sourceId);const probe=await source.probe();assert.equal(probe.tls,true);assert.equal(probe.readOnly,true);assert.match(probe.version,/^17\.11/);pass('TLS_verify_full_real_pg17_source_readonly_attestation');
 for(const options of [{wrongHost:true},{wrongCA:true}])await assert.rejects(captureFictional({roots,source:await pgFixtureSource(sourceId,options),basename:'tls-reject',passphrase:phrase}),/TLS_OR_READONLY_SOURCE_PROBE_FAILED/);
 assert.deepEqual(await readdir(roots.data),[]);pass('wrong_CA_and_hostname_deny_before_dump_or_publication');
 const n=assertFixture(sourceId),help=cmd(['exec',n.container,'pg_dump','--help']).toString();assert.ok(help.includes('--lock-wait-timeout'));pass('client_help_checked_pg_dump_custom_lock_wait_supported');
 const saved=await captureFictional({roots,source,basename:'tls-fixture',passphrase:phrase});assert.equal(saved.dumpExitZero,true);pass('new_adapter_single_real_TLS_custom_pg_dump_exit_zero');
 const old=await readFile(saved.dataFile),oldKey=await readFile(saved.keyFile);
 const {id,token}=await createClosedTarget();closedId=id;
 const incomplete=witness();incomplete.journal.baselineComplete=false;
 await assert.rejects(rebuildFictional({...saved,passphrase:phrase,journalWitness:incomplete,target:token}),/CURRENT_INDEPENDENT_JOURNAL_REQUIRED/);
 assert.equal(sql(closedId,'postgres',"select to_regnamespace('fixture') is null;"),'t');pass('missing_current_journal_blocks_even_target_DDL');
 const bad=path.join(roots.data,'corrupt.cva'),b=Buffer.from(old);b[b.length-20]^=1;await writeFile(bad,b,{mode:0o600});
 await assert.rejects(rebuildFictional({...saved,dataFile:bad,passphrase:phrase,journalWitness:witness(),target:token}),/INTEGRITY/);await rm(bad);
 assert.equal(sql(closedId,'postgres',"select to_regnamespace('fixture') is null;"),'t');pass('V2_authentication_before_restore_and_any_target_mutation');
 const rebuilt=await rebuildFictional({...saved,passphrase:phrase,journalWitness:witness(),target:token});assert.equal(rebuilt.canOpenGuestAccess,false);
 assert.equal(sql(closedId,'postgres',"select value from fixture.business where id=1;"),'FICTIONAL-BUSINESS');
 assert.equal(sql(closedId,'postgres',"select to_regnamespace('auth') is null and to_regclass('fixture.outbox') is null and to_regclass('fixture.invitations') is null;"),'t');
 assert.equal(sql(closedId,'postgres','select closed from recovery_control.state;'),'t');pass('closed_rebuild_data_only_without_Auth_sessions_invites_outbox_or_access');
 const c=JSON.parse(cmd(['inspect',assertFixture(closedId).container]))[0];assert.equal(c.HostConfig.NetworkMode,'none');assert.equal(Object.keys(c.HostConfig.PortBindings??{}).length,0);pass('reconstruction_target_has_no_egress_and_no_published_ports');
 await assert.rejects(rebuildFictional({...saved,passphrase:phrase,journalWitness:witness(),target:token}),/EMPTY_CLOSED_TARGET_REQUIRED/);pass('nonempty_target_rejected_without_overwrite');
 sql(sourceId,'fixture_source',"create table fixture.no_read(id int);revoke all on fixture.no_read from fixture_reader;");
 await assert.rejects(captureFictional({roots,source,basename:'permissions-fail',passphrase:phrase}),/PG_DUMP_FAILED/);
 assert.deepEqual(await readFile(saved.dataFile),old);assert.deepEqual(await readFile(saved.keyFile),oldKey);assert.equal((await readdir(roots.data)).includes('permissions-fail.cva'),false);pass('real_dump_permission_failure_not_silently_omitted_existing_pair_preserved');
 assert.deepEqual((await readdir(roots.root)).filter(x=>x.startsWith('.provisional-pending-')),[]);pass('failed_TLS_and_dump_operations_leave_no_pending_material');
}finally{
 try{if(closedId)cleanup(closedId);}finally{try{if(sourceId)cleanup(sourceId);}finally{if(roots)await removeFictionalRun(roots.root);}}
}
assertNoResources();if(roots)await assert.rejects(lstat(roots.root),{code:'ENOENT'});pass('all_owned_fictional_containers_volumes_networks_and_private_material_removed');
console.log(JSON.stringify({result:'NEW_ADAPTER_PG17_CLOSED_REBUILD_PASS',passed:checks.length,checks,realCaptureExecuted:false,integralRecoveryVerified:false}));
