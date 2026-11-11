import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createPrivateWriterContractReview,createHeldPrivateStayCandidate,SUPPORTED_OPERATION} from './composition.mjs';
import {createIndependentWriterPorts} from './independent-ports.mjs';
import {PROJECT,frame,parse,digest,digestOf} from './vendor/qa/contract-v1/codec.mjs';
import {SQL_STATEMENTS} from './vendor/qa/writer-gateway-v2/gateway.mjs';

const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const user=id(1),session=id(2),account=id(3),member=id(4),property=id(5),intent=id(6);
const token='fixture.exact.bearer',renewed='fixture.renewed.bearer';
const baseTime=Date.UTC(2026,10,11),expiry=Math.floor(baseTime/1000)+3600;
const writerPin={sessionUser:'cheveni_writer_client_v1',currentUser:'cheveni_writer_client_v1',
 database:'cheveni_fixture',pid:111,startedAt:'2026-11-11T00:00:00.000Z',serverVersion:170011};
const readerPin={...writerPin,pid:222,startedAt:'2026-11-11T00:00:01.000Z'};
const request=()=>({p_auth_user_id:user,p_session_id:session,p_request_id:id(7),p_intent_id:intent,
 p_operation:SUPPORTED_OPERATION,p_token_expires_at:expiry,p_arguments:{p_member_id:member,p_property_id:property,
  p_guest_phone_hash:'a'.repeat(64),p_guest_display_name:'FICTIONAL GUEST',p_check_in_at:'2026-11-12T12:00:00.000Z',
  p_check_out_at:'2026-11-14T12:00:00.000Z',p_access_from:'2026-11-12T12:00:00.000Z',
  p_access_until:'2026-11-14T12:00:00.000Z',p_language:'es'}});
function fixture(){
 let sequence=100;
 const state={now:baseTime,session,issuer:'https://'+PROJECT+'.supabase.co/auth/v1',revoked:false,manage:true,claims:0,observations:0,calls:[],ledger:new Map(),
  loseAck:false,wrongReadBackend:false,alterReadReceipt:false,onInspect:null,onWrite:null,claimsHook:null,budget:500};
 const next=()=>id(sequence++);
 const claims=async bearer=>{
  state.claims++;if(state.claimsHook)await state.claimsHook(state.claims);
  assert.ok([token,renewed].includes(bearer));
  return {error:null,data:{claims:{sub:user,session_id:state.session,exp:expiry,iat:Math.floor(baseTime/1000)-60,
   iss:state.issuer,aud:'authenticated',role:'authenticated',is_anonymous:false,
   user_metadata:{role:'owner'}}}};
 };
 const readSource=async r=>{state.observations++;return {requestId:r.requestId,principal:'manager',userId:user,
  sessionId:state.session,accountId:account,memberId:member,propertyId:r.propertyId,role:'owner',revision:1,
  emailConfirmed:true,sessionActive:!state.revoked,sessionNotAfterMs:baseTime+7200000,suspended:false,
  readInviteReceipts:true,dispatchInvites:false,manageStays:state.manage,fenceCovered:true};};
 function receipt(op,a,saved){
  return {status:'COMMITTED',intentDigest:digestOf('intent',op),
   intentKeyDigest:digestOf('intent_key',{projectRef:PROJECT,userId:op.userId,intentId:op.intentId}),
   checkedAttemptDigest:digestOf('attempt',a),dispatchAttemptDigest:digestOf('attempt',saved.attempt),
   effectFrame:saved.effect.toString('hex'),effectDigest:digest(saved.effect)};
 }
 async function transport(r,pin){
  assert.ok(Object.values(SQL_STATEMENTS).includes(r.text));
  state.calls.push({operation:r.operation,pid:pin.pid,readOnly:r.readOnly});
  let value;
  if(r.operation==='inspect'){
   assert.equal(r.readOnly,true);assert.equal(pin.pid,readerPin.pid);
   const [u,s,exp,p,req]=r.values;
   const bytes=frame('scope',{projectRef:PROJECT,userId:u,sessionId:s,tokenExpiresAt:String(exp),propertyId:p,
    requestId:req,accountId:account,memberId:member,memberRole:'owner',checkedAtMs:String(state.now)});
   value={frame:bytes.toString('hex'),digest:digest(bytes)};
   if(state.onInspect)await state.onInspect();
  }else{
   const op=parse('intent',r.values[0]),a=parse('attempt',r.values[1]);
   const key=op.userId+':'+op.intentId;
   if(r.operation==='write'){
    assert.equal(r.readOnly,false);assert.equal(pin.pid,writerPin.pid);assert.equal(a.mode,'DISPATCH');
    // This Map is a synthetic driver ledger, NOT a PostgreSQL durability test.
    assert.equal(state.ledger.has(key),false,'no second fake effect');
    const effect=frame('effect',{projectRef:PROJECT,intentDigest:digestOf('intent',op),state:'COMMITTED',
     stayId:id(10),stayMemberId:id(11),guestIdentityId:id(12),inviteId:id(13)});
    state.ledger.set(key,{op,attempt:a,effect});
    if(state.onWrite)await state.onWrite();
    if(state.loseAck)throw Error('FICTIONAL_ACK_LOST_AFTER_FAKE_COMMIT');
    value=receipt(op,a,state.ledger.get(key));
   }else{
    assert.equal(r.operation,'readback');assert.equal(r.readOnly,true);assert.equal(pin.pid,readerPin.pid);
    assert.equal(a.mode,'READBACK');
    const saved=state.ledger.get(key);
    value=saved?receipt(op,a,saved):{status:'UNRESOLVED',intentDigest:digestOf('intent',op),
     intentKeyDigest:digestOf('intent_key',{projectRef:PROJECT,userId:op.userId,intentId:op.intentId}),checkedAttemptDigest:digestOf('attempt',a)};
    if(state.alterReadReceipt)value={...value,dispatchAttemptDigest:'f'.repeat(64)};
   }
  }
  return {requestId:r.requestId,operation:r.operation,backend:state.wrongReadBackend&&r.operation==='readback'?writerPin:pin,
   commitTag:'COMMIT',transactionStatus:'IDLE',rows:[{value}]};
 }
 const writer={transact:r=>transport(r,writerPin),newRequestId:next,expectedBackend:writerPin,remainingMs:()=>500};
 const reader={transact:r=>transport(r,readerPin),newRequestId:next,expectedBackend:readerPin,remainingMs:()=>500};
 const make=()=>createPrivateWriterContractReview({mode:'OFFLINE_FIXTURE',getClaims:claims,readManagerSource:readSource,
  writer,reader,now:()=>state.now,newId:next,budgetMs:state.budget});
 return {state,writer,reader,make,review:make(),writes:()=>state.calls.filter(x=>x.operation==='write').length,
  readbacks:()=>state.calls.filter(x=>x.operation==='readback').length};
}
function noOperationalApproval(r){
 assert.equal(r.operationalApproval,false);assert.equal(r.actualSqlVerified,false);
 assert.equal(r.actualProviderVerified,false);assert.equal(r.actualJournalVerified,false);
 assert.equal(r.automaticRetryAllowed,false);assert.equal(r.betaDecision,'NO-GO');
 assert.equal('effect' in r,false);assert.equal('stayId' in r,false);
}

test('real candidate keeps original prelegal hold before inspecting config/token/command; no mode opens it',async()=>{
 const unreadable=new Proxy({},{get(){assert.fail('held candidate inspected input');}});
 const candidate=createHeldPrivateStayCandidate(unreadable);
 for(const r of [await candidate.create(unreadable,unreadable),await candidate.reconcile(unreadable,unreadable),
  await createPrivateWriterContractReview().review(unreadable,unreadable)]){
  assert.equal(r.state,'HELD');noOperationalApproval(r);
 }
});
test('actual codec, SDK boundary, authority and original SQL ports compose with distinct readback PID',async()=>{
 const h=fixture(),r=await h.review.review(token,request());
 assert.equal(r.state,'REVIEW_MATCHED');noOperationalApproval(r);
 assert.equal(h.writes(),1);assert.equal(h.readbacks(),1);
 assert.equal(h.state.calls.find(x=>x.operation==='write').pid,111);
 assert.equal(h.state.calls.find(x=>x.operation==='readback').pid,222);
});
test('all eleven historical operations lack a CBF1 mapping and never reach SDK or private SQL',async()=>{
 const source=readFileSync(new URL('../../../backend/ops/drafts/MANAGER-WRITE-FENCE-QA-DO-NOT-APPLY.sql',import.meta.url),'utf8');
 const bytes=Buffer.from(source);
 const pinned=JSON.parse(readFileSync(new URL('../reviews/post-integration-20261111/SECURITY-SOURCE-PINS.json',import.meta.url))).sources
  .find(x=>x.path==='ops/drafts/MANAGER-WRITE-FENCE-QA-DO-NOT-APPLY.sql');
 assert.equal(pinned.ref,'9beb837a621f9a8f06601043afa64b3bba317cb5');
 assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),pinned.gitBlob);
 const operations=[...source.matchAll(/when '(concierge_[a-z_]+)' then/g)].map(x=>x[1]);
 assert.equal(operations.length,11);assert.equal(operations.includes(SUPPORTED_OPERATION),false);
 const h=fixture();for(const operation of operations){const e=request();e.p_operation=operation;
  assert.equal((await h.review.review(token,e)).state,'HELD');}
 assert.equal(h.state.claims,0);assert.equal(h.state.calls.length,0);
});
test('spoofed user/session/member/expiry and unreviewed argument keys do not become a private intent',async()=>{
 for(const change of [e=>e.p_auth_user_id=id(90),e=>e.p_session_id=id(90),e=>e.p_arguments.p_member_id=id(90),
  e=>e.p_token_expires_at++,e=>e.p_arguments.extra='ignored']){
  const h=fixture(),e=request();change(e);const r=await h.review.review(token,e);
  assert.equal(r.state,'HELD');assert.equal(h.writes(),0);noOperationalApproval(r);
 }
});
test('still-unexpired old JWT plus revoked current session or removed permission cannot dispatch',async()=>{
 for(const change of [s=>s.revoked=true,s=>s.manage=false]){
  const h=fixture();change(h.state);const r=await h.review.review(token,request());
  assert.equal(r.state,'HELD');assert.equal(h.writes(),0);assert.equal(h.state.calls.length,0);
 }
});
test('refresh/session replacement during admission cannot inherit the earlier exact-bearer identity',async()=>{
 const h=fixture();h.state.claimsHook=async n=>{if(n===2)h.state.session=id(88);};
 assert.equal((await h.review.review(token,request())).state,'HELD');assert.equal(h.writes(),0);
});
test('revocation while scope lookup was pending is rechecked immediately before the write',async()=>{
 const h=fixture();h.state.onInspect=async()=>{h.state.revoked=true;};
 assert.equal((await h.review.review(token,request())).state,'HELD');assert.equal(h.writes(),0);
});
test('a started write with late revocation becomes UNKNOWN and cannot release a stale result',async()=>{
 const h=fixture();let resume,entered;const started=new Promise(r=>entered=r);
 h.state.onWrite=()=>{entered();return new Promise(r=>resume=r);};
 const operation=h.review.review(token,request());await started;h.state.revoked=true;resume();
 const r=await operation;assert.equal(r.state,'UNKNOWN');assert.equal(h.writes(),1);assert.equal(h.readbacks(),0);noOperationalApproval(r);
});
test('expiry after a fake effect remains UNKNOWN, never rollback or a fresh admission',async()=>{
 const h=fixture();h.state.onWrite=async()=>{h.state.now=expiry*1000;};
 const r=await h.review.review(token,request());assert.equal(r.state,'UNKNOWN');assert.equal(h.writes(),1);
 assert.equal(h.readbacks(),0);noOperationalApproval(r);
});
test('ACK loss stays UNKNOWN; retry is blocked and explicit independent readback does not resend',async()=>{
 const h=fixture();h.state.loseAck=true;
 assert.equal((await h.review.review(token,request())).state,'UNKNOWN');
 assert.equal((await h.review.review(token,request())).state,'UNKNOWN');assert.equal(h.writes(),1);
 const r=await h.review.reconcile(token,{intentId:intent});assert.equal(r.state,'REVIEW_MATCHED');
 assert.equal(h.writes(),1);assert.equal(h.readbacks(),1);noOperationalApproval(r);
});
test('a fresh replacement session must reauthorize before readback and never reuses a write binding',async()=>{
 const h=fixture();h.state.loseAck=true;await h.review.review(token,request());
 h.state.session=id(88);
 const r=await h.review.reconcile(renewed,{intentId:intent});
 assert.equal(r.state,'REVIEW_MATCHED');assert.equal(h.writes(),1);assert.equal(h.readbacks(),1);noOperationalApproval(r);
});
test('same intent with changed arguments conflicts instead of overwriting the original snapshot',async()=>{
 const h=fixture();h.state.loseAck=true;await h.review.review(token,request());
 const changed=request();changed.p_arguments.p_guest_display_name='OTHER FICTIONAL GUEST';
 assert.equal((await h.review.review(token,changed)).state,'CONFLICT');assert.equal(h.writes(),1);
 assert.equal((await h.review.reconcile(token,{intentId:intent})).state,'REVIEW_MATCHED');
});
test('concurrent local callers reserve before yielding to one write; this is not SQL concurrency proof',async()=>{
 const h=fixture();let resume,entered;const started=new Promise(r=>entered=r);
 h.state.onWrite=()=>{entered();return new Promise(r=>resume=r);};
 const a=h.review.review(token,request()),b=h.review.review(token,request());await started;resume();
 const outcomes=await Promise.all([a,b]);assert.equal(h.writes(),1);
 assert.deepEqual(outcomes.map(x=>x.state).sort(),['REVIEW_MATCHED','UNKNOWN']);
});
test('same backend PID, shared transport and broad principal are rejected before any connection call',()=>{
 const h=fixture();
 for(const reader of [{...h.reader,expectedBackend:{...readerPin,pid:writerPin.pid}},
  {...h.reader,transact:h.writer.transact},
  {...h.reader,expectedBackend:{...readerPin,sessionUser:'service_role',currentUser:'service_role'}}])
  assert.throws(()=>createIndependentWriterPorts({writer:h.writer,reader}));
 assert.equal(h.state.calls.length,0);
});
test('writer backend ACK on readback and an altered dispatch binding both remain UNKNOWN without a second effect',async()=>{
 for(const change of [s=>s.wrongReadBackend=true,s=>s.alterReadReceipt=true]){
  const h=fixture();change(h.state);const r=await h.review.review(token,request());
  assert.equal(r.state,'UNKNOWN');assert.equal(h.writes(),1);noOperationalApproval(r);
 }
});
test('loss of trusted local snapshot after restart/quarantine never infers rollback or starts another write',async()=>{
 const h=fixture();h.state.loseAck=true;await h.review.review(token,request());assert.equal(h.state.ledger.size,1);
 const fresh=h.make(),r=await fresh.reconcile(token,{intentId:intent});
 assert.equal(r.state,'UNKNOWN');assert.match(r.code,/ABSENCE_IS_NOT_ROLLBACK/);assert.equal(h.writes(),1);assert.equal(h.readbacks(),0);
});
test('cancelled late SDK and silent provider do not advance to authority/SQL after the global deadline',async()=>{
 const h=fixture();let resume,entered;const started=new Promise(r=>entered=r);
 h.state.claimsHook=()=>{entered();return new Promise(r=>resume=r);};
 const controller=new AbortController(),pending=h.review.review(token,request(),{signal:controller.signal});
 await started;controller.abort();assert.equal((await pending).state,'HELD');resume();
 await new Promise(r=>setImmediate(r));assert.equal(h.state.observations,0);assert.equal(h.state.calls.length,0);
 const silent=fixture();silent.state.budget=20;silent.state.claimsHook=()=>new Promise(()=>{});
 assert.equal((await silent.make().review(token,request())).state,'HELD');assert.equal(silent.state.calls.length,0);
});
test('historical DEV issuer is not rewritten or trusted as the private QA issuer',async()=>{
 const h=fixture();h.state.issuer='https://tyvwgsdzqipusodxtydv.supabase.co/auth/v1';
 const r=await h.review.review(token,request());assert.equal(r.state,'HELD');
 assert.equal(h.state.observations,0);assert.equal(h.state.calls.length,0);noOperationalApproval(r);
});
