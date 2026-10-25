// Reuse only the prior VM harness. None of its sixteen approved tests registers.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..'),old=fs.readFileSync(path.join(root,'test/manager-password-recovery-qa.test.cjs'),'utf8'),prefix=old.slice(0,old.indexOf("test('recovery clears"));const moduleValue={exports:{}};
vm.runInNewContext(prefix+';module.exports={harness,settle,deferred,ok};',{module:moduleValue,require,__dirname:path.join(root,'test'),URLSearchParams,AbortController,Set,Map,Promise});
const {harness,settle,deferred,ok}=moduleValue.exports;
test('HTTP200 without valid Auth identity never permits password PUT',async()=>{
 for(const user of [null,{},[],{id:'not-a-uuid'},{id:'11111111-1111-4111-8111-111111111111',is_anonymous:true}]){
  const h=harness({fetcher:async()=>({ok:true,status:200,json:async()=>user})});await settle();h.fill();await h.submit();assert.equal(h.puts().length,0);assert.equal(h.node('recovery').hidden,true);assert.equal(h.node('save').disabled,true);
 }
});
test('HTML or invalid JSON success cannot validate recovery session',async()=>{const h=harness({fetcher:async()=>({ok:true,status:200,json:async()=>{throw Error('FICTIONAL_HTML_PROXY');}})});await settle();h.fill();await h.submit();assert.equal(h.puts().length,0);assert.equal(h.node('save').disabled,true);assert.ok(!h.node('status').textContent.includes('FICTIONAL_HTML_PROXY'));});
test('pagehide during Auth body parsing prevents late credential form admission',async()=>{const body=deferred(),h=harness({fetcher:async()=>({ok:true,status:200,json:()=>body.promise})});await settle();h.events.pagehide();body.resolve({id:'11111111-1111-4111-8111-111111111111'});await settle();h.fill();await h.submit();assert.equal(h.node('recovery').hidden,true);assert.equal(h.node('save').disabled,true);assert.equal(h.puts().length,0);});
test('verified fictional Auth body permits exactly one password update and local logout',async()=>{const h=harness();await settle();assert.equal(h.node('recovery').hidden,false);h.fill();await h.submit();assert.equal(h.puts().length,1);assert.equal(h.logouts().length,1);assert.equal(h.node('recovery').hidden,true);});
