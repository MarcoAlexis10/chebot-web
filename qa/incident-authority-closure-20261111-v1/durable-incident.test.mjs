import test from 'node:test';import assert from 'node:assert/strict';
import {createDurableIncidentReview,createHeldIncidentAuthorityCandidate,WRITE_SQL,READ_SQL,WRITER_LOGIN,READER_LOGIN} from './durable-incident-review.mjs';
import {fixture,command,TOKEN,id} from './fixtures.mjs';
function custodian(){
 const records=new Map(),original=command();let last;
 return {records,get last(){return last;},original,admit:async b=>{last={...b};const key=b.userId+':'+b.intentId;const prior=records.get(key);if(!prior)records.set(key,{binding:{...b},originalRef:id(100),claimed:false});return {state:prior?'KNOWN':'NEW',originalRef:id(100),...(prior?prior.binding:b)};},loadOriginal:async q=>({originalRef:q.originalRef,userId:original.p_auth_user_id,intentId:original.p_intent_id,operation:original.p_operation,accountId:id(7),memberId:id(6),propertyId:id(8),stayId:id(9),arguments:{...original.p_arguments}}),claimDispatch:async b=>{const saved=records.get(b.userId+':'+b.intentId);if(!saved||saved.claimed)throw Error('already claimed');saved.claimed=true;return {state:'DISPATCH_CLAIMED',...b};}};
}
function lab(shared=custodian()){
 const x=fixture();x.writes=0;x.reads=0;x.intents=shared;
 x.options2={mode:'OFFLINE_FIXTURE',resolutionOptions:x.options,clock:()=>x.now,intents:shared,writer:{principal:WRITER_LOGIN,dispatch:async q=>{x.writes++;x.write=q;if(x.onWrite)await x.onWrite(q);return {dispatchId:q.values[5],transaction:'COMMIT'};}},reader:{principal:READER_LOGIN,readOnly:true,readback:async q=>{x.reads++;const b=shared.records.get(id(1)+':'+id(4)).binding;const o={state:'EFFECT_OBSERVED',originalRef:id(100),...b,incidentId:id(5),resultingStatus:'resolving',recoveryEpoch:x.version.recoveryEpoch,observedAtMs:x.now,expiresAtMs:x.now+1000};if(x.onRead)await x.onRead(o);return o;}}};
 x.review=()=>createDurableIncidentReview(x.options2);return x;
}
test('default candidate stays HELD and explicit review rejects legacy broad writer and shared reader',async()=>{
 const hostile=new Proxy({},{get(){throw Error('not read');}});assert.equal((await createHeldIncidentAuthorityCandidate(hostile).execute(hostile,hostile)).status,'HELD');
 const x=lab();x.options2.writer.principal='cheveni_service_manager_backend_v2';assert.throws(()=>x.review());
 const y=lab();y.options2.reader.readback=y.options2.writer.dispatch;assert.throws(()=>y.review());
});
test('durable-port review retains intent/attempt/session/authority and dispatches only incident entry',async()=>{
 const x=lab(),r=await x.review().execute(TOKEN,command());assert.equal(r.state,'REVIEW_EFFECT_OBSERVED');assert.equal(r.actualSqlVerified,false);assert.equal(r.operationalApproval,false);
 assert.equal(x.write.text,WRITE_SQL);assert.equal(x.write.values.length,16);assert.equal(x.write.values[3],id(4));assert.equal(x.write.values[4],id(3));assert.equal(x.write.values[6],id(100));assert.equal(x.write.values[14],7);assert.equal(x.write.values[15].recoveryEpoch,3);
 assert.equal(JSON.stringify(x.intents.last).includes('SUMMARY'),false);assert.equal('p_arguments' in x.intents.last,false);assert.notEqual(WRITE_SQL,READ_SQL);
});
test('lost durable admission or dispatch-claim ACK never reaches a writer',async()=>{
 const x=lab();x.intents.admit=async()=>{throw Error('lost claim ACK');};assert.equal((await x.review().execute(TOKEN,command())).state,'UNKNOWN');assert.equal(x.writes,0);
 const y=lab();y.intents.claimDispatch=async()=>{throw Error('lost dispatch claim ACK');};assert.equal((await y.review().execute(TOKEN,command())).state,'UNKNOWN');assert.equal(y.writes,0);
});
test('lost write ACK and process restart cannot turn a known intent into a resend',async()=>{
 const shared=custodian(),x=lab(shared),r=x.review();x.onWrite=()=>{throw Error('lost write ACK after fictional effect');};assert.equal((await r.execute(TOKEN,command())).state,'UNKNOWN');assert.equal(x.reads,0);
 const after=lab(shared),c=command();c.p_request_id=id(33);assert.equal((await after.review().execute(TOKEN,c)).state,'UNKNOWN');assert.equal(after.writes,0);
 assert.equal((await after.review().reconcile(TOKEN,id(4),command())).state,'UNKNOWN');assert.equal(after.reads,0);
 assert.equal((await r.reconcile(TOKEN,id(4))).state,'REVIEW_EFFECT_OBSERVED');assert.equal(x.writes,1);
});
test('different args for same known intent conflict; simultaneous review instances rely on one custodian claim',async()=>{
 const shared=custodian(),x=lab(shared),y=lab(shared);
 const a=x.review().execute(TOKEN,command()),b=y.review().execute(TOKEN,command());const rs=await Promise.all([a,b]);assert.equal(rs.filter(z=>z.state==='REVIEW_EFFECT_OBSERVED').length,1);assert.equal(x.writes+y.writes,1);
 const z=lab(shared),c=command();c.p_request_id=id(55);c.p_arguments.p_event_summary='OTHER FICTIONAL';assert.equal((await z.review().execute(TOKEN,c)).state,'CONFLICT');assert.equal(z.writes,0);
});
test('missing original custody, wrong reference or client snapshot cannot unlock dispatch',async()=>{
 for(const mutation of [async()=>null,async()=>{throw Error('missing original');}]){const x=lab();x.intents.loadOriginal=mutation;assert.equal((await x.review().execute(TOKEN,command())).state,'UNKNOWN');assert.equal(x.writes,0);}
 const x=lab(),orig=x.intents.loadOriginal;x.intents.loadOriginal=async q=>({...await orig(q),originalRef:id(300)});assert.equal((await x.review().execute(TOKEN,command())).state,'UNKNOWN');assert.equal(x.writes,0);
});
test('revocation during dispatch claim and after possible effect preserves UNKNOWN and blocks private readback',async()=>{
 const x=lab(),claim=x.intents.claimDispatch;x.intents.claimDispatch=async q=>{const b=await claim(q);x.row.sessionLive=false;return b;};assert.equal((await x.review().execute(TOKEN,command())).state,'UNKNOWN');assert.equal(x.writes,0);
 const y=lab();y.onWrite=()=>{y.row.identityRevokedAt=y.now;};assert.equal((await y.review().execute(TOKEN,command())).state,'UNKNOWN');assert.equal(y.reads,0);
});
test('reader contradictions never produce terminal success or resubmit and cannot reuse refreshed bearer',async()=>{
 for(const patch of [{attemptId:id(99)},{authorityVersion:999},{restrictionVersion:999},{recoveryEpoch:1},{state:'DENIED'},{originalRef:id(66)},{resultingStatus:'closed'},{expiresAtMs:0}]){const x=lab();x.onRead=v=>Object.assign(v,patch);assert.equal((await x.review().execute(TOKEN,command())).state,'UNKNOWN');assert.equal(x.writes,1);}
 const x=lab(),r=x.review();await r.execute(TOKEN,command());const previous=x.reads;assert.equal((await r.reconcile('bmV3.aW5jaWRlbnQ.cmV2aWV3',id(4))).state,'UNKNOWN');assert.equal(x.reads,previous);
});
test('a role change without its authority revision is a contradictory protected source',async()=>{
 const x=lab();x.onRead=()=>{x.row.memberRole='manager';};assert.equal((await x.review().execute(TOKEN,command())).state,'UNKNOWN');
});
