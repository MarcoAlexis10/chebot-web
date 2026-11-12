import test from 'node:test';import assert from 'node:assert/strict';
import {fixture,command,id,TOKEN} from '../incident-authority-closure-20261111-v1/fixtures.mjs';
import {READ_SQL,WRITE_SQL} from '../incident-authority-closure-20261111-v1/durable-incident-review.mjs';
import {revisionKeys} from '../incident-authority-closure-20261111-v1/current-resolution.mjs';
const baseline=process.execArgv.includes('--conditions=baseline');
const {createProviderBindingReview}=await import(baseline?'../incident-native17-review-20261111-v1/provider-binding.mjs':'./provider-binding.mjs');
test('provider binding expiring inside the transport resolution await cannot compile a write or read',async()=>{
 for(const write of [true,false]){
  const x=fixture();let serial=200,advance=false;const resolver=x.resolver();
  const reviewed={resolve:async(...args)=>{if(advance)x.now+=1200;return resolver.resolve(...args);},inspect:(...args)=>resolver.inspect(...args)};
  const binder=createProviderBindingReview({mode:'OFFLINE_FIXTURE',getClaims:x.options.getClaims,resolver:reviewed,clock:()=>x.now,budgetMs:2000,newRequestId:()=>id(serial++),attestor:{
   originalReference:async q=>({...q,originalRef:id(88)}),
   register:async(q,proof)=>{proof.useVerifiedIdentity();return {...q,providerBindingRef:id(77),observedAtMs:x.now,expiresAtMs:x.now+1000};},
   claim:async q=>({...q,observedAtMs:x.now,expiresAtMs:x.now+1000})}});
  const c=command(),cap=await binder.prepare(TOKEN,c),claim=await binder.claim(cap,TOKEN,c);assert.equal(claim.state,'REVIEW_BOUND_CLAIM');
  const f=Object.fromEntries(revisionKeys.map(k=>[k,x.row[k]??x.version[k]]));
  const values=write?[id(1),id(2),c.p_token_expires_at,id(4),id(3),id(3),id(88),id(7),id(6),id(8),id(9),id(5),'resolving',c.p_arguments.p_event_summary,7,f]:[id(1),id(2),c.p_token_expires_at,id(4),id(3),id(3),id(88),7,f];
  advance=true;
  assert.equal((await binder.transport(claim,TOKEN,c,{text:write?WRITE_SQL:READ_SQL,values,readOnly:!write})).state,'HELD_BOUND_SQL_REQUEST');
 }
});
