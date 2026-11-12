import test from 'node:test';import assert from 'node:assert/strict';import {reviewPropertyCustodyReuse,createPropertyOriginalPort} from './custody-contract.mjs';
test('existing CBF1 stay-intent and the unimplemented invite custody verifier cannot be relabeled as exact property-original custody',async()=>{
 const r=reviewPropertyCustodyReuse();assert.equal(r.state,'PROPERTY_ORIGINAL_CUSTODY_MISSING_HELD');assert.equal(r.cbf1PropertyIntentCompatible,false);assert.ok(r.cbf1IntentFields.includes('guestPhoneHash'));assert.ok(!r.cbf1IntentFields.includes('privateAddress'));assert.equal(r.inviteVerifierImplemented,false);assert.equal(r.duplicateRemovalAuthorized,false);assert.equal(r.newProtocolCreated,false);assert.equal(r.personalHashGenerated,false);
 let touches=0;const poison=new Proxy({},{get(){touches++;throw Error();}}),p=createPropertyOriginalPort(poison);assert.equal((await p.compare(poison)).state,'UNKNOWN');assert.equal(touches,0);
});
