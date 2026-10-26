const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../manager-signup-v1.js'),'utf8');
const reply=(body,status=202)=>({ok:status>=200&&status<300,status,json:async()=>body});
const accepted=()=>reply({ok:true,code:'PENDING_OWNER_APPROVAL'});
async function settle(){for(let i=0;i<30;i++)await Promise.resolve();}
function harness(fetcher,{legal=true}={}){
 let html;vm.runInNewContext(source,{__dirname:'/fictional',console:{log(){}},require(name){
  if(name==='./manager-build-config.cjs')return {managerBuildConfig:()=>({apiOrigin:'https://api.example.invalid'})};
  // VM-only dependency stub, no manifest, published document or real gate changed.
  if(name==='./manager-legal-publication-gate-v1.cjs')return {legalPublicationGate:()=>({approved:legal})};
  if(name==='node:fs')return {mkdirSync(){},writeFileSync:(p,c)=>{html=c;}};
  if(name==='node:path')return path;throw Error('UNEXPECTED_IMPORT');
 }});
 const nodes=new Map(),events=new Map(),calls=[];
 function node(id){if(!nodes.has(id))nodes.set(id,{hidden:['invite-form','completed','no-invite','legal-pending'].includes(id),disabled:false,value:['managerName','email','businessName'].includes(id)?'FICTIONAL':'',checked:true,textContent:'',listeners:{},addEventListener:(k,f)=>{node(id).listeners[k]=f;},reportValidity:()=>true,reset(){}});return nodes.get(id);}
 const window={location:{hash:'#invite='+'a'.repeat(43),pathname:'/manager/activar/'},history:{replaceState(){}},addEventListener:(k,f)=>{if(!events.has(k))events.set(k,[]);events.get(k).push(f);}};
 vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{URLSearchParams,AbortController,setTimeout:()=>1,clearTimeout(){},window,document:{getElementById:node},fetch:(url,options)=>{assert.equal(url,'https://api.example.invalid/api/concierge/manager/signup-request');calls.push({url,options});return fetcher(url,options);}});
 return {node,calls,submit:()=>node('invite-form').listeners.submit?.({preventDefault(){}}),emit:(type,event={})=>{for(const f of events.get(type)||[])f(event);}};
}
test('signup suppresses duplicate submits while the original request is pending',async()=>{
 let release;const h=harness(()=>new Promise(r=>release=r)),first=h.submit();h.submit();assert.equal(h.calls.length,1);release(accepted());await first;
 assert.equal(h.node('completed').hidden,false);assert.equal(h.node('invite-form').hidden,true);assert.equal(h.node('email').value,'');
});
test('signup transport uncertainty conceals private fields and prevents a second POST',async()=>{
 const h=harness(async()=>{throw Error('FICTIONAL_ACK_LOST');});await h.submit();await h.submit();assert.equal(h.calls.length,1);assert.equal(h.node('submit').disabled,true);assert.equal(h.node('email').value,'');assert.match(h.node('form-status').textContent,/No repitas/);
});
test('an inconsistent 202 receipt does not certify success or enable retry',async()=>{
 const h=harness(async()=>reply({ok:false,code:'PENDING_OWNER_APPROVAL'}));await h.submit();assert.equal(h.node('completed').hidden,true);assert.equal(h.node('submit').disabled,true);
});
test('pagehide clears drafts and discards a late successful response',async()=>{
 let release;const h=harness(()=>new Promise(r=>release=r)),pending=h.submit();h.emit('pagehide');assert.equal(h.node('email').value,'');assert.equal(h.calls[0].options.signal.aborted,true);release(accepted());await pending;assert.equal(h.node('completed').hidden,true);assert.equal(h.node('invite-form').hidden,true);
});
test('bfcache restoration cannot reopen a private draft or dispatch again',async()=>{
 const h=harness(async()=>accepted());h.emit('pagehide');h.emit('pageshow',{persisted:true});await h.submit();assert.equal(h.calls.length,0);assert.equal(h.node('invite-form').hidden,true);assert.equal(h.node('privacy').checked,false);
});
test('only an explicit pre-dispatch validation denial permits correction',async()=>{
 let count=0;const h=harness(async()=>++count===1?reply({ok:false,code:'INVALID_REQUEST'},400):accepted());await h.submit();assert.equal(h.node('submit').disabled,false);await h.submit();assert.equal(h.calls.length,2);assert.equal(h.node('completed').hidden,false);
});
test('the held legal gate keeps the signup form closed and dispatches nothing',async()=>{
 const h=harness(async()=>{assert.fail('HELD_SIGNUP_MUST_NOT_SEND');},{legal:false});await h.submit();assert.equal(h.calls.length,0);assert.equal(h.node('invite-form').hidden,true);assert.equal(h.node('legal-pending').hidden,false);
});
