import test from 'node:test';import assert from 'node:assert/strict';
import {previewPrearrivalVector,freeGuidePreview} from './prearrival.mjs';import {prearrival,id} from './fixtures.mjs';
test('pre-arrival review binds every reservation relation and revision without accepting client approval or private text',()=>{
 const p=prearrival(),out=previewPrearrivalVector(p);assert.equal(out.screen,'PREARRIVAL_PUBLIC_TEXT_REVIEW_ONLY');assert.equal(out.sourceApprovalAccredited,false);assert.equal(out.codesAllowed,false);
 for(const key of Object.keys(p.request))assert.equal(previewPrearrivalVector({...p,request:{...p.request,[key]:id(99)}}).screen,'PREARRIVAL_HELD');
 for(const patch of [{reservationRevision:8},{identityGeneration:3},{propertyId:id(99)},{stayId:id(99)},{templateKeys:['wifi']},{text:'FICTIONAL_SECRET_REJECT'},{approved:true}])assert.equal(previewPrearrivalVector({...p,source:{...p.source,...patch}}).screen,'PREARRIVAL_HELD');
 let reads=0;const source={...p.source};Object.defineProperty(source,'templateKeys',{get(){reads++;return ['public_guide']}});assert.equal(previewPrearrivalVector({...p,source}).screen,'PREARRIVAL_HELD');assert.equal(reads,0);assert.equal('propertyId' in out,false);assert.equal('stayId' in out,false);
});
test('check-in switches to a separate closed private port; checkout/revocation never fall back to reservation data in Free',()=>{
 const p=prearrival();assert.equal(previewPrearrivalVector({...p,nowMs:2000}).screen,'PRIVATE_WINDOW_PORT_HELD');
 for(const patch of [{revoked:true},{expiresAtMs:1000},{verifiedAtMs:1100},{checkoutMs:1000}])assert.equal(previewPrearrivalVector({...p,binding:{...p.binding,...patch}}).screen,'PREARRIVAL_HELD');
 assert.equal(previewPrearrivalVector({...p,nowMs:2500}).screen,'PREARRIVAL_HELD');
 const free=freeGuidePreview(p);assert.equal(free.screen,'CHE_VENI_FREE');assert.equal('propertyId' in free,false);assert.equal('stayId' in free,false);assert.equal(free.guestAccessEnabled,false);
});
