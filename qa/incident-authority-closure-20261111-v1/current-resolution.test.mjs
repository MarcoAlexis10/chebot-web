import test from 'node:test';import assert from 'node:assert/strict';
import {createProtectedCurrentResolution,createCurrentResolutionReview} from './current-resolution.mjs';
import {fixture,command,TOKEN,id,T} from './fixtures.mjs';
test('missing protected producer cannot be replaced by options or client CurrentResolution',async()=>{
 const hostile=new Proxy({},{get(){throw Error('client read');}});assert.equal((await createProtectedCurrentResolution(hostile).resolve(hostile,hostile)).state,'HELD_PROTECTED_SOURCE_MISSING');
 assert.throws(()=>createCurrentResolutionReview({mode:'LIVE'}));
 const x=fixture(),r=x.resolver();assert.throws(()=>r.inspect({...x.row},TOKEN,command()));
});
test('source review uses exact provider-bound identity, two unique source observations and independent floors',async()=>{
 const x=fixture(),r=x.resolver(),c=command(),cap=await r.resolve(TOKEN,c);
 assert.equal(cap.kind,'OFFLINE_CURRENT_RESOLUTION_REVIEW');assert.equal(cap.actualProviderVerified,false);assert.equal(cap.operationalApproval,false);
 assert.equal(x.observations,2);assert.equal(x.floorReads,2);assert.equal(x.revReads,1);
 const got=r.inspect(cap,TOKEN,c);assert.equal(got.resolution.authorityVersion,7);assert.equal(got.plan.parameters[6],'incident_state');assert.equal(got.revision.recoveryEpoch,3);
 assert.equal(Object.hasOwn(cap,'resolution'),false);assert.throws(()=>x.resolver().inspect(cap,TOKEN,c));
});
test('zero, duplicate, accessor, extra and uncorrelated source rows cannot yield authority',async()=>{
 for(const mutate of [v=>v.rows=[],v=>v.rows.push({...v.rows[0]}),v=>Object.defineProperty(v.rows,'0',{get(){throw Error('unsafe');}}),v=>v.requestId=id(99),v=>v.rows[0].extra=true]){
  const x=fixture();x.onRows=mutate;assert.equal((await x.resolver().resolve(TOKEN,command())).state,'HELD_CURRENT_RESOLUTION');
 }
});
test('every incident/stay/property/account/identity join and manage_incidents is checked against source',async()=>{
 for(const patch of [{sessionUserId:id(99)},{incidentStayId:id(99)},{incidentAccountId:id(99)},{incidentPropertyId:id(99)},{stayPropertyId:id(99)},{stayAccountId:id(99)},{propertyAccountId:id(99)},{identityMemberId:id(99)},{identityAccountId:id(99)},{memberAccountId:id(99)},{canManageIncidents:false},{memberStatus:'revoked'},{identityRevokedAt:T},{sessionLive:false},{memberRole:'owner',canManageIncidents:false}]){
  const x=fixture();Object.assign(x.row,patch);assert.equal((await x.resolver().resolve(TOKEN,command())).state,'HELD_CURRENT_RESOLUTION');
 }
});
test('JWT metadata cannot supply roles/revisions; DEV and session mismatch are rejected',async()=>{
 for(const patch of [{iss:'https://tyvwgsdzqipusodxtydv.supabase.co/auth/v1'},{session_id:id(44)},{exp:T/1000}]){
  const x=fixture();Object.assign(x.claims,patch);assert.equal((await x.resolver().resolve(TOKEN,command())).state,'HELD_CURRENT_RESOLUTION');assert.equal(x.observations,0);
 }
 const x=fixture();x.claims.user_metadata={role:'owner',authorityVersion:999};x.row.canManageIncidents=false;assert.equal((await x.resolver().resolve(TOKEN,command())).state,'HELD_CURRENT_RESOLUTION');
});
test('missing revisions, rollback floors, contradictory checkpoint and changed relations fail closed',async()=>{
 for(const mutate of [v=>delete v.authorityVersion,v=>v.restrictionVersion=0,v=>v.authorityVersion--,v=>v.recoveryEpoch--,v=>v.datasetId='d'.repeat(64),v=>v.inventoryDigest='d'.repeat(64),v=>v.sessionId=id(88)]){
  const x=fixture();x.onRevision=mutate;assert.equal((await x.resolver().resolve(TOKEN,command())).state,'HELD_CURRENT_RESOLUTION');
 }
 const x=fixture();x.onRows=v=>{if(x.observations===2)v.rows[0].incidentStayId=id(88);};assert.equal((await x.resolver().resolve(TOKEN,command())).state,'HELD_CURRENT_RESOLUTION');
 const y=fixture();y.onFloor=v=>{if(y.floorReads===2)v.restrictionVersion++;};assert.equal((await y.resolver().resolve(TOKEN,command())).state,'HELD_CURRENT_RESOLUTION');
});
test('local revision floor never regresses and independent floor provider is mandatory',async()=>{
 const x=fixture(),r=x.resolver();assert.equal((await r.resolve(TOKEN,command())).kind,'OFFLINE_CURRENT_RESOLUTION_REVIEW');x.version.restrictionVersion--;assert.equal((await r.resolve(TOKEN,command())).state,'HELD_CURRENT_RESOLUTION');
 const y=fixture();y.options.readCurrentFloor=y.options.readRevisions;assert.throws(()=>y.resolver());
});
test('expiry or revocation during source awaits and capability reuse after expiry cannot pass',async()=>{
 const x=fixture(),c=command();x.options.budgetMs=2000;x.claims.exp=T/1000+1;c.p_token_expires_at=x.claims.exp;x.onFloor=()=>{if(x.floorReads===2)x.now+=1100;};assert.equal((await x.resolver().resolve(TOKEN,c)).state,'HELD_CURRENT_RESOLUTION');
 const y=fixture();y.onRows=v=>{if(y.observations===2)v.rows[0].identityRevokedAt=T;};assert.equal((await y.resolver().resolve(TOKEN,command())).state,'HELD_CURRENT_RESOLUTION');
 const z=fixture(),r=z.resolver(),cap=await r.resolve(TOKEN,command());z.now+=4000;assert.throws(()=>r.inspect(cap,TOKEN,command()));
});
test('capabilities bind the exact bearer and arguments; provider errors disclose no private message',async()=>{
 const x=fixture(),r=x.resolver(),c=command(),cap=await r.resolve(TOKEN,c);assert.throws(()=>r.inspect(cap,'b3RoZXI.aW5jaWRlbnQ.cmV2aWV3',c));c.p_arguments.p_event_summary='different';assert.throws(()=>r.inspect(cap,TOKEN,c));
 const y=fixture();y.options.readRevisions=async()=>{throw Error('PRIVATE_SENTINEL');};const output=await y.resolver().resolve(TOKEN,command());assert.equal(output.state,'HELD_CURRENT_RESOLUTION');assert.equal(JSON.stringify(output).includes('PRIVATE_SENTINEL'),false);
});
