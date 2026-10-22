import {openVerifiedFictionalEnvelope} from './envelope-v2.mjs';
import {checkPrivate} from './approved/private-host.mjs';
import {lstat} from 'node:fs/promises';import path from 'node:path';
import {reconcileJournal} from './journal.mjs';
// Only a fixed, reviewed DATA table is imported, not source SQL, Auth, ACLs or jobs.
export async function rebuildFictional({dataFile,keyFile,passphrase,journalWitness,target}){
 for(const file of [dataFile,keyFile]){const s=await lstat(file);if(!s.isFile()||s.isSymbolicLink())throw Error('PRIVATE_REGULAR_ARCHIVE_REQUIRED');await checkPrivate(path.dirname(file));}
 const archive=await openVerifiedFictionalEnvelope({dataFile,keyFile,passphrase});
 try{
  if(archive.subarray(0,5).toString()!=='PGDMP')throw Error('PG_CUSTOM_ARCHIVE_REQUIRED');
  const current=reconcileJournal(journalWitness);
  // The caller supplies a capability minted by the CLOSED target factory.
  const {restoreAllowedData}=await import('./qa/closed-target.mjs');
  const r=await restoreAllowedData(target,archive,current);
  return {...r,independentJournalSignatureVerified:true,canOpenGuestAccess:false,
   authFunctionalRestoreVerified:false,integralRecoveryVerified:false,operationalApproval:false};
 }finally{archive.fill(0);}
}
