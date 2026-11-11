// Verification only. Private keys and durable append authority belong to a separate custodian.
import {createHash,verify} from 'node:crypto';
const proofs = new WeakMap();
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const hex = s => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
const exact = (o,keys) => o && Object.getPrototypeOf(o) === Object.prototype && Reflect.ownKeys(o).length === keys.length && keys.every(k=>Object.hasOwn(o,k));
// Signature checks and restriction insertion must refer to the same own data
// values. Never execute a provider object's getters or follow inherited rows.
function record(input,keys){
 if(!exact(input,keys))throw Error('JOURNAL_RECORD_INVALID');
 const out={};
 for(const key of keys){const d=Object.getOwnPropertyDescriptor(input,key);if(!d||!Object.hasOwn(d,'value'))throw Error('JOURNAL_RECORD_INVALID');out[key]=d.value;}
 return Object.freeze(out);
}
function journalSnapshot(input){
 const raw=record(input,['head','events','signature']),events=raw.events;
 if(!Array.isArray(events)||Object.getPrototypeOf(events)!==Array.prototype)throw Error('JOURNAL_EVENTS_INVALID');
 const length=Object.getOwnPropertyDescriptor(events,'length');
 if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)
   ||length.value<0||length.value>100000)throw Error('JOURNAL_EVENTS_INVALID');
 const count=length.value;
 if(Reflect.ownKeys(events).length!==count+1)throw Error('JOURNAL_EVENTS_INVALID');
 const rows=[];
 for(let i=0;i<count;i++){
  const d=Object.getOwnPropertyDescriptor(events,String(i));
  if(!d||!Object.hasOwn(d,'value'))throw Error('JOURNAL_EVENTS_INVALID');
  rows.push(record(d.value,['sequence','subject','action','at','previous','digest']));
 }
 return Object.freeze({head:record(raw.head,['journalId','sequence','digest','observedAt','challenge','baselineComplete']),events:Object.freeze(rows),signature:raw.signature});
}
export const journalGenesis = id => hash(['CHEVENI_RESTRICTIONS_V1',id]);
export const restrictionDigest = e => hash([e.sequence,e.subject,e.action,e.at,e.previous]);
export const signedHeadBytes = h => Buffer.from(JSON.stringify([h.journalId,h.sequence,h.digest,h.observedAt,h.challenge,h.baselineComplete]));
export function isVerifiedRestrictionProof(value) {
 const state=proofs.get(value);
 return !!state&&state.current();
}
// Keep issuer lifetime and the latest accepted head outside caller-owned data.
// A downstream freshness policy cannot extend this signed observation's window.
export function isRestrictionProofCurrent(value,now) {
 const state=proofs.get(value);
 return !!state&&state.current()&&Number.isSafeInteger(now)&&now>=state.observed&&now<=state.expires;
}
export function bindIndependentRestrictions({journalId,publicKey,minimumHead,maxAgeMs}) {
  try{minimumHead=record(minimumHead,['sequence','digest']);}catch{throw Error('RESTRICTION_POLICY_INVALID');}
  if (!/^[a-z0-9_-]{1,64}$/.test(journalId || '') || publicKey?.type !== 'public' || publicKey.asymmetricKeyType !== 'ed25519'
      || !exact(minimumHead,['sequence','digest']) || !Number.isSafeInteger(minimumHead.sequence) || minimumHead.sequence < 0 || !hex(minimumHead.digest)
      || !Number.isSafeInteger(maxAgeMs) || maxAgeMs < 1 || maxAgeMs > 300000) throw Error('RESTRICTION_POLICY_INVALID');
  let floor = {...minimumHead}, clock = -1;
  // Replay state is bounded by the signed proof's actual acceptance window.
  // Never prune on an invalid/future input: only a successful verification may
  // advance the clock and retire expired challenges atomically with its floor.
  const used = new Map();
  return Object.freeze({verify(snapshot,{challenge,now}={}) {
    const deny = () => { throw Error('INDEPENDENT_RESTRICTIONS_UNVERIFIED'); };
    try {
      snapshot=journalSnapshot(snapshot);
      if (!Number.isSafeInteger(now) || now < clock || !hex(challenge)
          || !exact(snapshot,['head','events','signature']) || !Array.isArray(snapshot.events) || snapshot.events.length > 100000) deny();
      if (used.get(challenge) >= now || [...used.values()].filter(expiresAt => expiresAt >= now).length >= 1024) deny();
      const {head,events,signature} = snapshot;
      if (!exact(head,['journalId','sequence','digest','observedAt','challenge','baselineComplete']) || head.journalId !== journalId
          || head.baselineComplete !== true || head.challenge !== challenge || !Number.isSafeInteger(head.sequence)
          || head.sequence !== events.length || head.sequence < floor.sequence || !hex(head.digest)
          || typeof head.observedAt !== 'string' || new Date(head.observedAt).toISOString() !== head.observedAt
          || now < Date.parse(head.observedAt) || now - Date.parse(head.observedAt) > maxAgeMs
          || typeof signature !== 'string') deny();
      const sig = Buffer.from(signature,'base64');
      if (sig.length !== 64 || sig.toString('base64') !== signature || !verify(null,signedHeadBytes(head),publicKey,sig)) deny();
      let digest = journalGenesis(journalId), floorDigest = digest, lastAt = -1;
      const restricted = new Set();
      for (let i = 0; i < events.length; i++) {
        const e = events[i];
        if (!exact(e,['sequence','subject','action','at','previous','digest']) || e.sequence !== i+1 || !hex(e.subject)
            || !['REVOKE','ERASE'].includes(e.action) || e.previous !== digest || !hex(e.digest) || restrictionDigest(e) !== e.digest
            || typeof e.at !== 'string' || new Date(e.at).toISOString() !== e.at || Date.parse(e.at) < lastAt || Date.parse(e.at) > Date.parse(head.observedAt)) deny();
        lastAt = Date.parse(e.at); digest = e.digest; restricted.add(e.subject);
        if (e.sequence === floor.sequence) floorDigest = digest;
      }
      if (digest !== head.digest || floorDigest !== floor.digest) deny();
      const result = Object.freeze({journalId,sequence:head.sequence,digest,subjects:Object.freeze([...restricted]),
        observedAt:head.observedAt,operationalApproval:false});
      for (const [nonce,expiresAt] of used) if (expiresAt < now) used.delete(nonce);
      const observed=Date.parse(head.observedAt),expires=observed+maxAgeMs;
      if(!Number.isSafeInteger(expires))deny();
      proofs.set(result,{observed,expires,current:()=>floor.sequence===head.sequence&&floor.digest===digest});
      used.set(challenge,expires);
      floor = {sequence:head.sequence,digest}; clock = now;
      return result;
    } catch { deny(); }
  }});
}
