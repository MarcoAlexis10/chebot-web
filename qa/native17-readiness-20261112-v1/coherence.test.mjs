import test from 'node:test';import assert from 'node:assert/strict';
import {loadPacket,inspectPacket,names} from './coherence.mjs';
const baseline=process.execArgv.includes('--conditions=baseline'),dir=baseline?'../incident-native17-review-20261111-v1/':'./sql/';
const p=loadPacket(new URL(dir,import.meta.url)),report=inspectPacket(p);
test('immutable intent lock and NEW/KNOWN original provenance agree with the proposed ACL',()=>{
 assert.deepEqual(report.findings.filter(f=>['IMMUTABLE_INTENT_LOCK_PRIVILEGE','KNOWN_ORIGINAL_NOT_COMPARED'].includes(f.id)),[]);
});
test('restrictive RLS guards cannot be OR-ed away and remain enforced on source and effect tables',()=>{
 assert.deepEqual(report.findings.filter(f=>['PERMISSIVE_POLICY_BYPASS','RLS_ENABLE_FORCE_UNSPECIFIED'].includes(f.id)),[]);
});
test('provider projection and final revalidation agree across storage, writer and reader',()=>{
 assert.deepEqual(report.findings.filter(f=>['EFFECT_PROVIDER_PROJECTION_MISSING','PROVIDER_FINAL_REVALIDATION_MISSING'].includes(f.id)),[]);
 const s=p[names[4]],reader=s.split('as $reader$')[1].split('$reader$')[0];assert.ok(!/\b(insert|update|delete|truncate|merge)\b/i.test(reader));
});
test('capture covers owners/schema and all seven review artifacts preserve their hard aborts',()=>{
 assert.deepEqual(report.findings.filter(f=>['CAPTURE_OWNER_SCHEMA_GAP','ABORT_MISSING'].includes(f.id)),[]);
 assert.equal(report.sqlExecuted,false);assert.equal(report.parserUsed,false);
});
