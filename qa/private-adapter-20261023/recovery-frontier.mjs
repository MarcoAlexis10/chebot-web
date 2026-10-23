import {reconcileJournal} from '../technical-closure-20261022/journal.mjs';
// minimumHead is pinned by the independent custodian, NEVER read from the dump.
export function reconcileRecoveryFrontier({witness,minimumHead,captureFinishedAt,now=Date.now()}){
 const deny=()=>{throw Error('CURRENT_NONROLLBACK_JOURNAL_REQUIRED');};
 if(!minimumHead||!Number.isSafeInteger(minimumHead.sequence)||minimumHead.sequence<0||
 !/^[a-f0-9]{64}$/.test(minimumHead.digest)||minimumHead.journalId!==witness?.journal?.id)deny();
 const finished=Date.parse(captureFinishedAt),at=Date.parse(witness?.head?.observedAt);
 if(!Number.isFinite(finished)||finished>now||!Number.isFinite(at)||at<finished)deny();
 const verified=reconcileJournal({...witness,now});
 if(verified.sequence<minimumHead.sequence||(verified.sequence===minimumHead.sequence&&witness.head.digest!==minimumHead.digest))deny();
 return {...verified,antiRollbackFloorVerified:true,postCaptureHeadVerified:true,canOpenGuestAccess:false};
}
