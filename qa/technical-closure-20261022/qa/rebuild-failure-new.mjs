import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {startFixture,cleanup,assertNoResources,sql} from './pg-fixture.mjs';
import {createClosedTarget} from './closed-target.mjs';import {createRun,removeFictionalRun} from '../approved/private-host.mjs';
import {captureFictional} from '../capture-adapter.mjs';import {pgFixtureSource} from '../source-capability.mjs';
import {rebuildFictional} from '../reconstruction.mjs';import {freshChallenge} from '../journal.mjs';
let sourceId,targetId,roots;const checks=[];const pass=x=>{checks.push(x);console.log('PASS '+x);};
try{
 sourceId=await startFixture();roots=await createRun();
 sql(sourceId,'fixture_source',"create table fixture.business(id int primary key,tenant text not null,property text not null,value text not null,unexpected text);insert into fixture.business values(1,'tenant-a','property-a','FICTIONAL-BAD-SHAPE','FICTIONAL-EXTRA');grant select on fixture.business to fixture_reader;");
 const passphrase='FICTIONAL_REBUILD_FAILURE_NEW_ONLY';
 const saved=await captureFictional({roots,source:await pgFixtureSource(sourceId),basename:'shape-drift',passphrase});const data=await readFile(saved.dataFile),key=await readFile(saved.keyFile);pass('affected_new_pump_still_captures_real_TLS_pg_dump_after_lifecycle_fix');
 const {publicKey,privateKey}=generateKeyPairSync('ed25519'),now=Date.now(),challenge=freshChallenge(),journal={kind:'CHEVENI_INDEPENDENT_REVOCATIONS_V1',id:'fictional-current',baselineComplete:true,events:[]};
 const head={journalId:journal.id,sequence:0,digest:createHash('sha256').update(JSON.stringify(['BASELINE',journal.id])).digest('hex'),observedAt:new Date(now).toISOString(),challenge};
 const journalWitness={journal,head,publicKey,challenge,now,signature:sign(null,Buffer.from(JSON.stringify(head)),privateKey).toString('base64')};
 const {id,token}=await createClosedTarget();targetId=id;
 await assert.rejects(rebuildFictional({...saved,passphrase,journalWitness,target:token}),/REBUILD_FAILED_TARGET_CLOSED_AND_OWN_SCHEMAS_REMOVED/);
 assert.equal(sql(id,'postgres',"select to_regnamespace('fixture') is null and to_regnamespace('recovery_control') is null;"),'t');pass('authentic_but_incompatible_data_archive_rolls_back_import_and_removes_only_new_target_schemas');
 assert.deepEqual(await readFile(saved.dataFile),data);assert.deepEqual(await readFile(saved.keyFile),key);assert.deepEqual((await readdir(roots.root)).filter(x=>x.startsWith('.provisional-pending-')),[]);pass('failed_rebuild_keeps_completed_encrypted_pair_and_no_capture_staging');
}finally{try{if(targetId)cleanup(targetId);}finally{try{if(sourceId)cleanup(sourceId);}finally{if(roots)await removeFictionalRun(roots.root);}}}
assertNoResources();pass('new_rebuild_failure_fixture_cleaned');console.log(JSON.stringify({result:'REBUILD_FAILURE_NEW_PASS',passed:checks.length,checks,canOpenGuestAccess:false,realRecoveryVerified:false}));
