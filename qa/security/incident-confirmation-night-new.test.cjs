const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// Reuse only the fictional DOM/transport factory. Never evaluate its historical test() calls.
const fixturePath=path.resolve(__dirname,'incident-intent-noasus-delta.test.cjs'),source=fs.readFileSync(fixturePath,'utf8');
const api=vm.runInNewContext('(function(){'+source.slice(0,source.indexOf('\ntest('))+';return {harness,incident,learning,draft,settle,reply,ID,PROP,KEY,TOKEN};})()', {require,URL,Event,AbortController,setTimeout,clearTimeout,__dirname:path.dirname(fixturePath)});
const STAY='00000008-0000-4000-8000-000000000000',OTHER='00000009-0000-4000-8000-000000000000';
const fresh=(state,change={})=>({...api.incident(state),stay_id:STAY,...change});
const notification=change=>({sent:true,status:'sent',manager_response_recorded:true,guidance_recorded:true,communicated_at:'2026-10-27T00:00:00Z',version:'incident-mediation-v2',...change});
async function run({notify=notification(),getRows,noteMissing=false,state='resolving',postChange={}}={}){
 const h=api.harness({state,getIncidents:n=>getRows?getRows(n):[fresh(n===1?state:'waiting_guest')],post:async()=>api.reply({ok:true,incident:{incident_id:api.ID,resulting_status:'waiting_guest'},...(noteMissing?{}:{notification:notify}),...postChange})});
 await api.settle();await h.click('Responder al huésped');return h;
}
const blocked=h=>{assert.equal(h.storage.get(api.KEY),'1');assert.equal(h.posts(),1);assert.equal(h.button('Responder al huésped').disabled,true);};
test('missing notification evidence cannot certify that a recorded waiting-guest state reached the guest',async()=>{blocked(await run({noteMissing:true}));});
test('contradictory sent true plus reconciliation remains in review',async()=>{blocked(await run({notify:notification({reconciliation_required:true})}));});
test('an incomplete or string-valued delivery claim cannot unlock the incident',async()=>{for(const notify of [notification({sent:'true'}),notification({status:'unknown'}),notification({manager_response_recorded:false}),notification({guidance_recorded:false}),notification({communicated_at:'invalid'})])blocked(await run({notify}));});
test('a fresh incident with the same ID but another stay cannot clear the action marker',async()=>{blocked(await run({getRows:n=>[fresh(n===1?'resolving':'waiting_guest',n>1?{stay_id:OTHER}:{})]}));});
test('duplicate fresh incident IDs do not establish a unique current result',async()=>{blocked(await run({getRows:n=>n===1?[fresh('resolving')]:[fresh('waiting_guest'),fresh('waiting_guest')]}));});
test('known non-sent guidance remains explicit to the manager without claiming delivery',async()=>{const h=await run({notify:notification({sent:false,status:'template_required',guidance_recorded:false})});assert.equal(h.storage.has(api.KEY),false);assert.ok(h.alerts.some(x=>/no se envi[oó]|no fue enviad|no se entreg[oó]/i.test(x)));});
test('exact fictional acceptance plus one bound current row permits the next distinct action',async()=>{const h=await run();assert.equal(h.storage.has(api.KEY),false);assert.equal(h.button('Retomar').disabled,false);});
test('duplicate learning rows cannot confirm one proposal and remove replay protection',async()=>{const h=api.harness({state:'learning_pending',getIncidents:n=>n===1?[fresh('learning_pending')]:[fresh('learning_pending'),fresh('learning_pending')],knowledge:n=>n===1?[]:[api.draft()],post:async()=>api.reply({ok:true,learning:api.learning()})});await api.settle();await h.click('Generar propuesta');assert.equal(h.storage.get(api.KEY),'1');assert.equal(h.posts(),1);});
