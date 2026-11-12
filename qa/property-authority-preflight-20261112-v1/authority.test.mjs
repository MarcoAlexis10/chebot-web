import test from 'node:test';import assert from 'node:assert/strict';
import {reviewAuthoritySourceComposition,createProtectedPropertyAuthority} from './authority-source.mjs';
test('existing active-property and started-trial scope cannot authorize a first NULL-property draft; source caller pairs cannot be silently widened',async()=>{
 const r=reviewAuthoritySourceComposition();assert.equal(r.state,'PROPERTY_AUTHORITY_COMPOSITION_HELD');assert.equal(r.scopeV2Reusable,false);assert.equal(r.launchReusable,false);assert.equal(r.privateReaderCallerAcceptedByAuthSource,false);assert.equal(r.privateWriterCallerAcceptedByFenceSource,false);assert.ok(r.incompatibilities.includes('POST_CAPTURE_READER_CANNOT_REQUIRE_FREE_SLOT'));assert.equal(r.installedCatalogObserved,false);assert.equal(r.dispatchPlan,null);
 let touched=0;const poison=new Proxy({},{get(){touched++;throw Error();}}),p=createProtectedPropertyAuthority(poison);for(const f of [p.resolve,p.admit]){const x=await f(poison);assert.equal(x.receipt,null);assert.equal(x.dispatchPerformed,false);}assert.equal(touched,0);
});
