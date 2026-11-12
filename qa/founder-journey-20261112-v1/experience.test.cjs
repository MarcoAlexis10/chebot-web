'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {compose}=require('./compose.cjs'),{harness,response,settle,TOKEN}=require('./dom-harness.cjs');
const baseline=process.execArgv.includes('--conditions=baseline'),output=compose({baseline}).generated;
test('malformed session receipts never label a manager session verified or start private list reads',async()=>{
 for(const bad of [{},{role:'manager'},[], 'manager',{account_id:'invalid',member_id:'invalid',role:'owner'},{account_id:'00000000-0000-4000-8000-000000000001',member_id:'00000000-0000-4000-8000-000000000002',role:'operator'}]){
  const h=harness(output['manager/manager-auth.js'],{token:'FICTIONAL_BEARER',fetcher:async url=>response(url.endsWith('/session')?200:503,url.endsWith('/session')?{ok:true,session:bad}:{ok:false,error:'HELD'})});await settle();
  assert.ok(h.classes.has('manager-auth-pending'));assert.equal(h.calls.filter(c=>/\/(properties|stays)$/.test(c.url)).length,0);assert.equal(h.storage.has(TOKEN),false);
 }
});
test('service failure and rate limit at sign-in do not accuse the user of an incorrect password or retry',async()=>{
 for(const status of [503,429]){
  const h=harness(output['manager/manager-auth.js'],{fetcher:async()=>response(status,{error:'HELD'})});await settle();await h.login();
  assert.doesNotMatch(h.node('manager-auth-status').textContent,/contraseña incorrect/);assert.ok(h.classes.has('manager-auth-pending'));assert.equal(h.calls.length,1);
  if(status===429)assert.match(h.node('manager-auth-status').textContent,/límite|esperá/i);
 }
});
test('current invitation 401 invalidates visible private UI without clearing uncertain intent or dispatching again',async()=>{
 let invalidate=0;const h=harness('',{token:'FICTIONAL_BEARER',visible:true,fetcher:async()=>response(401,{ok:false,error:'AUTH_TOKEN_INVALID'})});
 h.window.addEventListener('cheveni-manager-session-denied',()=>{invalidate++;h.classes.add('manager-auth-pending')});
 const row=h.element();row.dataset={stayId:'00000000-0000-4000-8000-000000000007',stayStatus:'active',stayCheckout:'2099-01-01T00:00:00Z'};
 h.context.document.querySelectorAll=s=>s==='#estadias .row[data-stay-id]'?[row]:[];
 require('node:vm').runInContext(output['manager/manager-invite.js'],h.context);
 const action=row.children[0],button=action.children[0];await button.listeners.click();await settle();
 assert.equal(invalidate,1);assert.ok(h.classes.has('manager-auth-pending'));assert.equal(h.calls.length,1);assert.equal(h.storage.get('chebot_manager_invite_review_v1:'+row.dataset.stayId),'1');
 await button.listeners.click();assert.equal(h.calls.length,1);
});
test('invitation session denial clears UI at headers even when its JSON body never arrives',async()=>{
 let invalidate=0;const h=harness('',{token:'FICTIONAL_BEARER',visible:true,fetcher:async()=>({status:401,ok:false,json:()=>new Promise(()=>{})})});
 h.window.addEventListener('cheveni-manager-session-denied',()=>{invalidate++;h.classes.add('manager-auth-pending')});
 const row=h.element();row.dataset={stayId:'00000000-0000-4000-8000-000000000008',stayStatus:'active',stayCheckout:'2099-01-01T00:00:00Z'};
 h.context.document.querySelectorAll=s=>s==='#estadias .row[data-stay-id]'?[row]:[];
 require('node:vm').runInContext(output['manager/manager-invite.js'],h.context);
 const button=row.children[0].children[0],pending=button.listeners.click();await settle();assert.equal(invalidate,1);
 const deadline=[...h.timers.values()].find(t=>t.ms===8000);deadline.fn();await pending;assert.equal(h.calls.length,1);assert.equal(h.storage.get('chebot_manager_invite_review_v1:'+row.dataset.stayId),'1');
});
test('read failure renderers never assert that a session is still active without current evidence',()=>{
 const vm=require('node:vm');
 for(const [file,name,selector] of [['manager-auth.js','renderPropertiesError','#propiedades .list'],['manager-auth.js','renderStaysError','#estadias .list'],['manager-requests.js','renderRequestsError','#manager-requests-list'],['manager-incidents.js','renderIncidentsError','#manager-incidents-list']]){
  const h=harness('',{visible:true}),source=output['manager/'+file],fn=source.match(new RegExp('function '+name+'\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}'))?.[0];assert.ok(fn);
  h.context.list=h.lists.get(selector);vm.runInContext('('+fn+')()',h.context);
  const text=h.lists.get(selector).children[0].children.map(n=>n.textContent).join(' ');assert.doesNotMatch(text,/sesión sigue activa/);assert.match(text,/comprobar|verificar/);
 }
});
