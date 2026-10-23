// New private-client QA integration; approved adapter and envelopes unchanged.
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,lstat,link,rm} from 'node:fs/promises';
import path from 'node:path';
import {assertRun,checkPrivate,cleanPending} from '../technical-closure-20261022/approved/private-host.mjs';
import {sealPrivateStream,verifyPrivateEnvelope} from './envelope-v3.mjs';
import {captureStream} from '../technical-closure-20261022/process-source.mjs';
import {isPrivateQASource} from './private-source.mjs';
export const remoteConnectionEnabled=false;
export function captureDev(){throw Error('REAL_CAPTURE_REQUIRES_SEPARATE_AUTHORIZED_RELEASE');}
const sha=b=>createHash('sha256').update(b).digest('hex');
async function captureOwned({roots,source,basename,passphrase,limits,beforePublish}){
 if(!isPrivateQASource(source))throw Error('OWNED_PRIVATE_QA_SOURCE_REQUIRED');
 const r=await assertRun(roots.root);
 if(typeof basename!=='string'||!/^[a-z0-9-]{1,40}$/.test(basename))throw Error('SAFE_BASENAME_REQUIRED');
 const dataFile=path.join(r.data,basename+'.cva'),keyFile=path.join(r.keys,basename+'.cclave');
 for(const f of [dataFile,keyFile]){try{await lstat(f);throw Error('EXISTING_BACKUP_PRESERVED');}catch(e){if(e.code!=='ENOENT')throw e;}}
 const operation=randomBytes(12).toString('hex'),stage=path.join(r.root,'.provisional-pending-'+operation);
 await mkdir(stage,{mode:0o700});
 try{await checkPrivate(stage,process.platform==='win32');await writeFile(path.join(stage,'pending-owner.json'),JSON.stringify({run:r.id,operation,pid:process.pid}),{flag:'wx',mode:0o600});}
 catch(e){await rm(stage,{recursive:true,force:true});throw e;}
 let result,ownData=false,ownKey=false;
 const unlinkOwn=async(file,origin)=>{try{const [a,b]=await Promise.all([lstat(file,{bigint:true}),lstat(origin,{bigint:true})]);if(a.ino===b.ino&&a.dev===b.dev)await rm(file);}catch(e){if(e.code!=='ENOENT')throw e;}};
 try{
  result=await sealPrivateStream({source:captureStream(source,limits),privateDirectory:stage,basename:'dump',passphrase});
  await verifyPrivateEnvelope({...result,passphrase});
  await beforePublish?.();
  await link(result.keyFile,keyFile);ownKey=true;await link(result.dataFile,dataFile);ownData=true;
  return {dataFile,keyFile,dataSha256:sha(await readFile(dataFile)),keySha256:sha(await readFile(keyFile)),
   format:'CVP3/CVK5',mode:'ONLINE_PROVISIONAL',source:'PRIVATE_PROVISIONAL_ADAPTER_V3',
   dumpExitZero:true,readOnlyProbeVerified:true,realCaptureExecuted:false,integralRecoveryVerified:false,canOpenGuestAccess:false};
 }catch(e){if(ownData)await unlinkOwn(dataFile,result.dataFile);if(ownKey)await unlinkOwn(keyFile,result.keyFile);throw e;}
 finally{await cleanPending(r.root,{operation,allowCurrent:true});}
}

export async function capturePrivateQA(options){
 const source=options?.source;if(!isPrivateQASource(source))throw Error("OWNED_PRIVATE_QA_SOURCE_REQUIRED");
 try{return await captureOwned(options);}finally{await source.dispose();}
}
