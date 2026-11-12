import test from 'node:test';import assert from 'node:assert/strict';
import {createDomainAbiReview,createProtectedDomainPorts} from './evidence-binding.mjs';
import {bound,propertyCase,stayCase,id,untrustedReceipt} from './fixtures.mjs';
const fail=v=>createDomainAbiReview().compile(v).state==='DOMAIN_ABI_INCOMPATIBLE_HELD';
test('property evidence ABI separates provider/member, quota, jurisdiction, building and independent floor instead of trusting UI authority',()=>{
 const x=bound(),r=createDomainAbiReview(),p=r.compile(x);assert.equal(p.state,'DOMAIN_ABI_REVIEW_HELD');assert.equal(p.actualAuthVerified,false);assert.equal(p.protectedProducerPresent,false);assert.equal(r.describe(p.handle).proposedRevision,5);assert.equal('address'in r.describe(p.handle),false);
 for(const patch of [{userId:id(99)},{sessionId:id(99)},{sessionRevision:3},{issuer:'https://fictional-dev.example.invalid/auth/v1'},{expiresAtMs:x.request.nowMs},{revoked:true}])assert.ok(fail({...x,observations:{...x.observations,provider:{...x.observations.provider,...patch}}}));
 assert.ok(fail({...x,observations:{...x.observations,memberships:[...x.observations.memberships,...x.observations.memberships]}}));
 for(const [key,patch]of [['floor',{datasetId:id(99)}],['floor',{recoveryEpoch:1}],['restrictions',{blocked:true}],['jurisdiction',{designation:'Buenos Aires'}],['quota',{allocatedCount:0}],['quota',{inventoryRevision:10}]])assert.ok(fail({...x,observations:{...x.observations,[key]:{...x.observations[key],...patch}}}));
 const c=propertyCase('property.draft.create');c.command.payload.buildingId=id(90);const b=bound('property',c);assert.equal(r.compile(b).state,'DOMAIN_ABI_REVIEW_HELD');assert.ok(fail({...b,observations:{...b.observations,building:{...b.observations.building,accountId:id(99)}}}));assert.ok(fail({...b,observations:{...b.observations,building:null}}));
 const d=bound('property',propertyCase('property.decision','ready_for_review'));assert.ok(fail({...d,observations:{...d.observations,decision:null}}));
});
test('argument binding is frozen before future use and key order is not a conflict; released handles never reconstruct originals',()=>{
 const x=bound(),r=createDomainAbiReview(),p=r.compile(x);const same=structuredClone(x);same.request.command=Object.fromEntries(Object.entries(same.request.command).reverse());assert.equal(r.compareArguments(p.handle,same).state,'ARGUMENT_BINDING_MODEL_MATCH_HELD');
 x.request.command.payload.configuration.internalName='OTHER FICTIONAL NAME';assert.equal(r.compareArguments(p.handle,x).state,'ARGUMENT_BINDING_MISMATCH_HELD');assert.equal(r.compareArguments(p.handle,x).sqlConflictAccredited,false);
 assert.equal(r.revalidate(p.handle,same.observations,same.request.nowMs).state,'DOMAIN_SOURCES_MODEL_STILL_MATCH_HELD');assert.equal(r.revalidate(p.handle,{...same.observations,quota:{...same.observations.quota,revision:5}},same.request.nowMs).state,'DOMAIN_SOURCES_CHANGED_HELD');
 assert.equal(r.revalidate(p.handle,same.observations,same.observations.provider.expiresAtMs).state,'DOMAIN_SOURCES_CHANGED_HELD');r.release(p.handle);assert.equal(r.describe(p.handle).state,'UNKNOWN');assert.equal(r.inspectReceipt(p.handle,{}).state,'UNKNOWN');
});
test('receipt correlation cannot promote untrusted ACK or claimed COMMIT to success, including after restart and missing producers',async()=>{
 const x=bound(),r=createDomainAbiReview(),p=r.compile(x),receipt=untrustedReceipt(x);assert.equal(r.inspectReceipt(p.handle,receipt).untrustedReceiptShapeMatches,true);assert.equal(r.inspectReceipt(p.handle,receipt).state,'UNKNOWN');assert.equal(r.inspectReceipt(p.handle,receipt).externalCommitVerified,false);
 for(const patch of [{intentId:id(99)},{attemptId:id(99)},{sessionId:id(99)},{operation:'concierge_manager_create_stay'},{authorityRevision:8},{entityRevision:3},{witnessRef:receipt.journalRef},{commit:true}]){const v=r.inspectReceipt(p.handle,{...receipt,...patch});assert.equal(v.state,'UNKNOWN');assert.equal(v.untrustedReceiptShapeMatches,false);assert.equal(v.automaticRetryAllowed,false);}
 assert.equal(createDomainAbiReview().inspectReceipt(p.handle,receipt).state,'UNKNOWN');let touched=0;const poison=new Proxy({},{get(){touched++;throw Error()}}),ports=createProtectedDomainPorts(poison);assert.equal((await ports.property(poison)).receipt,null);assert.equal((await ports.stay(poison)).protectedProducerPresent,false);assert.equal((await ports.reconcile(receipt)).state,'UNKNOWN');assert.equal(touched,0);
});
test('stay ABI requires a current guest-binding source and does not accept an opaque UUID as evidence of association',()=>{
 const x=bound('stay',stayCase('stay.guest.bind')),r=createDomainAbiReview();assert.equal(r.compile(x).state,'DOMAIN_ABI_REVIEW_HELD');assert.ok(fail({...x,observations:{...x.observations,guestBinding:null}}));for(const patch of [{propertyId:id(99)},{stayId:id(99)},{identityGeneration:0},{status:'revoked'},{expiresAtMs:x.request.nowMs}])assert.ok(fail({...x,observations:{...x.observations,guestBinding:{...x.observations.guestBinding,...patch}}}));
 const max=bound();max.request.snapshot.revision=Number.MAX_SAFE_INTEGER;max.request.command.expectedRevision=Number.MAX_SAFE_INTEGER;assert.ok(fail(max));
});
test('revalidation binds guest generation, building revision and decision reviewer rather than only their identifiers',()=>{
 const r=createDomainAbiReview(),g=bound('stay',stayCase('stay.guest.bind')),gh=r.compile(g).handle;assert.ok(gh);
 assert.equal(r.revalidate(gh,{...g.observations,guestBinding:{...g.observations.guestBinding,identityGeneration:3}},g.request.nowMs).state,'DOMAIN_SOURCES_CHANGED_HELD');
 const q=propertyCase('property.draft.create');q.command.payload.buildingId=id(90);const b=bound('property',q),bh=r.compile(b).handle;assert.ok(bh);assert.equal(r.revalidate(bh,{...b.observations,building:{...b.observations.building,revision:4}},b.request.nowMs).state,'DOMAIN_SOURCES_CHANGED_HELD');
 const d=bound('property',propertyCase('property.decision','ready_for_review')),dh=r.compile(d).handle;assert.ok(dh);assert.equal(r.revalidate(dh,{...d.observations,decision:{...d.observations.decision,reviewerMemberId:id(99)}},d.request.nowMs).state,'DOMAIN_SOURCES_CHANGED_HELD');
});
test('Native17 revision cut uses dataset and independent inventory/restriction digests, not an invented UUID dataset type',()=>{
 const x=bound();for(const key of ['restrictions','floor'])Object.assign(x.observations[key],{datasetId:'a'.repeat(64),inventoryDigest:'b'.repeat(64),restrictionJournalId:'qa_synthetic_only',restrictionDigest:'c'.repeat(64),bootstrapProvenanceRef:id(91),authorityCommitRef:id(92)});
 const r=createDomainAbiReview(),p=r.compile(x);assert.equal(p.state,'DOMAIN_ABI_REVIEW_HELD');
 for(const patch of [{datasetId:id(70)},{inventoryDigest:'B'.repeat(64)},{restrictionDigest:null},{restrictionJournalId:'unapproved journal'},{bootstrapProvenanceRef:null},{authorityCommitRef:null}])assert.equal(r.compile({...x,observations:{...x.observations,restrictions:{...x.observations.restrictions,...patch},floor:{...x.observations.floor,...patch}}}).state,'DOMAIN_ABI_INCOMPATIBLE_HELD');
 const changed={...x.observations,restrictions:{...x.observations.restrictions,inventoryDigest:'d'.repeat(64)},floor:{...x.observations.floor,inventoryDigest:'d'.repeat(64)}};assert.equal(r.revalidate(p.handle,changed,x.request.nowMs).state,'DOMAIN_SOURCES_CHANGED_HELD');
});
