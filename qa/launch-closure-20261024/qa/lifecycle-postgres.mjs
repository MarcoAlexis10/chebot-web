// NEW composition tests only. Approved qa_legal SQL is a dependency, NOT its suite.
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {startFixture,sql,cleanup,assertNoResources} from '../../technical-closure-20261022/qa/pg-fixture.mjs';
import {bootstrapOwned} from './owned-bootstrap.mjs';
import {openOwnedSession} from '../../independent-controls-20261024/qa/owned-session.mjs';
const uid=n=>n.toString(16).padStart(8,'0')+'-0000-4000-8000-000000000000';
const A=uid(1),B=uid(2),G=uid(3),H=uid(4),S=uid(5),T=uid(6),P=uid(7),Q=uid(8),ST=uid(9),OT=uid(10),R=uid(11),V=uid(12);
const digest=n=>createHash('sha256').update('FICTIONAL-LIFECYCLE-'+n).digest('hex');
let id,one,two;const checks=[];const pass=name=>{checks.push(name);console.log('PASS '+name);};
const from=Number(process.env.CHEVENI_QA_FROM??1);if(!Number.isSafeInteger(from)||from<1||from>31)throw Error('QA_CASE_SELECTOR_DENIED');let ordinal=0;const skipped=[];async function check(name,fn){ordinal++;if(ordinal<from){skipped.push(name);return;}await fn();pass(name);}
const raw=q=>sql(id,'postgres',q);const result=q=>JSON.parse(raw(q));
const n=(table,where='true')=>Number(raw(`select count(*) from ${table} where ${where};`));
const call=(f,args)=>`select qa_lifecycle.${f}(${args}) as result`;
const guest=(who=3,stay=ST)=>result(call('guest_read',`'${digest(who)}','${stay}'`));
const clock=(who=1,stay=ST)=>result(call('start_clock',`'${digest(who)}','${stay}'`));
const work=(who=1)=>result(call('new_work_allowed',`'${digest(who)}'`));
const exit=(event=uid(50),kind='WITHDRAW',who=1,stay=null)=>result(call('exit',`'${digest(who)}','${event}','${kind}',${stay?"'"+stay+"'":'null'}`));
function seed({supervise=true}={}){
 raw(`truncate qa_lifecycle.outbox,qa_lifecycle.events,qa_lifecycle.erasure_requests,qa_lifecycle.stays,qa_lifecycle.enrollments,qa_legal.audit,qa_legal.candidates,qa_legal.acceptances,qa_legal.delivery_documents,qa_legal.deliveries,qa_legal.credentials,qa_legal.issuances,qa_legal.subjects;
 update qa_legal.gate set release_id=null,generation=0,clock_floor='2000-01-01Z';delete from qa_legal.releases;delete from qa_legal.documents;
 insert into qa_legal.documents select k,'fictional-v'||v,'FICTIONAL LIFECYCLE '||k||v,encode(sha256(convert_to('FICTIONAL LIFECYCLE '||k||v,'UTF8')),'hex'),'https://legal.invalid/'||k||'/v'||v,now()-interval '1 hour',now()+interval '1 day','${uid(13)}' from unnest(array['notice','terms']) k cross join generate_series(1,2) v;
 insert into qa_legal.releases(id,notice_version,terms_version) values('${R}','fictional-v1','fictional-v1'),('${V}','fictional-v2','fictional-v2');
 insert into qa_legal.subjects values('${A}','${S}',0,'ACTIVE'),('${B}','${T}',0,'ACTIVE'),('${G}','${S}',0,'ACTIVE'),('${H}','${T}',0,'ACTIVE');
 ${[1,2,3,4].map((x)=>{const actor=[A,B,G,H][x-1],scope=[S,T,S,T][x-1];return `insert into qa_legal.issuances values('${uid(20+x)}','${actor}','${scope}','SESSION',now()-interval '1 minute',now()+interval '1 hour',false);insert into qa_legal.credentials(id,digest,issuance_id,epoch,issued_at,until_at) values('${uid(30+x)}','${digest(x)}','${uid(20+x)}',0,now()-interval '30 seconds',now()+interval '30 minutes');`;}).join('\n')}
 select qa_legal.publish('${R}');
 select qa_legal.confirm('${digest(1)}',(qa_legal.deliver('${digest(1)}')->>'deliveryId')::uuid);
 select qa_legal.confirm('${digest(2)}',(qa_legal.deliver('${digest(2)}')->>'deliveryId')::uuid);`);
 if(supervise)raw(`insert into qa_lifecycle.enrollments select c.scope,c.actor,c.event_id,0,case when c.scope='${S}' then '${P}'::uuid else '${Q}'::uuid end,'SUPERVISED_FIXTURE',null,null from qa_legal.candidates c;
 insert into qa_lifecycle.stays values('${ST}','${S}','${P}','${G}','VERIFIED_FIXTURE',now()-interval '1 minute',now()+interval '1 hour',null,null),('${OT}','${T}','${Q}','${H}','VERIFIED_FIXTURE',now()-interval '1 minute',now()+interval '1 hour',null,null);`);
}
async function blocked(waiter,holder){for(let k=0;k<120;k++){if(raw(`select ${holder}=any(pg_blocking_pids(${waiter}));`)==='t')return;await new Promise(r=>setTimeout(r,20));}throw Error('QA_BLOCK_NOT_OBSERVED');}
async function race(firstSql,secondSql){await one.exec('begin;');try{await one.exec(firstSql+';');const pending=two.query(secondSql);pending.catch(()=>{});await blocked(two.pid,one.pid);await one.exec('commit;');return (await pending).rows[0].result;}catch(e){await one.exec('rollback;');throw e;}}
try{
 id=await startFixture('closed-target');bootstrapOwned(id,"begin;set local cheveni.qa_mode='FICTIONAL_ONLY';\n"+readFileSync(new URL('../../legal-acceptance-20261024/LEGAL-ACCEPTANCE-FICTIONAL-DO-NOT-INSTALL.sql',import.meta.url),'utf8')+'\n'+readFileSync(new URL('../LIFECYCLE-FICTIONAL-DO-NOT-INSTALL.sql',import.meta.url),'utf8')+'\ncommit;');
 one=await openOwnedSession(id);two=await openOwnedSession(id);await one.exec('set role qa_lifecycle_bridge;');await two.exec('set role qa_lifecycle_bridge;');
 await check('acceptance_is_not_supervised_enrollment_activation_or_trial_start',async()=>{
 seed({supervise:false});assert.equal(n('qa_legal.acceptances'),2);assert.equal(work().ok,false);assert.equal(clock().ok,false);assert.equal(guest().ok,false);assert.equal(n('qa_lifecycle.enrollments'),0);
 });
 await check('current_acceptance_and_scoped_fixture_identity_do_not_implicitly_start_clock',async()=>{

 seed();assert.equal(work().ok,true);assert.equal(guest().privateAccess,true);assert.equal(n('qa_lifecycle.enrollments','beta_start is not null'),0);assert.equal(n('qa_lifecycle.events'),0);
 });
 await check('manager_legal_revocation_blocks_guest_private_context_manager_work_and_clock',async()=>{

 seed();raw(`select qa_legal.revoke('${A}','${S}','REVOKE');`);assert.equal(guest().privateAccess,false);assert.equal(work().ok,false);assert.equal(clock().ok,false);assert.equal('property' in guest(),false);
 });
 await check('guest_revocation_is_identity_and_scope_specific',async()=>{

 seed();raw(`select qa_legal.revoke('${G}','${S}','REVOKE');`);assert.equal(guest().ok,false);assert.equal(guest(4,OT).ok,true);
 });
 await check('manager_identity_and_other_tenant_guest_cannot_use_stay_identifiers_as_authority',async()=>{

 seed();for(const [who,stay] of [[3,OT],[4,ST],[1,ST],[2,ST]])assert.equal(guest(who,stay).ok,false);assert.equal(guest().ok,true);
 });
 await check('property_binding_is_rechecked_instead_of_trusting_client_or_stay_scope_alone',async()=>{

 seed();raw(`update qa_lifecycle.stays set property='${Q}' where id='${ST}';`);assert.equal(guest().ok,false);assert.equal(clock().ok,false);
 });
 await check('revoked_original_guest_issuance_invalidates_previously_working_access',async()=>{

 seed();raw(`update qa_legal.issuances set revoked=true where actor='${G}';`);assert.equal(guest().ok,false);
 });
 await check('new_composition_keeps_checkout_exclusive_and_public_safe_help_available',async()=>{

 seed();raw(`update qa_lifecycle.stays set access_from=now()+interval '1 minute',access_until=now()+interval '2 minutes' where id='${ST}';`);assert.equal(guest().ok,false);raw(`update qa_lifecycle.stays set access_from=now()-interval '2 minutes',access_until=clock_timestamp() where id='${ST}';`);assert.equal(guest().ok,false);assert.equal(guest().safeHelp,true);
 });
 await check('end_stay_is_atomic_scoped_private_access_revocation_and_pending_outbox_only',async()=>{

 seed();{const r=exit(uid(50),'END_STAY',1,ST);assert.equal(r.ok,true);assert.equal(r.erasureComplete,false);assert.equal(guest().ok,false);assert.equal(n('qa_lifecycle.outbox'),1);assert.equal(n('qa_lifecycle.events',"kind='END_STAY'"),1);assert.equal(n('qa_lifecycle.enrollments','beta_start is not null'),0);}
 });
 await check('foreign_manager_cannot_end_another_accounts_stay',async()=>{

 seed();assert.equal(exit(uid(50),'END_STAY',2,ST).ok,false);assert.equal(n('qa_lifecycle.events'),0);assert.equal(guest().ok,true);
 });
 await check('exact_end_receipt_replay_is_idempotent_despite_later_legal_version_or_trial_expiry',async()=>{

 seed();exit(uid(50),'END_STAY',1,ST);raw(`select qa_legal.publish('${V}');update qa_lifecycle.enrollments set beta_start=now()-interval '721 hours',beta_end=now()-interval '1 hour';`);assert.equal(exit(uid(50),'END_STAY',1,ST).idempotent,true);assert.equal(n('qa_lifecycle.events'),1);assert.equal(n('qa_lifecycle.outbox'),1);
 });
 await check('idempotency_key_cannot_be_rebound_to_other_action_actor_or_target',async()=>{

 seed();exit(uid(50),'END_STAY',1,ST);assert.equal(exit(uid(50),'WITHDRAW').ok,false);assert.equal(exit(uid(50),'END_STAY',2,OT).ok,false);assert.equal(guest(4,OT).ok,true);
 });
 await check('withdrawal_revokes_legal_epoch_and_stays_without_resetting_clock_or_claiming_external_completion',async()=>{

 seed();clock();{const start=raw(`select beta_start from qa_lifecycle.enrollments where scope='${S}';`),r=exit();assert.equal(r.ok,true);assert.equal(r.externalPropagationVerified,false);assert.equal(guest().ok,false);assert.equal(work().ok,false);assert.equal(clock().ok,false);assert.equal(raw(`select state from qa_legal.subjects where actor='${A}' and scope='${S}';`),'REVOKED');assert.equal(raw(`select beta_start from qa_lifecycle.enrollments where scope='${S}';`),start);assert.equal(n('qa_lifecycle.outbox'),1);assert.equal(exit().idempotent,true);assert.equal(n('qa_lifecycle.outbox'),1);}
 });
 await check('erasure_request_blocks_processing_but_retains_evidence_for_proportional_review_not_fake_total_deletion',async()=>{

 seed();{const r=exit(uid(51),'ERASURE_HOLD');assert.equal(r.erasureComplete,false);assert.equal(n('qa_legal.acceptances'),2);assert.equal(n('qa_lifecycle.erasure_requests',"state='REVIEW_REQUIRED'"),1);assert.equal(guest().ok,false);assert.equal(raw(`select state from qa_legal.subjects where actor='${A}';`),'ERASURE_HOLD');}
 });
 await check('version_obsolescence_blocks_service_but_never_forces_reacceptance_to_withdraw',async()=>{

 seed();raw(`select qa_legal.publish('${V}');`);assert.equal(guest().ok,false);assert.equal(work().ok,false);assert.equal(exit().ok,true);
 });
 await check('new_legal_lifecycle_composition_starts_fixture_clock_once_with_no_billing_or_extension',async()=>{

 seed();{const r=clock();assert.equal(r.ok,true);assert.equal(n('qa_lifecycle.events',"kind='START_CLOCK'"),1);assert.equal(raw(`select beta_end-beta_start=interval '720 hours' from qa_lifecycle.enrollments where scope='${S}';`),'t');const start=raw(`select beta_start from qa_lifecycle.enrollments where scope='${S}';`);assert.equal(clock().idempotent,true);assert.equal(raw(`select beta_start from qa_lifecycle.enrollments where scope='${S}';`),start);assert.equal(n('qa_lifecycle.events',"kind='START_CLOCK'"),1);}
 });
 await check('revoked_legal_acceptance_cannot_be_used_to_start_a_first_stay_clock',async()=>{

 seed();raw(`select qa_legal.revoke('${A}','${S}','REVOKE');`);assert.equal(clock().ok,false);assert.equal(n('qa_lifecycle.enrollments','beta_start is not null'),0);assert.equal(n('qa_lifecycle.events'),0);
 });
 await check('proposed_expiry_policy_blocks_new_work_preserves_bounded_existing_stay_and_allows_exit',async()=>{

 seed();raw(`update qa_lifecycle.enrollments set beta_start=now()-interval '721 hours',beta_end=now()-interval '1 hour' where scope='${S}';`);assert.equal(work().ok,false);assert.equal(guest().privateAccess,true);assert.equal(exit(uid(52),'END_STAY',1,ST).ok,true);assert.equal(guest().privateAccess,false);
 });
 await check('outbox_storage_failure_rolls_back_legal_revocation_stays_events_and_audit_without_private_errors',async()=>{

 seed();raw("create function qa_lifecycle.inject_failure() returns trigger language plpgsql as $$begin raise exception 'FICTIONAL_SECRET user@example.invalid';end$$;create trigger qa_outbox_failure before insert on qa_lifecycle.outbox for each row execute function qa_lifecycle.inject_failure();");{let e;try{exit();}catch(error){e=error;}assert.equal(e.message,'FIXTURE_DOCKER_FAILED_HOST');assert.equal(/SECRET|example/.test(e.message),false);assert.equal(n('qa_lifecycle.events'),0);assert.equal(n('qa_lifecycle.outbox'),0);assert.equal(raw(`select state from qa_lifecycle.enrollments where scope='${S}';`),'SUPERVISED_FIXTURE');assert.equal(raw(`select state||epoch from qa_legal.subjects where actor='${A}';`),'ACTIVE0');assert.equal(guest().ok,true);assert.equal(n('qa_legal.audit',"action='REVOKE'"),0);}raw('drop trigger qa_outbox_failure on qa_lifecycle.outbox;drop function qa_lifecycle.inject_failure();');
 });
 await check('bridge_cannot_self_approve_forge_journal_ack_read_tables_or_execute_private_helpers',async()=>{

 seed();assert.equal(raw("select not has_table_privilege('qa_lifecycle_bridge','qa_lifecycle.outbox','UPDATE') and not has_table_privilege('qa_lifecycle_bridge','qa_lifecycle.enrollments','INSERT') and not has_function_privilege('qa_lifecycle_bridge','qa_lifecycle.admitted(uuid,timestamptz)','EXECUTE');"),'t');assert.equal(raw("select bool_and(relrowsecurity and relforcerowsecurity) from pg_class where relnamespace='qa_lifecycle'::regnamespace and relkind='r';"),'t');assert.equal(raw("select not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a where p.pronamespace='qa_lifecycle'::regnamespace and a.grantee=0 and a.privilege_type='EXECUTE');"),'t');
 });
 await check('withdrawal_committing_while_guest_waits_is_observed_after_lock_not_old_snapshot',async()=>{

 seed();{const r=await race(call('exit',`'${digest(1)}','${uid(50)}','WITHDRAW',null`),call('guest_read',`'${digest(3)}','${ST}'`));assert.equal(r.privateAccess,false);assert.equal(n('qa_lifecycle.outbox'),1);}
 });
 await check('read_before_withdrawal_linearizes_once_and_next_read_is_denied',async()=>{

 seed();{await one.exec('begin;');assert.equal((await one.query(call('guest_read',`'${digest(3)}','${ST}'`))).rows[0].result.privateAccess,true);const pending=two.query(call('exit',`'${digest(1)}','${uid(50)}','WITHDRAW',null`));await blocked(two.pid,one.pid);await one.exec('commit;');assert.equal((await pending).rows[0].result.ok,true);assert.equal(guest().ok,false);}
 });
 await check('end_stay_committing_before_clock_start_prevents_late_activation',async()=>{

 seed();{const r=await race(call('exit',`'${digest(1)}','${uid(50)}','END_STAY','${ST}'`),call('start_clock',`'${digest(1)}','${ST}'`));assert.equal(r.ok,false);assert.equal(n('qa_lifecycle.events',"kind='START_CLOCK'"),0);}
 });
 await check('clock_then_checkout_keeps_original_window_and_prevents_reactivation_of_ended_stay',async()=>{

 seed();{const r=await race(call('start_clock',`'${digest(1)}','${ST}'`),call('exit',`'${digest(1)}','${uid(50)}','END_STAY','${ST}'`));assert.equal(r.ok,true);assert.equal(n('qa_lifecycle.events',"kind='START_CLOCK'"),1);assert.equal(guest().ok,false);assert.equal(clock().ok,false);}
 });
 await check('guest_waiting_across_checkout_uses_database_time_after_lock',async()=>{

 seed();raw(`update qa_lifecycle.stays set access_until=clock_timestamp()+interval '0.6 seconds' where id='${ST}';`);await one.exec('set role qa_legal_owner;begin;');await one.exec('select singleton from qa_legal.gate where singleton=1 for update;');{const p=two.query(call('guest_read',`'${digest(3)}','${ST}'`));await blocked(two.pid,one.pid);raw('select pg_sleep(0.7);');await one.exec('commit;');assert.equal((await p).rows[0].result.ok,false);await one.exec('set role qa_lifecycle_bridge;');}
 });
 await check('cached_guest_identity_cannot_bypass_new_legal_release',async()=>{

 seed();{await one.exec('set role qa_legal_publisher;begin;');await one.exec(`select qa_legal.publish('${V}');`);const p=two.query(call('guest_read',`'${digest(3)}','${ST}'`));await blocked(two.pid,one.pid);await one.exec('commit;');assert.equal((await p).rows[0].result.ok,false);await one.exec('set role qa_lifecycle_bridge;');}
 });
 await check('expired_current_document_disables_service_without_blocking_contract_exit',async()=>{

 seed();raw("update qa_legal.documents set until_at=clock_timestamp() where version='fictional-v1';");assert.equal(guest().ok,false);assert.equal(work().ok,false);assert.equal(exit().ok,true);
 });
 await check('receipt_replay_requires_original_unexpired_unrevoked_session_not_just_event_uuid',async()=>{

 seed();exit();assert.equal(exit(uid(50),'WITHDRAW',4).ok,false);raw(`update qa_legal.issuances set revoked=true where actor='${A}';`);assert.equal(exit().ok,false);assert.equal(n('qa_lifecycle.outbox'),1);
 });
 await check('clock_regression_blocks_all_composed_operations_without_side_effects',async()=>{

 seed();raw("update qa_legal.gate set clock_floor=now()+interval '1 hour';");for(const r of [guest(),work(),clock(),exit()])assert.equal(r.ok,false);assert.equal(n('qa_lifecycle.events'),0);
 });
 await check('new_evidence_and_outbox_have_only_fictional_pseudonyms_no_contact_or_message_fields',async()=>{

 assert.equal(raw("select count(*) from information_schema.columns where table_schema='qa_lifecycle' and column_name~'(phone|email|name|password|token|message|ip_address)';"),'0');
 });
 await check('nested_revocation_and_exit_never_lower_clock_floor_below_committed_evidence',async()=>{
  for(const kind of ['WITHDRAW','ERASURE_HOLD','END_STAY']){
   seed();const r=exit(uid(65),kind,1,kind==='END_STAY'?ST:null);assert.equal(r.ok,true);
   assert.equal(raw("select clock_floor >= (select max(at) from (select at from qa_legal.audit union all select at from qa_lifecycle.events) evidence) from qa_legal.gate where singleton=1;"),'t');
   assert.equal(n('qa_lifecycle.outbox'),1);assert.equal(guest().ok,false);
   assert.equal(r.externalPropagationVerified,false);assert.equal(r.operationalApproval,false);
  }
 });

}finally{await one?.close();await two?.close();if(id)cleanup(id);}
assertNoResources();pass('new_lifecycle_lab_removes_all_owned_resources');
console.log(JSON.stringify({result:'NEW_LIFECYCLE_COMPOSITION_FICTIONAL_PASS',passed:checks.length,checks,realOperationalControlsClosed:0,productionIntegrationVerified:false,independentJournalWritten:false,erasureExecuted:false,beta:'NO_GO',historicalSuitesRepeated:false,fromCase:from,skippedNewCases:skipped}));
