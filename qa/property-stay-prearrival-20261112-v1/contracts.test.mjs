import test from 'node:test';import assert from 'node:assert/strict';
import {reviewPropertyShape,reviewDuplicateHint,reviewStayPlan,reviewCbf1Compatibility,comparePendingAndCbf1,createHeldLifecycleCandidate} from './contracts.mjs';
import {checkConciergeBetaCityScope} from '../../../backend/concierge-beta-ba-scope-guard.js';
import {property,intent,pending,stay,id} from './fixtures.mjs';
test('property onboarding cannot become a create_stay, city authorization or uniqueness guarantee',()=>{
 assert.equal(reviewPropertyShape(property()).state,'HELD_PROPERTY_LIFECYCLE_ABI_MISSING');
 assert.equal(checkConciergeBetaCityScope({property:{account_id:id(3),status:'active',city:'CABA'},accountId:id(3)}).allowed,false);
 assert.equal(reviewPropertyShape({...property(),role:'owner'}).state,'INVALID_PROPERTY_REVIEW_INPUT');
 assert.equal(reviewPropertyShape({...property(),wifiPassword:'FICTIONAL_REJECT'}).state,'INVALID_PROPERTY_REVIEW_INPUT');
 const p={accountId:id(3),address:'DIRECCION FICTICIA QA 1',floorOrUnit:'A'},r={id:id(6),...p};
 assert.equal(reviewDuplicateHint(p,[r]).hint,'POSSIBLE_DUPLICATE');assert.equal(reviewDuplicateHint({...p,floorOrUnit:'B'},[r]).hint,'NONE_IN_SUPPLIED_VECTOR');assert.equal(reviewDuplicateHint(p,[r]).sqlUniquenessAccredited,false);
 for(const operation of ['concierge_create_property','concierge_update_property','concierge_revoke_property'])assert.equal(reviewCbf1Compatibility({mode:'OFFLINE_VECTOR',intent:{...intent(),operation}}).state,'CBF1_INCOMPATIBLE_HELD');
});
test('pending-to-CBF1 compatibility rejects lost windows, scope changes and deferred guest association',()=>{
 const i=intent(),p=pending(i);assert.equal(comparePendingAndCbf1({pending:p,intent:i}).state,'PENDING_FIELDS_MATCH_ONLY_HELD');assert.equal(comparePendingAndCbf1({pending:p,intent:i}).operationIdMappedToIntentId,false);
 assert.equal(comparePendingAndCbf1({pending:p,intent:{...i,accessFrom:'2027-01-12T17:00:00.000Z'}}).state,'PENDING_ACCESS_WINDOW_NOT_REPRESENTABLE');
 assert.equal(comparePendingAndCbf1({pending:p,intent:{...i,memberId:id(33)}}).state,'PENDING_ARGUMENTS_NOT_EQUIVALENT');
 const deferred={...i};delete deferred.guestDisplayName;delete deferred.guestPhoneHash;assert.equal(reviewCbf1Compatibility({mode:'OFFLINE_VECTOR',intent:deferred}).state,'CBF1_INCOMPATIBLE_HELD');
 assert.equal(reviewCbf1Compatibility({mode:'OFFLINE_VECTOR',intent:i}).state,'CBF1_FORMAT_REVIEWED_HELD');assert.equal(reviewCbf1Compatibility({mode:'OFFLINE_VECTOR',intent:i}).framePersisted,false);
 for(const operation of ['modify_stay','cancel_stay','checkout'])assert.equal(reviewCbf1Compatibility({mode:'OFFLINE_VECTOR',intent:{...i,operation}}).state,'CBF1_INCOMPATIBLE_HELD');
});
test('web planning keeps half-open access overlap hints distinct from SQL exclusion and rejects impossible dates',()=>{
 const p=stay(),earlier={id:id(7),propertyId:p.propertyId,accessFrom:'2027-01-11T18:00:00.000Z',accessUntil:'2027-01-12T18:00:00.000Z',status:'active'};
 const x=reviewStayPlan(p,[earlier]);assert.equal(x.overlapHint,'NONE_IN_SUPPLIED_VECTOR');assert.equal(x.state,'HELD_STAY_WITHOUT_GUEST_ABI_MISSING');assert.equal(x.sqlExclusionAccredited,false);
 assert.equal(reviewStayPlan(p,[{...earlier,accessUntil:'2027-01-12T18:01:00.000Z'}]).overlapHint,'POSSIBLE_OVERLAP');
 assert.equal(reviewStayPlan({...p,checkInLocal:'2027-02-29T15:00'}).state,'INVALID_OR_INCOMPLETE_STAY_REVIEW');
 assert.equal(reviewStayPlan({...p,status:'active'}).state,'INVALID_OR_INCOMPLETE_STAY_REVIEW');
});
test('all lifecycle entries stay closed and an untrusted ACK never resolves UNKNOWN or permits resend',async()=>{
 let calls=0;const bad=new Proxy({},{get(){calls++;throw Error('UNTRUSTED')}}),candidate=createHeldLifecycleCandidate(bad);
 for(const method of ['property','modify','cancel','checkout','prearrival'])assert.equal((await candidate[method](bad)).operationalApproval,false);
 assert.equal((await candidate.stay(bad)).state,'UNKNOWN');assert.equal((await candidate.reconcile({state:'COMMITTED',commit:true})).state,'UNKNOWN');assert.equal((await candidate.reconcile(bad)).automaticRetryAllowed,false);assert.equal(calls,0);
});
