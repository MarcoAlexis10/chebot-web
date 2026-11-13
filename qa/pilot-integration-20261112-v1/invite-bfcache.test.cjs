'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {harness,response,settle,TOKEN}=require('../founder-journey-20261112-v1/dom-harness.cjs');
const baseline=process.execArgv.includes('--conditions=baseline'),script=require('./compose.cjs').build({baseline}).generated['manager/manager-invite.js'];
test('BFCache restore accepts only fresh stay controls and preserves UNKNOWN across navigation',async()=>{
 const h=harness('',{token:'FICTIONAL_NOT_JWT',visible:true,fetcher:async()=>response(503,{ok:false,error:'GUEST_INVITE_PRIVACY_HOLD'})});
 const row=id=>Object.assign(h.element(),{dataset:{stayId:id,stayStatus:'active',stayCheckout:'2099-01-01T00:00:00Z'}});
 const old=row('00000000-0000-4000-8000-000000000007'),rows=[old];let install;
 h.context.document.querySelectorAll=()=>rows;h.context.MutationObserver=class{constructor(f){install=f}observe(){}};
 vm.runInContext(script,h.context);const oldButton=old.children[0].children[0];h.dispatch('pagehide');
 const event=new Event('pageshow');Object.defineProperty(event,'persisted',{value:true});h.window.dispatchEvent(event);
 await oldButton.listeners.click();assert.equal(h.calls.length,0,'old row binding must remain invalid');
 // Only a subsequent panel reload can supply new DOM rows. This is a DOM
 // fixture, not evidence that Auth/session/reservation was really verified.
 const fresh=row('00000000-0000-4000-8000-000000000008');rows.splice(0,1,fresh);install();
 const button=fresh.children[0].children[0];await button.listeners.click();await settle();assert.equal(h.calls.length,1);assert.match(button.textContent,/Enviar invitación/);
 const unknown=row('00000000-0000-4000-8000-000000000009');h.storage.set('chebot_manager_invite_review_v1:'+unknown.dataset.stayId,'1');rows.push(unknown);install();
 const blocked=unknown.children[0].children[0];assert.equal(blocked.disabled,true);await blocked.listeners.click();assert.equal(h.calls.length,1);assert.equal(h.storage.get('chebot_manager_invite_review_v1:'+unknown.dataset.stayId),'1');
 h.storage.set(TOKEN,'FICTIONAL_NEW_SESSION');await button.listeners.click();assert.equal(h.calls.length,1,'old session control cannot dispatch');
});
