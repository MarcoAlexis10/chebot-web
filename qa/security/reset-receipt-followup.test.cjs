// Execute only new cases; reuse the old harness without registering old tests.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),prior=fs.readFileSync(path.join(root,'test/manager-password-recovery-qa.test.cjs'),'utf8');
const value={exports:{}};
vm.runInNewContext(prior.slice(0,prior.indexOf("test('recovery clears"))+';module.exports={harness,settle,deferred,ok};',{module:value,require,__dirname:path.join(root,'test'),URLSearchParams,AbortController,Set,Map,Promise});
const {harness,settle,deferred,ok}=value.exports;
const success=body=>({ok:true,status:200,json:async()=>body});
for(const [name,body] of [['missing identity',{}],['different user',{id:'22222222-2222-4222-8222-222222222222'}],['anonymous identity',{id:'11111111-1111-4111-8111-111111111111',is_anonymous:true}]])test(`password update receipt with ${name} remains uncertain and cannot retry`,async()=>{
 const h=harness({fetcher:async(_url,o)=>o.method==='PUT'?success(body):ok});await settle();h.fill();await h.submit();await h.submit();
 assert.equal(h.puts().length,1);assert.equal(h.logouts().length,1);assert.equal(h.node('recovery').hidden,true);
 assert.doesNotMatch(h.node('status').textContent,/Contraseña actualizada/);assert.match(h.node('status').textContent,/No pudimos confirmar/);
});
test('unreadable HTTP200 update body never reports a confirmed password change',async()=>{
 const h=harness({fetcher:async(_url,o)=>o.method==='PUT'?{ok:true,status:200,json:async()=>{throw Error('FICTIONAL_BODY_ERROR');}}:ok});await settle();h.fill();await h.submit();
 assert.doesNotMatch(h.node('status').textContent,/Contraseña actualizada|FICTIONAL_BODY_ERROR/);assert.equal(h.logouts().length,1);
});
test('pagehide while parsing update receipt conceals drafts and ignores late success',async()=>{
 const body=deferred(),h=harness({fetcher:async(_url,o)=>o.method==='PUT'?{ok:true,status:200,json:()=>body.promise}:ok});
 await settle();h.fill();const pending=h.submit();await settle();h.events.pagehide();body.resolve(await ok.json());await pending;
 assert.doesNotMatch(h.node('status').textContent,/Contraseña actualizada/);assert.equal(h.node('password').value,'');assert.equal(h.logouts().length,0);
});
test('a matching current Auth user receipt confirms the update and closes only its local session',async()=>{
 const h=harness();await settle();h.fill();await h.submit();assert.match(h.node('status').textContent,/Contraseña actualizada/);
 assert.equal(h.puts().length,1);assert.equal(h.logouts().length,1);assert.equal(h.node('recovery').hidden,true);
});
test('a stalled update identity body is bounded even when the adapter ignores abort',async()=>{
 const h=harness({fetcher:async(_url,o)=>o.method==='PUT'?{ok:true,status:200,json:()=>new Promise(()=>{})}:ok});await settle();h.fill();const pending=h.submit();await settle();
 const timer=[...h.timers.values()].find(x=>x.ms===8000);assert.ok(timer);timer.fn();await pending;
 assert.equal(h.puts().length,1);assert.equal(h.logouts().length,1);assert.equal(h.node('save').disabled,true);assert.match(h.node('status').textContent,/No pudimos confirmar/);
});
test('a stalled initial identity body times out without ever enabling password submission',async()=>{
 const h=harness({fetcher:async()=>({ok:true,status:200,json:()=>new Promise(()=>{})})});await settle();
 const timer=[...h.timers.values()].find(x=>x.ms===8000);assert.ok(timer);timer.fn();await settle();h.fill();await h.submit();
 assert.equal(h.puts().length,0);assert.equal(h.node('recovery').hidden,true);assert.equal(h.node('save').disabled,true);
});
