// New Docker-client cancellation and pre-stdin failure paths only.
import assert from 'node:assert/strict';import {spawn} from 'node:child_process';
import {readFile,writeFile,readdir,lstat} from 'node:fs/promises';import path from 'node:path';
import {startFixture,assertFixture,sql,cleanup,assertNoResources} from '../../technical-closure-20261022/qa/pg-fixture.mjs';
import {createRun,removeFictionalRun,safeEnv} from '../../technical-closure-20261022/approved/private-host.mjs';
import {ownedPrivateQASource,assertNoPrivateClients} from '../private-source.mjs';import {capturePrivateQA} from '../capture-private-qa.mjs';
const checks=[],pass=x=>{checks.push(x);console.log('PASS '+x);};let id,roots,locker,lockerDone,abortTimer;
try{
 id=await startFixture();roots=await createRun();sql(id,'fixture_source','create table fixture.locked_data(id int);insert into fixture.locked_data values(1);');
 // Preexisting fictional ciphertext markers are not presented as valid backups.
 const oldData=path.join(roots.data,'preexisting.cva'),oldKey=path.join(roots.keys,'preexisting.cclave');
 await writeFile(oldData,'FICTIONAL_PREEXISTING_CIPHERTEXT_MARKER',{flag:'wx',mode:0o600});await writeFile(oldKey,'FICTIONAL_PREEXISTING_KEY_MARKER',{flag:'wx',mode:0o600});
 const controller=new AbortController();let dumpStarted=false;
 const source=await ownedPrivateQASource(id,{beforeStart:({inspection:c})=>{if(c.Config.Cmd.includes('pg_dump')&&!c.Config.Cmd.includes('--help')){dumpStarted=true;abortTimer=setTimeout(()=>controller.abort(),150);}}});
 const n=assertFixture(id);locker=spawn('docker',['exec','-i',n.container,'psql','-X','-qAt','--username=postgres','--dbname=fixture_source','--set','ON_ERROR_STOP=1'],{env:safeEnv(),stdio:['pipe','pipe','pipe']});locker.stderr.resume();
 const locked=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('OWNED_LOCK_NOT_READY')),5000);locker.stdout.on('data',b=>{if(b.toString().includes('NEW_PRIVATE_LOCK_HELD')){clearTimeout(timer);resolve();}});});
 lockerDone=new Promise(resolve=>{locker.once('close',resolve);locker.once('error',()=>resolve(-1));});
 locker.stdin.end("begin;lock table fixture.locked_data in access exclusive mode;select 'NEW_PRIVATE_LOCK_HELD';select pg_sleep(12);rollback;");await locked;
 await assert.rejects(capturePrivateQA({roots,source,basename:'cancelled-client',passphrase:'FICTIONAL_CLIENT_CANCEL_PAPER_PHRASE',limits:{signal:controller.signal}}),/CAPTURE_CANCELLED/);clearTimeout(abortTimer);assert.equal(dumpStarted,true);assertNoPrivateClients();
 // A server waiting for a lock may retain the disconnected socket until
 // lock_timeout. Observe completion; never terminate a source backend to pass.
 let sessions='unknown';for(let attempt=0;attempt<16;attempt++){sessions=sql(id,'postgres',"select count(*) from pg_stat_activity where usename='private_reader';");if(sessions==='0')break;await new Promise(r=>setTimeout(r,250));}
 assert.equal(sessions,'0');pass('active_dump_client_tmpfs_removed_and_readonly_session_exits_after_lock_timeout_without_admin_termination');
 // Release the fixture-only lock before the next source factory's GRANT.
 await lockerDone;
 const failed=await ownedPrivateQASource(id,{beforeStart:()=>{throw Error('FICTIONAL_START_REJECTION');}});
 await assert.rejects(capturePrivateQA({roots,source:failed,basename:'start-rejected',passphrase:'FICTIONAL_CLIENT_CANCEL_PAPER_PHRASE'}),/PRIVATE_CLIENT_START_FAILED/);assertNoPrivateClients();pass('failure_after_create_before_secret_stdin_removes_owned_client_and_publishes_nothing');
 assert.equal(await readFile(oldData,'utf8'),'FICTIONAL_PREEXISTING_CIPHERTEXT_MARKER');assert.equal(await readFile(oldKey,'utf8'),'FICTIONAL_PREEXISTING_KEY_MARKER');
 assert.deepEqual(await readdir(roots.data),['preexisting.cva']);assert.deepEqual(await readdir(roots.keys),['preexisting.cclave']);assert.deepEqual((await readdir(roots.root)).filter(x=>x.startsWith('.provisional-pending-')),[]);pass('both_new_failure_paths_preserve_preexisting_files_and_remove_only_current_staging');
}finally{clearTimeout(abortTimer);try{assertNoPrivateClients();}finally{try{if(id)cleanup(id);if(locker){locker.kill();if(lockerDone)await lockerDone;}}finally{if(roots)await removeFictionalRun(roots.root);}}}
assertNoResources();assertNoPrivateClients();if(roots)await assert.rejects(lstat(roots.root),{code:'ENOENT'});pass('new_cancellation_scenario_has_independently_verified_complete_owned_cleanup');
console.log(JSON.stringify({result:'NEW_PRIVATE_CLIENT_CANCEL_AND_START_FAILURE_PASS',passed:checks.length,checks,realCaptureExecuted:false,remoteConnectionEnabled:false}));
