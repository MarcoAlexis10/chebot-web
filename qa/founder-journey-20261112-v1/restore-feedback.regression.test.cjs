// Three existing directly affected restore cases; not new tests. Original SHA256 ff11b922457cff270e0a660f2eacddbd641b9313c826bfb845ad80894219002d
'use strict';
// Executes the COMPLETE actual generated auth JS in a VM with a simulated DOM
// and explicit transport outcomes. This is NOT a Chromium/CORS test.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=require('./compose.cjs').compose().generated['manager/manager-auth.js'];
const TOKEN='chebot_manager_preview_access_token';
async function runRestore(outcome){
 const classes=new Set(['manager-auth-pending']);
 const storage=new Map([[TOKEN,'FICTIONAL_NOT_A_JWT']]),nodes=new Map(),calls=[];
 const makeNode=()=>({value:'',type:'password',hidden:false,disabled:false,textContent:'',style:{},
  addEventListener(){},setAttribute(){},focus(){},replaceChildren(){},appendChild(){},append(){}});
 const node=id=>{if(!nodes.has(id))nodes.set(id,makeNode());return nodes.get(id);};
 let clears=0;const list={replaceChildren(){clears++;},appendChild(){}};
 const context={URL,Date,Event,AbortController,MutationObserver:class{observe(){}},
  setTimeout:()=>1,clearTimeout(){},
  document:{getElementById:node,body:{classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)}},
   querySelector:()=>list,querySelectorAll:()=>[],createElement:makeNode},
  window:{addEventListener(){},dispatchEvent(){}},
  sessionStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  fetch:async(url,options)=>{
   calls.push({url,method:options.method});
   assert.equal(url,'https://fictional-api.example.invalid/api/concierge/manager/session');
   assert.equal(options.method,'GET');
   if(outcome==='network-unknown')throw new TypeError('FICTIONAL_FETCH_UNREADABLE');
   const status=outcome==='http-held'?503:401;
   return {status,ok:false,json:async()=>({ok:false,error:status===503?'MANAGER_OPERATIONS_NOT_RELEASED':'AUTH_SESSION_REVOKED'})};
  }};
 vm.runInNewContext(source,context,{timeout:1000});
 for(let i=0;i<40;i++)await Promise.resolve();
 assert.equal(calls.length,1);assert.equal(classes.has('manager-auth-pending'),true);
 assert.equal(storage.has(TOKEN),false);assert.ok(clears>0);
 return node('manager-auth-status').textContent;
}
test('unreadable fetch does not claim session expiry or diagnose CORS; private panel stays closed',async()=>{
 const message=await runRestore('network-unknown');
 assert.match(message,/No pudimos comprobar tu sesión/);
 assert.doesNotMatch(message,/venció|expir|CORS/i);
});
test('readable HTTP 503 HELD does not claim an expired session or reopen private data',async()=>{
 const message=await runRestore('http-held');
 assert.match(message,/No pudimos comprobar tu sesión/);
 assert.doesNotMatch(message,/venció|expir/i);
});
test('explicit readable HTTP 401 retains the existing authorization-denial message',async()=>{
 const message=await runRestore('http-denied');
 assert.match(message,/La sesión dejó de estar autorizada/);
});
