import {open,lstat,readFile} from 'node:fs/promises';
import path from 'node:path';
import {privateRegular,assertCustody} from './custody.mjs';
import {checkPrivate} from './private-host.mjs';
import {AUTHORIZATION,DEV} from './policy.mjs';
const permits=new WeakSet();
const filename='ONE-CAPTURE-20261023.json';
export async function checkUnused(home){
 await checkPrivate(home);
 try{await lstat(path.join(home,filename));}catch(e){if(e.code==='ENOENT')return;throw e;}
 throw Error('ONE_CAPTURE_ALREADY_CLAIMED__DO_NOT_RETRY');
}
export async function claimAttempt({home,custody,machineBinding}){
 const c=await assertCustody(custody);await checkUnused(home);
 if(!/^[a-f0-9]{64}$/.test(machineBinding))throw Error('ASUS_MACHINE_BINDING_REQUIRED');
 const claim={kind:'CHEVENI_ONE_CAPTURE_CLAIM_V1',authorization:AUTHORIZATION,project:DEV,
  machineBinding,custodyRoot:c.root,claimedAt:new Date().toISOString(),
  outcome:'UNKNOWN_UNTIL_PRIVATE_RECEIPT',automaticRetryAllowed:false};
 const f=await open(path.join(home,filename),'wx',0o600);
 try{await f.writeFile(JSON.stringify(claim,null,2)+'\n');await f.sync();}finally{await f.close();}
 const permit=Object.freeze({});permits.add(permit);return permit;
}
export function consumeAttempt(permit){
 if(!permits.has(permit))throw Error('ONE_CAPTURE_PERMIT_REQUIRED');
 permits.delete(permit);
}
export async function readClaim(home){
 const file=path.join(home,filename);const st=await privateRegular(file);
 if(st.size>8192)throw Error('PRIVATE_CLAIM_REJECTED');
 const c=JSON.parse(await readFile(file));
 if(c.kind!=='CHEVENI_ONE_CAPTURE_CLAIM_V1'||c.authorization!==AUTHORIZATION||c.project!==DEV)throw Error('PRIVATE_CLAIM_REJECTED');
 return c;
}
