import assert from 'node:assert/strict';
import {createRun,removeFictionalRun} from './private-host.mjs';
import {startResource,cleanupResource,sql,captureFixture,restoreFixture} from './docker-fictional.mjs';
import {verifyFictionalEnvelope} from './provisional-crypto.mjs';
import {readFile,writeFile,rm,readdir} from 'node:fs/promises';
import path from 'node:path';
export async function packageLab(){
 const r=await createRun();const phrase='FICTIONAL-PACKAGE-SMOKE-ONLY-'+r.id;let count=0;
 try{
 await startResource(r.id);count++;
 sql(r.id,'postgres','create database fixture_source;create database fixture_target;');
 sql(r.id,'fixture_source',"create schema fixture;create table fixture.samples(id integer primary key,value text);insert into fixture.samples values(1,'FICTIONAL-WINDOWS-PACKAGE');");
 const saved=await captureFixture({id:r.id,roots:r,basename:'fixture',passphrase:phrase});count++;
 await verifyFictionalEnvelope({...saved,passphrase:phrase});await restoreFixture({id:r.id,...saved,passphrase:phrase});assert.equal(sql(r.id,'fixture_target','select count(*) from fixture.samples;'),'1');count++;
 await assert.rejects(()=>restoreFixture({id:r.id,...saved,passphrase:phrase}),/EMPTY_DISCARDABLE_TARGET_REQUIRED/);assert.equal(sql(r.id,'fixture_target','select count(*) from fixture.samples;'),'1');count++;
 const original=await readFile(saved.dataFile);const key=await readFile(saved.keyFile);
 await assert.rejects(()=>captureFixture({id:r.id,roots:r,basename:'fixture',passphrase:phrase}),/EXISTING_BACKUP/);assert.deepEqual(await readFile(saved.dataFile),original);assert.deepEqual(await readFile(saved.keyFile),key);count++;
 await assert.rejects(()=>captureFixture({id:r.id,roots:r,basename:'aborted',passphrase:phrase,onChunk:()=>{throw Error('FICTIONAL_PIPE_ABORT');}}),/FICTIONAL_PIPE_ABORT/);assert.deepEqual((await readdir(r.root)).filter(x=>x.startsWith('.provisional-pending-')),[]);count++;
 const bad=path.join(r.data,'bad.cva'),bytes=Buffer.from(original);bytes[bytes.length-20]^=1;await writeFile(bad,bytes);await assert.rejects(()=>verifyFictionalEnvelope({dataFile:bad,keyFile:saved.keyFile,passphrase:phrase}),/INTEGRITY/);await rm(bad);assert.deepEqual(await readFile(saved.dataFile),original);count++;
 sql(r.id,'postgres','drop database fixture_source;');await assert.rejects(()=>captureFixture({id:r.id,roots:r,basename:'nonzero',passphrase:phrase}),/PG_DUMP_FAILED/);assert.deepEqual(await readFile(saved.dataFile),original);assert.deepEqual((await readdir(r.root)).filter(x=>x.startsWith('.provisional-pending-')),[]);assert.equal((await readdir(r.data)).includes('nonzero.cva'),false);count++;
 return {result:'PACKAGE_PG17_SMOKE_PASS',checks:count+1,fictionalOnly:true,integralRecoveryVerified:false,realCaptureApproved:false};
 }finally{try{cleanupResource(r.id);}finally{await removeFictionalRun(r.root);}}
}
export async function packageRestore(input){
 // Authentication before resource creation; selected encrypted files are read-only and never removed.
 await verifyFictionalEnvelope(input);const r=await createRun();
 try{await startResource(r.id);sql(r.id,'postgres','create database fixture_target;');return await restoreFixture({id:r.id,...input});}
 finally{try{cleanupResource(r.id);}finally{await removeFictionalRun(r.root);}}
}
