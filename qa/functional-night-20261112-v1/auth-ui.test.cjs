'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {harness,response,settle,TOKEN}=require('../founder-journey-20261112-v1/dom-harness.cjs');
const baseline=process.execArgv.includes('--conditions=baseline'),script=require('./compose.cjs').build({baseline}).generated['manager/manager-auth.js'];
test('current 403 clears access but reports permission rejection without claiming session expiry or revocation',async()=>{
 const h=harness(script,{token:'FICTIONAL_NOT_JWT',fetcher:async()=>response(403,{ok:false,error:'MANAGER_PERMISSION_DENIED'})});await settle();
 assert.match(h.node('manager-auth-status').textContent,/permisos vigentes/);assert.doesNotMatch(h.node('manager-auth-status').textContent,/sesión dejó|expir|venció/i);assert.ok(h.classes.has('manager-auth-pending'));assert.equal(h.storage.has(TOKEN),false);assert.equal(h.calls.length,1);
});
test('logout clears prior session/scope labels and private rows immediately even when provider logout is unconfirmed',async()=>{
 const h=harness(script,{fetcher:async()=>response(503,{error:'HELD'})});await settle();h.storage.set(TOKEN,'FICTIONAL_NOT_JWT');h.classes.delete('manager-auth-pending');
 h.node('manager-session-label').textContent='PRIVATE_SCOPE_MARKER';h.node('manager-account-name').textContent='PRIVATE_ACCOUNT_MARKER';
 // IDs below are the exact generated script IDs; inspect both labels.
 const source=script.match(/const accountLabel = document.getElementById\('([^']+)'\)/)[1];h.node(source).textContent='PRIVATE_ACCOUNT_MARKER';
 for(const list of h.lists.values())list.children.push(h.element());
 h.storage.set('chebot_manager_invite_review_v1:00000000-0000-4000-8000-000000000008','1');
 const pending=h.node('manager-logout').listeners.click();assert.ok(h.classes.has('manager-auth-pending'));assert.equal(h.node('manager-session-label').textContent,'');assert.equal(h.node(source).textContent,'Che Vení Concierge');for(const list of h.lists.values())assert.equal(list.children.length,0);
 await pending;assert.equal(h.storage.has(TOKEN),false);assert.match(h.node('manager-auth-status').textContent,/No pudimos confirmar/);assert.equal(h.storage.get('chebot_manager_invite_review_v1:00000000-0000-4000-8000-000000000008'),'1');
});
test('late restore response after an explicit denial cannot reopen rows, scope labels or an uncertain invitation',async()=>{
 let release;const h=harness(script,{token:'FICTIONAL_OLD_BEARER',fetcher:()=>new Promise(resolve=>{release=resolve})});
 h.storage.set('chebot_manager_invite_review_v1:00000000-0000-4000-8000-000000000008','1');h.dispatch('cheveni-manager-session-denied');
 release(response(200,{ok:true,session:{}}));await settle();assert.ok(h.classes.has('manager-auth-pending'));assert.equal(h.storage.has(TOKEN),false);assert.equal(h.calls.length,1);for(const list of h.lists.values())assert.equal(list.children.length,0);assert.equal(h.node('manager-session-label').textContent,'');assert.equal(h.storage.get('chebot_manager_invite_review_v1:00000000-0000-4000-8000-000000000008'),'1');
});
