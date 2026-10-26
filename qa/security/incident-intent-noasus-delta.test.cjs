const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),uid=n=>`${String(n).padStart(8,'0')}-0000-4000-8000-000000000000`,ID=uid(1),PROP=uid(2),TOKEN='chebot_manager_preview_access_token',KEY='chebot_manager_incident_review_v1:'+ID;
const reply=(x,status=200)=>({ok:status>=200&&status<300,status,json:async()=>x}),settle=async()=>{for(let i=0;i<45;i++)await Promise.resolve();};
function generated(){let js='';const context={__dirname:'/fixture',console:{log(){}},require:n=>n==='path'?path:n==='./manager-build-config.cjs'?{managerBuildConfig:()=>({apiUrl:s=>'https://api.example.invalid/api/concierge/manager/'+s})}:n==='fs'?{existsSync:()=>true,readFileSync:()=>js,writeFileSync:(p,s)=>{if(p.endsWith('manager-incidents.js'))js=s;}}:assert.fail(n)};
 const source=fs.readFileSync(path.join(root,'manager-incidents-v1.js'),'utf8');vm.runInNewContext(source.slice(0,source.indexOf('let html = fs.readFileSync')),context);vm.runInNewContext(fs.readFileSync(path.join(root,'manager-incident-actions-v1.js'),'utf8'),{...context});return js;}
const browser=generated();
const incident=status=>({id:ID,property_id:PROP,status,category:'other',severity:'low',opened_at:'2026-10-26T00:00:00Z',applied_knowledge:status==='learning_pending'?{knowledge_key:'FIXTURE_KEY',version_number:3}:null});
const draft=(property=PROP)=>({id:uid(3),category:'incident_protocol',knowledge_key:'FIXTURE_KEY',scope_type:'property',scope:{type:'property',property_id:property},version:{id:uid(4),version_number:4,status:'draft',source_type:'learned_from_incident',change_summary:'incident:'+ID+' | FICTIONAL_RESOLUTION'}});
const learning=()=>({ok:true,status:'draft_created',knowledge_item_id:uid(3),version_id:uid(4),version_number:4,item_status:'review',version_status:'draft'});
function harness({state='new',storage=new Map([[TOKEN,'FICTIONAL_TOKEN']]),post,getIncidents,knowledge=[],storageFail=false}={}){
 const nodes=new Map(),events=new Map(),calls=[],alerts=[],all=n=>[n,...n.children.flatMap(all)];let gets=0,reloads=0;
 const element=tag=>({tag,children:[],style:{},hidden:false,disabled:false,textContent:'',listeners:{},append(...xs){this.children.push(...xs);},appendChild(x){this.children.push(x);},replaceChildren(...xs){this.children=xs;},addEventListener(k,f){this.listeners[k]=f;},querySelector(){return null;},querySelectorAll(selector){return selector==='button'?all(this).filter(n=>n.tag==='button'):[];}});
 const node=id=>{if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id);};
 vm.runInNewContext(browser,{URL,Date,Intl,Event,document:{getElementById:node,createElement:element,querySelector:()=>null,querySelectorAll:()=>[],body:{classList:{contains:()=>false}}},sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(storageFail)throw Error('FICTIONAL_QUOTA');storage.set(k,v);},removeItem:k=>storage.delete(k)},MutationObserver:class{observe(){}},window:{confirm:()=>true,prompt:()=> 'FICTIONAL_INSTRUCTION',alert:x=>alerts.push(x),dispatchEvent(){},location:{reload(){reloads++;}},addEventListener:(k,f)=>events.set(k,f)},
  fetch:async(url,o)=>{assert.ok(url.startsWith('https://api.example.invalid/'));calls.push({url,method:o.method});if(o.method==='POST')return post?post(JSON.parse(o.body)):reply({ok:true,incident:{incident_id:ID,resulting_status:JSON.parse(o.body).new_status},notification:null});if(url.endsWith('/knowledge'))return reply({ok:true,knowledge:typeof knowledge==='function'?knowledge(gets):knowledge});gets++;return reply({ok:true,incidents:getIncidents?getIncidents(gets):[incident(state)]});}});
 const button=label=>all(node('manager-incidents-list')).find(n=>n.tag==='button'&&n.textContent===label);
 return {storage,calls,alerts,button,posts:()=>calls.filter(x=>x.method==='POST').length,gets:()=>gets,reloads:()=>reloads,click:label=>button(label)?.listeners.click(),emit:k=>events.get(k)?.()};
}
test('pending incident state intent survives reload and blocks another action',async()=>{
 const h=harness({post:()=>new Promise(()=>{})});await settle();h.click('Tomar caso');await settle();assert.equal(h.storage.get(KEY),'1');
 const reload=harness({storage:h.storage});await settle();await reload.click('Escalar');assert.equal(reload.posts(),0);
});
test('pending learning proposal intent survives reload without another POST',async()=>{
 const h=harness({state:'learning_pending',post:()=>new Promise(()=>{})});await settle();h.click('Generar propuesta');await settle();assert.equal(h.storage.get(KEY),'1');
 const reload=harness({state:'learning_pending',storage:h.storage});await settle();await reload.click('Generar propuesta');assert.equal(reload.posts(),0);
});
test('storage failure prevents an incident POST instead of losing its replay guard',async()=>{
 const h=harness({storageFail:true});await settle();await h.click('Tomar caso');assert.equal(h.posts(),0);assert.equal(h.button('Tomar caso').disabled,true);
});
test('known state receipt plus matching fresh read permits the next distinct action',async()=>{
 const h=harness({getIncidents:n=>[incident(n===1?'new':'resolving')]});await settle();await h.click('Tomar caso');assert.equal(h.posts(),1);assert.equal(h.storage.has(KEY),false);assert.equal(h.button('Responder al huésped').disabled,false);
});
test('a stale read after committed state does not unlock an old action',async()=>{
 const h=harness();await settle();await h.click('Tomar caso');assert.equal(h.storage.get(KEY),'1');assert.equal(h.button('Tomar caso').disabled,true);
});
test('pagehide during state POST withholds late refresh and preserves review intent',async()=>{
 let release;const h=harness({post:()=>new Promise(r=>release=r)});await settle();const pending=h.click('Tomar caso');await settle();h.emit('pagehide');release(reply({ok:true,incident:{incident_id:ID,resulting_status:'resolving'}}));await pending;assert.equal(h.gets(),1);assert.equal(h.storage.get(KEY),'1');
});
test('a stale incident button cannot dispatch with a replacement session token',async()=>{
 const h=harness();await settle();h.storage.set(TOKEN,'FICTIONAL_OTHER_SESSION');await h.click('Tomar caso');assert.equal(h.posts(),0);
});
test('unknown learning outcome after state commit remains blocked',async()=>{
 const h=harness({state:'resolved',post:async()=>reply({ok:true,incident:{incident_id:ID,resulting_status:'learning_pending'},learning:{ok:false,reconciliation_required:true,reason:'LEARNING_PROPOSAL_OUTCOME_UNKNOWN'}})});await settle();await h.click('Aprendizaje');assert.equal(h.storage.get(KEY),'1');assert.equal(h.reloads(),0);
});
test('another property with the same knowledge key is not this incident learning receipt',async()=>{
 const h=harness({state:'learning_pending',knowledge:[draft(uid(9))]});await settle();assert.ok(h.button('Generar propuesta'),'another property must not suppress this action');
});
test('a draft for another incident cannot suppress this incident learning action',async()=>{
 const wrong=draft();wrong.version.change_summary='incident:'+uid(8)+' | FICTIONAL_OTHER';const h=harness({state:'learning_pending',knowledge:[wrong]});await settle();assert.ok(h.button('Generar propuesta'));
});
test('a typed proposal plus exact fresh property/incident draft clears the local intent',async()=>{
 const h=harness({state:'learning_pending',knowledge:n=>n===1?[]:[draft()],post:async()=>reply({ok:true,learning:learning()})});await settle();await h.click('Generar propuesta');
 assert.equal(h.storage.has(KEY),false);assert.ok(h.button('Cerrar'));assert.equal(h.button('Cerrar').disabled,false);assert.equal(h.reloads(),0);
});
test('a positive proposal alone cannot clear intent without an exact fresh draft',async()=>{
 const h=harness({state:'learning_pending',post:async()=>reply({ok:true,learning:learning()})});await settle();await h.click('Generar propuesta');assert.equal(h.storage.get(KEY),'1');assert.equal(h.reloads(),0);
});
test('ambiguous duplicate knowledge receipts cannot claim a unique proposal',async()=>{
 const h=harness({state:'learning_pending',knowledge:[draft(),draft()]});await settle();assert.ok(h.button('Generar propuesta'));
});
test('known pre-dispatch incident permission denial allows a corrected deliberate action',async()=>{
 let posts=0;const h=harness({getIncidents:n=>[incident(n===1?'new':'resolving')],post:async()=>++posts===1?reply({ok:false,error:'MANAGER_PERMISSION_DENIED'},403):reply({ok:true,incident:{incident_id:ID,resulting_status:'resolving'}})});await settle();await h.click('Tomar caso');assert.equal(h.storage.has(KEY),false);assert.equal(h.button('Tomar caso').disabled,false);await h.click('Tomar caso');assert.equal(h.posts(),2);
});
test('unclassified incident error keeps intent instead of enabling another POST',async()=>{
 const h=harness({post:async()=>reply({ok:false,error:'FICTIONAL_UNREVIEWED_ERROR'},403)});await settle();await h.click('Tomar caso');await h.click('Escalar');assert.equal(h.posts(),1);assert.equal(h.storage.get(KEY),'1');
});
test('late learning receipt after pagehide cannot reload or clear the persisted intent',async()=>{
 let release;const h=harness({state:'learning_pending',post:()=>new Promise(r=>release=r)});await settle();const pending=h.click('Generar propuesta');await settle();h.emit('pagehide');release(reply({ok:true,learning:learning()}));await pending;assert.equal(h.gets(),1);assert.equal(h.reloads(),0);assert.equal(h.storage.get(KEY),'1');
});
