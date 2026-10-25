const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {browserSource,harness,json,settle,TOKEN}=require('./auth-browser-fixture.cjs');
test('a current 401 from private properties conceals every section and clears the browser credential',async()=>{
 const h=harness(url=>Promise.resolve(url.endsWith('/properties')?json({error:'AUTH_SESSION_REVOKED'},401):json({ok:true,session:{role:'manager'},stays:[]})));
 await settle();assert.ok(h.classes.has('manager-auth-pending'));assert.equal(h.storage.has(TOKEN),false);assert.ok([...h.lists.values()].every(x=>x.cleared>0));
});
test('a 401 from an earlier page generation cannot log out a freshly reverified session',async()=>{
 let n=0,release;const h=harness(url=>{if(url.endsWith('/properties')&&++n===1)return new Promise(r=>{release=r;});return Promise.resolve(json({ok:true,session:{role:'manager'},properties:[],stays:[]}));});
 await settle();h.emit('pagehide');h.emit('pageshow',{persisted:true});await settle();assert.ok(!h.classes.has('manager-auth-pending'));
 release(json({error:'AUTH_SESSION_REVOKED'},401));await settle();assert.ok(!h.classes.has('manager-auth-pending'));assert.equal(h.storage.get(TOKEN),'FICTIONAL_TOKEN');
});
for(const [file,suffix,key] of [['manager-knowledge-v1.js','Knowledge','KNOWLEDGE'],['manager-requests-v1.js','Requests','REQUESTS'],['manager-incidents-v1.js','Incidents','INCIDENTS']])test(suffix+' signals current authentication loss without disclosing a token',async()=>{
 const source=browserSource(file),start=source.indexOf('  function readSectionToken()'),end=source.indexOf('\n  let lastLoadedToken',start);let event;
 const context={fetch:async()=>json({error:'AUTH_SESSION_REVOKED'},401),sessionStorage:{getItem:()=> 'FICTIONAL_TOKEN'},document:{body:{classList:{contains:()=>false}}},window:{dispatchEvent:e=>{event=e;}},Event,TOKEN_KEY:TOKEN,['BACKEND_'+key+'_URL']:'https://fictional-api.example.invalid/'+key};
 const fn=vm.compileFunction('let loadSequence=1;'+source.slice(start,end)+';return loadManager'+suffix+';',Object.keys(context))(...Object.values(context));
 await assert.rejects(fn('FICTIONAL_TOKEN'));assert.equal(event?.type,'cheveni-manager-session-denied');assert.equal(event.detail,undefined);
});
test('duplicate recovery submit events issue only one pending request',async()=>{
 const pending=[];const h=harness((url,options)=>url.includes('/recover?')?new Promise(resolve=>pending.push(resolve)):Promise.resolve(json({ok:true,session:{role:'manager'},properties:[],stays:[]})));
 await settle();h.node('manager-forgot').listeners.click();h.node('manager-recovery-email').value='fictional@example.invalid';
 const event={preventDefault(){}};const a=h.node('manager-recovery-form').listeners.submit(event),b=h.node('manager-recovery-form').listeners.submit(event);const count=pending.length;
 pending.forEach(resolve=>resolve(json({})));await Promise.all([a,b]);assert.equal(count,1);
 const sent=h.calls.find(c=>c.url.includes('/recover?'));assert.equal(sent.options.redirect,'error');assert.ok(sent.options.signal);
});
test('cancelled recovery response cannot replace the message of a new recovery form',async()=>{
 let release;const h=harness(url=>url.includes('/recover?')?new Promise(resolve=>{release=resolve;}):Promise.resolve(json({ok:true,session:{role:'manager'},properties:[],stays:[]})));
 await settle();h.node('manager-forgot').listeners.click();h.node('manager-recovery-email').value='fictional@example.invalid';const pending=h.node('manager-recovery-form').listeners.submit({preventDefault(){}});
 h.node('manager-recovery-cancel').listeners.click();h.node('manager-forgot').listeners.click();
 release(json({}));await pending;assert.equal(h.node('manager-recovery-status').textContent,'');
});
test('storage access failure during a private response conceals the panel and disables new login',async()=>{
 let release;const h=harness(url=>url.endsWith('/properties')?new Promise(r=>{release=r;}):Promise.resolve(json({ok:true,session:{role:'manager'},stays:[]})));
 await settle();assert.ok(!h.classes.has('manager-auth-pending'));h.state.getFails=true;
 release(json({ok:true,properties:[]}));await settle();assert.ok(h.classes.has('manager-auth-pending'));assert.equal(h.node('manager-login-submit').disabled,true);
});
test('section storage denial emits once while visible and does not cause a hidden-panel observer loop',async()=>{
 for(const file of ['manager-knowledge-v1.js','manager-requests-v1.js','manager-incidents-v1.js']){
  const source=browserSource(file),start=source.indexOf('  function readSectionToken()'),end=source.indexOf('\n  async function fetchManager',start);let hidden=false,events=0;
  const fn=vm.compileFunction(source.slice(start,end)+';return readSectionToken;', ['sessionStorage','TOKEN_KEY','window','document','Event'])({getItem(){throw Error('FICTIONAL');}},TOKEN,{dispatchEvent(){events++;hidden=true;}},{body:{classList:{contains:()=>hidden}}},Event);
  assert.equal(fn(),null);assert.equal(fn(),null);assert.equal(events,1);
 }
});
test('each generated private module and the actual auth gate cooperate to conceal a revoked session',async()=>{
 for(const [file,route] of [['manager-knowledge-v1.js','knowledge'],['manager-requests-v1.js','requests'],['manager-incidents-v1.js','incidents']]){
  const h=harness(url=>Promise.resolve(url.endsWith('/'+route)?json({error:'AUTH_SESSION_REVOKED'},401):json({ok:true,session:{role:'manager'},properties:[],stays:[]})));
  await settle();assert.ok(!h.classes.has('manager-auth-pending'));h.loadPrivate(file);await settle();
  assert.ok(h.classes.has('manager-auth-pending'),route);assert.equal(h.storage.has(TOKEN),false);
  assert.ok([...h.lists.values()].every(x=>x.cleared>0));
 }
});
