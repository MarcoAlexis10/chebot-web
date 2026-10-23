import {readFile,lstat,realpath} from 'node:fs/promises';
import {createHash,X509Certificate} from 'node:crypto';import path from 'node:path';
import {checkPrivate} from './private-host.mjs';
import {prepareProvisional} from './prepare-provisional.mjs';
// No process/network call and no credential input. Real transport stays blocked.
export async function preparePrivateWindowsSource({source,caFile,now=Date.now()}){
 const plan=prepareProvisional(source);
 if(typeof caFile!=='string'||!path.isAbsolute(caFile))throw Error('PRIVATE_CA_FILE_REQUIRED');
 const s=await lstat(caFile),dir=path.dirname(caFile);
 if(!s.isFile()||s.isSymbolicLink()||s.size>256*1024||s.size===0)throw Error('PRIVATE_CA_FILE_REQUIRED');
 await checkPrivate(dir);
 const eq=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
 if(!eq(await realpath(dir),path.resolve(dir))||!eq(await realpath(caFile),path.resolve(caFile)))throw Error('PRIVATE_CA_FILE_REQUIRED');
 if(process.platform!=='win32'&&(s.uid!==process.getuid()||(s.mode&0o077)!==0))throw Error('PRIVATE_CA_FILE_REQUIRED');
 const bytes=await readFile(caFile);
 if(createHash('sha256').update(bytes).digest('hex')!==source.caSha256)throw Error('CA_DIGEST_MISMATCH');
 let cert;try{cert=new X509Certificate(bytes);}catch{throw Error('CA_CERTIFICATE_INVALID');}
 if(!cert.ca||Date.parse(cert.validFrom)>now||Date.parse(cert.validTo)<=now)throw Error('CA_CERTIFICATE_INVALID');
 return {...plan,caFileMetadataVerified:true,caTrustOwnerAttestationPending:true,
  liveServerIdentityVerified:false,sourceReadOnlyVerified:false,sourceConnected:false,
  futureProbe:{program:'psql',shell:false,args:['-X','--no-password','--dbname=postgres','--set','ON_ERROR_STOP=1','--command',"begin read only;select current_database(),current_user,current_setting('server_version'),current_setting('transaction_read_only'),(select ssl from pg_stat_ssl where pid=pg_backend_pid());rollback;"]},
  privateInputPolicy:'Existing credentials entered only in a future authorized local form; PGPASSFILE private and ephemeral, never command line, Git, CI or stdout',
  futureTransportStatus:'NOT_EXPOSED__REQUIRES_SEPARATE_AUTHORIZED_RELEASE',
  remoteConnectionEnabled:false,realCaptureApproved:false};
}
