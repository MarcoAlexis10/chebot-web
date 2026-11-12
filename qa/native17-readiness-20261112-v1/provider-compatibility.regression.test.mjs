// One directly affected prior case; not a new unique test. Source sha256 88a00b4e6c1b63b678d2773061ccc140b38a90ea520945b57cb2553593d93941
import test from 'node:test';import assert from 'node:assert/strict';
import {createProviderDispatchBinding,createProviderBindingReview} from './provider-binding.mjs';
import {fixture,command,id,TOKEN,T} from '../incident-authority-closure-20261111-v1/fixtures.mjs';
import {WRITE_SQL,READ_SQL} from '../incident-authority-closure-20261111-v1/durable-incident-review.mjs';
import {revisionKeys} from '../incident-authority-closure-20261111-v1/current-resolution.mjs';
function lab(){const x=fixture();let n=100;x.options.newRequestId=()=>id(n++);x.registers=0;x.claimCalls=0;
 const attestor={originalReference:async q=>({...q,originalRef:id(88)}),register:async(request,proof)=>{x.registers++;x.request=request;assert.equal(proof.useVerifiedIdentity().sessionId,id(2));if(x.onRegister)await x.onRegister(request);return {...request,providerBindingRef:id(77),observedAtMs:x.now,expiresAtMs:x.now+1000};},claim:async request=>{x.claimCalls++;const response={...request,observedAtMs:x.now,expiresAtMs:x.now+1000};if(x.onClaim)await x.onClaim(response);return response;}};
 x.binder=()=>createProviderBindingReview({mode:'OFFLINE_FIXTURE',getClaims:x.options.getClaims,resolver:x.resolver(),attestor,clock:()=>x.now,newRequestId:()=>id(n++)});x.attestor=attestor;return x;}
test('bound transport preserves the original ABI arguments and adds only an instance-proven provider reference',async()=>{
 const x=lab(),b=x.binder(),c=command(),cap=await b.prepare(TOKEN,c,id(999)),claim=await b.claim(cap,TOKEN,c);assert.equal(claim.context.originalRef,id(88));
 const f=Object.fromEntries(revisionKeys.map(k=>[k,x.row[k]??x.version[k]]));
 const values=[id(1),id(2),c.p_token_expires_at,id(4),id(3),id(3),id(88),id(7),id(6),id(8),id(9),id(5),'resolving',c.p_arguments.p_event_summary,7,f],q={text:WRITE_SQL,values,readOnly:false};
 assert.equal((await b.transport({...claim},TOKEN,c,q)).state,'HELD_BOUND_SQL_REQUEST');
 const got=await b.transport(claim,TOKEN,c,q);assert.equal(got.state,'REVIEW_BOUND_SQL_REQUEST');assert.equal(got.values.length,17);assert.equal(got.values.at(-1),id(77));assert.deepEqual(got.values.slice(0,-1),values);assert.equal(got.text.includes('change_state_bound_v2('),true);assert.equal((await b.transport(claim,TOKEN,c,q)).state,'HELD_BOUND_SQL_REQUEST');
 const read={text:READ_SQL,values:[id(1),id(2),c.p_token_expires_at,id(4),id(3),id(3),id(88),7,f],readOnly:true};assert.equal((await b.transport(claim,TOKEN,c,read)).values.length,10);
 let invoked=0;const bad=[...read.values];Object.defineProperty(bad,'8',{get(){invoked++;return f;}});assert.equal((await b.transport(claim,TOKEN,c,{...read,values:bad})).state,'HELD_BOUND_SQL_REQUEST');assert.equal(invoked,0);
 x.row.sessionLive=false;assert.equal((await b.transport(claim,TOKEN,c,read)).state,'HELD_BOUND_SQL_REQUEST');
});
