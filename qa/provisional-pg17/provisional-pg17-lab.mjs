/** Real pg_dump/pg_restore, fictional PostgreSQL 17 data only. No remote DB input. */
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {mkdtemp,readdir,readFile,writeFile,rm,lstat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {PG_IMAGE,LABEL,docker,assertFixture,sql,holdSnapshot,captureFictionalPostgres,restoreFictionalPostgres} from './online-provisional-pg17.mjs';
import {verifyFictionalEnvelope,openVerifiedFictionalEnvelope} from './online-provisional-crypto.mjs';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const hash=b=>createHash('sha256').update(b).digest('hex');
const phrase='QA-FICTIONAL-ONLY-recovery-phrase-20261021';
const run=process.env.GITHUB_RUN_ID??'local-fictional';
const id=randomBytes(6).toString('hex');
const network='cheveni-prov-'+id;
const source='cheveni_prov_source_'+id,target='cheveni_prov_target_'+id;
const volumeNames=['cheveni-prov-source-'+id,'cheveni-prov-target-'+id];
const labelArgs=['--label',LABEL+'='+id,'--label','cheveni.provisional.run='+run];
const stages=[];const stage=(name,details={})=>{stages.push({name,passed:true,...details});console.log(JSON.stringify({stage:stages.length,name,status:'PASS',...details}));};
let root,artifacts,baselineFiles,sourceRemoved=false;
const snapshots=[];const extraSessions=[];
const digestQuery=`select md5(jsonb_build_object(
 'events',(select jsonb_agg(to_jsonb(x) order by id) from app.events x),
 'sessions',(select jsonb_agg(to_jsonb(x) order by id) from auth_fake.sessions x),
 'vault',(select jsonb_agg(to_jsonb(x) order by id) from vault_fake.secrets x),
 'storage',(select jsonb_agg(to_jsonb(x) order by id) from storage_fake.objects x),
 'bulk',(select md5(string_agg(md5(payload),'' order by id)) from app.bulk)
)::text);`;
function sourceSql(text){return sql(source,id,'a1_source',text);}
function targetSql(text){return sql(target,id,'a1_target',text);}
function resetTarget(){sql(target,id,'postgres','drop database a1_target; create database a1_target;');}
function objectCount(){return targetSql("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname not like 'pg_%' and n.nspname<>'information_schema' and c.relkind in ('r','p','v','m','f','S');");}
async function sealedFiles(){const out={};for(const file of (await readdir(artifacts)).filter(f=>!f.startsWith('.'))){const p=path.join(artifacts,file);if((await lstat(p)).isFile())out[file]=hash(await readFile(p));}return out;}
async function preserveBaseline(){for(const [name,digest] of Object.entries(baselineFiles)){assert.equal(hash(await readFile(path.join(artifacts,name))),digest,'existing encrypted backup changed');}}
async function noPending(){assert.deepEqual((await readdir(artifacts)).filter(f=>f.startsWith('.provisional-pending-')),[]);}
function capture(snap,basename,more={}){return captureFictionalPostgres({container:source,id,snapshot:snap,privateDirectory:artifacts,basename,passphrase:phrase,...more});}
function restore(saved,more={}){return restoreFictionalPostgres({container:target,id,dataFile:saved.dataFile,keyFile:saved.keyFile,passphrase:phrase,...more});}
async function holdLock(){
 const p=spawn('docker',['exec','-i',source,'psql','-X','-qAt','--set=ON_ERROR_STOP=1','--username=postgres','--dbname=a1_source'],{stdio:['pipe','pipe','pipe']});
 p.stdin.on('error',()=>{});p.stderr.resume();
 const ready=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{p.kill();reject(Error('LOCK_TIMEOUT'));},10000);p.stdout.on('data',b=>{if(b.toString().includes('LOCK_READY')){clearTimeout(timeout);resolve();}});p.on('error',reject);});
 const ended=new Promise(resolve=>p.on('close',resolve));
 p.stdin.write("begin; lock table app.events in access exclusive mode; select 'LOCK_READY';\n");
 const session={release:async()=>{p.stdin.end('rollback;\n');await ended;}};extraSessions.push(session);await ready;return session;
}
function cleanupResources(){
 for(const container of [source,target]){
  const names=docker(['ps','-a','--filter','label='+LABEL+'='+id,'--format','{{.Names}}']).toString().trim().split('\n');
  if(names.includes(container)){
   const c=JSON.parse(docker(['inspect',container]))[0];assert.equal(c.Config.Labels[LABEL],id);assert.equal(c.Config.Labels['cheveni.provisional.run'],run);
   docker(['rm','-f',container]);
  }
 }
 for(const v of volumeNames){const names=docker(['volume','ls','--filter','label='+LABEL+'='+id,'--format','{{.Name}}']).toString().trim().split('\n');if(names.includes(v)){assert.equal(JSON.parse(docker(['volume','inspect',v]))[0].Labels[LABEL],id);docker(['volume','rm',v]);}}
 const nets=docker(['network','ls','--filter','label='+LABEL+'='+id,'--format','{{.Name}}']).toString().trim().split('\n');
 if(nets.includes(network)){assert.equal(JSON.parse(docker(['network','inspect',network]))[0].Labels[LABEL],id);docker(['network','rm',network]);}
 for(const args of [['ps','-a','--filter','label='+LABEL+'='+id,'--format','{{.ID}}'],['volume','ls','--filter','label='+LABEL+'='+id,'--format','{{.Name}}'],['network','ls','--filter','label='+LABEL+'='+id,'--format','{{.Name}}']])assert.equal(docker(args).toString().trim(),'');
}
async function main(){
 assert.equal(process.env.CHEVENI_PROVISIONAL_LAB,'fictional-only');
 root=await mkdtemp(path.join(tmpdir(),'cheveni-provisional-pg17-'));artifacts=path.join(root,'encrypted');
 docker(['network','create','--internal',...labelArgs,network]);
 for(const v of volumeNames)docker(['volume','create',...labelArgs,v]);
 for(const [name,volume,db] of [[source,volumeNames[0],'a1_source'],[target,volumeNames[1],'a1_target']]){
  docker(['run','--detach','--name',name,...labelArgs,'--network',network,'--mount','type=volume,src='+volume+',dst=/var/lib/postgresql/data','--env','POSTGRES_HOST_AUTH_METHOD=trust','--env','POSTGRES_DB='+db,PG_IMAGE]);
  let ready=false;for(let n=0;n<80;n++){try{docker(['exec',name,'pg_isready','--username=postgres','--dbname='+db]);ready=true;break;}catch{await pause(100);}}assert.equal(ready,true);
  assertFixture(name,id);
 }
 const versions={server:sourceSql('show server_version;'),dump:docker(['exec',source,'pg_dump','--version']).toString().trim(),restore:docker(['exec',target,'pg_restore','--version']).toString().trim()};
 assert.match(versions.server,/^17\.11/);assert.match(versions.dump,/17\.11/);assert.match(versions.restore,/17\.11/);
 stage('owned_internal_network_no_ports_pg17',versions);
 sourceSql(`create schema app; create schema auth_fake; create schema vault_fake; create schema storage_fake;
 create table app.events(id integer primary key,generation integer not null);
 create table auth_fake.sessions(id integer primary key references app.events(id),generation integer not null);
 insert into app.events values(1,0); insert into auth_fake.sessions values(1,0);
 create table vault_fake.secrets(id integer primary key,ciphertext text);insert into vault_fake.secrets values(1,'FICTIONAL-CIPHERTEXT-NOT-VAULT');
 create table storage_fake.objects(id integer primary key,body_ref text);insert into storage_fake.objects values(1,'FICTIONAL-METADATA-NO-S3');
 create sequence app.non_mvcc_seq;select nextval('app.non_mvcc_seq');
 create table app.bulk(id integer primary key,payload text not null);
 insert into app.bulk select i,repeat(md5(i::text),64) from generate_series(1,6000) i;
 create role fictional_global_role nologin;`);
 const initialHash=sourceSql(digestQuery);
 const held=holdSnapshot(source,id);snapshots.push(held);const snapshot=await held.snapshot;
 let concurrentCommits=0;
 const first=await capture(snapshot,'snapshot-first',{onFirstChunk:async({producerRunning})=>{
  assert.equal(producerRunning,true,'pg_dump must still be running while concurrent writer commits');
  for(let i=1;i<=5;i++){sourceSql(`begin; update app.events set generation=${i}; update auth_fake.sessions set generation=${i}; insert into app.events values(${i+1},${i});insert into auth_fake.sessions values(${i+1},${i});select nextval('app.non_mvcc_seq');commit;`);concurrentCommits++;}
 }});
 assert.equal(concurrentCommits,5);assert.equal(first.postgresStreamCompleted,true);
 const currentHash=sourceSql(digestQuery);assert.notEqual(initialHash,currentHash);
 const verified=await verifyFictionalEnvelope({...first,passphrase:phrase});assert.equal(verified.authenticated,true);assert.equal(verified.plaintextSha256,first.plaintextSha256);
 stage('pg_dump_stream_with_five_concurrent_commits',{commits:concurrentCommits,archiveBytes:first.plaintextBytes});
 const second=await capture(snapshot,'snapshot-shared');
 await held.release();snapshots.splice(snapshots.indexOf(held),1);
 const next=holdSnapshot(source,id);snapshots.push(next);const latest=await capture(await next.snapshot,'snapshot-new');await next.release();snapshots.splice(snapshots.indexOf(next),1);
 baselineFiles=await sealedFiles();
 const restored=await restore(first);assert.equal(restored.integralRecoveryVerified,false);assert.equal(targetSql(digestQuery),initialHash);assert.equal(targetSql('select count(*) from app.events;'),'1');
 stage('restore_old_snapshot_has_no_mixed_schema_generations');
 assert.equal(targetSql("select count(*) from pg_roles where rolname='fictional_global_role';"),'0');
 assert.equal(sourceSql("select last_value>1 from app.non_mvcc_seq;"),'t');
 stage('global_roles_absent_and_sequence_outside_snapshot_guarantee');
 resetTarget();await restore(second);assert.equal(targetSql(digestQuery),initialHash);
 resetTarget();await restore(latest);assert.equal(targetSql(digestQuery),currentHash);assert.notEqual(targetSql(digestQuery),initialHash);
 stage('same_exported_snapshot_equal_independent_snapshot_newer');

 // Data corruption and authentication failures must be rejected before ANY SQL restoration.
 resetTarget();
 const bytes=await readFile(first.dataFile);
 const damaged=path.join(artifacts,'damaged.cva');const changed=Buffer.from(bytes);changed[changed.length-40]^=1;await writeFile(damaged,changed);
 const before=objectCount();await assert.rejects(()=>restore({...first,dataFile:damaged}),/INTEGRITY/);assert.equal(objectCount(),before);
 await rm(damaged);const truncated=path.join(artifacts,'truncated.cva');await writeFile(truncated,bytes.subarray(0,bytes.length-9));
 await assert.rejects(()=>restore({...first,dataFile:truncated}),/INTEGRITY|TRUNCATED/);assert.equal(objectCount(),'0');await rm(truncated);
 await assert.rejects(()=>restore(first,{passphrase:'FICTIONAL-WRONG-PASSPHRASE-DO-NOT-USE'}),/PASSPHRASE/);
 await assert.rejects(()=>restore({...first,keyFile:latest.keyFile}),/INTEGRITY/);assert.equal(objectCount(),'0');await preserveBaseline();
 stage('corruption_truncation_wrong_phrase_wrong_key_precede_sql');
 const integral=path.join(artifacts,'integral.cva');await writeFile(integral,Buffer.concat([Buffer.from('CVA2'),bytes.subarray(4)]));
 await assert.rejects(()=>restore({...first,dataFile:integral}),/NOT_PROVISIONAL/);await rm(integral);assert.equal(objectCount(),'0');
 await assert.rejects(()=>openVerifiedFictionalEnvelope({...first,passphrase:phrase,maxBytes:1024}),/TOO_LARGE/);
 stage('integral_magic_rejected_and_memory_bound_enforced');

 const expired=holdSnapshot(source,id);const stale=await expired.snapshot;await expired.release();
 await assert.rejects(()=>capture(stale,'invalid-snapshot'),/PG_DUMP_FAILED/);await noPending();await preserveBaseline();
 stage('pg_dump_nonzero_discards_ciphertext_and_preserves_backups');
 const live=holdSnapshot(source,id);snapshots.push(live);const liveId=await live.snapshot;
 await assert.rejects(()=>capture(liveId,'midstream-abort',{onFirstChunk:()=>{throw Error('FICTIONAL_ABORT_DURING_DUMP');}}),/FICTIONAL_ABORT/);
 await noPending();await preserveBaseline();
 assert.equal(sourceSql("select count(*) from pg_stat_activity where application_name like 'cheveni-prov-dump-%';"),'0');
 stage('midstream_abort_cleans_process_and_pending_files');
 await assert.rejects(()=>capture(liveId,'snapshot-first'),/EXISTING_BACKUP_PRESERVED/);
 const keyOnly=path.join(artifacts,'key-collision.cclave');const original=Buffer.from('FICTIONAL-EXISTING-KEY-DO-NOT-OVERWRITE');await writeFile(keyOnly,original);
 await assert.rejects(()=>capture(liveId,'key-collision'),/EXISTING_BACKUP_PRESERVED/);assert.deepEqual(await readFile(keyOnly),original);await rm(keyOnly);await preserveBaseline();
 stage('existing_data_and_key_collisions_preserved');

 const lock=await holdLock();
 await assert.rejects(()=>capture(liveId,'ddl-conflict'),/PG_DUMP_FAILED/);await lock.release();extraSessions.splice(extraSessions.indexOf(lock),1);await noPending();await preserveBaseline();
 stage('concurrent_exclusive_ddl_lock_fails_closed_with_timeout');

 // Fault arrives AFTER key publication at final no-clobber link: preserve competing file.
 const raceFile=path.join(artifacts,'publish-race.cva');const competing=Buffer.from('FICTIONAL-OTHER-BACKUP');
 await assert.rejects(()=>capture(liveId,'publish-race',{onFirstChunk:()=>writeFile(raceFile,competing,{flag:'wx'})}),/EEXIST/);
 assert.deepEqual(await readFile(raceFile),competing);assert.equal((await readdir(artifacts)).includes('publish-race.cclave'),false);await rm(raceFile);await noPending();await preserveBaseline();
 stage('publication_race_removes_only_owned_key_link');

 // An authentic pg_dump can still be unrestorable: a global owner role is absent at the target.
 sourceSql('create table app.restore_failure(value integer);insert into app.restore_failure values(1);alter table app.restore_failure owner to fictional_global_role;');
 // Use a new snapshot for the deliberately missing-owner fixture.
 const badHold=holdSnapshot(source,id);snapshots.push(badHold);const bad=await capture(await badHold.snapshot,'restore-failure-current');await badHold.release();snapshots.splice(snapshots.indexOf(badHold),1);
 resetTarget();await assert.rejects(()=>restore(bad),/FICTIONAL_DOCKER_COMMAND_FAILED/);assert.equal(objectCount(),'0');
 await verifyFictionalEnvelope({...bad,passphrase:phrase});await preserveBaseline();
 stage('authenticated_archive_restore_error_rolls_back_all_sql_keeps_backup');
 await live.release();snapshots.splice(snapshots.indexOf(live),1);

 // True process crash during capture: only staging residue exists, no completed backup pair.
 const crashHold=holdSnapshot(source,id);snapshots.push(crashHold);const crashSnapshot=await crashHold.snapshot;
 const child=spawn(process.execPath,[fileURLToPath(import.meta.url),'--crash-capture'],{env:{...process.env,CHEVENI_CRASH_INPUT:JSON.stringify({container:source,id,snapshot:crashSnapshot,privateDirectory:artifacts,basename:'crash',passphrase:phrase})},stdio:['ignore','pipe','pipe']});
 child.stdout.resume();child.stderr.resume();const crashExit=await new Promise(resolve=>child.on('close',(code,signal)=>resolve({code,signal})));assert.equal(crashExit.signal,'SIGKILL');
 assert.equal((await readdir(artifacts)).includes('crash.cva'),false);assert.equal((await readdir(artifacts)).includes('crash.cclave'),false);
 const pending=(await readdir(artifacts)).filter(f=>f.startsWith('.provisional-pending-'));assert.equal(pending.length,1);
 // Explicit cleanup of this run's pending directory, never scan/delete completed backup names.
 await rm(path.join(artifacts,pending[0]),{recursive:true,force:true});
 sourceSql("select pg_terminate_backend(pid) from pg_stat_activity where application_name like 'cheveni-prov-dump-%';");
 await crashHold.release();snapshots.splice(snapshots.indexOf(crashHold),1);await preserveBaseline();await noPending();
 stage('sigkill_leaves_only_pending_residue_explicit_cleanup_preserves_completed_files');

 // Prove restoration can use the encrypted checkpoint without the source cluster.
 docker(['rm','-f',source]);docker(['volume','rm',volumeNames[0]]);sourceRemoved=true;
 resetTarget();await restore(first);assert.equal(targetSql(digestQuery),initialHash);
 stage('restore_after_source_cluster_and_volume_destroyed');
 cleanupResources();await preserveBaseline();
 stage('all_owned_containers_network_volumes_removed_backups_unchanged');
 console.log(JSON.stringify({result:'PROVISIONAL_PG17_FICTIONAL_LAB_PASS',stages:stages.length,versions,fictionalOnly:true,sourceRemoved,oldTestsRerun:false,realCaptureExecuted:false,realCaptureApproved:false,integralRecoveryVerified:false,go:'GO_TO_PREPARE_FUTURE_PRIVATE_PROVISIONAL_CAPTURE',completed:stages}));
}
if(process.argv[2]==='--crash-capture'){
 const input=JSON.parse(process.env.CHEVENI_CRASH_INPUT);delete process.env.CHEVENI_CRASH_INPUT;
 await captureFictionalPostgres({...input,onFirstChunk:()=>process.kill(process.pid,'SIGKILL')});
}else{
 let error;
 try{await main();}catch(e){error=e;console.error(JSON.stringify({result:'PROVISIONAL_PG17_FICTIONAL_LAB_FAIL',passedStages:stages.length,code:e.code??e.message,reason:e.reason,exitStatus:e.exitStatus,stack:e.stack,integralRecoveryVerified:false}));}
 finally{
  for(const s of [...extraSessions,...snapshots])await s.release().catch(()=>{});
  try{cleanupResources();console.log('PROVISIONAL_LAB_CLEANUP_OK');}catch(e){error??=e;console.error('PROVISIONAL_LAB_CLEANUP_FAILED');}
  if(root)await rm(root,{recursive:true,force:true});
 }
 if(error)process.exitCode=1;
}
