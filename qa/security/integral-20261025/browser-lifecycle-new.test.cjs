const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../../manager-auth-v1.js'),'utf8');let browser;
vm.runInNewContext(source.slice(0,source.indexOf('let html = fs.readFileSync')),{__dirname:'/fictional',console:{log(){}},require(name){
 if(name==='fs')return {existsSync:()=>true,writeFileSync:(name,text)=>{if(name.endsWith('/manager-auth.js'))browser=text;}};
 if(name==='path')return path;
 if(name==='./manager-build-config.cjs')return {managerBuildConfig:()=>({supabaseUrl:'https://fictional-auth.example.invalid',publishableKey:'FICTIONAL_PUBLIC',apiUrl:n=>'https://fictional-api.example.invalid/'+n,recoveryUrl:'https://fictional-web.example.invalid/reset/'})};
 throw Error('UNEXPECTED_IMPORT');
}});
const TOKEN='chebot_manager_preview_access_token',json=b=>({ok:true,json:async()=>b});
async function settle(){for(let i=0;i<20;i++)await Promise.resolve();}
function harness(fetcher){
 const classes=new Set(['manager-auth-pending']),state={getFails:false,removeFails:false},storage=new Map([[TOKEN,'FICTIONAL_TOKEN']]),nodes=new Map(),events=new Map(),calls=[];
 function node(id){if(!nodes.has(id))nodes.set(id,{value:'',hidden:false,disabled:false,textContent:'',listeners:{},addEventListener(k,f){this.listeners[k]=f;},setAttribute(){},focus(){},checkValidity(){return true;}});return nodes.get(id);}
 const lists=new Map(['#propiedades .list','#estadias .list','#manager-knowledge-list','#manager-requests-list','#manager-incidents-list'].map(k=>[k,{cleared:0,replaceChildren(){this.cleared++;},appendChild(){}}]));
 vm.runInNewContext(browser,{AbortController,URL,Date,console:{log(){assert.fail('NO_LOGGING');}},document:{getElementById:node,body:{classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)}},querySelector:k=>lists.get(k)||null,querySelectorAll:()=>[],createElement:()=>({append(){},appendChild(){},classList:{add(){}}})},
  sessionStorage:{getItem:k=>{if(state.getFails)throw Error('PRIVATE_STORAGE_FAILURE');return storage.get(k)||null;},setItem:(k,v)=>storage.set(k,v),removeItem:k=>{if(state.removeFails)throw Error('PRIVATE_STORAGE_FAILURE');storage.delete(k);}},
  window:{addEventListener:(k,f)=>events.set(k,f)},setTimeout:()=>1,clearTimeout(){},fetch:(url,options)=>{assert.ok(url.startsWith('https://fictional-'));calls.push({url,options});return fetcher?fetcher(url,options):Promise.resolve(json({ok:true,session:{role:'manager'},properties:[],stays:[]}));}});
 return {state,classes,storage,calls,node,lists,logout:()=>node('manager-logout').listeners.click(),emit:(k,data={})=>{assert.ok(events.has(k),'missing '+k+' lifecycle handler');return events.get(k)(data);}};
}
test('storage removal failure cannot leave private panel visible after logout',async()=>{
 const h=harness();await settle();assert.equal(h.classes.has('manager-auth-pending'),false);h.state.removeFails=true;
 await assert.doesNotReject(h.logout());assert.ok(h.classes.has('manager-auth-pending'));assert.ok([...h.lists.values()].every(x=>x.cleared>0));
 assert.equal(h.node('manager-login-submit').disabled,true);assert.doesNotMatch(h.node('manager-auth-status').textContent,/PRIVATE_STORAGE_FAILURE/);
});
test('storage read failure cannot prevent local logout concealment',async()=>{
 const h=harness();await settle();h.state.getFails=true;await assert.doesNotReject(h.logout());
 assert.ok(h.classes.has('manager-auth-pending'));assert.equal(h.node('manager-login-submit').disabled,true);
});
test('pagehide removes all private lists before browser back-cache persistence',async()=>{
 const h=harness();await settle();const n=h.calls.length;h.emit('pagehide');assert.ok(h.classes.has('manager-auth-pending'));
 assert.ok([...h.lists.values()].every(x=>x.cleared>0));assert.equal(h.calls.length,n);assert.equal(h.storage.get(TOKEN),'FICTIONAL_TOKEN');
});
test('back-cache restoration remains hidden until a fresh server session check finishes',async()=>{
 let sessions=0,release;const h=harness(url=>{if(url.endsWith('/session')&&++sessions===2)return new Promise(r=>{release=r;});return Promise.resolve(json({ok:true,session:{role:'manager'},properties:[],stays:[]}));});
 await settle();h.emit('pagehide');h.emit('pageshow',{persisted:true});await settle();assert.equal(sessions,2);assert.ok(h.classes.has('manager-auth-pending'));
 release(json({ok:true,session:{role:'manager'}}));await settle();assert.equal(h.classes.has('manager-auth-pending'),false);
});
test('data response from a prior page generation cannot replace a newly verified panel',async()=>{
 let properties=0,release;const h=harness(url=>{if(url.endsWith('/properties')&&++properties===1)return new Promise(r=>{release=r;});return Promise.resolve(json({ok:true,session:{role:'manager'},properties:[],stays:[]}));});
 await settle();h.emit('pagehide');h.emit('pageshow',{persisted:true});await settle();const before=h.lists.get('#propiedades .list').cleared;
 release(json({ok:true,properties:[{property_id:'FICTIONAL_OLD',internal_name:'OLD_GENERATION'}]}));await settle();assert.equal(h.lists.get('#propiedades .list').cleared,before);
});
