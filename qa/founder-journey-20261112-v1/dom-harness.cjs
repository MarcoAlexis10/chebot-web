'use strict';
// DOM/storage/fetch doubles. This is NOT a browser or backend authorization.
const vm=require('node:vm');
const TOKEN='chebot_manager_preview_access_token';
const settle=async()=>{for(let i=0;i<45;i++)await Promise.resolve()};
const response=(status,body)=>({status,ok:status>=200&&status<300,json:async()=>body});
function harness(script,{token=null,fetcher,visible=false}={}){
 const nodes=new Map(),classes=new Set(visible?[]:['manager-auth-pending']),storage=new Map(token?[[TOKEN,token]]:[]),listeners=new Map(),calls=[],timers=new Map();let timerId=0;
 function element(){return {value:'',textContent:'',className:'',hidden:false,disabled:false,type:'',dataset:{},style:{},children:[],listeners:{},isConnected:true,
  addEventListener(t,f){this.listeners[t]=f},setAttribute(k,v){this[k]=v},focus(){},checkValidity(){return true},reportValidity(){return true},
  append(...xs){this.children.push(...xs)},appendChild(x){this.children.push(x)},replaceChildren(...xs){this.children=[...xs]},
  classList:{add(){},remove(){},contains(){return false}}}}
 const node=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)};
 const selectors=['#propiedades .list','#estadias .list','#manager-knowledge-list','#manager-requests-list','#manager-incidents-list'];
 const lists=new Map(selectors.map(s=>[s,element()]));
 const win={addEventListener(t,f){const a=listeners.get(t)||[];a.push(f);listeners.set(t,a)},dispatchEvent(e){for(const f of listeners.get(e.type)||[])f(e);return true},crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000099'},confirm:()=>false,alert(){throw Error('UNEXPECTED_ALERT')}};
 const body={classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)}};
 const ctx={window:win,document:{body,getElementById:node,querySelector:s=>lists.get(s)||null,querySelectorAll:()=>[],createElement:element},
  sessionStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
  AbortController,URLSearchParams,Event,Date,Intl,console:{log(){throw Error('PRIVATE_LOG_FORBIDDEN')}},MutationObserver:class {observe(){}},
  setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),
  fetch(url,options){if(!url.startsWith('https://fictional-'))throw Error('NON_FICTIONAL_FETCH');calls.push({url,options});return fetcher?fetcher(url,options):Promise.reject(Error('NO_POSITIVE_BACKEND_FIXTURE'))}};
 const context=vm.createContext(ctx);vm.runInContext(script,context,{timeout:1000});
 return {node,classes,storage,listeners,lists,calls,timers,context,element,window:win,login:()=>node('manager-login-form').listeners.submit({preventDefault(){}}),dispatch:type=>win.dispatchEvent(new Event(type))};
}
module.exports={harness,response,settle,TOKEN};
