'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {harness,response,settle,TOKEN}=require('../founder-journey-20261112-v1/dom-harness.cjs');
const baseline=process.execArgv.includes('--conditions=baseline'),src=require('./compose.cjs').build({baseline}).generated['manager/manager-knowledge.js'];
function extract(name){const start=src.indexOf('  async function '+name+'('),end=src.indexOf('\n  }',start);assert.ok(start>=0&&end>start);return src.slice(start,end+4);}
for(const stall of ['headers','body'])test('uncertain knowledge decision reaches UNKNOWN after '+stall+' stall even if transport ignores abort',async()=>{
 let release;const h=harness('',{token:'FICTIONAL_NOT_JWT',visible:true,fetcher:()=>stall==='headers'?new Promise(r=>{release=r}):Promise.resolve({status:200,ok:true,json:()=>new Promise(r=>{release=r})})});
 let alerts=0,reloads=0;const pending=new Set();h.window.confirm=()=>true;h.window.alert=()=>{alerts++};
 Object.assign(h.context,{CustomEvent:class extends Event{constructor(t,o){super(t);this.detail=o.detail}},loadSequence:4,knowledgeMutationPending:false,knowledgeUncertain:pending,
  readSectionToken:()=>h.storage.get(TOKEN),needsReview:k=>h.storage.has(k),storeIntent:k=>{h.storage.set(k,'UNKNOWN');return '00000000-0000-4000-8000-000000000009'},clearIntent:k=>h.storage.delete(k),
  BACKEND_KNOWLEDGE_URL:'https://fictional-backend.invalid/knowledge',list:h.element(),validDecision:()=>false,maybeLoadKnowledge:async()=>{reloads++}});
 vm.runInContext(extract('fetchManager')+'\n'+extract('decideKnowledge'),h.context);
 const button=h.element();button.textContent='Aprobar';h.context.button=button;h.context.item={id:'ITEM',version:{id:'VERSION'}};
 let settled=false;const action=vm.runInContext("decideKnowledge(item,'approve',button,'FICTIONAL_NOT_JWT',4)",h.context).then(()=>{settled=true});
 await settle();for(const t of [...h.timers.values()])if(t.ms===8000)t.fn();await settle();
 assert.equal(settled,true,'abort-only mutation remained pending; UNKNOWN was never presented');await action;
 assert.equal(h.context.knowledgeMutationPending,false);assert.ok(pending.has('ITEM:VERSION'));assert.equal(h.storage.get('ITEM:VERSION'),'UNKNOWN');assert.equal(button.disabled,true);assert.equal(alerts,1);assert.equal(reloads,0);assert.equal(h.calls.length,1);
 // A late payload cannot confirm a write or release a persisted uncertainty.
 if(stall==='headers')release(response(401,{ok:false,error:'AUTH_TOKEN_INVALID'}));else release({ok:true,action:'approve'});
 await settle();assert.equal(h.calls.length,1);assert.equal(h.storage.get('ITEM:VERSION'),'UNKNOWN');assert.equal(button.disabled,true);
});
