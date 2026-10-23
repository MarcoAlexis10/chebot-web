import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,mkdir,copyFile,link,realpath} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {AUTHORIZATION,DEV,validateExecutionContext,requireRealAuthorization,armLocalSession} from '../source/policy.mjs';
import {claimAttempt,consumeAttempt,checkUnused,readClaim} from '../source/one-shot.mjs';
import {createCustody,assertCustody} from '../source/custody.mjs';import {checkPrivate} from '../source/private-host.mjs';
import {createDevSource} from '../source/source.mjs';import {captureOnceLocally,makeSourcePlan,installTrustedCa} from '../source/local-capture.mjs';
import {requireDistinctDownloadedPair} from '../source/distinct-copy.mjs';
const good={platform:'win32',inputTTY:true,outputTTY:true,ci:false,remoteSession:false,manufacturer:'ASUSTeK COMPUTER INC.',machineBinding:'a'.repeat(64),authorization:AUTHORIZATION,project:DEV};
async function fixture(fn){const root=await mkdtemp(path.join(tmpdir(),'cv-one-shot-test-'));try{await checkPrivate(root,true);return await fn(await realpath(root));}finally{await rm(root,{recursive:true,force:true});}}
// These are exclusively new operational gates. No PostgreSQL, Docker or network.
test('new gate accepts exact ASUS context and rejects CI, remote, other OS/device/project/permission',()=>{
 assert.equal(validateExecutionContext(good),true);
 for(const changed of [{platform:'linux'},{inputTTY:false},{outputTTY:false},{ci:true},{remoteSession:true},{manufacturer:'other'},{machineBinding:''},{authorization:'other'},{project:'production'}])assert.throws(()=>validateExecutionContext({...good,...changed}));
 assert.throws(()=>armLocalSession(good));assert.throws(requireRealAuthorization);
});
test('new real entry refuses before source options, password, path or custody getters',async()=>{
 const hostile=new Proxy({},{get(){throw Error('PRIVATE_GETTER_ACCESSED');}});
 await assert.rejects(createDevSource(hostile),/REAL_OPERATION_LOCKED/);
 await assert.rejects(captureOnceLocally(hostile),/REAL_OPERATION_LOCKED/);
});
test('single durable claim wins concurrent attempts, persists unknown outcome and never overwrites backup',()=>fixture(async home=>{
 const custody=await createCustody(home),c=await assertCustody(custody);const retained=path.join(c.data,'existing.cva');await writeFile(retained,'FICTIONAL-EXISTING',{mode:0o600});
 const r=await Promise.allSettled([claimAttempt({home,custody,machineBinding:good.machineBinding}),claimAttempt({home,custody,machineBinding:good.machineBinding})]);
 assert.equal(r.filter(x=>x.status==='fulfilled').length,1);const permit=r.find(x=>x.status==='fulfilled').value;
 consumeAttempt(permit);assert.throws(()=>consumeAttempt(permit),/PERMIT_REQUIRED/);assert.throws(()=>consumeAttempt({}),/PERMIT_REQUIRED/);
 assert.equal((await readClaim(home)).outcome,'UNKNOWN_UNTIL_PRIVATE_RECEIPT');
 await assert.rejects(checkUnused(home),/ALREADY_CLAIMED/);assert.equal(await readFile(retained,'utf8'),'FICTIONAL-EXISTING');
}));
test('failed or interrupted source simulation keeps latch; no second attempt or false success receipt',()=>fixture(async home=>{
 const custody=await createCustody(home);const p=await claimAttempt({home,custody,machineBinding:good.machineBinding});consumeAttempt(p);
 // Simulate a source failing before success: no real source/credential/connection.
 await assert.rejects(Promise.reject(Error('FICTIONAL_SOURCE_FAILED')));
 await assert.rejects(claimAttempt({home,custody,machineBinding:good.machineBinding}),/ALREADY_CLAIMED/);
 const c=await readClaim(home);assert.equal(c.project,DEV);assert.equal(c.automaticRetryAllowed,false);assert.equal(c.outcome,'UNKNOWN_UNTIL_PRIVATE_RECEIPT');
}));
test('new local input accepts exact DEV host shape only and never URI/PROD/transaction endpoint',()=>{
 const hash='b'.repeat(64);assert.equal(makeSourcePlan(`db.${DEV}.supabase.co`,hash).user,'postgres');
 assert.equal(makeSourcePlan('aws-0-fictional-1.pooler.supabase.com',hash).user,`postgres.${DEV}`);
 for(const host of ['https://example.test','postgres://secret@example.test','db.ykfpzqpiaxevpkhpaxpg.supabase.co','evil.test',`db.${DEV}.supabase.co:6543`])assert.throws(()=>makeSourcePlan(host,hash));
});
test('CA path alone does not establish trust and existing content is preserved',()=>fixture(async home=>{
 const file=path.join(home,'fictional-public-ca.crt');await writeFile(file,'FICTIONAL-PUBLIC-NOT-X509',{mode:0o600});
 await assert.rejects(installTrustedCa({file,home,ownerAttested:false}),/TRUSTED_DEV_CA_REQUIRED/);
 const a=await installTrustedCa({file,home,ownerAttested:true}),b=await installTrustedCa({file,home,ownerAttested:true});assert.equal(a.caFile,b.caFile);
 assert.equal(await readFile(file,'utf8'),'FICTIONAL-PUBLIC-NOT-X509');
 // installTrustedCa only stages public bytes; the existing X509 checker still must pass before credentials/capture.
 const {preparePrivateWindowsSource}=await import('../source/prepare-windows-source.mjs');
 await assert.rejects(preparePrivateWindowsSource({source:makeSourcePlan(`db.${DEV}.supabase.co`,a.caSha256),caFile:a.caFile}),/CA_CERTIFICATE_INVALID/);
}));
test('download verification requires different files, including hardlink denial, without claiming cloud provenance',()=>fixture(async home=>{
 const custody=await createCustody(home),c=await assertCustody(custody),captureName='fictional';
 const originalData=path.join(c.data,captureName+'.cva'),originalKey=path.join(c.keys,captureName+'.cclave');
 await writeFile(originalData,'FICTIONAL-CIPHER',{mode:0o600});await writeFile(originalKey,'FICTIONAL-WRAPPED',{mode:0o600});
 const download=path.join(c.root,'download');await mkdir(download,{mode:0o700});
 const a=path.join(download,'a.cva'),b=path.join(download,'b.cclave');await copyFile(originalData,a);await copyFile(originalKey,b);
 const cfg={custodyRoot:c.root,captureName,downloadedDataFile:a,downloadedKeyFile:b};await requireDistinctDownloadedPair(cfg);
 await assert.rejects(requireDistinctDownloadedPair({...cfg,downloadedDataFile:originalData}),/DOWNLOADED_COPY_REQUIRED/);
 const alias=path.join(download,'alias.cva');await link(originalData,alias);await assert.rejects(requireDistinctDownloadedPair({...cfg,downloadedDataFile:alias}),/DOWNLOADED_COPY_REQUIRED/);
}));
test('new Windows CIM bridge returns private bounded metadata; no session is armed', {skip:process.platform!=='win32'},async()=>{
 const {localMachineMetadata}=await import('../source/asus-host.mjs');const m=localMachineMetadata();
 assert.equal(typeof m.manufacturer,'string');assert.match(m.uuid,/^[a-f0-9-]{36}$/i);assert.match(m.sid,/^S-1-/);assert.throws(requireRealAuthorization);
});
