// Backend candidate. No SQL driver/network/SDK defaults; holds stay enabled by default.
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {record,array,PROJECT,isHex,isUuid,frame,parse,digest,digestOf,subject} from '../contract-v1/codec.mjs';
import {createSdkIdentityBoundary,verifiedIdentity} from './sdk-identity.mjs';
import {createJournalVerifier} from '../journal-contract-v2/receipts.mjs';
import {bindIndependentRestrictions,isRestrictionProofCurrent} from '../backend-candidates/concierge-independent-revocations.js';
// Exact legacy subject domains, ported without importing the REST gateway.
const oldSubject=(kind,id)=>createHash('sha256').update(JSON.stringify([kind,id])).digest('hex');
const authUserRestrictionSubject=id=>oldSubject('AUTH_USER_V1',id),authSessionRestrictionSubject=id=>oldSubject('AUTH_SESSION_V1',id);
import {conciergePrelegalSensitiveHold} from '../backend-candidates/concierge-prelegal-sensitive-hold-qa.js';
const fail=()=>{throw Error('WRITER_GATEWAY_CLOSED');},hexFrame=s=>{if(typeof s!=='string'||s.length>131072||s.length%2||!/^([a-f0-9]{2})+$/.test(s))fail();return Buffer.from(s,'hex');};
const outcome=(state,code,effect=null)=>Object.freeze({state,code,effect,automaticRetryAllowed:false,reconciliationRequired:state==='UNKNOWN'||state==='HELD',operationalApproval:false,betaDecision:'NO-GO'});
export const SQL_STATEMENTS=Object.freeze({inspect:'select concierge_writer_contract_v2.scope_v2($1,$2,$3,$4,$5) value',write:'select concierge_writer_contract_v2.write_v2($1::bytea,$2::bytea) value',readback:'select concierge_writer_contract_v2.readback_v2($1::bytea,$2::bytea) value'});
function signedSnapshot(input){const s=record(input,['head','events','signature']);return Object.freeze({head:record(s.head,['journalId','sequence','digest','observedAt','challenge','baselineComplete']),events:array(s.events,100000).map(x=>record(x,['sequence','subject','action','at','previous','digest'])),signature:s.signature});}
export function createWriterGateway({held=conciergePrelegalSensitiveHold,getClaims,sql,journal,getRestrictions,policy,now=Date.now,newId=randomUUID,newChallenge=()=>randomBytes(32).toString('hex'),deadlineMs=4000,operationDeadlineMs=20000,requestSignal=null}={}){
 if(requestSignal!==null&&!(requestSignal instanceof AbortSignal))fail();
 // Missing adapters remain HELD; no fallback to REST, service key or broad DML.
 if(getClaims===undefined||sql===undefined||journal===undefined||getRestrictions===undefined||policy===undefined)return Object.freeze({execute:async()=>outcome('HELD','ADAPTERS_NOT_CONFIGURED'),reconcile:async()=>outcome('HELD','ADAPTERS_NOT_CONFIGURED')});
 const db=record(sql,['inspect','write','readback']),j=record(journal,['checkpoint','prepare','claim','observe','complete']);if(!Object.values(db).every(f=>typeof f==='function')||!Object.values(j).every(f=>typeof f==='function')||typeof getRestrictions!=='function'||typeof held!=='function'||typeof now!=='function'||!Number.isSafeInteger(deadlineMs)||deadlineMs<1||deadlineMs>8000||!Number.isSafeInteger(operationDeadlineMs)||operationDeadlineMs<1||operationDeadlineMs>60000)fail();
 const p=record(policy,['custodianKey','witnessKey','custodianId','datasetId','minimumRecoveryEpoch','inventoryDigest','restrictionKey','restrictionJournalId','minimumRestrictionHead']);
 const identity=createSdkIdentityBoundary({getClaims}),proofs=createJournalVerifier(Object.fromEntries(Object.entries(p).filter(([k])=>k!=='restrictionKey'))),restrictions=bindIndependentRestrictions({journalId:p.restrictionJournalId,publicKey:p.restrictionKey,minimumHead:p.minimumRestrictionHead,maxAgeMs:Math.min(deadlineMs,4000)});
 const reservations=new Map();let clock=-1;
 function tick(){const t=now();if(!Number.isSafeInteger(t)||t<clock)fail();clock=t;return t;}
 function hold(until){if(held()!==false||requestSignal?.aborted||performance.now()>=until)fail();}
 function nonce(){const c=newChallenge();if(!isHex(c))fail();return c;}
 function requestId(){const x=newId();if(!isUuid(x))fail();return x;}
 async function within(until,fn){
  const controller=new AbortController();
  hold(until);
  const expires=Math.min(until,performance.now()+deadlineMs);
  const cancelled=()=>Error('REQUEST_CANCELLED_UNCERTAIN');
  let timer,onAbort;
  try{
   const alarm=new Promise((_,reject)=>{
    onAbort=()=>{reject(cancelled());controller.abort();};
    requestSignal?.addEventListener('abort',onAbort,{once:true});
    timer=setTimeout(onAbort,Math.max(0,expires-performance.now()));
    if(requestSignal?.aborted)onAbort();
   });
   const value=await Promise.race([alarm,Promise.resolve().then(()=>{
    if(controller.signal.aborted||performance.now()>=expires)throw cancelled();
    hold(until);
    return fn(controller.signal);
   })]);
   if(controller.signal.aborted||requestSignal?.aborted||performance.now()>=expires)throw cancelled();
   hold(until);
   return value;
  }finally{
   clearTimeout(timer);
   requestSignal?.removeEventListener('abort',onAbort);
   controller.abort();
  }
 }
 async function verified(until,token,expected){hold(until);const proof=await within(until,()=>identity.verify(token,{now:tick()})),r=verifiedIdentity(proof,token,tick());if(expected&&Object.keys(expected).some(k=>r[k]!==expected[k]))fail();hold(until);return r;}
 async function restrictionProof(until,auth,scope=null){hold(until);const since=tick(),challenge=nonce(),raw=signedSnapshot(await within(until,signal=>getRestrictions(Object.freeze({challenge,signal}))));const proof=restrictions.verify(raw,{challenge,now:tick()});if(!isRestrictionProofCurrent(proof,tick())||Date.parse(proof.observedAt)<since)fail();
 const subjects=[authUserRestrictionSubject(auth.userId),authSessionRestrictionSubject(auth.sessionId),subject('AUTH_USER',auth.userId),subject('AUTH_SESSION',auth.sessionId)];if(scope)subjects.push(subject('ACCOUNT',scope.accountId),subject('MEMBER',scope.memberId),subject('PROPERTY',scope.propertyId));if(subjects.some(s=>proof.subjects.includes(s)))fail();hold(until);return proof;}
 function assertRestriction(proof){if(!isRestrictionProofCurrent(proof,tick()))fail();}
 async function inspect(until,auth,propertyId){hold(until);const started=tick(),id=requestId(),args=Object.freeze([auth.userId,auth.sessionId,Number(auth.tokenExpiresAt),propertyId,id]);const raw=record(await within(until,signal=>db.inspect(Object.freeze({text:SQL_STATEMENTS.inspect,values:args,signal}))),['frame','digest']);const bytes=hexFrame(raw.frame),sc=parse('scope',bytes);
 if(raw.digest!==digest(bytes)||sc.userId!==auth.userId||sc.sessionId!==auth.sessionId||sc.tokenExpiresAt!==auth.tokenExpiresAt||sc.requestId!==id||sc.propertyId!==propertyId||Number(sc.checkedAtMs)<started||Number(sc.checkedAtMs)>tick())fail();hold(until);return sc;}
 function attempt(auth,op,restriction,mode){return Object.freeze({projectRef:PROJECT,intentDigest:digestOf('intent',op),sessionId:auth.sessionId,tokenExpiresAt:auth.tokenExpiresAt,requestId:requestId(),restrictionJournalId:restriction.journalId,restrictionSequence:String(restriction.sequence),restrictionDigest:restriction.digest,dispatchId:requestId(),mode});}
 async function checkpoint(until,intentDigest,intentKeyDigest,restriction){const challenge=nonce(),since=tick(),raw=await within(until,signal=>j.checkpoint(Object.freeze({intentDigest,intentKeyDigest,challenge,restrictionJournalId:restriction.journalId,restrictionSequence:String(restriction.sequence),restrictionDigest:restriction.digest,signal})));const cp=proofs.verifyCheckpoint(raw,{intentDigest,intentKeyDigest,challenge,now:tick(),since});if(cp.restrictionJournalId!==restriction.journalId||cp.restrictionSequence!==String(restriction.sequence)||cp.restrictionDigest!==restriction.digest)fail();return cp;}
 const expected=a=>Object.freeze({intentDigest:a.intentDigest,attemptDigest:digestOf('attempt',a),dispatchId:a.dispatchId,restrictionJournalId:a.restrictionJournalId,restrictionSequence:a.restrictionSequence,restrictionDigest:a.restrictionDigest});
 async function journalStep(until,method,payload,cp,e){hold(until);const detached=Object.fromEntries(Object.entries(payload).map(([k,v])=>[k,v instanceof Uint8Array?Buffer.from(v):v]));const challenge=nonce(),since=tick(),raw=await within(until,signal=>j[method](Object.freeze({...detached,challenge,signal})));return proofs.verifyReceipt(raw,{checkpoint:cp,expected:e,challenge,now:tick(),since});}
 function operation(command,auth,sc){const c=record(command,['intentId','propertyId','arguments']),a=record(c.arguments,['guestPhoneHash','guestDisplayName','checkInAt','checkOutAt','accessFrom','accessUntil','language']);if(!isUuid(c.intentId)||c.propertyId!==sc.propertyId)fail();return parse('intent',frame('intent',{projectRef:PROJECT,intentId:c.intentId,operation:'concierge_manager_create_stay',userId:auth.userId,accountId:sc.accountId,memberId:sc.memberId,memberRole:sc.memberRole,propertyId:sc.propertyId,...a}));}
 function checkScope(op,auth,sc){if(op.userId!==auth.userId||op.accountId!==sc.accountId||op.memberId!==sc.memberId||op.memberRole!==sc.memberRole||op.propertyId!==sc.propertyId)fail();}
 function checkSql(raw,op,a,includeEffect){const keys=includeEffect?['status','intentDigest','intentKeyDigest','checkedAttemptDigest','dispatchAttemptDigest','effectFrame','effectDigest']:['status','intentDigest','intentKeyDigest','checkedAttemptDigest'];const r=record(raw,keys);if(r.intentKeyDigest!==digestOf('intent_key',{projectRef:PROJECT,userId:op.userId,intentId:op.intentId})||r.intentDigest!==digestOf('intent',op)||r.checkedAttemptDigest!==digestOf('attempt',a))fail();if(includeEffect){if(!['COMMITTED','DENIED'].includes(r.status)||!isHex(r.dispatchAttemptDigest))fail();const b=hexFrame(r.effectFrame),ef=parse('effect',b);if(r.effectDigest!==digest(b)||ef.intentDigest!==r.intentDigest||ef.state!==r.status)fail();return Object.freeze({...r,effect:ef,bytes:Buffer.from(b)});}return r;}
 async function readback(until,auth,op,proof){const a=attempt(auth,op,proof,'READBACK'),raw=await within(until,signal=>db.readback(Object.freeze({text:SQL_STATEMENTS.readback,values:Object.freeze([Buffer.from(frame('intent',op)),Buffer.from(frame('attempt',a))]),signal})));if(Object.getOwnPropertyDescriptor(raw,'status')?.value==='UNRESOLVED'){checkSql(raw,op,a,false);fail();}return checkSql(raw,op,a,true);}
 async function finalize(until,auth,token,op,cp,dispatch,initial,restriction){hold(until);await verified(until,token,auth);const current=await restrictionProof(until,auth,op);if(current.sequence!==restriction.sequence||current.digest!==restriction.digest)fail();const rb=await readback(until,auth,op,current);if(rb.dispatchAttemptDigest!==dispatch.attemptDigest||initial&&rb.effectDigest!==initial.effectDigest)fail();await verified(until,token,auth);assertRestriction(current);
 const final=await journalStep(until,'complete',{intentDigest:dispatch.intentDigest,attemptDigest:dispatch.attemptDigest,state:rb.status,effectDigest:rb.effectDigest},cp,dispatch);if(final.state!==rb.status||final.effectDigest!==rb.effectDigest)fail();
 // One final fresh restriction receipt before releasing even the minimal resource IDs.
 const last=await restrictionProof(until,auth,op);if(last.sequence!==restriction.sequence||last.digest!==restriction.digest)fail();await verified(until,token,auth);assertRestriction(last);hold(until);
 const result=rb.status==='COMMITTED'?Object.freeze({stayId:rb.effect.stayId,stayMemberId:rb.effect.stayMemberId,inviteId:rb.effect.inviteId}):null;
 return outcome(rb.status==='COMMITTED'?'CONFIRMED':'DENIED',rb.status==='COMMITTED'?'FRESH_READBACK_AND_JOURNAL_MATCH':'CONFIRMED_DENIED',result);}
 async function execute(token,command){const until=performance.now()+operationDeadlineMs;let uncertain=false;try{
  hold(until);const c=record(command,['intentId','propertyId','arguments']);if(!isUuid(c.intentId)||!isUuid(c.propertyId))fail();
  // Snapshot all arguments before the first provider/SQL/journal await.
  const detached=Object.freeze({...c,arguments:record(c.arguments,['guestPhoneHash','guestDisplayName','checkInAt','checkOutAt','accessFrom','accessUntil','language'])});
  const auth=await verified(until,token),restriction=await restrictionProof(until,auth),sc=await inspect(until,auth,c.propertyId),op=operation(detached,auth,sc);assertRestriction(restriction);
  const scoped=await restrictionProof(until,auth,op),cp=await checkpoint(until,digestOf('intent',op),digestOf('intent_key',{projectRef:PROJECT,userId:op.userId,intentId:op.intentId}),scoped);if(cp.mode!=='NEW')return outcome('HELD','EXISTING_INTENT_READBACK_ONLY');
  const key=auth.userId+':'+op.intentId;if(reservations.has(key)||reservations.size>=4096)return outcome('HELD','INTENT_RESERVED_NO_AUTOMATIC_RETRY');reservations.set(key,digestOf('intent',op));
  const a=attempt(auth,op,scoped,'DISPATCH'),e=expected(a);uncertain=true;
  const prepared=await journalStep(until,'prepare',{...e,intentKeyDigest:cp.intentKeyDigest},cp,e);if(prepared.state!=='PREPARED')fail();
  const claimed=await journalStep(until,'claim',{intentDigest:e.intentDigest,attemptDigest:e.attemptDigest,dispatchId:e.dispatchId},cp,e);if(claimed.state!=='DISPATCH_CLAIMED')fail();
  await verified(until,token,auth);const before=await restrictionProof(until,auth,op);if(before.sequence!==scoped.sequence||before.digest!==scoped.digest)fail();assertRestriction(before);hold(until);verifiedIdentity(auth,token,tick());
  const raw=await within(until,signal=>db.write(Object.freeze({text:SQL_STATEMENTS.write,values:Object.freeze([Buffer.from(frame('intent',op)),Buffer.from(frame('attempt',a))]),signal}))),got=checkSql(raw,op,a,true);
  return await finalize(until,auth,token,op,cp,e,got,scoped);
 }catch{return outcome(uncertain?'UNKNOWN':'HELD',uncertain?'OUTCOME_UNCERTAIN_READBACK_REQUIRED':'AUTH_SCOPE_OR_CUSTODY_UNVERIFIED');}}
 async function reconcile(token,input){const until=performance.now()+operationDeadlineMs;try{hold(until);const c=record(input,['intentFrame']),op=parse('intent',hexFrame(c.intentFrame)),auth=await verified(until,token),restriction=await restrictionProof(until,auth,op);if(op.userId!==auth.userId)fail();checkScope(op,auth,await inspect(until,auth,op.propertyId));const cp=await checkpoint(until,digestOf('intent',op),digestOf('intent_key',{projectRef:PROJECT,userId:op.userId,intentId:op.intentId}),restriction);if(cp.mode!=='KNOWN')return outcome('UNKNOWN','ABSENCE_IS_NOT_ROLLBACK');
  const rb=await readback(until,auth,op,restriction),challenge=nonce(),since=tick(),raw=await within(until,signal=>j.observe(Object.freeze({intentDigest:digestOf('intent',op),challenge,signal}))),signed=record(raw,['record','signature']);
  const r=record(signed.record,['projectRef','custodianId','intentDigest','attemptDigest','state','revision','dispatchId','restrictionJournalId','restrictionSequence','restrictionDigest','effectDigest','challenge','observedAtMs','expiresAtMs']);
  const e=Object.freeze({intentDigest:digestOf('intent',op),attemptDigest:rb.dispatchAttemptDigest,dispatchId:r.dispatchId,restrictionJournalId:restriction.journalId,restrictionSequence:String(restriction.sequence),restrictionDigest:restriction.digest});
  const observed=proofs.verifyReceipt(raw,{checkpoint:cp,expected:e,challenge,now:tick(),since});if(!['DISPATCH_CLAIMED','COMMITTED','DENIED'].includes(observed.state))fail();return await finalize(until,auth,token,op,cp,e,rb,restriction);
 }catch{return outcome('UNKNOWN','RECONCILIATION_CLOSED_NO_RESEND');}}
 return Object.freeze({execute,reconcile});
}
