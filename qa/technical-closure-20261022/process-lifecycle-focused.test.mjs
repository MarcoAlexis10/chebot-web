import test from 'node:test';import assert from 'node:assert/strict';
import {createRun,removeFictionalRun} from './approved/private-host.mjs';
import {captureFictional} from './capture-adapter.mjs';import {processFixture} from './source-capability.mjs';
import {captureStream} from './process-source.mjs';
test('timeout still cancels a pg_dump process after its stdout has already closed',async()=>{
 const before=performance.now();
 const stream=captureStream(processFixture('stdout-closed-hang'),{timeoutMs:100});
 await assert.rejects(async()=>{for await(const _chunk of stream){}},/CAPTURE_TIMEOUT/);
 assert.ok(performance.now()-before<1500,'closed stdout left child alive until natural exit');
});
test('lifecycle cancellation correction preserves exit-zero encrypted publication',async()=>{
 const r=await createRun();try{
  const saved=await captureFictional({roots:r,source:processFixture(),basename:'lifecycle',passphrase:'FICTIONAL-LIFECYCLE-ONLY-PHRASE'});
  assert.equal(saved.dumpExitZero,true);assert.equal(saved.realCaptureExecuted,false);
 }finally{await removeFictionalRun(r.root);}
});
