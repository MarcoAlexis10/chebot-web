// NEW package regressions only. No old ASUS/coverage/crypto/PG17 suites imported.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdtemp,rm,cp,readdir,mkdir,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRun,assertRun,checkPrivate,cleanPending,removeFictionalRun,safeEnv} from './private-host.mjs';
import {sealPackageFixture,compareEncryptedCopies} from './package-io.mjs';
import {verifyFictionalEnvelope} from './provisional-crypto.mjs';
import {validateEndpoint,command} from './docker-fictional.mjs';
import {validateFutureSource,realCapture,DEV} from './future-dev-plan.mjs';
import {verifyPackage} from './iniciar.mjs';
const home=path.dirname(fileURLToPath(import.meta.url)),phrase='FICTITIOUS-ONLY-package-regression-2026';
const withRun=async fn=>{const r=await createRun();try{await fn(r);}finally{await removeFictionalRun(r.root);}};
const seal=(r,name,more={})=>sealPackageFixture({roots:r,basename:name,source:Readable.from(['FICTITIOUS-PACKAGE-CONTENT']),passphrase:phrase,...more});
function cli(mode,env={},input){return execFileSync(process.execPath,[path.join(home,'iniciar.mjs'),mode],{env:{...process.env,...env},input,encoding:'utf8',timeout:60000,stdio:['pipe','pipe','pipe']});}
test('Child environment never inherits credentials or untrusted Windows module cache paths',()=>{
 const names=['PGPASSWORD','PSModuleAnalysisCachePath','PSModulePath'],saved=names.map(k=>process.env[k]);
 try{process.env.PGPASSWORD='FICTITIOUS-ENV-CANARY';process.env.PSModuleAnalysisCachePath='\\\\fictional.invalid\\cache';process.env.PSModulePath='\\\\fictional.invalid\\modules';const e=safeEnv();assert.equal(e.PGPASSWORD,undefined);if(process.platform==='win32'){assert.equal(e.PSModuleAnalysisCachePath,'NUL');assert.equal(e.PSModulePath,path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','Modules'));}assert.equal(process.env.PSModuleAnalysisCachePath,'\\\\fictional.invalid\\cache');}
 finally{names.forEach((k,i)=>{if(saved[i]===undefined)delete process.env[k];else process.env[k]=saved[i];});}
});
test('Manifest flat, complete, and changed or unexpected files rejected',async()=>{
 assert.equal((await verifyPackage()).manifestVerified,true);const dir=await mkdtemp(path.join(tmpdir(),'provisional package spaces-'));
 try{await cp(home,dir,{recursive:true});await writeFile(path.join(dir,'LEEME-PRIMERO.txt'),'changed');await assert.rejects(()=>verifyPackage(dir),/CHANGED/);await cp(home,dir,{recursive:true});await writeFile(path.join(dir,'unexpected.txt'),'fictional');await assert.rejects(()=>verifyPackage(dir),/UNEXPECTED/);}finally{await rm(dir,{recursive:true,force:true});}
});
test('Future DEV source contract excludes PROD, arbitrary hosts, transaction pooler and weak TLS',()=>{
 const p={project:DEV,database:'postgres',port:5432,host:'db.'+DEV+'.supabase.co',user:'postgres',sslMode:'verify-full'};
 assert.equal(validateFutureSource(p).captureAllowed,false);
 assert.equal(validateFutureSource({...p,host:'aws-0-sa-east-1.pooler.supabase.com',user:'postgres.'+DEV}).shapeValid,true);
 for(const patch of [{project:'ykfpzqpiaxevpkhpaxpg'},{port:6543},{host:'example.invalid'},{user:'postgres.other'},{sslMode:'require'}])assert.throws(()=>validateFutureSource({...p,...patch}));
 assert.throws(()=>realCapture({authorized:true}),/NOT_AUTHORIZED/);
});
test('Windows npipe contract and Linux socket reject TCP SSH remote and cross-platform transport',()=>{
 for(const p of ['npipe:////./pipe/docker_engine','npipe:////./pipe/dockerDesktopLinuxEngine'])assert.equal(validateEndpoint(p,'win32'),true);
 for(const p of ['tcp://127.0.0.1:2375','tcp://example.invalid:2376','ssh://remote','unix:///var/run/docker.sock','npipe:////evil/pipe/docker_engine'])assert.throws(()=>validateEndpoint(p,'win32'));
 assert.equal(validateEndpoint('unix:///var/run/docker.sock','linux'),true);
 const old=process.env.DOCKER_HOST;try{process.env.DOCKER_HOST='tcp://example.invalid:2375';assert.throws(()=>command(['info']),/OVERRIDE/);}finally{if(old===undefined)delete process.env.DOCKER_HOST;else process.env.DOCKER_HOST=old;}
});
test('NTFS or POSIX private ACL checked for owner and separate data key folders',async()=>withRun(async r=>{
 assert.equal(await realpath(r.root),r.root);
 assert.equal((await checkPrivate(r.root)).private,true);assert.equal((await checkPrivate(r.data)).private,true);assert.equal((await checkPrivate(r.keys)).private,true);assert.notEqual(r.data,r.keys);assert.equal((await assertRun(r.root)).id,r.id);
}));
test('Package publication and independent encrypted copy hashes, no overwrite of either file',async()=>withRun(async r=>{
 const b=await seal(r,'preserve');await verifyFictionalEnvelope({...b,passphrase:phrase});const original=await readFile(b.dataFile),key=await readFile(b.keyFile);
 await assert.rejects(()=>seal(r,'preserve'),/EXISTING/);assert.deepEqual(await readFile(b.dataFile),original);assert.deepEqual(await readFile(b.keyFile),key);
 const dataCopy=path.join(r.data,'copy.cva'),keyCopy=path.join(r.keys,'copy.cclave');await writeFile(dataCopy,original);await writeFile(keyCopy,key);
 assert.equal((await compareEncryptedCopies({...b,dataCopy,keyCopy})).bothEncryptedCopiesMatch,true);await writeFile(keyCopy,'corrupt');await assert.rejects(()=>compareEncryptedCopies({...b,dataCopy,keyCopy}),/HASH_MISMATCH/);
}));
test('Publication collision after precheck preserves competing file and removes only own link',async()=>withRun(async r=>{
 const competitor=Buffer.from('FICTITIOUS-EXISTING-BACKUP');await assert.rejects(()=>seal(r,'race',{beforePublish:()=>writeFile(path.join(r.data,'race.cva'),competitor,{flag:'wx'})}),/EEXIST/);
 assert.deepEqual(await readFile(path.join(r.data,'race.cva')),competitor);assert.deepEqual(await readdir(r.keys),[]);assert.equal((await readdir(r.root)).some(x=>x.startsWith('.provisional-pending-')),false);
}));
test('Concurrent package operations do not clean another active staging directory',async()=>withRun(async r=>{
 let release,started;const gate=new Promise(resolve=>release=resolve),began=new Promise(resolve=>started=resolve);
 async function* slow(){yield Buffer.from('FICTITIOUS-SLOW');started();await gate;yield Buffer.from('END');}
 const first=seal(r,'slow',{source:Readable.from(slow())});await began;
 try{await seal(r,'fast');assert.equal((await readdir(r.root)).filter(x=>x.startsWith('.provisional-pending-')).length,1);}finally{release();await first;}
 await verifyFictionalEnvelope({dataFile:path.join(r.data,'slow.cva'),keyFile:path.join(r.keys,'slow.cclave'),passphrase:phrase});
}));
test('Failed producer cleans its pending files and preserves completed package backups',async()=>withRun(async r=>{
 const b=await seal(r,'prior'),old=await readFile(b.dataFile);async function* broken(){yield Buffer.from('FICTITIOUS');throw Error('FIXTURE_SOURCE_ABORT');}
 await assert.rejects(()=>seal(r,'failed',{source:Readable.from(broken())}),/SOURCE_ABORT/);assert.deepEqual(await readFile(b.dataFile),old);assert.equal((await readdir(r.root)).some(x=>x.startsWith('.provisional-pending-')),false);
}));
test('Ownership mismatch and unknown pending file refuse deletion',async()=>withRun(async r=>{
 const marker=path.join(r.root,'ownership.json'),original=await readFile(marker);await writeFile(marker,original.toString().replace(r.id,'0'.repeat(24)));await assert.rejects(()=>cleanPending(r.root),/OWNED/);await writeFile(marker,original);
 const pending=path.join(r.root,'.provisional-pending-'+'a'.repeat(24));await mkdir(pending);await writeFile(path.join(pending,'not-owned.txt'),'preserve');await assert.rejects(()=>cleanPending(r.root),/UNOWNED/);assert.equal((await readFile(path.join(pending,'not-owned.txt'))).toString(),'preserve');
}));
test('Dead-process staging cleanup is owned and never touches completed files',async()=>withRun(async r=>{
 const b=await seal(r,'completed'),before=await readFile(b.dataFile);
 const script=`const fs=require('node:fs'),path=require('node:path');let b='';process.stdin.on('data',c=>b+=c);process.stdin.on('end',()=>{const r=JSON.parse(b),op='b'.repeat(24),d=path.join(r.root,'.provisional-pending-'+op);fs.mkdirSync(d);fs.writeFileSync(path.join(d,'pending-owner.json'),JSON.stringify({run:r.id,operation:op,pid:process.pid}));fs.writeFileSync(path.join(d,'dump.cva'),'FICTITIOUS-PARTIAL');});`;
 execFileSync(process.execPath,['-e',script],{input:JSON.stringify(r),timeout:10000,stdio:['pipe','pipe','pipe']});assert.equal((await cleanPending(r.root)).cleaned,1);assert.deepEqual(await readFile(b.dataFile),before);
}));
test('CLI help plan diagnostics and real-capture gate do not expose canary or enable remote writes',()=>{
 const canary='FICTITIOUS-CANARY-PRIVATE-NOT-REAL',env={PGPASSWORD:canary,DOCKER_HOST:'tcp://example.invalid:2375'};
 for(const mode of ['--help','PREPARAR-CAPTURA','DIAGNOSTICO-LOCAL']){const out=cli(mode,env);assert.equal(out.includes(canary),false);assert.equal(JSON.parse(out).remoteConnectionEnabled,false);}
 try{cli('CAPTURA-REAL-PENDIENTE-AUTORIZACION',env);assert.fail('must block');}catch(e){const out=String(e.stdout);assert.match(out,/REAL_CAPTURE_NOT_AUTHORIZED/);assert.equal(out.includes(canary),false);}
});
test('CLI private stdin verification returns only summary and fails without printing phrase',async()=>withRun(async r=>{
 const b=await seal(r,'input');const env={CHEVENI_PACKAGE_TEST_INPUT:'fictional-only'};
 const out=cli('VERIFICAR-ARCHIVOS',env,JSON.stringify({...b,passphrase:phrase}));assert.equal(JSON.parse(out).authenticated,true);assert.equal(out.includes(phrase),false);assert.equal(out.includes(r.root),false);
 try{cli('VERIFICAR-ARCHIVOS',env,JSON.stringify({...b,passphrase:'FICTIONAL-WRONG-PHRASE-DO-NOT-USE'}));assert.fail('must fail');}catch(e){assert.equal(String(e.stdout).includes('FICTIONAL-WRONG'),false);assert.equal(JSON.parse(String(e.stdout)).realCaptureApproved,false);}
}));
