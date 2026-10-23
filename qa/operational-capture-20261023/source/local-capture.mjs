import {readFile,writeFile,lstat} from 'node:fs/promises';import path from 'node:path';
import {createHash} from 'node:crypto';
import {requireRealAuthorization,DEV} from './policy.mjs';
import {compilePrivateDevReleasePlan} from './private-release-plan.mjs';
import {preparePrivateWindowsSource} from './prepare-windows-source.mjs';
import {createCustody,assertCustody,privateRegular} from './custody.mjs';
import {claimAttempt,checkUnused} from './one-shot.mjs';
import {collectPrivateInputs} from './private-input.mjs';
import {createDevSource} from './source.mjs';import {captureToCustody} from './operation.mjs';
export function makeSourcePlan(host,caSha256){
 const user=host===`db.${DEV}.supabase.co`?'postgres':`postgres.${DEV}`;
 const p={project:DEV,database:'postgres',host,port:5432,user,sslMode:'verify-full',caSha256};
 compilePrivateDevReleasePlan(p);return p;
}
// A public CA is not a password. Copy only bounded PEM bytes, never a URL/DSN.
export async function installTrustedCa({file,home,ownerAttested}){
 if(ownerAttested!==true||typeof file!=='string'||!path.isAbsolute(file))throw Error('TRUSTED_DEV_CA_REQUIRED');
 const s=await lstat(file);if(!s.isFile()||s.isSymbolicLink()||s.size<1||s.size>262144)throw Error('TRUSTED_DEV_CA_REQUIRED');
 const bytes=await readFile(file);if(bytes.length>262144)throw Error('TRUSTED_DEV_CA_REQUIRED');
 const caSha256=createHash('sha256').update(bytes).digest('hex');
 // Content addressed; existing CA is never replaced.
 const caFile=path.join(home,'ca-'+caSha256+'.crt');
 try{await writeFile(caFile,bytes,{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;await privateRegular(caFile);if(!bytes.equals(await readFile(caFile)))throw Error('EXISTING_CA_PRESERVED');}
 return {caFile,caSha256};
}
export async function captureOnceLocally(options){
 requireRealAuthorization();
 const {home,machineBinding,sourcePlan,caFile}=options;await checkUnused(home);
 await preparePrivateWindowsSource({source:sourcePlan,caFile});
 const custody=await createCustody(home),root=(await assertCustody(custody)).root;
 // Before credentials: a private durable pointer is available even on interruption.
 const c=await collectPrivateInputs();let source;
 try{
  const attempt=await claimAttempt({home,custody,machineBinding});
  source=await createDevSource({sourcePlan,caFile,password:c.password,attempt});
  const r=await captureToCustody({custody,source,passphrase:c.passphrase,name:'dev-provisional-20261023'});
  return {custodyRoot:root,receiptFile:r.receiptFile};
 }finally{await source?.dispose();c.password='';c.passphrase='';}
}
