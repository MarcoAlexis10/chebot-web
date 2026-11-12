import test from 'node:test';import assert from 'node:assert/strict';
import {createDaytimeCandidate} from './candidate.mjs';
test('founder request, admission, lost original/restart, independent read and configuration stay closed without accepting injected grants or durable ACKs',async()=>{
 let reads=0;const poison=new Proxy({},{get(){reads++;throw Error('FORBIDDEN')}}),c=createDaytimeCandidate(poison);
 for(const fn of [c.propertyAuthority.resolve,c.propertyAuthority.admit,c.propertyCapture.prepare,c.propertyCapture.write]){const r=await fn(poison);assert.equal(r.receipt,null);assert.equal(r.dispatchPerformed,false);}
 for(const value of [poison,{state:'COMMITTED',commit:'COMMITTED',originalRef:'client',snapshot:{trusted:true},journal:{signed:true}},undefined]){
  for(const fn of [c.captureReader.read,c.captureReader.recover]){const r=await fn(value);assert.equal(r.state,'UNKNOWN');assert.equal(r.propertyId,null);assert.equal(r.originalTrusted,false);assert.equal(r.automaticRetryAllowed,false);}
  assert.equal((await c.originalComparator.compare(value)).state,'UNKNOWN');const config=await c.prepareConfiguration(value);assert.equal(config.propertyId,null);assert.equal(config.entityRevisionAvailable,false);
 }
 assert.equal(reads,0);
});
