import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';
import {requiresRevision,reviewRevisionCut} from './revision-cut.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8'),body=(s,tag)=>s.split('as $'+tag+'$')[1].split('$'+tag+'$')[0];
test('authority policy advances on revocation/relationship changes, without self-invalidating incident status writes',()=>{
 const a={id:'fake_incident',account_id:'fake_account',property_id:'fake_property',stay_id:'fake_stay',status:'waiting_manager'};
 assert.equal(requiresRevision('public.concierge_incidents','UPDATE',[a],[{...a,status:'resolving'}]),false);
 for(const k of ['id','account_id','property_id','stay_id'])assert.equal(requiresRevision('public.concierge_incidents','UPDATE',[a],[{...a,[k]:'changed'}]),true);
 assert.equal(requiresRevision('auth.sessions','DELETE'),true);assert.equal(requiresRevision('public.concierge_account_members','UPDATE',[],[]),true);assert.equal(requiresRevision('public.concierge_incidents','TRUNCATE'),true);assert.throws(()=>requiresRevision('unreviewed.table','UPDATE'));
});
test('a missing clock or stale/different independent cut cannot bootstrap authority or admit a restored backup',()=>{
 const c={datasetId:'a'.repeat(64),recoveryEpoch:8,authorityVersion:51,bootstrapProvenanceRef:'00000000-0000-4000-8000-000000000001'},w={...c,restrictionVersion:72,inventoryDigest:'b'.repeat(64),restrictionDigest:'c'.repeat(64),authorityCommitRef:'00000000-0000-4000-8000-000000000002',restrictionJournalId:'qa_fixture_only',observedAtMs:1000,expiresAtMs:2000};
 assert.equal(reviewRevisionCut(null,w,1500).state,'HELD_NO_CURRENT_INDEPENDENT_CUT');assert.equal(reviewRevisionCut(c,w,1500).actualSqlVerified,false);
 for(const patch of [{authorityVersion:50},{authorityVersion:52},{datasetId:'d'.repeat(64)},{recoveryEpoch:7},{restrictionVersion:0},{inventoryDigest:null},{authorityCommitRef:null},{expiresAtMs:null},{observedAtMs:1600}])assert.equal(reviewRevisionCut(c,{...w,...patch},1500).state,'HELD_NO_CURRENT_INDEPENDENT_CUT');
});
test('SQL remains aborted and unbootstrapped; revision cut and binding explicitly reject NULL freshness',()=>{
 for(const file of readdirSync(new URL('.',import.meta.url)).filter(x=>x.endsWith('.sql'))){const s=read(file);assert.ok(s.indexOf('raise exception')<Math.max(s.indexOf('create '),s.indexOf('select current_user'))||file.startsWith('00-source'));assert.ok(s.trim().endsWith('rollback;'));}
 const s=read('01-revisions-DO-NOT-APPLY.sql');assert.ok(!/insert into .*authority_clock_v2/i.test(s));assert.ok(s.includes('authority_revision=c.authority_revision+1'));assert.ok(!/authority_revision bigint[^\n]*default/i.test(s));assert.ok(s.includes('f.observed_at is null or f.expires_at is null'));
 assert.ok(read('02-admission-DO-NOT-APPLY.sql').includes('b.expires_at is null'));assert.ok(s.includes('INDEPENDENT_FLOOR_REQUIRED'));
});
test('NEW admission is separate from effect bindings and KNOWN never mutates or rewrites original history',()=>{
 const s=read('02-admission-DO-NOT-APPLY.sql'),admit=body(s,'admit');assert.ok(s.includes('create table concierge_incident_private_v1.admission_v2'));
 assert.ok(!/insert into .*intent_binding\b/i.test(admit));assert.ok(admit.indexOf("'KNOWN'")<admit.indexOf('insert into'));assert.ok(!/update .*original_ref|on conflict.*update/i.test(s));assert.ok(admit.includes('original_reference_v2'));
});
test('provider-bound ABI 17/10 preserves the source writer/reader and rejects old entry fallback',()=>{
 const s=read('03-bound-entries-DO-NOT-APPLY.sql');for(const [name,n] of [['change_state_bound_v2',17],['read_effect_bound_v2',10]]){const args=s.match(new RegExp(name+'\\(([^)]+)\\)'))[1].split(',');assert.equal(args.length,n);assert.equal(args.at(-1).trim(),'p_provider_binding uuid');}
 assert.ok(!/\.change_state_v1\(/.test(s));assert.ok(body(s,'writer').includes('concierge_manager_set_incident_state(p_incident,p_member,p_status,p_summary)'));assert.ok(body(s,'reader').includes('assert_claimed_admission_v2'));assert.ok(!/\b(insert|update|delete|truncate|merge)\b/i.test(body(s,'reader')));
 assert.ok(s.includes('p_provider_binding,p_floor'));
 assert.ok(body(s,'reader').includes("'providerBindingRef',p_provider_binding"));
});
test('ACL proposal includes actual invoker dependencies and gives logins no DML or broad service entries',()=>{
 const c=JSON.parse(read('EXPECTED-CATALOG.json')),writer='cheveni_incident_writer_owner_v1',scope='cheveni_incident_scope_owner_v1';
 for(const relation of ['public.concierge_account_members','public.concierge_member_property_permissions'])assert.ok(c.grants.some(g=>g.role===writer&&g.object===relation&&g.kind==='SELECT'));
 const p=c.grants.find(g=>g.role===scope&&g.object==='public.concierge_member_property_permissions'&&g.kind==='SELECT');assert.ok(p.columns.includes('can_manage_team'));assert.ok(p.columns.includes('can_manage_secrets'));
 for(const [login,entries] of Object.entries(c.entries)){assert.ok(entries.every(x=>!/manager_action|checkout|suspend|change_state_v1\(/.test(x)));assert.equal(c.grants.filter(g=>g.role===login).every(g=>g.kind==='EXECUTE'),true);}
 for(const name of ['bound_claim_matches_v2','assert_provider_v2','provider_binding_v2'])assert.ok(c.grants.some(g=>g.role==='cheveni_incident_readback_owner_v1'&&g.kind==='EXECUTE'&&g.object.startsWith('concierge_incident_private_v1.'+name+'(')),'SECURITY INVOKER must retain the actual reader role through helper calls');
 assert.equal(c.effectiveMinimumPrivilegeAccredited,false);assert.equal(c.rlsSourceContextImplemented,false);
 for(const [relation,command] of [['public.concierge_incidents','UPDATE'],['public.concierge_incident_events','INSERT'],['public.concierge_audit_events','INSERT']])assert.ok(c.policies.some(p=>p.table===relation&&p.role===writer&&p.command===command&&p.predicate.includes('source_row_visible_v2')));
});
test('hook matrix covers before-fence ordering and does not advance authority for admission/effect bookkeeping',()=>{
 const h=JSON.parse(read('HOOK-MATRIX.json')).hooks;assert.equal(h.filter(x=>x.mode==='FENCE_ONLY_NO_AUTHORITY_INCREMENT').length,3);assert.ok(h.some(x=>x.table==='auth.users'&&x.tgtype===62));assert.ok(h.some(x=>x.table==='public.concierge_incidents'&&x.criticalColumns?.includes('stay_id')));
 assert.equal(h.filter(x=>x.table==='public.concierge_incidents').length,3);assert.ok(h.every(x=>[62,44,16].includes(x.tgtype)));
});
test('capture is held, metadata-only, and distinguishes pg_depend from complete late-bound dependency proof',()=>{
 const c=read('05-catalog-capture-NOT-RUN.sql');assert.ok(c.includes('begin read only;'));assert.ok(c.includes('REQUIRES_SEPARATE_LAB_AUTHORIZATION'));for(const name of ['pg_auth_members','pg_default_acl','pg_policy','pg_trigger','pg_depend','has_function_privilege','has_column_privilege'])assert.ok(c.includes(name));
 assert.ok(!/select[^;]*\b(rolpassword|prosrc\s*,|access_token|refresh_token)\b/i.test(c));assert.ok(c.includes('pg_depend alone does NOT discover'));assert.ok(c.includes('closure_limit_reached'));
});
