import test from 'node:test';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,chmod,rm} from 'node:fs/promises';import {createHash} from 'node:crypto';import path from 'node:path';
import {createRun,removeFictionalRun} from './approved/private-host.mjs';
import {preparePrivateWindowsSource} from './prepare-windows-source.mjs';
test('private CA is parsed and pinned while live identity and credentials stay unverified',async()=>{
 const r=await createRun();try{
  const ca=path.join(r.data,'fictional-ca.crt'),key=path.join(r.keys,'fictional-ca.key');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=CheVeniFictionalPrep','-keyout',key,'-out',ca],{stdio:'ignore'});await chmod(ca,0o600);
  const source={project:'tyvwgsdzqipusodxtydv',database:'postgres',host:'db.tyvwgsdzqipusodxtydv.supabase.co',port:5432,user:'postgres',sslMode:'verify-full',caSha256:createHash('sha256').update(await readFile(ca)).digest('hex')};
  const p=await preparePrivateWindowsSource({source,caFile:ca});assert.equal(p.caFileMetadataVerified,true);assert.equal(p.liveServerIdentityVerified,false);assert.equal(p.remoteConnectionEnabled,false);assert.equal(p.futureProbe.shell,false);
  await assert.rejects(preparePrivateWindowsSource({source:{...source,caSha256:'f'.repeat(64)},caFile:ca}),/CA_DIGEST_MISMATCH/);
  await assert.rejects(preparePrivateWindowsSource({source,caFile:ca,now:Date.now()+2*86400000}),/CA_CERTIFICATE_INVALID/);
 }finally{await removeFictionalRun(r.root);}
});
