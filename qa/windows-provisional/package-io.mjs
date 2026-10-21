import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,link,lstat,rm} from 'node:fs/promises';
import path from 'node:path';
import {sealFictionalStream,verifyFictionalEnvelope} from './provisional-crypto.mjs';
import {assertRun,cleanPending} from './private-host.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function sealPackageFixture({roots,basename,source,passphrase,beforePublish}){
 const r=await assertRun(roots.root);if(!/^[a-z0-9-]{1,40}$/.test(basename))throw Error('SAFE_BASENAME_REQUIRED');
 const dataFile=path.join(r.data,basename+'.cva'),keyFile=path.join(r.keys,basename+'.cclave');
 for(const file of [dataFile,keyFile]){try{await lstat(file);throw Error('EXISTING_BACKUP_PRESERVED');}catch(e){if(e.code!=='ENOENT')throw e;}}
 const op=randomBytes(12).toString('hex'),staging=path.join(r.root,'.provisional-pending-'+op);await mkdir(staging,{mode:0o700});
 await writeFile(path.join(staging,'pending-owner.json'),JSON.stringify({run:r.id,operation:op,pid:process.pid}),{flag:'wx',mode:0o600});
 let result,ownKey=false,ownData=false;
 async function removeLink(file,origin){try{const [a,b]=await Promise.all([lstat(file),lstat(origin)]);if(a.dev===b.dev&&a.ino===b.ino)await rm(file);}catch(e){if(e.code!=='ENOENT')throw e;}}
 try{
  result=await sealFictionalStream({source,privateDirectory:staging,basename:'dump',passphrase});
  await verifyFictionalEnvelope({...result,passphrase});await beforePublish?.();
  await link(result.keyFile,keyFile);ownKey=true;await link(result.dataFile,dataFile);ownData=true;
  return {dataFile,keyFile,mode:'ONLINE_PROVISIONAL',fictionalOnly:true,integralRecoveryVerified:false,realCaptureApproved:false,realCaptureExecuted:false,
   dataSha256:sha(await readFile(dataFile)),keySha256:sha(await readFile(keyFile))};
 }catch(e){if(ownData)await removeLink(dataFile,result.dataFile);if(ownKey)await removeLink(keyFile,result.keyFile);throw e;}
 finally{await cleanPending(r.root,{operation:op,allowCurrent:true});}
}
export async function compareEncryptedCopies({dataFile,keyFile,dataCopy,keyCopy}){
 const pairs=[[dataFile,dataCopy],[keyFile,keyCopy]];for(const [a,b] of pairs)if(sha(await readFile(a))!==sha(await readFile(b)))throw Error('ENCRYPTED_COPY_HASH_MISMATCH');
 return {bothEncryptedCopiesMatch:true,remoteDriveVerified:false};
}
