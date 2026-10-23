import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm,writeFile,readdir,lstat} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {createDevSource} from '../source.mjs';import {executeRealCapture,executeRealRestore,executeRealCopyVerification,prepareRecoveryChallenge} from '../runtime.mjs';
import {loadIndependentWitness} from '../runtime.mjs';
import {restoreCustodialCopy,captureToCustody} from '../operation.mjs';import {createCustody,assertCustody,publishPair,lockCustody,requireVacantCapture} from '../custody.mjs';
import {removeFictionalRun} from '../../technical-closure-20261022/approved/private-host.mjs';
test('all real entrypoints refuse before input/config/Docker, even with caller approval flags',async()=>{
 let calls=0;const trap=new Proxy({authorized:true},{get(){calls++;throw Error('PRIVATE_INPUT_READ');}});
 for(const fn of [createDevSource,executeRealCapture,executeRealRestore,executeRealCopyVerification])await assert.rejects(fn(trap),/REAL_OPERATION_LOCKED/);
 assert.throws(()=>prepareRecoveryChallenge(),/REAL_OPERATION_LOCKED/);assert.equal(calls,0);
});
test('coordinator refuses unminted transport before touching custody or passphrase',async()=>{let reads=0;await assert.rejects(captureToCustody({source:{},get custody(){reads++;throw Error('PRIVATE_READ');},get passphrase(){reads++;throw Error('SECRET_READ');}}),/OWNED_RELEASE_SOURCE_REQUIRED/);assert.equal(reads,0);});
test('durable custody is rejected by disposable recursive cleanup and concurrent lock',async()=>{
 const base=await mkdtemp(path.join(tmpdir(),'cv-release-unit-'));try{const token=await createCustody(base),r=await assertCustody(token);await assert.rejects(removeFictionalRun(r.root),e=>e.code==='ENOENT'||e.message==='OWNED_RUN_REQUIRED');const unlock=await lockCustody(token);await assert.rejects(lockCustody(token),{code:'EEXIST'});await unlock();assert.ok((await lstat(r.root)).isDirectory());}finally{await rm(base,{recursive:true});}
});
test('new publication rolls back only its own key link on collision and preserves durable data',async()=>{
 const base=await mkdtemp(path.join(tmpdir(),'cv-release-publication-'));try{const token=await createCustody(base),r=await assertCustody(token),input=path.join(r.root,'input');await import('node:fs/promises').then(m=>m.mkdir(input,{mode:0o700}));const pair={dataFile:path.join(input,'data'),keyFile:path.join(input,'key')};await writeFile(pair.dataFile,'FICTIONAL_CIPHER',{mode:0o600});await writeFile(pair.keyFile,'FICTIONAL_KEY_ENVELOPE',{mode:0o600});await writeFile(path.join(r.data,'collision.cva'),'FICTIONAL_EXISTING',{mode:0o600});await assert.rejects(publishPair(token,pair,'collision'),/EXISTING_CAPTURE_PRESERVED/);assert.deepEqual(await readdir(r.keys),[]);await assert.rejects(requireVacantCapture(token,'collision'),/EXISTING_CAPTURE_PRESERVED/);assert.deepEqual(await readdir(r.data),['collision.cva']);}finally{await rm(base,{recursive:true});}
});

test('non-QA recovery receipt cannot read custody or secret and same-custody trust is rejected',async()=>{
 let reads=0;await assert.rejects(restoreCustodialCopy({receipt:{executionClass:'OWNER_PRIVATE_DEV'},get custody(){reads++;throw Error('PRIVATE_READ');},get passphrase(){reads++;throw Error('SECRET_READ');}}),/REAL_OPERATION_LOCKED/);assert.equal(reads,0);
 const root=path.join(tmpdir(),'fictional-custody');await assert.rejects(loadIndependentWitness({custodyRoot:root,trustFile:path.join(root,'trust.json'),witnessFile:path.join(root,'witness.json')}),/INDEPENDENT_TRUST_LOCATION_REQUIRED/);
});
