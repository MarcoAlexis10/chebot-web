import test from 'node:test';import assert from 'node:assert/strict';
import {reviewPropertyLifecycle as review,createPropertyPorts,operations} from './property-lifecycle.mjs';
import {propertyCase,id} from './fixtures.mjs';
test('property commands distinguish draft/configuration/review/decision/pause/archive without inventing writes or authority',()=>{
 for(const [operation,from,to]of [['property.draft.create',null,'draft'],['property.configure','draft','draft'],['property.submit','draft','ready_for_review'],['property.decision','ready_for_review','active'],['property.pause','active','paused'],['property.archive','paused','archived'],['property.read','archived','archived']]){
  const x=propertyCase(operation,from??'draft'),r=review(x);assert.equal(r.state,'PROPERTY_TRANSITION_REVIEWED_HELD',operation);assert.equal(r.to,to);assert.equal(r.operationalApproval,false);assert.equal(r.sourceProducerPresent,false);assert.equal(r.receipt,null);assert.equal(r.privatePayloadRetained,false);
 }
 assert.equal(review(propertyCase('property.submit','active')).state,'PROPERTY_REVIEW_REJECTED');
 assert.equal(review(propertyCase('property.configure','ready_for_review')).state,'PROPERTY_REVIEW_REJECTED');
});
test('property review rejects client authority, stale revision, wrong account/building, unprotected cohort and private extras',()=>{
 const x=propertyCase();
 for(const patch of [{role:'co_manager'},{role:'manager'},{sessionId:id(99)},{sessionRevision:3},{accountId:id(91)},{authorityRevision:8},{restrictionsRevision:8},{expiresAtMs:x.nowMs},{revoked:true},{cohortCount:2},{jurisdiction:'CABA'}])assert.equal(review({...x,context:{...x.context,...patch}}).state,'PROPERTY_REVIEW_REJECTED');
 for(const patch of [{expectedRevision:3},{accountId:id(3)},{role:'owner'}])assert.equal(review({...x,command:{...x.command,...patch}}).state,'PROPERTY_REVIEW_REJECTED');
 assert.equal(review({...x,snapshot:{...x.snapshot,buildingId:id(9),buildingAccountId:id(91)}}).state,'PROPERTY_REVIEW_REJECTED');
 assert.equal(review({...x,command:{...x.command,payload:{...x.command.payload,configuration:{...x.command.payload.configuration,wifi:'FICTIONAL_REJECT'}}}}).state,'PROPERTY_REVIEW_REJECTED');
 const d=propertyCase('property.decision','ready_for_review');assert.equal(review({...d,command:{...d.command,payload:{...d.command.payload,reviewedRevision:3}}}).state,'PROPERTY_REVIEW_REJECTED');
 const c=propertyCase('property.draft.create');assert.equal(review({...c,context:{...c.context,cohortCount:1}}).state,'PROPERTY_REVIEW_REJECTED');
 let reads=0;const poison={...x.command.payload};Object.defineProperty(poison,'configuration',{get(){reads++;throw Error()}});assert.equal(review({...x,command:{...x.command,payload:poison}}).state,'PROPERTY_REVIEW_REJECTED');assert.equal(reads,0);
});
test('held property ports cannot accept a writer or ACK and never execute callbacks',async()=>{
 let touches=0;const poison=new Proxy({},{get(){touches++;throw Error()}}),ports=createPropertyPorts(poison);
 for(const op of operations){const r=await ports[op](poison);assert.equal(r.state,'PROPERTY_PORT_HELD');assert.equal(r.receipt,null);assert.equal(r.dispatchPerformed,false);assert.equal(r.automaticRetryAllowed,false);}assert.equal(touches,0);
});
test('property configuration rejects unpaired Unicode that cannot survive PostgreSQL UTF8 serialization',async()=>{
 const baseline=process.execArgv.includes('--conditions=baseline');
 const {reviewPropertyShape}=await import('../property-stay-prearrival-20261112-v1/contracts.mjs');
 for(const key of ['internalName','address','floorOrUnit'])for(const text of ['QA\ud800','QA\udfff']){
  const x=propertyCase();x.command.payload.configuration[key]=text;
  if(baseline){assert.notEqual(reviewPropertyShape(x.command.payload.configuration).shapeReviewed,true);return;}
  assert.equal(review(x).state,'PROPERTY_REVIEW_REJECTED');
 }
 const valid=propertyCase();valid.command.payload.configuration.internalName='QA FICTICIA 🧉';assert.equal(review(valid).state,'PROPERTY_TRANSITION_REVIEWED_HELD');
});
