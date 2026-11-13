'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {harness,response,settle,TOKEN}=require('../founder-journey-20261112-v1/dom-harness.cjs');
const baseline=process.execArgv.includes('--conditions=baseline'),g=require('./compose.cjs').build({baseline}).generated;
const session={account_id:'00000000-0000-4000-8000-000000000001',member_id:'00000000-0000-4000-8000-000000000002',role:'owner'};
// Synthetic response DTOs test UI consistency, never provider authentication.
for(const kind of ['properties','stays'])test(kind+' response from a changed account/member/role cannot populate the prior panel',async()=>{
 for(const change of [{account_id:'00000000-0000-4000-8000-000000000003'},{member_id:'00000000-0000-4000-8000-000000000004'},{role:'co_manager'},null]){
  const h=harness(g['manager/manager-auth.js'],{token:'FICTIONAL_NOT_JWT',fetcher:async url=>{
   if(url.endsWith('/session'))return response(200,{ok:true,session:{...session}});
   const field=url.endsWith('/properties')?'properties':'stays';
   if(field!==kind)return response(503,{ok:false,error:'HELD'});
   return response(200,{ok:true,session:change===null?null:{...session,...change},[field]:[]});
  }});await settle();assert.ok(h.classes.has('manager-auth-pending'));assert.equal(h.storage.has(TOKEN),false);
  for(const list of h.lists.values())assert.equal(list.children.length,0);
  assert.match(h.node('manager-auth-status').textContent,/contexto del panel/);
 }
});
test('matching read DTOs preserve the reviewed UI context without authorizing mutations',async()=>{
 const h=harness(g['manager/manager-auth.js'],{token:'FICTIONAL_NOT_JWT',fetcher:async url=>response(200,{ok:true,session:{...session},...(url.endsWith('/properties')?{properties:[]}:url.endsWith('/stays')?{stays:[]}: {})})});
 await settle();assert.equal(h.classes.has('manager-auth-pending'),false);assert.equal(h.calls.length,3);assert.ok(h.calls.every(x=>x.options.method==='GET'));
});
test('403 from requests, incidents and knowledge remains a permission denial at the shared Auth consumer',async()=>{
 for(const name of ['requests','incidents','knowledge']){
  const h=harness(g['manager/manager-auth.js']);await settle();h.storage.set(TOKEN,'FICTIONAL_NOT_JWT');h.classes.delete('manager-auth-pending');
  h.context.CustomEvent=class extends Event{constructor(type,options){super(type);this.detail=options.detail}};
  const src=g['manager/manager-'+name+'.js'];
  const fn=src.match(/  async function fetchManager\(url, options\) \{[\s\S]*?\n  \}/)?.[0];assert.ok(fn);
  h.context.fetch=async()=>response(403,{ok:false,error:'MANAGER_ACCESS_DENIED'});
  h.context.readSectionToken=()=>h.storage.get(TOKEN);h.context.loadSequence=1;
  await vm.runInContext('('+fn+")('https://fictional-backend.invalid/section',{headers:{Authorization:'Bearer FICTIONAL_NOT_JWT'}})",h.context);
  assert.match(h.node('manager-auth-status').textContent,/permisos vigentes/);assert.doesNotMatch(h.node('manager-auth-status').textContent,/sesión dejó|venció/);
  assert.ok(h.classes.has('manager-auth-pending'));assert.equal(h.storage.has(TOKEN),false);
 }
});
