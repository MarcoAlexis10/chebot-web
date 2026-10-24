// Preparation only: verifies an existing trusted baseline and builds an unsigned
// CAS append plan. Does not create a baseline, sign, write, send or acknowledge.
import {createHash} from 'node:crypto';
import {reconcileJournal,eventDigest} from '../technical-closure-20261022/journal.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const keys=(o,n)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join('|')===[...n].sort().join('|');
const deny=()=>{throw Error('INDEPENDENT_APPEND_PLAN_REJECTED');};
function event(e){if(!keys(e,['sequence','subject','action','at'])||!Number.isSafeInteger(e.sequence)||e.sequence<1||!/^subject-[a-f0-9]{16}$/.test(e.subject)||!['REVOKE','ERASURE_HOLD'].includes(e.action)||typeof e.at!=='string'||!Number.isFinite(Date.parse(e.at)))deny();return {sequence:e.sequence,subject:e.subject,action:e.action,at:new Date(e.at).toISOString()};}
export function bindJournalAppendPolicy({journalId,trustedPublicKey,keyFingerprint,minimumHead}){
 try{
  if(trustedPublicKey?.type!=='public'||trustedPublicKey.asymmetricKeyType!=='ed25519')deny();
  const key=trustedPublicKey,fingerprint=createHash('sha256').update(key.export({type:'spki',format:'der'})).digest('hex');
  if(typeof journalId!=='string'||!/^[-a-zA-Z0-9_]{1,64}$/.test(journalId)||fingerprint!==keyFingerprint||!keys(minimumHead,['journalId','sequence','digest'])||minimumHead.journalId!==journalId||!Number.isSafeInteger(minimumHead.sequence)||minimumHead.sequence<0||!/^([a-f0-9]{64})$/.test(minimumHead.digest))deny();
  const floor=Object.freeze({...minimumHead});
  return Object.freeze({plan({state,batch,challenge,nextChallenge,now=Date.now()}){
   try{
    if(!keys(state,['journal','head','signature'])||!keys(state.journal,['kind','id','baselineComplete','events'])||!keys(state.head,['journalId','sequence','digest','observedAt','challenge'])||state.journal.id!==journalId||!Array.isArray(batch)||batch.length>1000||!/^([a-f0-9]{64})$/.test(nextChallenge)||!Number.isFinite(now))deny();
    const verified=reconcileJournal({...state,publicKey:key,challenge,now});
    // Retain signed originals; never normalize or silently discard private fields.
    const old=state.journal.events.map(e=>{event(e);return Object.freeze({...e});});
    if(verified.sequence<floor.sequence)deny();
    let digest=sha(JSON.stringify(['BASELINE',journalId])),atFloor=digest;
    for(const e of old){digest=eventDigest(digest,e);if(e.sequence===floor.sequence)atFloor=digest;}
    if(atFloor!==floor.digest)deny();
    const incoming=batch.map(event);if(new Set(incoming.map(e=>e.sequence)).size!==incoming.length)deny();
    for(let i=1;i<incoming.length;i++)if(incoming[i].sequence<=incoming[i-1].sequence)deny();
    const next=[...old];let appended=0;
    for(const e of incoming){
     if(Date.parse(e.at)>now)deny();
     if(e.sequence<=old.length){const prev=event(old[e.sequence-1]);if(JSON.stringify([e.sequence,e.subject,e.action,e.at])!==JSON.stringify([prev.sequence,prev.subject,prev.action,prev.at]))deny();continue;}
     if(e.sequence!==next.length+1)deny();next.push(Object.freeze(e));digest=eventDigest(digest,e);appended++;
    }
    return Object.freeze({kind:'UNSIGNED_INDEPENDENT_APPEND_PLAN_V1',expectedHead:Object.freeze({journalId,sequence:state.head.sequence,digest:state.head.digest}),
     journal:Object.freeze({...state.journal,events:Object.freeze(next)}),head:Object.freeze({journalId,sequence:next.length,digest,observedAt:new Date(now).toISOString(),challenge:nextChallenge}),appended,
     custodianCompletenessStillRequired:true,requiresDurableCompareAndSwap:true,signaturePending:true,canAcknowledge:false,realJournalWritten:false,guestAccess:false,operationalApproval:false});
   }catch{deny();}
  }});
 }catch{deny();}
}
