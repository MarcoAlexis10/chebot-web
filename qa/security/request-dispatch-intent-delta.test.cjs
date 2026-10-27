const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),TOKEN='chebot_manager_preview_access_token',ID='11111111-1111-4111-8111-111111111111',REVIEW='chebot_manager_request_review_v1:'+ID;
const reply=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
const success=decision=>reply({ok:true,decision:{request_id:ID,resulting_status:decision}});
const settle=async()=>{for(let i=0;i<35;i++)await Promise.resolve();};
function generated(){
 let js='';const config={apiUrl:s=>'https://api.example.invalid/api/concierge/manager/'+s};
 const context={__dirname:'/fixture',console:{log(){}},require:n=>n==='path'?path:n==='./manager-build-config.cjs'?{managerBuildConfig:()=>config}:n==='fs'?{existsSync:()=>true,readFileSync:()=>js,writeFileSync:(p,s)=>{if(p.endsWith('manager-requests.js'))js=s;}}:assert.fail(n)};
 const base=fs.readFileSync(path.join(root,'manager-requests-v1.js'),'utf8');vm.runInNewContext(base.slice(0,base.indexOf('let html = fs.readFileSync')),context);
 vm.runInNewContext(fs.readFileSync(path.join(root,'manager-request-actions-v1.js'),'utf8'),{...context});return js;
}
const browser=generated();
function harness({storage=new Map([[TOKEN,'FICTIONAL_TOKEN']]),fetcher,storageFailure=false,silentStorageFailure=false}={}){
 const nodes=new Map(),events=new Map(),calls=[],alerts=[];
 const element=tag=>({tag,children:[],style:{},disabled:false,hidden:false,textContent:'',listeners:{},append(...xs){this.children.push(...xs);},appendChild(x){this.children.push(x);},replaceChildren(...xs){this.children=xs;},addEventListener(k,f){this.listeners[k]=f;},querySelector(){return null;},querySelectorAll(){return [];}});
 const node=id=>{if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id);};
 const pending={id:ID,status:'waiting_manager',request_type:'other',property:{internal_name:'FICTIONAL'},created_at:'2026-10-26T00:00:00Z'};
 vm.runInNewContext(browser,{URL,Date,Intl,Event,AbortController,setTimeout,clearTimeout,document:{getElementById:node,createElement:element,querySelector:()=>null,querySelectorAll:()=>[],body:{classList:{contains:()=>false}}},
  sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(storageFailure)throw Error('FICTIONAL_QUOTA');if(!silentStorageFailure)storage.set(k,v);},removeItem:k=>storage.delete(k)},
  MutationObserver:class{observe(){}},window:{confirm:()=>true,alert:x=>alerts.push(x),dispatchEvent(){},addEventListener:(k,f)=>events.set(k,f)},
  fetch:async(url,o)=>{assert.ok(url.startsWith('https://api.example.invalid/'));calls.push({url,method:o.method});return o.method==='GET'?reply({ok:true,requests:[pending]}):fetcher?fetcher(url,o):success(JSON.parse(o.body).decision);}});
 const all=parent=>[parent,...parent.children.flatMap(all)];
 const button=label=>all(node('manager-requests-list')).find(n=>n.tag==='button'&&n.textContent===label);
 return {storage,calls,alerts,node,button,posts:()=>calls.filter(x=>x.method==='POST').length,gets:()=>calls.filter(x=>x.method==='GET').length,click:label=>button(label).listeners.click(),emit:k=>events.get(k)?.()};
}
test('request intent is persisted before pending POST and survives a simulated page reload',async()=>{
 const h=harness({fetcher:()=>new Promise(()=>{})});await settle();h.click('Aprobar');await settle();assert.equal(h.storage.get(REVIEW),'1');assert.equal(h.posts(),1);
 const reload=harness({storage:h.storage});await settle();assert.equal(reload.button('Aprobar').disabled,true);await reload.click('Aprobar');assert.equal(reload.posts(),0);
});
test('pending response body cannot reopen the same decision after reload',async()=>{
 const h=harness({fetcher:async()=>({ok:true,status:200,json:()=>new Promise(()=>{})})});await settle();h.click('Aprobar');await settle();
 const reload=harness({storage:h.storage});await settle();await reload.click('Rechazar');assert.equal(reload.posts(),0);
});
for(const kind of ['throw','silent'])test(`unrecorded review intent (${kind}) prevents the POST`,async()=>{
 const h=harness({storageFailure:kind==='throw',silentStorageFailure:kind==='silent'});await settle();await h.click('Aprobar');assert.equal(h.posts(),0);assert.equal(h.button('Aprobar').disabled,true);
});
test('HTTP200 with reconciliation required freezes the decision without another read or POST',async()=>{
 const h=harness({fetcher:async()=>reply({ok:true,reconciliation_required:true,decision:{request_id:ID,resulting_status:'approved'}})});await settle();await h.click('Aprobar');await h.click('Aprobar');
 assert.equal(h.posts(),1);assert.equal(h.gets(),1);assert.equal(h.storage.get(REVIEW),'1');
});
test('opposite decision receipt is uncertain rather than a successful action',async()=>{
 const h=harness({fetcher:async()=>success('rejected')});await settle();await h.click('Aprobar');assert.equal(h.gets(),1);assert.equal(h.storage.get(REVIEW),'1');
});
test('an explicit known pre-dispatch permission denial permits a deliberate corrected submit',async()=>{
 let posts=0;const h=harness({fetcher:async()=>++posts===1?reply({ok:false,error:'MANAGER_PERMISSION_DENIED'},403):success('approved')});await settle();await h.click('Aprobar');assert.equal(h.storage.has(REVIEW),false);assert.equal(h.button('Aprobar').disabled,false);
 await h.click('Aprobar');assert.equal(h.posts(),2);
});
test('an unclassified client error retains the intent and never authorizes replay',async()=>{
 const h=harness({fetcher:async()=>reply({ok:false,error:'UNREVIEWED_PROXY_ERROR'},403)});await settle();await h.click('Aprobar');await h.click('Aprobar');assert.equal(h.posts(),1);assert.equal(h.storage.get(REVIEW),'1');
});
test('confirmed response followed by a stale pending list cannot enable the same action again',async()=>{
 const h=harness();await settle();await h.click('Aprobar');assert.equal(h.gets(),2);assert.equal(h.button('Aprobar').disabled,true);await h.click('Aprobar');assert.equal(h.posts(),1);
});
test('late decision receipt from a replaced session cannot refresh or reopen its controls',async()=>{
 let release;const h=harness({fetcher:()=>new Promise(r=>release=r)});await settle();const pending=h.click('Aprobar');await settle();h.storage.set(TOKEN,'FICTIONAL_REPLACEMENT');release(success('approved'));await pending;
 assert.equal(h.gets(),1);assert.equal(h.storage.get(REVIEW),'1');assert.equal(h.button('Aprobar').disabled,true);
});
test('pagehide invalidates late decision results while preserving the persisted review intent',async()=>{
 let release;const h=harness({fetcher:()=>new Promise(r=>release=r)});await settle();const pending=h.click('Aprobar');await settle();h.emit('pagehide');release(success('approved'));await pending;
 assert.equal(h.gets(),1);assert.equal(h.storage.get(REVIEW),'1');assert.equal(h.button('Aprobar').disabled,true);
});
