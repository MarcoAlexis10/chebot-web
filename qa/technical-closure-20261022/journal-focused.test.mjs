import test from 'node:test';import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {freshChallenge,eventDigest,reconcileJournal} from './journal.mjs';
const keys=generateKeyPairSync('ed25519');
function fixture(){const now=Date.now(),challenge=freshChallenge(),journal={kind:'CHEVENI_INDEPENDENT_REVOCATIONS_V1',id:'fictional-independent',baselineComplete:true,events:[{sequence:1,subject:'subject-aaaaaaaaaaaaaaaa',action:'REVOKE',at:new Date(now-1000).toISOString()}]};
 const first=createHash('sha256').update(JSON.stringify(['BASELINE',journal.id])).digest('hex');const head={journalId:journal.id,sequence:1,digest:eventDigest(first,journal.events[0]),observedAt:new Date(now).toISOString(),challenge};
 return {journal,head,signature:sign(null,Buffer.from(JSON.stringify(head)),keys.privateKey).toString('base64'),publicKey:keys.publicKey,challenge,now};}
test('independent current head detects a post-snapshot revocation without reopening access',()=>{const r=reconcileJournal(fixture());assert.equal(r.journalVerified,true);assert.equal(r.canOpenGuestAccess,false);assert.deepEqual(r.revoked,['subject-aaaaaaaaaaaaaaaa']);});
test('old journal, removed event, forged signer, missing baseline and reused challenge are rejected',()=>{
 for(const mutate of [p=>p.journal.events=[],p=>p.journal.baselineComplete=false,p=>p.challenge=freshChallenge(),p=>p.now+=300001,p=>p.signature=Buffer.alloc(64).toString('base64'),p=>p.publicKey=generateKeyPairSync('ed25519').publicKey]){const p=fixture();mutate(p);assert.throws(()=>reconcileJournal(p),/CURRENT_INDEPENDENT_JOURNAL_REQUIRED/);}
});
test('valid signed head cannot conceal a gap or reorder a recorded event',()=>{
 const p=fixture();p.journal.events[0].sequence=2;p.head.sequence=2;p.signature=sign(null,Buffer.from(JSON.stringify(p.head)),keys.privateKey).toString('base64');assert.throws(()=>reconcileJournal(p),/CURRENT_INDEPENDENT_JOURNAL_REQUIRED/);
});
