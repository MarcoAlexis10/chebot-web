'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {harness,response,settle,TOKEN}=require('../founder-journey-20261112-v1/dom-harness.cjs');
const baseline=process.execArgv.includes('--conditions=baseline'),g=require('./compose.cjs').build({baseline}).generated;
const session={account_id:'00000000-0000-4000-8000-000000000001',member_id:'00000000-0000-4000-8000-000000000002',role:'owner'};
for(const kind of ['requests','incidents','knowledge'])test(kind+' metadata must match the Auth view context before rendering',async()=>{
 for(const change of [{account_id:'00000000-0000-4000-8000-000000000003'},{member_id:'00000000-0000-4000-8000-000000000004'},{member_role:'co_manager'},null]){
  const h=harness(g['manager/manager-auth.js'],{token:'FICTIONAL_NOT_JWT',fetcher:async url=>response(200,{ok:true,session:{...session},...(url.endsWith('/properties')?{properties:[]}:url.endsWith('/stays')?{stays:[]}: {})})});await settle();assert.equal(h.classes.has('manager-auth-pending'),false);
  h.context.CustomEvent=class extends Event{constructor(t,o){super(t);this.detail=o.detail}};
  const original=h.context.document.getElementById;h.context.document.getElementById=id=>id==='manager-'+kind+'-list'?h.lists.get('#'+id):original(id);
  h.context.fetch=async()=>response(200,{ok:true,[kind]:[],meta:change===null?null:{account_id:session.account_id,member_id:session.member_id,member_role:session.role,count:0,...change}});
  vm.runInContext(g['manager/manager-'+kind+'.js'],h.context);await settle();
  assert.ok(h.classes.has('manager-auth-pending'));assert.equal(h.storage.has(TOKEN),false);assert.match(h.node('manager-auth-status').textContent,/contexto del panel/);
  for(const list of h.lists.values())assert.equal(list.children.length,0);
 }
});
test('incident learning enrichment cannot import a receipt from a changed account',async()=>{
 const h=harness(g['manager/manager-auth.js'],{token:'FICTIONAL_NOT_JWT',fetcher:async url=>response(200,{ok:true,session:{...session},...(url.endsWith('/properties')?{properties:[]}:url.endsWith('/stays')?{stays:[]}: {})})});await settle();
 h.context.CustomEvent=class extends Event{constructor(t,o){super(t);this.detail=o.detail}};
 const meta={account_id:session.account_id,member_id:session.member_id,member_role:session.role,count:1};let reads=0;
 h.context.fetch=async()=>{reads++;return reads===1?response(200,{ok:true,meta,incidents:[{id:'SYNTHETIC_INCIDENT',property_id:'SYNTHETIC_PROPERTY',status:'learning_pending',applied_knowledge:{knowledge_key:'SYNTHETIC_KEY'}}]}):response(200,{ok:true,meta:{...meta,account_id:'00000000-0000-4000-8000-000000000003'},knowledge:[]})};
 Object.assign(h.context,{loadSequence:4,readSectionToken:()=>h.storage.get(TOKEN),BACKEND_INCIDENTS_URL:'https://fictional-backend.invalid/incidents',BACKEND_KNOWLEDGE_URL:'https://fictional-backend.invalid/knowledge'});
 const source=g['manager/manager-incidents.js'];
 const extract=name=>{const start=source.indexOf('  async function '+name+'('),end=source.indexOf('\n  }',start);assert.ok(start>=0&&end>start);return source.slice(start,end+4)};
 vm.runInContext(extract('fetchManager')+'\n'+extract('loadManagerIncidents'),h.context);
 const result=await vm.runInContext("loadManagerIncidents('FICTIONAL_NOT_JWT')",h.context);assert.equal(result.length,0);
 assert.equal(reads,2);assert.ok(h.classes.has('manager-auth-pending'));assert.equal(h.storage.has(TOKEN),false);
});
test('compatible section metadata remains displayable; a late prior-session response cannot close a newer view',async()=>{
 for(const kind of ['requests','incidents','knowledge']){
  for(const stale of [false,true]){
   const h=harness(g['manager/manager-auth.js'],{token:'FICTIONAL_NOT_JWT',fetcher:async url=>response(200,{ok:true,session:{...session},...(url.endsWith('/properties')?{properties:[]}:url.endsWith('/stays')?{stays:[]}: {})})});await settle();
   h.context.CustomEvent=class extends Event{constructor(t,o){super(t);this.detail=o.detail}};
   const original=h.context.document.getElementById;h.context.document.getElementById=id=>id==='manager-'+kind+'-list'?h.lists.get('#'+id):original(id);
   let release;h.context.fetch=()=>new Promise(r=>{release=r});vm.runInContext(g['manager/manager-'+kind+'.js'],h.context);
   if(stale)h.storage.set(TOKEN,'FICTIONAL_NEW_SESSION');
   release(response(200,{ok:true,[kind]:[],meta:{account_id:session.account_id,member_id:session.member_id,member_role:stale?'co_manager':session.role,count:0}}));await settle();
   assert.equal(h.classes.has('manager-auth-pending'),false);assert.equal(h.storage.get(TOKEN),stale?'FICTIONAL_NEW_SESSION':'FICTIONAL_NOT_JWT');
   assert.equal(h.lists.get('#manager-'+kind+'-list').children.length,stale?0:1);
  }
 }
});
