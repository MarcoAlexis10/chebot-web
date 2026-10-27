// Reuse only the prior fictional factory, never register or run old tests.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),prior=fs.readFileSync(path.join(root,'test/manager-password-recovery-qa.test.cjs'),'utf8');
let factory=prior.slice(0,prior.indexOf("test('recovery clears"));
factory=factory.replace('storageFails = false} = {})','storageFails = false, removeSilent = false, readFails = false} = {})');
factory=factory.replace("sessionStorage: {removeItem(key) {if(storageFails)throw Error('PRIVATE_STORAGE_ERROR');storage.delete(key);}, getItem(key) {return storage.get(key) ?? null;}}", "sessionStorage: {removeItem(key) {if(storageFails)throw Error('PRIVATE_STORAGE_ERROR');if(!removeSilent)storage.delete(key);},getItem(key){if(readFails)throw Error('PRIVATE_READ_ERROR');return storage.get(key)??null;}}");
assert.ok(factory.includes('getItem(key)'));
const value={exports:{}};vm.runInNewContext(factory+';module.exports={harness,settle,ok,TOKEN};',{module:value,require,__dirname:path.join(root,'test'),URLSearchParams,AbortController,Set,Map,Promise});
const {harness,settle,ok,TOKEN}=value.exports;
test('recovery refuses all provider calls when initial token removal silently fails',async()=>{
 const h=harness({removeSilent:true});await settle();assert.equal(h.calls.length,0);assert.equal(h.node('recovery').hidden,true);assert.equal(h.node('save').disabled,true);assert.match(h.node('status').textContent,/No pudimos limpiar/);assert.equal(h.storage.get(TOKEN),'FICTIONAL_OLD_MANAGER');
});
test('initial token readback failure also refuses recovery without exposing storage details',async()=>{
 const h=harness({readFails:true});await settle();assert.equal(h.calls.length,0);assert.equal(h.node('recovery').hidden,true);assert.match(h.node('status').textContent,/No pudimos limpiar/);assert.doesNotMatch(h.node('status').textContent,/PRIVATE_READ_ERROR/);
});
test('confirmed password update warns if a late local token survives silent removal',async()=>{
 const h=harness();await settle();h.storage.set(TOKEN,'FICTIONAL_LATE_TOKEN');h.storage.delete=()=>false;h.fill();await h.submit();
 assert.equal(h.puts().length,1);assert.equal(h.logouts().length,1);assert.equal(h.node('recovery').hidden,true);assert.match(h.node('status').textContent,/Contraseña actualizada/);assert.match(h.node('status').textContent,/No pudimos limpiar.*pestaña/);assert.equal(h.node('status').className,'error');
});
test('uncertain update includes local cleanup failure and remains terminal without replay',async()=>{
 const h=harness({fetcher:async(_url,o)=>{if(o.method==='PUT')throw Error('PRIVATE_TRANSPORT_ERROR');return ok;}});await settle();h.storage.set(TOKEN,'FICTIONAL_LATE_TOKEN');h.storage.delete=()=>false;h.fill();await h.submit();await h.submit();
 assert.equal(h.puts().length,1);assert.equal(h.logouts().length,1);assert.match(h.node('status').textContent,/No pudimos confirmar/);assert.match(h.node('status').textContent,/No pudimos limpiar.*pestaña/);assert.doesNotMatch(h.node('status').textContent,/PRIVATE_TRANSPORT_ERROR|FICTIONAL_LATE_TOKEN/);
});
test('readback failure after a confirmed update cannot produce a clean-exit confirmation',async()=>{
 const h=harness();await settle();h.storage.get=()=>{throw Error('PRIVATE_READBACK_FAILURE');};h.fill();await h.submit();
 assert.match(h.node('status').textContent,/Contraseña actualizada/);assert.match(h.node('status').textContent,/No pudimos limpiar/);assert.equal(h.node('status').className,'error');assert.doesNotMatch(h.node('status').textContent,/PRIVATE_READBACK_FAILURE/);
});
test('verified removal preserves an ordinary recovery and unrelated browser storage',async()=>{
 const h=harness();await settle();h.fill();await h.submit();assert.equal(h.storage.has(TOKEN),false);assert.equal(h.storage.get('unrelated'),'KEEP');assert.equal(h.node('status').className,'ok');assert.equal(h.puts().length,1);assert.equal(h.logouts().length,1);
});
