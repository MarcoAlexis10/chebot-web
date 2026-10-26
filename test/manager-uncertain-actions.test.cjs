const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const STAY='11111111-1111-4111-8111-111111111111',REQ='22222222-2222-4222-8222-222222222222',INVITE='33333333-3333-4333-8333-333333333333';
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={};this.listeners={};this.disabled=false;this.textContent='';this.classList={add(){},contains(){return false;}};}
 append(...nodes){this.children.push(...nodes);}appendChild(node){this.append(node);return node;}replaceChildren(...nodes){this.children=[...nodes];}setAttribute(){}addEventListener(type,fn){this.listeners[type]=fn;}
 set innerHTML(_){throw Error('unsafe HTML insertion is forbidden');}
}
function controls(root){return root.children.flatMap(c=>[c,...controls(c)]).filter(c=>c.tag==='button');}
const later=()=>new Promise(resolve=>setImmediate(resolve));
function storage(seed){const data=seed||new Map([['chebot_manager_preview_access_token','FICTIONAL-JWT']]);return {data,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
function script(name){return fs.readFileSync(path.join(__dirname,'..','dist','manager',name),'utf8');}
function invite(fetch,store=storage()){
 const row=new Element('article');Object.assign(row.dataset,{stayId:STAY,stayStatus:'active',stayCheckout:'2099-01-01T00:00:00Z'});const list=new Element('div');list.append(row);
 const context={sessionStorage:store,fetch,Date,AbortController,setTimeout:()=>1,clearTimeout(){},MutationObserver:class{observe(){}},document:{createElement:t=>new Element(t),querySelector:()=>list,querySelectorAll:()=>[row]}};
 vm.runInNewContext(script('manager-invite.js'),context);return {row,button:controls(row)[0],store};
}
async function requests(post,{store=storage(),refreshFails=false}={}){
 const list=new Element('div'),alerts=[];let gets=0,posts=0;
 const item={id:REQ,status:'new',request_type:'early_checkin',property_internal_name:'Fictional apartment',requested_at_time:'2099-01-01T12:00:00Z'};
 const fetch=async(url,options={})=>{if(options.method==='POST'){posts++;return post(url,options);}gets++;if(refreshFails&&gets>1)throw Error('fictional refresh failure');return new Response(JSON.stringify({ok:true,requests:[item]}));};
 const context={sessionStorage:store,fetch,Date,Intl,MutationObserver:class{observe(){}},window:{addEventListener(){},confirm:()=>true,alert:m=>alerts.push(m)},document:{body:{classList:{contains:()=>false}},getElementById:id=>id==='manager-requests-list'?list:null,querySelector:()=>list,querySelectorAll:()=>[],createElement:t=>new Element(t)}};
 vm.runInNewContext(script('manager-requests.js'),context);await later();return {list,buttons:controls(list),store,alerts,posts:()=>posts};
}
test('invite transport timeout freezes the action across a rendered page reload',async()=>{
 let calls=0;const fetch=async()=>{calls++;throw Error('fictional lost response after server commit');};const a=invite(fetch);
 await a.button.listeners.click();assert.equal(calls,1);assert.equal(a.button.disabled,true);assert.match(a.button.textContent,/revisión/);
 await a.button.listeners.click();assert.equal(calls,1);const reload=invite(fetch,a.store);assert.equal(reload.button.disabled,true);await reload.button.listeners.click();assert.equal(calls,1);
});
for(const [label,body,status] of [['uncertain reservation',{ok:false,reconciliation_required:true},503],['provider accepted, status unknown',{ok:false,accepted_by_provider:true},503],['malformed success',{ok:true},200]])test(label+' never presents a fresh invite send',async()=>{
 let calls=0;const a=invite(async()=>{calls++;return new Response(JSON.stringify(body),{status});});await a.button.listeners.click();assert.equal(a.button.disabled,true);await a.button.listeners.click();assert.equal(calls,1);
});
test('provider acceptance is labeled as a recorded send, never delivery',async()=>{
 const a=invite(async()=>new Response(JSON.stringify({ok:true,invite:{id:INVITE,stay_id:STAY,already_sent:false,status:'sent'}})));await a.button.listeners.click();assert.equal(a.button.textContent,'Envío registrado');assert.doesNotMatch(a.button.textContent,/entregad/i);
});
test('double click while invite request is pending performs only one POST',async()=>{
 let finish,calls=0;const a=invite(()=>{calls++;return new Promise(r=>finish=r);});const first=a.button.listeners.click();await a.button.listeners.click();assert.equal(calls,1);finish(new Response(JSON.stringify({ok:true,invite:{id:INVITE,stay_id:STAY,already_sent:false,status:'sent'}})));await first;
});
for(const [label,post] of [['network loss',async()=>{throw Error('lost reply');}],['uncertain server result',async()=>new Response(JSON.stringify({ok:false,reconciliation_required:true}),{status:502})],['malformed success',async()=>new Response(JSON.stringify({ok:true}))]])test('request decision '+label+' freezes both conflicting actions',async()=>{
 const a=await requests(post);await a.buttons[0].listeners.click();assert.equal(a.posts(),1);assert.ok(a.buttons.every(b=>b.disabled));await a.buttons[1].listeners.click();assert.equal(a.posts(),1);assert.match(a.alerts.at(-1),/No la repitas/);
 const reload=await requests(post,{store:a.store});assert.ok(reload.buttons.every(b=>b.disabled));
});
test('confirmed decision plus failed refresh cannot be resubmitted',async()=>{
 const a=await requests(async()=>new Response(JSON.stringify({ok:true,decision:{request_id:REQ,resulting_status:'approved'}})),{refreshFails:true});await a.buttons[0].listeners.click();assert.ok(a.buttons.every(b=>b.disabled));assert.match(a.alerts.at(-1),/se registró/);await a.buttons[1].listeners.click();assert.equal(a.posts(),1);
});
test('a definite permission denial keeps the existing authenticated error behavior',async()=>{
 const a=await requests(async()=>new Response(JSON.stringify({ok:false,error:'MANAGER_PERMISSION_DENIED'}),{status:403}));await a.buttons[0].listeners.click();assert.ok(a.buttons.every(b=>!b.disabled));assert.equal(a.posts(),1);
});
