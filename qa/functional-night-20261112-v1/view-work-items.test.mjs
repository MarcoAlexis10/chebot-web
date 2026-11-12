import test from 'node:test';import assert from 'node:assert/strict';import {createReviewView} from './view-lease.mjs';
import {reviewWorkItems,createFunctionalHeldCandidate} from './work-items.mjs';import {context,id,NOW} from './fixtures.mjs';
const scope=()=>({sessionId:id(2),accountId:id(3),propertyId:id(5),stayId:id(8),authorityRevision:7,restrictionRevision:9,entityRevision:4,expiresAtMs:NOW+500,checkoutAtMs:NOW+300});
test('view sequencing discards responses after scope/version/session changes, newer requests, logout or checkout during awaits',async()=>{
 const v=createReviewView(),s=scope();v.select(s);let release;const t=v.begin('stay'),pending=new Promise(resolve=>{release=resolve}).then(()=>v.settle(t,{nowMs:NOW,currentScope:s}));v.select({...s,propertyId:id(99)});release();assert.equal((await pending).state,'REVIEW_RESPONSE_DISCARDED');
 for(const patch of [{sessionId:id(99)},{authorityRevision:8},{restrictionRevision:10},{entityRevision:5},{stayId:id(99)}]){v.select(s);const t=v.begin('stay');assert.equal(v.settle(t,{nowMs:NOW,currentScope:{...s,...patch}}).state,'REVIEW_RESPONSE_DISCARDED');}
 v.select(s);const old=v.begin('stay'),current=v.begin('stay');assert.equal(v.settle(old,{nowMs:NOW,currentScope:s}).state,'REVIEW_RESPONSE_DISCARDED');assert.equal(v.settle(current,{nowMs:NOW,currentScope:s}).privateViewAllowed,false);assert.equal(v.settle(current,{nowMs:NOW,currentScope:s}).state,'REVIEW_RESPONSE_DISCARDED');
 v.select(s);const end=v.begin('stay');await Promise.resolve();assert.equal(v.settle(end,{nowMs:s.checkoutAtMs,currentScope:s}).state,'REVIEW_RESPONSE_DISCARDED');
 v.select({...s,checkoutAtMs:null});const expired=v.begin('property');assert.equal(v.settle(expired,{nowMs:s.expiresAtMs,currentScope:{...s,checkoutAtMs:null}}).state,'REVIEW_RESPONSE_DISCARDED');
 v.select(s);const logout=v.begin('incidents');v.close();assert.equal(v.settle(logout,{nowMs:NOW,currentScope:s}).state,'REVIEW_RESPONSE_DISCARDED');
});
test('UNKNOWN survives local view changes without becoming retry permission and restart cannot reconstruct an original',async()=>{
 const v=createReviewView();v.select(scope());v.noteUnknown(id(1));v.close();v.select({...scope(),sessionId:id(99)});assert.equal(v.uncertainty(id(1)).state,'UNKNOWN');assert.equal(v.uncertainty(id(1)).automaticRetryAllowed,false);const restarted=createReviewView();assert.equal(restarted.reconcile({snapshot:'CLIENT_ORIGINAL',ack:'COMMIT'}).state,'UNKNOWN');assert.equal(restarted.uncertainty(id(1)).originalAvailable,false);
 const c=createFunctionalHeldCandidate(new Proxy({},{get(){throw Error('NO_ADAPTERS')}}));const r=await c.reconcile({receipt:'COMMIT'});assert.equal(r.state,'UNKNOWN');assert.equal(r.automaticRetryAllowed,false);assert.equal((await c.reconcileIncident({state:'COMMITTED'})).state,'UNKNOWN');assert.equal((await c.request({operation:'concierge_manager_decide_request'})).dispatchPerformed,false);assert.equal((await c.incident.execute('FICTIONAL_NOT_JWT',{})).operationalApproval,false);
});
const work=()=>({mode:'OFFLINE_VECTOR',nowMs:NOW,context:context(),stayScope:{stayId:id(8),accountId:id(3),propertyId:id(5),revision:4,expectedRevision:4,checkoutAtMs:NOW+1000},incidents:[{id:id(20),accountId:id(3),propertyId:id(5),stayId:id(8),status:'learning_pending',revision:2,guestConfirmedResolved:false,knowledgeItemId:null}],requests:[{id:id(21),accountId:id(3),propertyId:id(5),stayId:id(8),status:'waiting_manager',revision:3}]});
test('work-item projections reject cross-stay/property/account data, stale revision and private payloads; learning never activates',()=>{
 const x=work(),r=reviewWorkItems(x);assert.equal(r.state,'WORK_ITEM_RELATION_REVIEWED_HELD');assert.equal(r.incidents[0].learningProposalReviewOnly,false);assert.equal(r.requests[0].decisionPending,true);assert.equal(r.incidents[0].automaticActivationAllowed,false);assert.equal('id'in r.incidents[0],false);
 assert.equal(reviewWorkItems({...x,incidents:[{...x.incidents[0],guestConfirmedResolved:true}]}).incidents[0].learningProposalReviewOnly,true);
 for(const patch of [{stayId:id(99)},{propertyId:id(99)},{accountId:id(99)},{summary:'FICTIONAL_PRIVATE_MUST_NOT_LEAK'},{status:'auto_activated'}]){const v=reviewWorkItems({...x,incidents:[{...x.incidents[0],...patch}]});assert.equal(v.state,'WORK_ITEMS_HELD');assert.equal(JSON.stringify(v).includes('FICTIONAL_PRIVATE'),false);}
 for(const patch of [{revoked:true},{authorityRevision:0},{expiresAtMs:NOW}])assert.equal(reviewWorkItems({...x,context:{...x.context,...patch}}).state,'WORK_ITEMS_HELD');
 assert.equal(reviewWorkItems({...x,stayScope:{...x.stayScope,expectedRevision:3}}).state,'WORK_ITEMS_HELD');assert.equal(reviewWorkItems({...x,nowMs:x.stayScope.checkoutAtMs}).state,'WORK_ITEMS_HELD');
});
test('review-view clock cannot move backwards to revive an otherwise current ticket',()=>{
 const v=createReviewView(),s=scope();v.select(s);const first=v.begin('stay');assert.equal(v.settle(first,{nowMs:NOW+10,currentScope:s}).state,'REVIEW_SCOPE_CURRENT_HELD');
 const second=v.begin('stay');assert.equal(v.settle(second,{nowMs:NOW+9,currentScope:s}).state,'REVIEW_RESPONSE_DISCARDED');
});
