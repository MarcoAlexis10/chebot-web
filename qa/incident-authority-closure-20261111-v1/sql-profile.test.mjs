import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {reviewIncidentProfile} from './profile-check.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8'),profile=()=>JSON.parse(read('ROLE-PROFILE.json'));
const sql=()=>read('incident-only-DO-NOT-APPLY.sql'),body=tag=>sql().split('as $'+tag+'$')[1].split('$'+tag+'$')[0];
test('incident SQL has an unconditional pre-DDL abort, independent logins and no old broad service call',()=>{
 const s=sql();assert.ok(s.indexOf("raise exception 'CHEVENI_INCIDENT_REVIEW_DO_NOT_APPLY'")<s.indexOf('create schema'));assert.ok(s.trim().endsWith('rollback;'));
 const writer=body('writer'),reader=body('reader');assert.ok(writer.includes('concierge_manager_set_incident_state(p_incident,p_member,p_status,p_summary)'));assert.ok(!/manager_action|checkout|suspend|set role/i.test(writer));assert.ok(!/\b(insert|update|delete|truncate|merge|change_state_v1|concierge_manager_set_incident_state)\b/i.test(reader));
 assert.equal(s.split('\n').filter(l=>l.startsWith('grant execute')).length,3);assert.ok(!/create role/i.test(s));assert.equal(reviewIncidentProfile(profile()).state,'PROFILE_REVIEW_MATCHED');
});
test('transitive proposal graph rejects reader helper writes, old principals, owner changes, inheritance and RLS gaps',()=>{
 const good=reviewIncidentProfile(profile());assert.equal(good.minimumPrivilegeAccredited,false);
 for(const mutation of [p=>p.functions.current_revisions_v1.mutates=true,p=>p.functions.current_resolution_v1.calls.push('business_incident_state'),p=>p.entries.cheveni_incident_readback_backend_v1.push('change_state_v1'),p=>p.publicExecute.push('change_state_v1'),p=>p.roles[0].setRoles.push('writer'),p=>p.roles[0].inherit=true,p=>p.functions.read_effect_v1.owner='cheveni_incident_writer_owner_v1',p=>p.roles.at(-1).login=true,p=>p.functions.current_revisions_v1.securityDefiner=true,p=>p.rls.attempt_binding.force=false,p=>p.ownerColumnRequirements.readerOwner.push('attempt_binding:UPDATE')]){const p=profile();mutation(p);assert.equal(reviewIncidentProfile(p).state,'HELD_PROFILE_MISMATCH');}
});
test('reader and writer compare complete scope, dataset, epoch, inventory, journal and restriction floor',()=>{
 for(const tag of ['writer','reader']){
  const b=body(tag);assert.ok(b.includes('p_floor is distinct from jsonb_build_object('));
  assert.equal(b.split('p_floor is distinct from jsonb_build_object(').length-1,2,'floor must be checked before and after possible work');
  for(const name of ['dataset_id','recovery_epoch','inventory_digest','restriction_journal_id','restriction_digest','authority_revision','restriction_revision'])assert.ok(b.includes('rev.'+name));
 }
});
test('durable proposal stores only opaque original reference/metadata, enforces uniqueness and never retries an existing binding',()=>{
 const table=sql().split('create table concierge_incident_private_v1.intent_binding(')[1].split('alter table')[0];assert.ok(!/\b(summary|phone|name|argument_digest|frame|payload)\b/i.test(table));
 assert.ok(table.includes('primary key(user_id,intent_id)'));assert.ok(table.includes('unique(user_id,attempt_id)'));assert.ok(table.includes('dispatch_id uuid not null unique'));
 const w=body('writer');assert.ok(w.indexOf("'RECONCILIATION_REQUIRED'")<w.indexOf('insert into concierge_incident_private_v1.intent_binding'));assert.ok(w.includes('dispatch_claim_v1('));
 assert.ok(body('gate').includes('INCIDENT_NATIVE_FENCE_AUTH_FLOORS_CUSTODY_NOT_ACCREDITED'));assert.ok(sql().includes('where false'));
 for(const t of ['intent_binding','attempt_binding'])assert.ok(sql().includes(`alter table concierge_incident_private_v1.${t} owner to cheveni_incident_data_owner_v1;`));
});
