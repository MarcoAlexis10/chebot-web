import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {reviewEffects,reviewPrivatePrimitive,reviewNativeCheckout} from './effect-plan.mjs';
import {reviewStayLifecycle} from '../functional-night-20261112-v1/stay-lifecycle.mjs';
import {bound,propertyCase,stayCase,id} from './fixtures.mjs';
const baseline=process.execArgv.includes('--conditions=baseline');
test('date changes invalidate prior stay bindings and reconcile invites instead of merely relabeling the entity',()=>{
 const x=bound('stay',stayCase());if(baseline){assert.equal(reviewStayLifecycle(x.request).revocationRequired,true);return;}
 const r=reviewEffects(x);assert.equal(r.state,'EFFECT_CONTRACT_REVIEWED_HELD');assert.equal(r.revocationRequired,true);assert.ok(r.effects.includes('INVALIDATE_PRIOR_STAY_BINDINGS'));assert.ok(r.effects.includes('ACCESS_EXCLUSION'));assert.ok(r.effects.includes('RECONCILE_EXISTING_INVITES'));assert.equal(r.effectReceipt,null);assert.equal(r.invitationSendAllowed,false);assert.equal(r.actualAuthVerified,false);
});
test('effect plans keep creation, guest association, confirmation, cancellation, checkout and private history distinct',()=>{
 const draft=reviewEffects(bound('stay',stayCase('stay.draft.create')));assert.equal(draft.proposedRevision,1);assert.equal(draft.implicitGuestCreationAllowed,false);
 const binding=reviewEffects(bound('stay',stayCase('stay.guest.bind')));assert.ok(binding.effects.includes('CURRENT_GUEST_IDENTITY_BINDING'));assert.equal(binding.proposedRevision,5);
 const cancel=reviewEffects(bound('stay',stayCase('stay.cancel','scheduled')));assert.ok(cancel.effects.includes('REVOKE_INVITES'));
 const history=reviewEffects(bound('stay',stayCase('stay.history.read','completed')));assert.equal(history.proposedRevision,4);assert.equal(history.revocationRequired,false);assert.deepEqual(history.effects,['CURRENT_PRIVATE_READ']);
 const pause=reviewEffects(bound('property',propertyCase('property.pause','active')));assert.ok(pause.effects.includes('WITHDRAW_PUBLIC_CATALOG'));assert.ok(pause.effects.includes('REVOKE_PROPERTY_ACCESS'));assert.equal(pause.accessGrantAllowed,false);
 const x=bound();assert.equal(reviewEffects({...x,observations:{...x.observations,floor:{...x.observations.floor,recoveryEpoch:1}}}).state,'EFFECT_CONTRACT_INCOMPATIBLE_HELD');
});
function checkout(){const q=stayCase('stay.checkout','active'),at=Date.parse(q.snapshot.checkOutAt);q.nowMs=at;q.context.verifiedAtMs=at-1;q.context.expiresAtMs=at+5000;return bound('stay',q)}
test('Native17 checkout projection preserves stable intent and separates token seconds from source expiry but cannot drop required revisions',()=>{
 const b=checkout(),identityContract={userId:id(42),sessionId:b.request.context.sessionId,tokenExpiresAtSeconds:String(Math.floor(b.request.nowMs/1000)+60)},x={mode:'OFFLINE_VECTOR',boundInput:b,identityContract};
 const r=reviewNativeCheckout(x);assert.equal(r.state,'NATIVE_CHECKOUT_BUSINESS_PROJECTION_ONLY_HELD');assert.equal(r.semanticProjection.commandId,b.request.command.intentId);assert.notEqual(r.semanticProjection.commandId,b.request.command.attemptId);assert.equal(r.semanticProjection.tokenExpiresAtSeconds,identityContract.tokenExpiresAtSeconds);assert.ok(r.unrepresentedFields.includes('entityRevision'));assert.equal(r.dispatchPlan,null);assert.equal(r.mappingAllowed,false);
 for(const patch of [{userId:id(99)},{sessionId:id(99)},{tokenExpiresAtSeconds:String(Math.floor(b.request.nowMs/1000))},{tokenExpiresAtSeconds:b.observations.provider.expiresAtMs},{exp:999}])assert.equal(reviewNativeCheckout({...x,identityContract:{...identityContract,...patch}}).state,'NATIVE_CHECKOUT_BINDING_INCOMPATIBLE_HELD');
 const effect=reviewEffects(b);assert.ok(effect.effects.includes('AUTHORIZED_POSTCHECKOUT_CASE_ONLY'));assert.ok(effect.effects.includes('REVOKE_PROPERTY_ACCESS_FOR_STAY'));
});
test('source ABI confirms Native17 suspend affects launch control and checkout is not a versioned property lifecycle port',()=>{
 const source=fs.readFileSync(new URL('./native17-manager-action.source.txt',import.meta.url),'utf8');assert.match(source,/update concierge_service_qa_v1\.launch_control set state='PAUSED'/);assert.doesNotMatch(source,/update public\.concierge_properties set status='paused'/);assert.match(source,/p_value<>'\{\}'::jsonb/);assert.match(source,/checkout_revoked_at=cutoff/);assert.match(source,/p_request,'replayed',false/);
 const p=reviewPrivatePrimitive('property.pause');assert.equal(p.state,'NATIVE_SUSPEND_NOT_PROPERTY_PAUSE');assert.equal(p.mappingAllowed,false);assert.equal(reviewPrivatePrimitive('property.draft.create').mappingAllowed,false);assert.equal(reviewPrivatePrimitive('stay.checkout').expectedRevisionRepresentable,false);
});
