// Generated browser code only; no external Auth, Supabase or real users.
const test=require('node:test'),assert=require('node:assert/strict');
const {harness,json,settle,TOKEN}=require('./intensive-20261025/auth-browser-fixture.cjs');
for(const route of ['properties','stays'])test('current '+route+' HTTP 403 clears previously authorized private panel before parsing denial JSON',async()=>{
 let release,bodyReads=0;
 const h=harness(url=>url.endsWith('/'+route)?new Promise(r=>release=r):Promise.resolve(json({ok:true,session:{role:'manager'},properties:[],stays:[]})));
 await settle();assert.equal(h.classes.has('manager-auth-pending'),false);
 release({ok:false,status:403,json:async()=>{bodyReads++;return {ok:false,error:'MANAGER_ACCESS_DENIED'};}});
 await settle();assert.equal(h.classes.has('manager-auth-pending'),true);assert.equal(h.storage.has(TOKEN),false);
 assert.ok([...h.lists.values()].every(x=>x.cleared>0));assert.equal(bodyReads,1);
});
for(const [file,route]of [['manager-knowledge-v1.js','knowledge'],['manager-requests-v1.js','requests'],['manager-incidents-v1.js','incidents']])test(route+' 403 conceals all cached sections through the current auth gate',async()=>{
 const h=harness(url=>Promise.resolve(url.endsWith('/'+route)?json({ok:false,error:'MANAGER_ACCESS_DENIED'},403):json({ok:true,session:{role:'manager'},properties:[],stays:[]})));
 await settle();assert.equal(h.classes.has('manager-auth-pending'),false);
 for(const id of ['manager-knowledge-list','manager-requests-list','manager-incidents-list'])Object.assign(h.node(id),{replaceChildren(){},appendChild(){}});
 h.loadPrivate(file);await settle();
 assert.equal(h.classes.has('manager-auth-pending'),true);assert.equal(h.storage.has(TOKEN),false);assert.ok([...h.lists.values()].every(x=>x.cleared>0));
});
test('old-generation 403 cannot clear a newly verified current panel',async()=>{
 let n=0,release;
 const h=harness(url=>url.endsWith('/properties')&&++n===1?new Promise(r=>release=r):Promise.resolve(json({ok:true,session:{role:'manager'},properties:[],stays:[]})));
 await settle();h.emit('pagehide');h.emit('pageshow',{persisted:true});await settle();
 assert.equal(h.classes.has('manager-auth-pending'),false);release(json({ok:false,error:'MANAGER_ACCESS_DENIED'},403));await settle();
 assert.equal(h.classes.has('manager-auth-pending'),false);assert.equal(h.storage.get(TOKEN),'FICTIONAL_TOKEN');
});
test('upstream 503 without a permission denial does not impersonate revoked Auth',async()=>{
 const h=harness(url=>Promise.resolve(url.endsWith('/properties')?json({ok:false,error:'SERVICE_UNAVAILABLE'},503):json({ok:true,session:{role:'manager'},stays:[]})));
 await settle();assert.equal(h.classes.has('manager-auth-pending'),false);assert.equal(h.storage.get(TOKEN),'FICTIONAL_TOKEN');
});
