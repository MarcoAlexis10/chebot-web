import assert from 'node:assert/strict';import {readFile,lstat} from 'node:fs/promises';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {createRun,removeFictionalRun,verifyNode} from './approved/private-host.mjs';
import {startFixture,sql,cleanup,assertNoResources} from './qa/pg-fixture.mjs';
import {pgFixtureSource} from './source-capability.mjs';import {captureFictional} from './capture-adapter.mjs';
import {createClosedTarget} from './qa/closed-target.mjs';import {rebuildFictional} from './reconstruction.mjs';import {freshChallenge} from './journal.mjs';
export async function desktopFocusedLab(){
 let roots,sourceId,targetId;let stages=0;
 try{
  verifyNode();roots=await createRun();sourceId=await startFixture();stages++;
  const source=await pgFixtureSource(sourceId),p=await source.probe();assert.equal(p.tls,true);assert.equal(p.readOnly,true);
  for(const options of [{wrongCA:true},{wrongHost:true}])await assert.rejects((await pgFixtureSource(sourceId,options)).probe(),/TLS_OR_READONLY_SOURCE_PROBE_FAILED/);stages++;
  sql(sourceId,'fixture_source',"create table fixture.business(id int primary key,tenant text not null,property text not null,value text not null);insert into fixture.business values(1,'tenant-a','property-a','FICTIONAL_DESKTOP');create schema auth;create table auth.sessions(value text);insert into auth.sessions values('FICTIONAL_NEVER_IMPORT');grant usage on schema auth to fixture_reader;grant select on auth.sessions to fixture_reader;grant select on fixture.business to fixture_reader;");
  const passphrase='FICTIONAL_DESKTOP_TEST_NO_REAL_BACKUP';
  const saved=await captureFictional({roots,source,basename:'desktop-only',passphrase});
  const {publicKey,privateKey}=generateKeyPairSync('ed25519'),now=Date.now(),challenge=freshChallenge(),journal={kind:'CHEVENI_INDEPENDENT_REVOCATIONS_V1',id:'fictional-desktop',baselineComplete:true,events:[]};
  const head={journalId:journal.id,sequence:0,digest:createHash('sha256').update(JSON.stringify(['BASELINE',journal.id])).digest('hex'),observedAt:new Date(now).toISOString(),challenge};
  const journalWitness={journal,head,publicKey,challenge,now,signature:sign(null,Buffer.from(JSON.stringify(head)),privateKey).toString('base64')};
  const target=await createClosedTarget();targetId=target.id;
  await rebuildFictional({...saved,passphrase,journalWitness,target:target.token});
  assert.equal(sql(targetId,'postgres','select value from fixture.business where id=1;'),'FICTIONAL_DESKTOP');
  assert.equal(sql(targetId,'postgres',"select to_regnamespace('auth') is null and (select closed from recovery_control.state);"),'t');stages++;
 }finally{try{if(targetId)cleanup(targetId);}finally{try{if(sourceId)cleanup(sourceId);}finally{if(roots)await removeFictionalRun(roots.root);}}}
 assertNoResources();if(roots)await assert.rejects(lstat(roots.root),{code:'ENOENT'});stages++;
 return {result:'NEW_DESKTOP_FICTIONAL_ADAPTER_PASS',stages,privateDirectoriesRemoved:true,ownedDockerResourcesRemoved:true,
  remoteConnectionEnabled:false,realCaptureExecuted:false,integralRecoveryVerified:false,
  scope:'Only the new adapter/TLS/closed reconstruction bridge; does not repeat the integral ASUS lab'};
}
