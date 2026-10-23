import test from 'node:test';import assert from 'node:assert/strict';
import {compilePrivateDevReleasePlan} from './private-release-plan.mjs';
import {provisionalMetadata} from './envelope-v3.mjs';
const DEV='tyvwgsdzqipusodxtydv';
const source={project:DEV,database:'postgres',host:'db.'+DEV+'.supabase.co',port:5432,user:'postgres',sslMode:'verify-full',caSha256:'a'.repeat(64)};
test('real-source compiled profile is offline, fixed DEV and never contains a credential or execution permission',()=>{
 const p=compilePrivateDevReleasePlan(source);assert.equal(p.remoteConnectionEnabled,false);assert.equal(p.executionExposed,false);assert.equal(p.credentialPolicy.environment,false);assert.equal(p.clientPolicy.hostBinds,false);assert.ok(p.plannedCommands.dump.args.includes('--format=custom'));assert.ok(!p.plannedCommands.dump.args.some(x=>x.startsWith('--exclude')));assert.match(p.inventorySnapshotRelationship,/SEPARATE/);
});
test('real-source preparation rejects PROD, transaction pooler, downgrade, arbitrary host and credential input',()=>{
 for(const patch of [{project:'ykfpzqpiaxevpkhpaxpg'},{host:'external.invalid'},{port:6543},{sslMode:'require'},{password:'FICTIONAL_NOT_ACCEPTED'}])assert.throws(()=>compilePrivateDevReleasePlan({...source,...patch}),/SOURCE_PLAN_REJECTED/);
 const p=compilePrivateDevReleasePlan({...source,host:'aws-0-us-east-1.pooler.supabase.com',user:'postgres.'+DEV});assert.equal(p.connection.port,5432);
});
test('V3 header separates the private provisional format without claiming a captured or recovered service',()=>{
 const h=provisionalMetadata();assert.equal(h.format,'CVP3');assert.equal(h.source,'PRIVATE_PROVISIONAL_ADAPTER_V3');assert.equal(h.integralRecoveryVerified,false);assert.equal(h.authFunctionalRestoreVerified,false);assert.equal(h.canOpenGuestAccess,false);assert.equal(h.storageBytes,'NOT_CAPTURED');
});
