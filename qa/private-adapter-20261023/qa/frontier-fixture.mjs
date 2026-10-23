import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {freshChallenge,eventDigest} from '../../technical-closure-20261022/journal.mjs';
export function frontierFixture({count=2,now=Date.now()}={}){
 const keys=generateKeyPairSync('ed25519'),journal={kind:'CHEVENI_INDEPENDENT_REVOCATIONS_V1',id:'fictional-independent-custody',baselineComplete:true,events:[]};
 let digest=createHash('sha256').update(JSON.stringify(['BASELINE',journal.id])).digest('hex');
 for(let i=1;i<=count;i++){const e={sequence:i,subject:'subject-'+i.toString(16).padStart(16,'0'),action:i%2?'REVOKE':'ERASURE_HOLD',at:new Date(now-1000).toISOString()};journal.events.push(e);digest=eventDigest(digest,e);}
 const challenge=freshChallenge(),head={journalId:journal.id,sequence:count,digest,observedAt:new Date(now).toISOString(),challenge};
 return {now,captureFinishedAt:new Date(now-2000).toISOString(),minimumHead:{journalId:journal.id,sequence:count,digest},witness:{journal,head,signature:sign(null,Buffer.from(JSON.stringify(head)),keys.privateKey).toString('base64'),publicKey:keys.publicKey,challenge,now}};
}
