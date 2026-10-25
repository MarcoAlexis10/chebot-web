const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('actual generated operator page keeps issue button frozen after lost POST reply and blocks duplicate submit',async()=>{
 let html='';const source=fs.readFileSync(path.resolve(__dirname,'../../../manager-signup-admin-v1.js'),'utf8');
 vm.runInNewContext(source,{require:id=>id==='./manager-build-config.cjs'?{managerBuildConfig:()=>({apiOrigin:'https://api.example.invalid'})}:id==='node:fs'?{mkdirSync(){},writeFileSync(_p,s){html=s}}:id==='node:path'?path:assert.fail(id),__dirname:'/fictional',console:{log(){}}});
 const script=html.match(/<script>([\s\S]*)<\/script>/)[1],nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{disabled:false,hidden:false,textContent:'',value:'fictional@example.invalid',checked:true,className:'',events:{},addEventListener(n,f){this.events[n]=f},reportValidity(){return true},reset(){},appendChild(){},replaceChildren(){}});return nodes.get(id)};
 let post=0,fail;const timers=new Map(),context={AbortController,URL,Date,Promise,Error,Map,Set,document:{getElementById:node,querySelectorAll:()=>[node('issue-button')],createElement:()=>node('created')},sessionStorage:{getItem:()=> 'FICTIONAL_TOKEN'},navigator:{clipboard:{}},window:{confirm:()=>true,alert(){}},setTimeout:f=>{const id=timers.size+1;timers.set(id,f);return id},clearTimeout:id=>timers.delete(id),fetch:(_u,o)=>o.method==='GET'?Promise.resolve({status:503,json:async()=>({ok:false})}):new Promise((_a,b)=>{post++;fail=b})};
 vm.runInNewContext(script,context);await new Promise(r=>setImmediate(r));
 const form=node('issue-form'),p=form.events.submit({preventDefault(){}});await form.events.submit({preventDefault(){}});assert.equal(post,1);fail(Error('FICTIONAL_LOST_REPLY'));await p;
 assert.equal(node('issue-button').disabled,true);assert.match(node('access-status').textContent,/No repitas/);await form.events.submit({preventDefault(){}});assert.equal(post,1);assert.equal(timers.size,0);
});
