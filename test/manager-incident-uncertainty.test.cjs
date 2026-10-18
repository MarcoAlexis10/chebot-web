const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',KEY='chebot_manager_incident_review_v1:'+ID;
class Element{
 constructor(tag){Object.assign(this,{tag,children:[],style:{},dataset:{},listeners:{},disabled:false,textContent:''});this.classList={contains:()=>false,add(){}};}
 append(...nodes){this.children.push(...nodes);}appendChild(node){this.append(node);return node;}replaceChildren(...nodes){this.children=[...nodes];}
 addEventListener(type,fn){this.listeners[type]=fn;}setAttribute(){}
 querySelectorAll(tag){return this.children.flatMap(node=>[node,...node.querySelectorAll(tag)]).filter(node=>node.tag===tag);}
}
const later=()=>new Promise(resolve=>setImmediate(resolve));
async function panel(post,{store=new Map([['chebot_manager_preview_access_token','FICTIONAL-JWT']]),status='resolving',refreshFails=false,refreshStatus=status}={}){
 const list=new Element('div');let posts=0,gets=0;const alerts=[];
 const fetch=async(url,options={})=>{if(options.method==='POST'){posts++;return post(url,options);}gets++;if(refreshFails&&gets>1)throw Error('fictional refresh failure');return new Response(JSON.stringify({ok:true,incidents:[{id:ID,status:gets>1?refreshStatus:status,category:'wifi',severity:'low',summary:'Fictional Wi-Fi incident'}]}));};
 const context={fetch,Date,Intl,MutationObserver:class{observe(){}},sessionStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
 window:{addEventListener(){},confirm:()=>true,prompt:()=> 'Fictional instruction',alert:message=>alerts.push(message),location:{reload(){}}},
 document:{body:{classList:{contains:()=>false}},createElement:tag=>new Element(tag),getElementById:id=>id==='manager-incidents-list'?list:null,querySelector:()=>list,querySelectorAll:()=>[]}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','dist','manager','manager-incidents.js'),'utf8'),context);await later();
 return{store,list,buttons:list.querySelectorAll('button'),posts:()=>posts,alerts};
}
test('lost incident response freezes all controls across reload and cannot send twice',async()=>{
 const a=await panel(async()=>{throw Error('fictional response loss after commit');});
 await a.buttons[0].listeners.click();assert.equal(a.posts(),1);assert.equal(a.store.get(KEY),'1');assert.ok(a.buttons.every(button=>button.disabled));
 await a.buttons[0].listeners.click();assert.equal(a.posts(),1);
 const reload=await panel(async()=>assert.fail('must not resubmit'),{store:a.store});assert.ok(reload.buttons.every(button=>button.disabled));await reload.buttons[0].listeners.click();assert.equal(reload.posts(),0);
});
for(const [label,body,status] of [['malformed success',{ok:true},200],['unknown server failure',{ok:false,error:'INTERNAL'},503],['wrong committed resource',{ok:true,incident:{incident_id:'wrong',resulting_status:'waiting_guest'}},200]])test(label+' requires incident reconciliation',async()=>{
 const a=await panel(async()=>new Response(JSON.stringify(body),{status}));await a.buttons[0].listeners.click();assert.equal(a.store.get(KEY),'1');assert.ok(a.buttons.every(button=>button.disabled));
});
test('confirmed incident mutation with failed refresh stays frozen',async()=>{
 const a=await panel(async()=>new Response(JSON.stringify({ok:true,incident:{incident_id:ID,resulting_status:'waiting_guest'}})),{refreshFails:true});await a.buttons[0].listeners.click();assert.equal(a.store.get(KEY),'1');assert.equal(a.posts(),1);
});
test('a pending incident mutation suppresses a second click',async()=>{
 let finish;const gate=new Promise(resolve=>{finish=resolve;});const a=await panel(async()=>{await gate;throw Error('fictional timeout');});const first=a.buttons[0].listeners.click();await later();await a.buttons[0].listeners.click();assert.equal(a.posts(),1);finish();await first;
});
test('known permission rejection permits a safe retry without an uncertainty marker',async()=>{
 const a=await panel(async()=>new Response(JSON.stringify({ok:false,error:'MANAGER_PERMISSION_DENIED'}),{status:403}));await a.buttons[0].listeners.click();assert.equal(a.store.has(KEY),false);assert.ok(a.buttons.every(button=>!button.disabled));await a.buttons[0].listeners.click();assert.equal(a.posts(),2);
});
test('unknown learning proposal outcome also freezes incident actions',async()=>{
 const a=await panel(async()=>{throw Error('fictional lost proposal');},{status:'learning_pending'});const propose=a.buttons.find(button=>button.textContent==='Generar propuesta');assert.ok(propose);await propose.listeners.click();assert.equal(a.store.get(KEY),'1');assert.ok(a.buttons.every(button=>button.disabled));
});
test('unknown provider acceptance freezes even when the state mutation returned success',async()=>{
 const a=await panel(async()=>new Response(JSON.stringify({ok:true,incident:{incident_id:ID,resulting_status:'waiting_guest'},notification:{sent:false,status:'WHATSAPP_UNAVAILABLE'}})));await a.buttons[0].listeners.click();assert.equal(a.store.get(KEY),'1');assert.equal(a.posts(),1);assert.ok(a.buttons.every(button=>button.disabled));
});
test('a valid state mutation with a known privacy hold refreshes without an uncertainty lock',async()=>{
 const a=await panel(async()=>new Response(JSON.stringify({ok:true,incident:{incident_id:ID,resulting_status:'waiting_guest'},notification:{sent:false,status:'notification_authority_required'}})),{refreshStatus:'waiting_guest'});await a.buttons[0].listeners.click();assert.equal(a.store.has(KEY),false);assert.equal(a.posts(),1);assert.ok(a.list.querySelectorAll('button').some(button=>button.textContent==='Retomar'&&!button.disabled));
});
