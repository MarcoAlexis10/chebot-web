import test from 'node:test';import assert from 'node:assert/strict';
import {reviewPublicProjection as projection,createPublicCatalogPort} from './public-projection.mjs';
import {reviewPermissionScope as permission} from './permissions.mjs';
import {prearrival} from '../property-stay-prearrival-20261112-v1/fixtures.mjs';
import {context,id,NOW} from './fixtures.mjs';
const catalog=()=>({mode:'OFFLINE_VECTOR',reservationVector:prearrival(),expectedCatalog:{itemId:id(10),versionId:id(11),contentRevision:2,approvalRevision:3,revocationRevision:4},projection:{accountId:id(3),propertyId:id(4),itemId:id(10),versionId:id(11),contentRevision:2,approvalRevision:3,revocationRevision:4,state:'PROPOSED_PUBLIC_TEMPLATE_ONLY',observedAtMs:990,expiresAtMs:1100,templateKey:'public_guide'}});
test('public projection never publishes historical approved knowledge text, unsafe links or private fields',async()=>{
 const x=catalog(),r=projection(x);assert.equal(r.state,'PUBLIC_TEMPLATE_PROJECTION_REVIEWED_HELD');assert.equal(r.sourceApprovalAccredited,false);assert.equal(r.actualAuthVerified,false);assert.equal('propertyId'in r,false);
 for(const patch of [{content:'FICTIONAL_SECRET_MUST_NOT_LEAK'},{url:'javascript:FICTIONAL_REJECT'},{wifi:'FICTIONAL_REJECT'},{phone:'FICTIONAL_REJECT'},{approved:true},{category:'arrival',risk_level:'normal',status:'approved'},{templateKey:'checkin_codes'}]){const v=projection({...x,projection:{...x.projection,...patch}});assert.equal(v.copy,null);assert.equal(JSON.stringify(v).includes('FICTIONAL'),false);}
 let reads=0;const p={...x.projection};Object.defineProperty(p,'templateKey',{get(){reads++;throw Error()}});assert.equal(projection({...x,projection:p}).copy,null);assert.equal(reads,0);
 const port=createPublicCatalogPort(new Proxy({},{get(){throw Error('NO_SOURCE')}}));assert.equal((await port.read(x)).copy,null);assert.equal(port.free(x).screen,'CHE_VENI_FREE');
});
test('public projection binds catalog versions and retirement independently of reservation, checkout and refresh',()=>{
 const x=catalog();for(const patch of [{versionId:id(99)},{contentRevision:3},{approvalRevision:4},{revocationRevision:5},{state:'WITHDRAWN'},{accountId:id(99)},{propertyId:id(99)},{observedAtMs:1001},{expiresAtMs:1000}])assert.equal(projection({...x,projection:{...x.projection,...patch}}).copy,null);
 for(const mutate of [p=>{p.request.sessionId=id(99)},p=>{p.binding.revoked=true},p=>{p.source.reservationRevision=9},p=>{p.nowMs=2500},p=>{p.nowMs=2000}]){const p=prearrival();mutate(p);assert.equal(projection({...x,reservationVector:p}).copy,null);}
});
const manager=()=>({mode:'OFFLINE_VECTOR',nowMs:NOW,action:'manage_stays',target:{accountId:id(3),propertyId:id(5),stayId:null,taskId:null,personId:null},expectedAuthorityRevision:7,expectedRestrictionsRevision:9,subject:{kind:'manager',vector:context()}});
test('manager roles use current account/property/action flags; client JWT fields or stale authority never create a grant',()=>{
 const x=manager();assert.equal(permission(x).state,'ROLE_RELATION_MODEL_MATCHED_HELD');assert.equal(permission(x).accessAllowed,false);
 for(const patch of [{accountId:id(99)},{propertyId:id(99)},{revoked:true},{authorityRevision:8},{restrictionsRevision:8},{expiresAtMs:NOW},{role:'operational'},{jwt:{role:'owner'}},{role:'co_manager',propertyPermissions:{...x.subject.vector.propertyPermissions,manageStays:false}}])assert.equal(permission({...x,subject:{kind:'manager',vector:{...x.subject.vector,...patch}}}).state,'ROLE_SCOPE_REVIEW_REJECTED');
 assert.equal(permission({...x,action:'property_create'}).state,'ROLE_SCOPE_REVIEW_REJECTED');
});
test('operational tasks and guest reservations remain separate scopes with hard expiration and no manager promotion',()=>{
 const x=manager(),s={personId:id(20),personStatus:'active',accountId:id(3),propertyId:id(5),propertyStatus:'active',taskId:id(21),taskStatus:'active',accessFromMs:NOW-100,accessUntilMs:NOW+100,authorityRevision:7,restrictionsRevision:9,revoked:false,observedAtMs:NOW-1,expiresAtMs:NOW+100};
 const op={...x,action:'operational_secret_access',target:{...x.target,taskId:id(21),personId:id(20)},subject:{kind:'operational',vector:s}};assert.equal(permission(op).state,'ROLE_RELATION_MODEL_MATCHED_HELD');assert.equal(permission(op).accessAllowed,false);
 for(const patch of [{personId:id(99)},{taskId:id(99)},{propertyId:id(99)},{accountId:id(99)},{taskStatus:'revoked'},{personStatus:'revoked'},{accessUntilMs:NOW},{expiresAtMs:NOW},{revoked:true},{authorityRevision:8}])assert.equal(permission({...op,subject:{kind:'operational',vector:{...s,...patch}}}).state,'ROLE_SCOPE_REVIEW_REJECTED');
 assert.equal(permission({...op,action:'manage_stays'}).state,'ROLE_SCOPE_REVIEW_REJECTED');
 const p=prearrival();p.nowMs=2100;const g={...x,nowMs:2100,action:'guest_private_view',target:{accountId:id(3),propertyId:id(4),stayId:id(5),taskId:null,personId:null},subject:{kind:'guest',vector:p}};assert.equal(permission(g).accessAllowed,false);assert.equal(permission(g).state,'ROLE_RELATION_MODEL_MATCHED_HELD');
 assert.equal(permission({...g,target:{...g.target,stayId:id(99)}}).state,'ROLE_SCOPE_REVIEW_REJECTED');const after=prearrival();after.nowMs=2500;assert.equal(permission({...g,nowMs:2500,subject:{kind:'guest',vector:after}}).state,'ROLE_SCOPE_REVIEW_REJECTED');
});
