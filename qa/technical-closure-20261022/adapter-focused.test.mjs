import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,writeFile,lstat,rm} from 'node:fs/promises';
import path from 'node:path';
import {createRun,removeFictionalRun,checkPrivate} from './approved/private-host.mjs';
import {processFixture} from './source-capability.mjs';
import {captureFictional,captureDev,remoteConnectionEnabled} from './capture-adapter.mjs';
import {verifyFictionalEnvelope} from './envelope-v2.mjs';
import {verifyFictionalEnvelope as oldVerify} from './approved/provisional-crypto.mjs';
const phrase='FICTIONAL_NEW_ADAPTER_TEST_PHRASE_ONLY';
async function run(fn){const r=await createRun();try{await fn(r);}finally{await removeFictionalRun(r.root);}await assert.rejects(lstat(r.root),{code:'ENOENT'});}
const save=(r,mode='ok',extra={})=>captureFictional({roots:r,source:processFixture(mode),basename:'new-adapter',passphrase:phrase,...extra});
test('real DEV route and arbitrary transports cannot start a child or access credentials',async()=>{
 assert.equal(remoteConnectionEnabled,false);assert.throws(()=>captureDev({authorized:true,project:'tyvwgsdzqipusodxtydv'}),/SEPARATE_AUTHORIZED_RELEASE/);
 let calls=0;await assert.rejects(captureFictional({roots:{get root(){calls++;throw Error('CREDENTIAL_READ');}},source:{dump(){calls++;}}}),/OWNED_FICTIONAL_SOURCE_REQUIRED/);assert.equal(calls,0);
});
test('V2 process adapter publishes only a complete authenticated pair in private separate directories',()=>run(async r=>{
 const saved=await save(r);assert.equal(saved.dumpExitZero,true);assert.equal(saved.canOpenGuestAccess,false);
 await checkPrivate(r.data);await checkPrivate(r.keys);assert.notEqual(path.dirname(saved.dataFile),path.dirname(saved.keyFile));
 assert.equal((await verifyFictionalEnvelope({...saved,passphrase:phrase})).authenticated,true);
 await assert.rejects(oldVerify({...saved,passphrase:phrase}),/KEY_ENVELOPE_INVALID|NOT_PROVISIONAL_FORMAT/);
}));
test('late pg_dump nonzero after stdout never publishes and preserves completed files',()=>run(async r=>{
 const old=await save(r),bytes=await readFile(old.dataFile),key=await readFile(old.keyFile);
 await assert.rejects(save(r,'late-nonzero',{basename:'late'}),/PG_DUMP_FAILED/);
 assert.deepEqual(await readFile(old.dataFile),bytes);assert.deepEqual(await readFile(old.keyFile),key);
 assert.deepEqual((await readdir(r.root)).filter(x=>x.startsWith('.provisional-pending-')),[]);
 assert.equal((await readdir(r.data)).includes('late.cva'),false);
}));
test('redacts child diagnostics and fails instead of certifying incomplete coverage',()=>run(async r=>{
 await assert.rejects(save(r,'stderr'),e=>/PG_DUMP_FAILED|PG_DUMP_DIAGNOSTIC_REVIEW_REQUIRED/.test(e.message)&&!e.message.includes('FICTIONAL_SECRET'));
 assert.deepEqual(await readdir(r.data),[]);assert.deepEqual(await readdir(r.keys),[]);
}));
test('timeout, cancellation and bounded output remove only current staging',()=>run(async r=>{
 const old=await save(r),bytes=await readFile(old.dataFile);
 await assert.rejects(save(r,'hang',{basename:'timeout',limits:{timeoutMs:100}}),/CAPTURE_TIMEOUT/);
 const controller=new AbortController();const p=save(r,'hang',{basename:'cancel',limits:{signal:controller.signal}});setTimeout(()=>controller.abort(),100);
 await assert.rejects(p,/CAPTURE_CANCELLED/);
 await assert.rejects(save(r,'large',{basename:'large',limits:{maxBytes:64}}),/CAPTURE_TOO_LARGE/);
 assert.deepEqual(await readFile(old.dataFile),bytes);assert.deepEqual((await readdir(r.root)).filter(x=>x.startsWith('.provisional-pending-')),[]);
}));
test('read-only, engine, DB identity and TLS preflight disagreements deny capture',()=>run(async r=>{
 for(const override of [{readOnly:false},{tls:false},{version:'18.0'},{database:'postgres'},{marker:'another-fixture'}]){
  await assert.rejects(captureFictional({roots:r,source:processFixture('ok',override),basename:'reject',passphrase:phrase}),/SOURCE_ATTESTATION_FAILED/);
 }
 assert.deepEqual(await readdir(r.data),[]);
}));
test('collision during publication rolls back only its own hardlink and leaves competing file',()=>run(async r=>{
 const key=path.join(r.keys,'new-adapter.cclave'),data=path.join(r.data,'new-adapter.cva');
 await assert.rejects(save(r,'ok',{beforePublish:()=>writeFile(data,'FICTIONAL_CONCURRENT_FILE',{flag:'wx'})}),{code:'EEXIST'});
 assert.equal(await readFile(data,'utf8'),'FICTIONAL_CONCURRENT_FILE');await assert.rejects(lstat(key),{code:'ENOENT'});
 await rm(data);assert.deepEqual((await readdir(r.root)).filter(x=>x.startsWith('.provisional-pending-')),[]);
}));
