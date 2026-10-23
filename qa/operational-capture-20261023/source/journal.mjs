import {createHash,verify,randomBytes} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
export const freshChallenge=()=>randomBytes(32).toString('hex');
export function eventDigest(previous,event){return sha(JSON.stringify([previous,event.sequence,event.subject,event.action,event.at]));}
// The public key must be pinned OUTSIDE the restored archive. Verification
// authenticates a custodian statement, not completeness of unrecorded events.
export function reconcileJournal({journal,head,signature,publicKey,challenge,now=Date.now()}){
 const deny=()=>{throw Error('CURRENT_INDEPENDENT_JOURNAL_REQUIRED');};
 try{
  if(!journal||journal.kind!=='CHEVENI_INDEPENDENT_REVOCATIONS_V1'||journal.baselineComplete!==true||!Array.isArray(journal.events)||journal.events.length>100000||!head||head.journalId!==journal.id||head.challenge!==challenge||!/^[a-f0-9]{64}$/.test(challenge))deny();
  const at=Date.parse(head.observedAt);if(!Number.isFinite(at)||at>now+30000||at<now-300000)deny();
  if(!verify(null,Buffer.from(JSON.stringify(head)),publicKey,Buffer.from(signature,'base64')))deny();
  let digest=sha(JSON.stringify(['BASELINE',journal.id])),seq=0;const revoked=new Set();
  for(const event of journal.events){
   if(event.sequence!==++seq||!/^subject-[a-f0-9]{16}$/.test(event.subject)||!['REVOKE','ERASURE_HOLD'].includes(event.action)||!Number.isFinite(Date.parse(event.at))||Date.parse(event.at)>at)deny();
   digest=eventDigest(digest,event);revoked.add(event.subject);
  }
  if(head.sequence!==seq||head.digest!==digest)deny();
  return {journalVerified:true,custodianCompletenessStillRequired:true,revoked:[...revoked],sequence:seq,canOpenGuestAccess:false};
 }catch{deny();}
}
