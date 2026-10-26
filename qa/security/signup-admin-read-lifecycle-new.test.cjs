const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const TOKEN='chebot_manager_preview_access_token';
const payload={ok:true,applications:[{id:'00000001-0000-4000-8000-000000000000',email_normalized:'fictional-manager@example.invalid',status:'fictional_pending',expires_at:'2099-01-01T00:00:00Z'}]};
const response=(body=payload,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function harness(fetcher){
 let html;vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../../manager-signup-admin-v1.js'),'utf8'),{__dirname:'/fictional',console:{log(){}},require:n=>n==='node:path'?path:n==='./manager-build-config.cjs'?{managerBuildConfig:()=>({apiOrigin:'https://fictional-api.example.invalid'})}:{mkdirSync(){},writeFileSync:(_p,text)=>html=text}});
 const nodes=new Map(),events=new Map(),storage=new Map([[TOKEN,'FICTIONAL_TOKEN']]);
 const element=()=>({hidden:false,disabled:false,value:'',textContent:'',children:[],listeners:{},addEventListener(k,f){this.listeners[k]=f;},appendChild(x){this.children.push(x);},replaceChildren(...xs){this.children=xs;},querySelectorAll(){return [];},reportValidity(){return true;},reset(){}});
 const node=id=>{if(!nodes.has(id)){const x=element();if(['editor','review','refresh','result'].includes(id))x.hidden=true;nodes.set(id,x);}return nodes.get(id);};
 const context={Date,AbortController,setTimeout:()=>1,clearTimeout(){},sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
 document:{getElementById:node,createElement:()=>element(),querySelectorAll:()=>[node('issue-button'),node('refresh'),node('copy-link')]},
 window:{confirm:()=>false,alert(){},addEventListener:(k,f)=>{if(!events.has(k))events.set(k,[]);events.get(k).push(f);}},
 fetch:(url,options)=>{assert.equal(url,'https://fictional-api.example.invalid/api/concierge/manager/signup-admin');return fetcher(options);}};
 vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
 return {node,storage,refresh:()=>node('refresh').listeners.click(),emit:(k,data={})=>{for(const f of events.get(k)||[])f(data);}};
}
test('a denied refresh clears private operator data and any prepared invitation link',async()=>{
 let count=0;const h=harness(async()=>++count===1?response():response({ok:false},401));await settle();assert.equal(h.node('editor').hidden,false);
 h.node('prepared-link').textContent='FICTIONAL_PRIVATE_LINK';h.node('result').hidden=false;
 await h.refresh();assert.equal(h.node('editor').hidden,true);assert.equal(h.node('review').hidden,true);assert.equal(h.node('result').hidden,true);
 assert.equal(h.node('prepared-link').textContent,'');assert.equal(h.node('applications').children.length,0);
});
test('a late GET from a replaced tab session cannot reopen the operator view',async()=>{
 let release;const h=harness(()=>new Promise(r=>release=r));h.storage.set(TOKEN,'FICTIONAL_REPLACED');release(response());await settle();
 assert.equal(h.node('editor').hidden,true);assert.equal(h.node('applications').children.length,0);
});
test('an older denied GET cannot overwrite a newer successful access check',async()=>{
 let release,count=0;const h=harness(()=>++count===1?new Promise(r=>release=r):Promise.resolve(response()));
 await h.refresh();assert.equal(h.node('editor').hidden,false);release(response({ok:false},403));await settle();
 assert.match(h.node('access-status').textContent,/Acceso administrativo verificado/);assert.equal(h.node('editor').hidden,false);
});
test('pagehide clears private data and prevents an in-flight GET from reopening the page',async()=>{
 let release;const h=harness(()=>new Promise(r=>release=r));h.node('prepared-link').textContent='FICTIONAL_PRIVATE_LINK';h.emit('pagehide');release(response());await settle();
 assert.equal(h.node('editor').hidden,true);assert.equal(h.node('prepared-link').textContent,'');assert.equal(h.node('applications').children.length,0);
});
test('successful revalidation preserves the one-time link while retaining current access',async()=>{
 const h=harness(async()=>response());await settle();h.node('prepared-link').textContent='FICTIONAL_ONE_TIME_LINK';h.node('result').hidden=false;
 await h.refresh();assert.equal(h.node('editor').hidden,false);assert.equal(h.node('result').hidden,false);assert.equal(h.node('prepared-link').textContent,'FICTIONAL_ONE_TIME_LINK');
});
test('storage session invalidation immediately clears operator data',async()=>{
 const h=harness(async()=>response());await settle();assert.equal(h.node('editor').hidden,false);
 h.emit('storage',{key:TOKEN,newValue:null});assert.equal(h.node('editor').hidden,true);assert.equal(h.node('applications').children.length,0);
});
test('back-forward restoration requires a new successful access check before showing operator data',async()=>{
 let count=0,release;const h=harness(()=>++count===1?Promise.resolve(response()):new Promise(r=>release=r));await settle();
 h.emit('pagehide');h.emit('pageshow',{persisted:true});assert.equal(h.node('editor').hidden,true);release(response());await settle();assert.equal(h.node('editor').hidden,false);assert.equal(count,2);
});
test('successful invitation preparation remains visible after its automatic access refresh',async()=>{
 const link='https://fictional-manager.example.invalid/manager/activar/#invite=FICTIONAL';let posts=0;
 const h=harness(async options=>options.method==='GET'?response():(posts++,response({ok:true,code:'INVITATION_PREPARED_NOT_SENT',url:link},201)));
 await settle();h.node('invite-email').value='fictional-manager@example.invalid';h.node('issue-confirm').checked=true;
 await h.node('issue-form').listeners.submit({preventDefault(){}});
 assert.equal(posts,1);assert.equal(h.node('prepared-link').textContent,link);assert.equal(h.node('editor').hidden,false);assert.equal(h.node('result').hidden,false);
});
test('uncertain mutation conceals private data and blocks a second dispatch',async()=>{
 let posts=0;const h=harness(async options=>{if(options.method==='GET')return response();posts++;throw Error('FICTIONAL_OUTCOME_UNKNOWN');});await settle();
 h.node('prepared-link').textContent='FICTIONAL_PREVIOUS_LINK';const submit=()=>h.node('issue-form').listeners.submit({preventDefault(){}});
 await submit();await submit();assert.equal(posts,1);assert.equal(h.node('issue-button').disabled,true);assert.equal(h.node('editor').hidden,true);assert.equal(h.node('prepared-link').textContent,'');
});
