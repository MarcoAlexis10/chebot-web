// Only the existing factory prefix is loaded; old tests are never registered.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const file=path.join(__dirname,'request-session-integral-new.test.cjs'),raw=fs.readFileSync(file,'utf8');
const api=vm.runInNewContext('(function(){'+raw.slice(0,raw.indexOf('\ntest('))+';return {harness,settle,reply,receipt,KEY};})()',{require,__dirname,URL,Event,AbortController,setTimeout,clearTimeout,process:{env:{}}});
test('a confirmed decision with unknown notification persistence warns without replaying the decision',async()=>{
 const h=api.harness({post:async()=>api.reply({...api.receipt('approved'),notification:{sent:true,status:'accepted_status_unconfirmed',reconciliation_required:true,communicated_at:null}})});await api.settle();await h.button('Aprobar').listeners.click();assert.equal(h.posts(),1);assert.equal(h.gets(),2);assert.match(h.alerts.join('|'),/decisión.*registrada.*aviso.*revisión/i);assert.equal(h.button('Aprobar'),undefined);
});
test('an ambiguous notification warning is not shown by a late decision from a replaced session',async()=>{
 let release;const h=api.harness({post:()=>new Promise(r=>release=r)});await api.settle();const pending=h.button('Aprobar').listeners.click();await api.settle();h.storage.set('chebot_manager_preview_access_token','FICTIONAL_REPLACEMENT');release(api.reply({...api.receipt('approved'),notification:{reconciliation_required:true}}));await pending;assert.equal(h.alerts.length,0);assert.equal(h.gets(),1);assert.equal(h.storage.get(api.KEY),'1');
});
test('a confirmed notification preserves the ordinary decision refresh without extra warnings',async()=>{
 const h=api.harness({post:async()=>api.reply({...api.receipt('approved'),notification:{sent:true,status:'sent',reconciliation_required:false}})});await api.settle();await h.button('Aprobar').listeners.click();assert.equal(h.alerts.length,0);assert.equal(h.posts(),1);assert.equal(h.gets(),2);
});
