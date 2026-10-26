const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function browser(){let js;vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../../manager-invite-v1.js'),'utf8'),{
 __dirname:'/fictional',console:{log(){}},require:n=>n==='path'?path:n==='./manager-build-config.cjs'?{managerBuildConfig:()=>({apiUrl:()=> 'https://fictional.example.invalid/invite'})}:{
  existsSync:()=>true,readFileSync:p=>p.endsWith('manager-auth.js')?"stays.forEach((stay) => {\n      const row = document.createElement('article');\n      row.className = 'row';":'<head></head><body></body>',
  writeFileSync:(p,text)=>{if(p.endsWith('manager-invite.js'))js=text;}
 }});return js;}
function harness(writeFails=false){
 const storage=new Map([['chebot_manager_preview_access_token','FICTIONAL_TOKEN']]);let button,calls=0,markerAtDispatch,resolve;
 const element=()=>({disabled:false,dataset:{},classList:{add(){}},setAttribute(){},appendChild(){},replaceChildren(){},addEventListener(_n,fn){this.click=fn;}});
 const row=Object.assign(element(),{dataset:{stayId:'FICTIONAL_STAY',stayStatus:'active',stayCheckout:'2099-01-01T00:00:00Z'}});
 const context={Date,MutationObserver:class{observe(){}},document:{querySelector:()=>element(),querySelectorAll:()=>[row],createElement:name=>{const x=element();if(name==='button')button=x;return x;}},
 sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(writeFails)throw Error('FICTIONAL_STORAGE_FAILURE');storage.set(k,v);},removeItem:k=>storage.delete(k)},
 fetch:()=>{calls++;markerAtDispatch=storage.get('chebot_manager_invite_review_v1:FICTIONAL_STAY');return new Promise(r=>resolve=r);}};
 vm.runInNewContext(browser(),context);return {button,storage,respond:(status,body)=>resolve({status,ok:status>=200&&status<300,json:async()=>body}),state:()=>({calls,markerAtDispatch})};
}
test('invitation outcome is durably marked uncertain before dispatch can survive a reload',()=>{
 const h=harness();h.button.click();assert.equal(h.state().calls,1);assert.equal(h.state().markerAtDispatch,'1');
 assert.equal(h.storage.get('chebot_manager_invite_review_v1:FICTIONAL_STAY'),'1');
});
test('an unavailable local uncertainty marker blocks invitation dispatch',async()=>{
 const h=harness(true);h.button.click();await Promise.resolve();assert.equal(h.state().calls,0);assert.equal(h.button.disabled,true);
});
for(const [kind,status,body,retained] of [
 ['known pre-send hold',503,{error:'GUEST_INVITE_PRIVACY_HOLD'},false],
 ['validated sent receipt',200,{ok:true,invite:{status:'sent',id:'00000001-0000-4000-8000-000000000000'}},false],
 ['unknown acceptance',503,{reconciliation_required:true},true]
])test(`invitation marker disposition follows ${kind}`,async()=>{
 const h=harness(),pending=h.button.click();h.respond(status,body);await pending;
 assert.equal(h.storage.has('chebot_manager_invite_review_v1:FICTIONAL_STAY'),retained);assert.equal(h.state().calls,1);
});
