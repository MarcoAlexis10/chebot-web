import test from 'node:test';import assert from 'node:assert/strict';
import {pgpassLine,prepareDevCapture,remoteConnectionEnabled,ownedPrivateQASource,assertClientShape} from './private-source.mjs';
import {capturePrivateQA} from './capture-private-qa.mjs';
import {reconcileRecoveryFrontier} from './recovery-frontier.mjs';
import {frontierFixture} from './qa/frontier-fixture.mjs';
import {preparationStatus,dependencies} from './release-dependencies.mjs';
test('DEV private-client route refuses authorization flags before accessing input or creating a process',()=>{
 let reads=0;const input={get password(){reads++;throw Error('MUST_NOT_READ');},authorized:true};
 assert.equal(remoteConnectionEnabled,false);assert.throws(()=>prepareDevCapture(input),/NOT_RELEASED/);assert.equal(reads,0);
});
test('unowned QA source and caller-supplied transports cannot access private roots',async()=>{
 await assert.rejects(ownedPrivateQASource('not-owned'),/OWNED_FIXTURE_REQUIRED/);
 let reads=0;await assert.rejects(capturePrivateQA({source:{},get roots(){reads++;}}),/OWNED_PRIVATE_QA_SOURCE_REQUIRED/);assert.equal(reads,0);
});
test('pgpass exact fields escape colon and backslash; line, NUL and wildcard injection denied',()=>{
 const p={host:'fictional.invalid',port:5432,database:'fixture_source',user:'private_reader',password:'FICTIONAL:a\\b'};
 assert.equal(pgpassLine(p),'fictional.invalid:5432:fixture_source:private_reader:FICTIONAL\\:a\\\\b\n');
 for(const password of ['bad\nsecond','bad\rrow','bad\0value','*',''])assert.throws(()=>pgpassLine({...p,password}),/REJECTED/);
});
test('inspection policy rejects writable root, published port, host bind, wrong network, wrong image and volume',()=>{
 const base={Config:{Image:'postgres@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826',Labels:{'cheveni.private.client.qa':'qa-id'}},HostConfig:{ReadonlyRootfs:true,Privileged:false,CapDrop:['ALL'],SecurityOpt:['no-new-privileges'],Binds:[],PortBindings:{},Tmpfs:{'/run/cheveni':'size=1048576'}},NetworkSettings:{Networks:{'internal-qa':{}}},Mounts:[{Type:'tmpfs'}]};
 assertClientShape(base,{id:'qa-id',network:'internal-qa'});
 for(const mutate of [x=>x.HostConfig.ReadonlyRootfs=false,x=>x.HostConfig.PortBindings={pg:[{}]},x=>x.HostConfig.Binds=['/host:/data'],x=>x.NetworkSettings.Networks={bridge:{}},x=>x.Config.Image='postgres:latest',x=>x.Mounts.push({Type:'volume'})]){const c=structuredClone(base);mutate(c);assert.throws(()=>assertClientShape(c,{id:'qa-id',network:'internal-qa'}),/ISOLATION_FAILED/);}
});
test('independent frontier must be newer than the capture and preserves deny-by-default access',()=>{
 const r=reconcileRecoveryFrontier(frontierFixture());assert.equal(r.postCaptureHeadVerified,true);assert.equal(r.canOpenGuestAccess,false);assert.equal(r.revoked.length,2);
 const p=frontierFixture();p.captureFinishedAt=new Date(p.now+1).toISOString();assert.throws(()=>reconcileRecoveryFrontier(p),/NONROLLBACK/);
});
test('freshly signed rollback, same-sequence fork and wrong journal floor fail',()=>{
 for(const mutate of [p=>p.minimumHead.sequence++,p=>p.minimumHead.digest='0'.repeat(64),p=>p.minimumHead.journalId='another-custodian']){const p=frontierFixture();mutate(p);assert.throws(()=>reconcileRecoveryFrontier(p),/NONROLLBACK/);}
});
test('a valid post-capture signature cannot replace the external floor or attest missing events',()=>{
 const p=frontierFixture();p.minimumHead=null;assert.throws(()=>reconcileRecoveryFrontier(p),/NONROLLBACK/);
 const q=frontierFixture();q.witness.journal.baselineComplete=false;assert.throws(()=>reconcileRecoveryFrontier(q),/CURRENT_INDEPENDENT/);
});
test('later release stages retain recovery, privacy, provider and owner authorization dependencies',()=>{
 const s=preparationStatus({approved:true});assert.equal(s.realCaptureApproved,false);assert.equal(s.betaApproved,false);assert.deepEqual(s.closedOperationalControls,[]);
 assert.ok(dependencies.A2_INSTALL.includes('rollbackForActualChange'));assert.ok(dependencies.WHATSAPP.includes('PRIVACY'));assert.ok(dependencies.BETA.includes('firstVerifiedStayClock'));
});
