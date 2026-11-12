import test from 'node:test';import assert from 'node:assert/strict';
import {reviewStayLifecycle as review,createStayPorts,operations} from './stay-lifecycle.mjs';
import {reviewStayPlan} from '../property-stay-prearrival-20261112-v1/contracts.mjs';
import {stayCase,staySnapshot,stay,id,NOW} from './fixtures.mjs';
const baseline=process.execArgv.includes('--conditions=baseline');
test('inventory accepts the six actual SQL stay states, excludes the exact edited revision and preserves half-open conflicts',()=>{
 const x=stayCase();
 if(baseline){assert.notEqual(reviewStayPlan(stay(),[{id:id(77),propertyId:id(5),accessFrom:x.snapshot.accessFrom,accessUntil:x.snapshot.accessUntil,status:'revoked'}]).state,'INVALID_OR_INCOMPLETE_STAY_REVIEW');return;}
 for(const status of ['draft','revoked','completed','cancelled']){const r=review({...x,inventory:[...x.inventory,{...staySnapshot(status),stayId:id(77)}]});assert.equal(r.state,'STAY_TRANSITION_REVIEWED_HELD',status);}
 assert.equal(review(x).state,'STAY_TRANSITION_REVIEWED_HELD');
 const row={...staySnapshot('active'),stayId:id(77),checkInAt:'2027-01-11T18:00:00.000Z',checkOutAt:x.snapshot.checkInAt,accessFrom:'2027-01-11T18:00:00.000Z',accessUntil:x.snapshot.accessFrom};
 assert.equal(review({...x,inventory:[...x.inventory,row]}).state,'STAY_TRANSITION_REVIEWED_HELD');
 assert.equal(review({...x,inventory:[...x.inventory,{...row,accessUntil:'2027-01-12T18:01:00.000Z'}]}).state,'STAY_CONFLICT_REVIEW_HELD');
 assert.equal(review({...x,inventory:[{...x.snapshot,revision:5}]}).state,'STAY_REVIEW_REJECTED');
 assert.equal(review({...x,inventory:[]}).state,'STAY_REVIEW_REJECTED');
});
test('date changes bind current revisions, CABA UTC calendar and forbid stale inventory, invalid windows or cross-property rows',()=>{
 const x=stayCase(),r=review(x);assert.equal(r.window.checkInAt,'2027-01-12T18:00:00.000Z');
 for(const patch of [{checkInLocal:'2027-02-29T15:00'},{checkOutLocal:'2027-01-12T15:00'},{accessUntilLocal:'2027-01-12T15:00'},{accessFromLocal:'2027-01-14T15:00'}])assert.equal(review({...x,command:{...x.command,payload:{...x.command.payload,...patch}}}).state,'STAY_REVIEW_REJECTED');
 for(const payload of [{checkInLocal:'2028-02-29T23:30',checkOutLocal:'2028-03-01T10:00',accessFromLocal:'2028-02-29T23:30',accessUntilLocal:'2028-03-01T10:00'},{checkInLocal:'2027-12-31T23:30',checkOutLocal:'2028-01-01T10:00',accessFromLocal:'2027-12-31T23:30',accessUntilLocal:'2028-01-01T10:00'}])assert.equal(review({...x,command:{...x.command,payload}}).state,'STAY_TRANSITION_REVIEWED_HELD');
 for(const patch of [{expectedRevision:3},{expectedInventoryRevision:10},{expectedAuthorityRevision:6},{propertyId:id(90)}])assert.equal(review({...x,command:{...x.command,...patch}}).state,'STAY_REVIEW_REJECTED');
 assert.equal(review({...x,inventory:[...x.inventory,{...staySnapshot(),stayId:id(90),propertyId:id(91)}]}).state,'STAY_REVIEW_REJECTED');
 const stale={...x,nowMs:Date.parse(x.snapshot.checkInAt),context:{...x.context,expiresAtMs:Date.parse(x.snapshot.checkInAt)+1000}};assert.equal(review(stale).state,'STAY_REVIEW_REJECTED');
});
test('guest-free draft, association, confirmation, cancel and checkout remain distinct proposals with no fabricated guest or effect',async()=>{
 const d=stayCase('stay.draft.create');assert.equal(review(d).to,'draft');assert.equal('guestPhoneHash'in d.command.payload,false);
 const b=stayCase('stay.guest.bind');assert.equal(review(b).state,'STAY_TRANSITION_REVIEWED_HELD');assert.equal(review({...b,command:{...b.command,payload:{protectedGuestBindingRef:id(66),name:'FICTIONAL_REJECT'}}}).state,'STAY_REVIEW_REJECTED');
 const c=stayCase('stay.confirm');assert.equal(review(c).state,'STAY_REVIEW_REJECTED');c.snapshot.guestBindingRef=id(66);c.inventory=[{...c.snapshot}];assert.equal(review(c).to,'scheduled');
 assert.equal(review(stayCase('stay.cancel','scheduled')).to,'cancelled');
 const x=stayCase('stay.checkout','active'),at=Date.parse(x.snapshot.checkOutAt);assert.equal(review(x).state,'STAY_REVIEW_REJECTED');assert.equal(review({...x,nowMs:at,context:{...x.context,verifiedAtMs:at-1,expiresAtMs:at+1000}}).to,'completed');
 const ports=createStayPorts({writer(){throw Error('NO_WRITER')}});for(const op of operations){const r=await ports[op]({state:'COMMITTED'});assert.equal(r.state,'STAY_PORT_HELD');assert.equal(r.operationalApproval,false);assert.equal(r.receipt,null);}
});
