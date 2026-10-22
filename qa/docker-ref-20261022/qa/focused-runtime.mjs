// New reference regression only: no previous suites or packageLab() invocation.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,readdir,lstat} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const pkg=path.resolve(process.argv[2]);
const load=name=>import(pathToFileURL(path.join(pkg,name)));
const d=await load('docker-fictional.mjs');
const h=await load('private-host.mjs');
const {verifyPackage}=await load('iniciar.mjs');
const expected='postgres@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826';
const checks=[];let r;
try{
 assert.equal(d.IMAGE,expected);await verifyPackage(pkg);
 const diagnostic=JSON.parse(execFileSync(process.execPath,[path.join(pkg,'iniciar.mjs'),'DIAGNOSTICO-LOCAL'],{encoding:'utf8',timeout:20000}));
 assert.equal(diagnostic.docker.pinnedImagePresent,true);assert.equal(diagnostic.remoteConnectionEnabled,false);assert.equal(diagnostic.realCaptureApproved,false);
 checks.push('canonical_cached_image_diagnostic');
 r=await h.createRun();await d.startResource(r.id);
 const names=d.assertResource(r.id);
 const actual=JSON.parse(d.command(['inspect',names.container]))[0];
 assert.equal(actual.Config.Image,expected);
 assert.match(d.sql(r.id,'postgres','show server_version;'),/^17\.11(?:\D|$)/);
 d.sql(r.id,'postgres','create database fixture_source;create database fixture_target;');
 d.sql(r.id,'fixture_source',"create schema fixture;create table fixture.reference_probe(id int primary key);insert into fixture.reference_probe values (22);");
 checks.push('canonical_container_identity_and_pg1711');
 const phrase='FICTIONAL-REFERENCE-REGRESSION-ONLY-'+r.id;
 const archive=await d.captureFixture({id:r.id,roots:r,basename:'canonical',passphrase:phrase});
 await d.restoreFixture({id:r.id,...archive,passphrase:phrase});
 assert.equal(d.sql(r.id,'fixture_target','select id from fixture.reference_probe;'),'22');
 checks.push('single_fictional_dump_restore');
 const prior=await readFile(archive.dataFile),key=await readFile(archive.keyFile);
 await assert.rejects(()=>d.captureFixture({id:r.id,roots:r,basename:'interrupted',passphrase:phrase,onChunk:()=>{throw Error('FICTIONAL_REFERENCE_ABORT');}}),/FICTIONAL_REFERENCE_ABORT/);
 assert.deepEqual((await readdir(r.root)).filter(x=>x.startsWith('.provisional-pending-')),[]);
 assert.deepEqual(await readFile(archive.dataFile),prior);assert.deepEqual(await readFile(archive.keyFile),key);
 assert.equal((await readdir(r.data)).includes('interrupted.cva'),false);
 checks.push('abort_cleanup_preserves_completed_pair');
}finally{
 if(r){try{d.cleanupResource(r.id);}finally{await h.removeFictionalRun(r.root);}}
}
assert.ok(r);
await assert.rejects(()=>lstat(r.root),{code:'ENOENT'});
for(const kind of ['container','network','volume']){
 const list=kind==='container'?['container','ls','-a']: [kind,'ls'];
 assert.equal(d.command([...list,'--filter','label=cheveni.windows.provisional='+r.id,'--format',kind==='container'?'{{.Names}}':'{{.Name}}']).toString().trim(),'');
}
checks.push('owned_docker_and_private_files_cleanup');
console.log(JSON.stringify({result:'FOCUSED_CANONICAL_REFERENCE_PASS',checks,passed:checks.length,fictionalOnly:true,realCaptureExecuted:false,integralRecoveryVerified:false}));
