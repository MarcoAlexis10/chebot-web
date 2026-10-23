import {createRun,removeFictionalRun} from '../technical-closure-20261022/approved/private-host.mjs';
import {sealPrivateStream,verifyPrivateEnvelope} from '../private-adapter-20261023/envelope-v3.mjs';
import {rebuildBusinessQuarantine} from '../private-adapter-20261023/closed-business.mjs';
import {startFixture,cleanup} from '../technical-closure-20261022/qa/pg-fixture.mjs';
import {reconcileRecoveryFrontier} from '../private-adapter-20261023/recovery-frontier.mjs';
import {isReleaseSource} from './source.mjs';import {captureStream} from './pump.mjs';
import {assertCustody,lockCustody,publishPair,pairDigest,writeReceipt,assertNoTemporaryRuns,privateRegular,requireVacantCapture} from './custody.mjs';
import {open} from 'node:fs/promises';
import {requireRealAuthorization} from './policy.mjs';
const safeFailure=e=>/^(CAPTURE_|PG_DUMP_|SOURCE_|CURRENT_|TENANT_|REQUIRED_|PRIVATE_|EXISTING_|EMPTY_|SAFE_|OWNED_)[A-Z0-9_]+$/.test(e?.message)?e.message:'PRIVATE_OPERATION_FAILED__DETAILS_REDACTED';
export async function captureToCustody(options){
 const source=options?.source;
 if(!isReleaseSource(source))throw Error('OWNED_RELEASE_SOURCE_REQUIRED');
 const {custody,passphrase,name,limits}=options;
 let releaseLock,stage,published=false,pair;
 try{
  const root=await assertCustody(custody);releaseLock=await lockCustody(custody);await requireVacantCapture(custody,name);stage=await createRun(root.root);
  const sealed=await sealPrivateStream({source:captureStream(source,limits),privateDirectory:stage.data,basename:'capture',passphrase});
  await verifyPrivateEnvelope({...sealed,passphrase});
  pair=await publishPair(custody,sealed,name);published=true;
  const receipt={kind:'CHEVENI_PRIVATE_CAPTURE_RECEIPT_V1',executionClass:source.executionClass,format:'CVP3/CVK5',captureFinishedAt:new Date().toISOString(),
   ...await pairDigest(pair),dumpExitZero:true,envelopeAuthenticated:true,realCaptureExecuted:source.executionClass==='OWNER_PRIVATE_DEV',
   integralRecoveryVerified:false,restoreVerified:false,driveRoundtripVerified:false,operationalApproval:false};
  const receiptFile=await writeReceipt(custody,name,receipt);return {pair,receipt,receiptFile};
 }catch(e){throw Error(published?'CAPTURE_PRESERVED__POST_PUBLICATION_REVIEW_REQUIRED':safeFailure(e));}
 finally{try{await source.dispose();}finally{try{if(stage)await removeFictionalRun(stage.root);}finally{if(releaseLock)await releaseLock();}}}
}
export async function verifyCustodialCopy({custody,original,downloaded,passphrase}){
 await assertCustody(custody);for(const f of [original.dataFile,original.keyFile,downloaded.dataFile,downloaded.keyFile])await privateRegular(f);
 const [a,b]=await Promise.all([pairDigest(original),pairDigest(downloaded)]);
 if(a.dataSha256!==b.dataSha256||a.keySha256!==b.keySha256)throw Error('PRIVATE_COPY_HASH_MISMATCH');
 await verifyPrivateEnvelope({...downloaded,passphrase});return {pairHashMatch:true,envelopeAuthenticated:true,
  drivePrivacyVerified:false,driveUploadOrDownloadObserved:false,operationalApproval:false};
}
export async function restoreCustodialCopy(options){
 const receipt=options?.receipt;
 if(receipt?.executionClass!=='QA_FICTIONAL')requireRealAuthorization();
 const {custody,pair,passphrase,frontier,inspectOwnedTarget}=options;
 await assertCustody(custody);const digests=await pairDigest(pair);
 if(receipt.kind!=='CHEVENI_PRIVATE_CAPTURE_RECEIPT_V1'||digests.dataSha256!==receipt.dataSha256||digests.keySha256!==receipt.keySha256)throw Error('CAPTURE_RECEIPT_PAIR_MISMATCH');
 await verifyPrivateEnvelope({...pair,passphrase});
 if(frontier.captureFinishedAt!==receipt.captureFinishedAt)throw Error('JOURNAL_CAPTURE_BOUNDARY_MISMATCH');
 reconcileRecoveryFrontier(frontier); // Before even creating a target.
 let id;
 try{
  id=await startFixture('closed-target');
  const r=await rebuildBusinessQuarantine({targetId:id,...pair,passphrase,frontier});
  await inspectOwnedTarget?.(id);
  return {...r,privateRestoreScope:'SIX_TABLE_CLOSED_QUARANTINE_ONLY',realDataRestored:receipt.executionClass==='OWNER_PRIVATE_DEV',targetCleanedOnReturn:true};
 }catch(e){throw Error(safeFailure(e));}
 finally{if(id)cleanup(id);}
}
export async function readPrivateReceipt(file){
 const s=await privateRegular(file);if(s.size>16384)throw Error('PRIVATE_RECEIPT_TOO_LARGE');
 const f=await open(file,'r'),b=Buffer.alloc(16385);let total=0;
 try{while(total<b.length){const {bytesRead}=await f.read(b,total,b.length-total,total);if(!bytesRead)break;total+=bytesRead;}if(total>16384)throw Error('PRIVATE_RECEIPT_TOO_LARGE');return JSON.parse(b.subarray(0,total));}finally{await f.close();}
}
export {assertNoTemporaryRuns};
