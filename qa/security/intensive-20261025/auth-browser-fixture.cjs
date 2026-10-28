const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
function browserSource(file){
 const source=fs.readFileSync(path.join(root,file),'utf8');let browser;
 vm.runInNewContext(source.slice(0,source.indexOf('let html = fs.readFileSync')),{__dirname:'/fictional',console:{log(){}},require(name){
  if(name==='fs')return {existsSync:()=>true,writeFileSync:(name,text)=>{if(name.endsWith('.js'))browser=text;}};
  if(name==='path')return path;
  if(name==='./manager-build-config.cjs')return {managerBuildConfig:()=>({supabaseUrl:'https://fictional-auth.example.invalid',publishableKey:'FICTIONAL_PUBLIC',apiUrl:n=>'https://fictional-api.example.invalid/'+n,recoveryUrl:'https://fictional-web.example.invalid/reset/'})};
  throw Error('UNEXPECTED_IMPORT');
 }});assert.equal(typeof browser,'string');return browser;
}
const TOKEN='chebot_manager_preview_access_token';
const json=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
async function settle(){for(let i=0;i<30;i++)await Promise.resolve();}
function harness(fetcher){
 const state={getFails:false};const classes=new Set(['manager-auth-pending']),storage=new Map([[TOKEN,'FICTIONAL_TOKEN']]),nodes=new Map(),events=new Map(),calls=[];
 function node(id){if(!nodes.has(id))nodes.set(id,{style:{},children:[],replaceChildren(...children){this.children=children;},append(...children){this.children.push(...children);},appendChild(child){this.children.push(child);},value:'',hidden:false,disabled:false,textContent:'',listeners:{},addEventListener(k,f){this.listeners[k]=f;},setAttribute(){},focus(){},checkValidity(){return true;}});return nodes.get(id);}
 const lists=new Map(['#propiedades .list','#estadias .list','#manager-knowledge-list','#manager-requests-list','#manager-incidents-list'].map(k=>[k,{cleared:0,replaceChildren(){this.cleared++;},appendChild(){}}]));
 const window={addEventListener:(k,f)=>{if(!events.has(k))events.set(k,[]);events.get(k).push(f);},dispatchEvent:event=>{for(const f of events.get(event.type)||[])f(event);return true;}};
 const context={AbortController,Event,URL,Date,console:{log(){assert.fail('NO_LOGGING');}},document:{getElementById:node,body:{classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)}},querySelector:k=>lists.get(k)||null,querySelectorAll:()=>[],createElement:()=>({style:{},children:[],replaceChildren(...children){this.children=children;},append(...children){this.children.push(...children);},appendChild(child){this.children.push(child);},classList:{add(){}},addEventListener(){},setAttribute(){}})},
 sessionStorage:{getItem:k=>{if(state.getFails)throw Error('FICTIONAL_STORAGE_FAILURE');return storage.get(k)||null;},setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},window,
 MutationObserver:class{observe(){}},setTimeout:()=>1,clearTimeout(){},fetch:(url,options)=>{assert.ok(url.startsWith('https://fictional-'));calls.push({url,options});return fetcher?fetcher(url,options):Promise.resolve(json({ok:true,session:{role:'manager'},properties:[],stays:[]}));}};
 vm.createContext(context);vm.runInContext(browserSource('manager-auth-v1.js'),context);
 return {state,classes,storage,calls,node,lists,window,loadPrivate:file=>vm.runInContext(browserSource(file),context),emit:(type,data={})=>{for(const f of events.get(type)||[])f(data);}};
}
module.exports={browserSource,harness,json,settle,TOKEN};
