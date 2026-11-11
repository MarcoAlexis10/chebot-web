// Signatures/monotonicity only. No signer, IO, automatic dispatch or custody assertion.
import {createHash} from 'node:crypto';import {record,snapshot,verifySignature,receiptHead,isHex,PROJECT} from '../contract-v1/codec.mjs';
const fail=()=>{throw Error('JOURNAL_CONTRACT_UNVERIFIED');};
export const fingerprint=k=>createHash('sha256').update(k.export({type:'spki',format:'der'})).digest('hex');
export function createJournalVerifier(input){
 const p=record(input,['custodianKey','witnessKey','custodianId','datasetId','minimumRecoveryEpoch','inventoryDigest','restrictionJournalId','minimumRestrictionHead']);
 if(![p.custodianKey,p.witnessKey].every(k=>k?.type==='public'&&k.asymmetricKeyType==='ed25519')||fingerprint(p.custodianKey)===fingerprint(p.witnessKey)||!isHex(p.datasetId)||!isHex(p.inventoryDigest)||!Number.isSafeInteger(p.minimumRecoveryEpoch)||p.minimumRecoveryEpoch<1)fail();
 const min=record(p.minimumRestrictionHead,['sequence','digest']);if(!Number.isSafeInteger(min.sequence)||min.sequence<1||!isHex(min.digest))fail();
 const checkpoints=new WeakMap(),used=new Set(),heads=new Map(),bindings=new Map();let clock=-1,epoch=p.minimumRecoveryEpoch,restrictionFloor={...min};
 function fresh(r,challenge,now,since){if(!Number.isSafeInteger(now)||now<clock||!Number.isSafeInteger(since)||!isHex(challenge)||r.challenge!==challenge||used.has(challenge)||used.size>=8192||Number(r.observedAtMs)<since||Number(r.observedAtMs)>now||Number(r.expiresAtMs)<=now)fail();}
 function checkpointProof(signed,{intentDigest,intentKeyDigest,challenge,now,since}={}){try{
  const s=record(signed,['record','signature']),r=verifySignature('checkpoint',s.record,s.signature,p.witnessKey);fresh(r,challenge,now,since);
  if(r.intentDigest!==intentDigest||r.intentKeyDigest!==intentKeyDigest||r.datasetId!==p.datasetId||r.inventoryDigest!==p.inventoryDigest||Number(r.recoveryEpoch)<p.minimumRecoveryEpoch||r.restrictionJournalId!==p.restrictionJournalId||Number(r.restrictionSequence)<min.sequence||(Number(r.restrictionSequence)===min.sequence&&r.restrictionDigest!==min.digest))fail();
  const seen=heads.get(intentKeyDigest);if(seen&&(Number(r.revision)<seen.revision||Number(r.revision)===seen.revision&&r.headDigest!==seen.digest))fail();
  if(Number(r.recoveryEpoch)<epoch||Number(r.restrictionSequence)<restrictionFloor.sequence||Number(r.restrictionSequence)===restrictionFloor.sequence&&r.restrictionDigest!==restrictionFloor.digest)fail();
  if(bindings.has(intentKeyDigest)?bindings.get(intentKeyDigest)!==intentDigest:bindings.size>=8192)fail();
  // Witness observations are floors even before a custodian receipt arrives.
  // Process-local only: restart still requires an independently persisted bootstrap floor.
  bindings.set(intentKeyDigest,intentDigest);heads.set(intentKeyDigest,{revision:Number(r.revision),digest:r.headDigest});epoch=Number(r.recoveryEpoch);restrictionFloor={sequence:Number(r.restrictionSequence),digest:r.restrictionDigest};
  const proof=Object.freeze({...r,automaticDispatchAllowed:false,operationalApproval:false});checkpoints.set(proof,r);used.add(challenge);clock=now;return proof;
 }catch{fail();}}
 function receiptProof(signed,{checkpoint,expected,challenge,now,since}={}){try{
  const cp=checkpoints.get(checkpoint);if(!cp||Number(cp.expiresAtMs)<=now||Number(cp.recoveryEpoch)<epoch||Number(cp.restrictionSequence)<restrictionFloor.sequence||Number(cp.restrictionSequence)===restrictionFloor.sequence&&cp.restrictionDigest!==restrictionFloor.digest)fail();const e=record(expected,['intentDigest','attemptDigest','dispatchId','restrictionJournalId','restrictionSequence','restrictionDigest']);
  const s=record(signed,['record','signature']),r=verifySignature('receipt',s.record,s.signature,p.custodianKey);fresh(r,challenge,now,since);
  if(r.custodianId!==p.custodianId||r.intentDigest!==cp.intentDigest||!Object.keys(e).every(k=>r[k]===e[k])||Number(r.restrictionSequence)<Number(cp.restrictionSequence)||(r.restrictionSequence===cp.restrictionSequence&&r.restrictionDigest!==cp.restrictionDigest))fail();
  const h=receiptHead(r),seen=heads.get(cp.intentKeyDigest),floor=seen&&seen.revision>Number(cp.revision)?seen:{revision:Number(cp.revision),digest:cp.headDigest};
  if(Number(r.revision)<floor.revision||Number(r.revision)===floor.revision&&floor.digest!==null&&h!==floor.digest)fail();
  if(Number(r.revision)>floor.revision&&floor.revision>0){const prior={...r,state:floor.revision===1?'PREPARED':'DISPATCH_CLAIMED',revision:String(floor.revision),effectDigest:null};if(receiptHead(prior)!==floor.digest)fail();}
  const next=Object.freeze({revision:Number(r.revision),digest:h});heads.set(cp.intentKeyDigest,next);used.add(challenge);clock=now;
  return Object.freeze({...r,headDigest:h,automaticDispatchAllowed:false,automaticRetryAllowed:false,signatureMatched:true,externalDurabilityVerified:false,operationalApproval:false});
 }catch{fail();}}
 return Object.freeze({verifyCheckpoint:checkpointProof,verifyReceipt:receiptProof});
}
