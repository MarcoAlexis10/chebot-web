// Existing DOM factories only, not their historical tests. Actual generated
// action code; fictional network ports. No JWT, provider or personal data.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const cases={request:'request-session-integral-new.test.cjs',incident:'incident-intent-noasus-delta.test.cjs',admin:'admin-intent-intensive-new.test.cjs',knowledge:'knowledge-read-finish-new.test.cjs'};
function fixture(kind,{seed={},dropDurable=false,cryptoMissing=false}={}){
 const file=path.join(__dirname,cases[kind]),raw=fs.readFileSync(file,'utf8'),records=[];
 const vmAdapter={...vm,runInNewContext(source,context){
  if(context.sessionStorage&&context.fetch){
   for(const[k,v]of Object.entries(seed))context.sessionStorage.setItem(k,v);
   const originalSet=context.sessionStorage.setItem;
   if(dropDurable)context.sessionStorage.setItem=(k,v)=>{if(!k.endsWith(':durable-intent-v2'))originalSet(k,v);};
   const fetch=context.fetch;
   context={...context,window:{...context.window,crypto:cryptoMissing?undefined:require('node:crypto').webcrypto},fetch:(url,o)=>{
    if(o.method==='POST')records.push({headers:{...o.headers},atDispatch:context.sessionStorage.getItem(reviewKey+':durable-intent-v2')});
    return fetch(url,o);
   }};
  }
  return vm.runInNewContext(source,context);
 }};
 const fsAdapter={...fs,readFileSync(p,...args){
  if(process.env.CHEVENI_UI_BASELINE_ROOT&&/manager-(?:request-actions|incident-actions|knowledge|signup-admin)-v1\.js$/.test(String(p)))p=path.join(process.env.CHEVENI_UI_BASELINE_ROOT,path.basename(p));
  return fs.readFileSync(p,...args);
 }};
 const api=vm.runInNewContext('(function(){'+raw.slice(0,raw.indexOf('\ntest('))+';return {harness,settle,reply,KEY};})()',{
  require:n=>n==='node:vm'?vmAdapter:n==='node:fs'?fsAdapter:require(n),__dirname:path.dirname(file),process,URL,Date,Event,AbortController,setTimeout,clearTimeout
 });
 const reviewKey=api.KEY;
 const h=api.harness({post:async()=>{throw Error('FICTIONAL_LOST_ACK');}});
 return {h,api,reviewKey,records,click:()=>kind==='request'?h.button('Aprobar').listeners.click():kind==='incident'?h.click('Tomar caso'):kind==='admin'?h.submit():h.button()?.listeners.click()};
}
for(const kind of Object.keys(cases))test(kind+' persists UUID before HTTP and retains it unchanged on UNKNOWN and reload',async()=>{
 const f=fixture(kind);await f.api.settle();await f.click();await f.api.settle();assert.equal(f.records.length,1);
 const key=f.records[0].headers['Idempotency-Key'];assert.match(key,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
 assert.deepEqual(JSON.parse(f.records[0].atDispatch),{version:2,intentId:key});
 assert.equal(f.h.storage.get(f.reviewKey),'1');assert.deepEqual(JSON.parse(f.h.storage.get(f.reviewKey+':durable-intent-v2')),{version:2,intentId:key});
 const seed={[f.reviewKey]:'1',[f.reviewKey+':durable-intent-v2']:f.h.storage.get(f.reviewKey+':durable-intent-v2')};const next=fixture(kind,{seed});await next.api.settle();await next.click();assert.equal(next.records.length,0);
});
test('all four surfaces preserve legacy unresolved v1 markers rather than minting a retry UUID',async()=>{
 for(const kind of Object.keys(cases)){const f0=fixture(kind);await f0.api.settle();const f=fixture(kind,{seed:{[f0.reviewKey]:'1'}});await f.api.settle();await f.click();assert.equal(f.records.length,0);assert.equal(f.h.storage.get(f.reviewKey),'1');assert.equal(f.h.storage.has(f.reviewKey+':durable-intent-v2'),false);}
});
test('orphaned or malformed v2 records stay blocked even when the old marker is absent',async()=>{
 for(const kind of Object.keys(cases)){const f0=fixture(kind);await f0.api.settle();const f=fixture(kind,{seed:{[f0.reviewKey+':durable-intent-v2']:'MALFORMED_REQUIRES_REVIEW'}});await f.api.settle();await f.click();assert.equal(f.records.length,0);}
});
test('silent failure to persist durable identity prevents every action from reaching HTTP',async()=>{
 for(const kind of Object.keys(cases)){const f=fixture(kind,{dropDurable:true});await f.api.settle();await f.click();assert.equal(f.records.length,0);}
});
test('missing secure randomness has no insecure fallback and produces no HTTP mutation',async()=>{
 for(const kind of Object.keys(cases)){const f=fixture(kind,{cryptoMissing:true});await f.api.settle();await f.click();assert.equal(f.records.length,0);}
});
