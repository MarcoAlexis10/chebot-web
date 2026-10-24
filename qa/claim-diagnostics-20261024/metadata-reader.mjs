// Optional ASUS-only CLI: local metadata reads, no capture imports/network/processes.
import {lstat,realpath,readdir,open} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const eq=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
async function directory(p){const s=await lstat(p);if(!s.isDirectory()||s.isSymbolicLink())throw Error('METADATA_REPARSE_OR_TYPE_REJECTED');}
async function exists(p){try{const s=await lstat(p);if(s.isSymbolicLink()||!s.isFile())throw Error('METADATA_REPARSE_OR_TYPE_REJECTED');return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
export async function inspectCleanupMetadata(home){
 if(typeof home!=='string'||!path.isAbsolute(home)||path.basename(home)!=='CheVeni-Captura-20261023'||(process.platform==='win32'&&!/^[a-z]:\\/i.test(home)))throw Error('METADATA_HOME_REJECTED');
 for(let p=path.resolve(home);;){await directory(p);const parent=path.dirname(p);if(parent===p)break;p=parent;}
 home=await realpath(home);const claim=path.join(home,'ONE-CAPTURE-20261023.json');
 if(!await exists(claim))return {status:'CLAIM_NOT_OBSERVED__STOP',retryAllowed:false,sourceContact:'UNKNOWN',stageDetermined:false};
 const st=await lstat(claim);if(st.size>8192)throw Error('METADATA_CLAIM_REJECTED');
 const f=await open(claim,'r'),bytes=Buffer.alloc(8193);let n=0,record;
 try{while(n<bytes.length){const r=await f.read(bytes,n,bytes.length-n,n);if(!r.bytesRead)break;n+=r.bytesRead;}if(n>8192)throw Error('METADATA_CLAIM_REJECTED');record=JSON.parse(bytes.subarray(0,n));}finally{await f.close();bytes.fill(0);}
 if(record.kind!=='CHEVENI_ONE_CAPTURE_CLAIM_V1'||record.authorization!=='CHEVENI-DEV-ONE-CAPTURE-20261023'||record.project!=='tyvwgsdzqipusodxtydv'||typeof record.custodyRoot!=='string'||!path.isAbsolute(record.custodyRoot))throw Error('METADATA_CLAIM_REJECTED');
 const root=path.resolve(record.custodyRoot);if(!eq(path.dirname(root),home)||!/^cheveni-custody-[a-f0-9]{24}$/.test(path.basename(root)))throw Error('METADATA_ROOT_REJECTED');
 await directory(root);if(!eq(root,await realpath(root)))throw Error('METADATA_ROOT_REJECTED');
 const result={status:'CONSUMED_NO_RETRY',lockPresent:await exists(path.join(root,'.capture-lock')),temporaryRunNamePresent:false,temporaryCipherPresent:false,temporaryWrappedKeyPresent:false,sourceContact:'UNKNOWN',stageDetermined:false,retryAllowed:false};
 for(const name of await readdir(root))if(/^cheveni-provisional-[a-f0-9]{24}$/.test(name)){
  const temp=path.join(root,name);await directory(temp);result.temporaryRunNamePresent=true;
  const data=path.join(temp,'data');try{await directory(data);}catch(e){if(e.code==='ENOENT')continue;throw e;}
  result.temporaryCipherPresent=(await exists(path.join(data,'capture.cva')))||result.temporaryCipherPresent;
  result.temporaryWrappedKeyPresent=(await exists(path.join(data,'capture.cclave')))||result.temporaryWrappedKeyPresent;
 }
 // Names/markers are not ownership or backup proofs. Do not clean or open them.
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 (async()=>{if(process.platform!=='win32'||process.argv.length!==2||!process.env.LOCALAPPDATA)throw Error('ASUS_LOCAL_METADATA_ONLY');
 const r=await inspectCleanupMetadata(path.join(process.env.LOCALAPPDATA,'CheVeni-Captura-20261023'));console.log(JSON.stringify(r));
 })().catch(()=>{console.error('METADATA_CHECK_FAILED__STOP__DETAILS_REDACTED');process.exitCode=1;});
}
