// NEW D01 checkout deltas only. No old test module imported.
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {startFixture,sql,cleanup,assertNoResources} from '../../technical-closure-20261022/qa/pg-fixture.mjs';
import {openOwnedSession} from '../../independent-controls-20261024/qa/owned-session.mjs';
import {bootstrapOwned} from './owned-bootstrap.mjs';
import {readPinnedModel} from './pinned-models.mjs';
import {awaitFinalPostmaster} from './owned-final-postmaster.mjs';
const uid=n=>n.toString(16).padStart(8,'0')+'-0000-4000-8000-000000000000',A=uid(1),G=uid(2),S=uid(3),P=uid(4),ST=uid(5),R=uid(6);
const hash=s=>createHash('sha256').update(s).digest('hex'),M=hash('FICTIONAL_D01_MANAGER'),H=hash('FICTIONAL_D01_GUEST');
let id,holder,waiter;const checks=[],pass=s=>{checks.push(s);console.log('PASS '+s);},raw=q=>sql(id,'postgres',q),j=q=>JSON.parse(raw(q));
const guest=()=>j(`set role qa_d01_bridge;select qa_d01.guest_read('${H}','${ST}');`),clock=()=>j(`set role qa_d01_bridge;select qa_d01.start_clock('${M}','${ST}');`);
function seed(){raw(`truncate qa_d01.checkouts,qa_lifecycle.outbox,qa_lifecycle.events,qa_lifecycle.erasure_requests,qa_lifecycle.stays,qa_lifecycle.enrollments,qa_legal.audit,qa_legal.candidates,qa_legal.acceptances,qa_legal.delivery_documents,qa_legal.deliveries,qa_legal.credentials,qa_legal.issuances,qa_legal.subjects;
 update qa_legal.gate set release_id=null,generation=0,clock_floor='2000-01-01Z';delete from qa_legal.releases;delete from qa_legal.documents;
 insert into qa_legal.documents select k,'fictional-v1','FICTIONAL D01 '||k,encode(sha256(convert_to('FICTIONAL D01 '||k,'UTF8')),'hex'),'https://legal.invalid/'||k,now()-interval '1 hour',now()+interval '1 day','${uid(7)}' from unnest(array['notice','terms']) k;
 insert into qa_legal.releases(id,notice_version,terms_version) values('${R}','fictional-v1','fictional-v1');insert into qa_legal.subjects values('${A}','${S}',0,'ACTIVE'),('${G}','${S}',0,'ACTIVE');
 insert into qa_legal.issuances values('${uid(8)}','${A}','${S}','SESSION',now()-interval '1 minute',now()+interval '1 hour',false),('${uid(9)}','${G}','${S}','SESSION',now()-interval '1 minute',now()+interval '1 hour',false);
 insert into qa_legal.credentials(id,digest,issuance_id,epoch,issued_at,until_at) values('${uid(10)}','${M}','${uid(8)}',0,now()-interval '30 seconds',now()+interval '30 minutes'),('${uid(11)}','${H}','${uid(9)}',0,now()-interval '30 seconds',now()+interval '30 minutes');
 select qa_legal.publish('${R}');select qa_legal.confirm('${M}',(qa_legal.deliver('${M}')->>'deliveryId')::uuid);
 insert into qa_lifecycle.enrollments select scope,actor,event_id,0,'${P}','SUPERVISED_FIXTURE',now()-interval '721 hours',now()-interval '1 hour' from qa_legal.candidates;
 insert into qa_lifecycle.stays values('${ST}','${S}','${P}','${G}','VERIFIED_FIXTURE',now()-interval '1 hour',now()+interval '2 hours',null,null);
 insert into qa_d01.checkouts values('${ST}',now()+interval '1 hour');`);}
async function blocked(){for(let k=0;k<80;k++){if(raw(`select ${holder.pid}=any(pg_blocking_pids(${waiter.pid}));`)==='t')return;await new Promise(r=>setTimeout(r,20));}throw Error('D01_LOCK_NOT_OBSERVED');}
try{
 id=await startFixture('closed-target');await awaitFinalPostmaster(id);
 const kernel=readPinnedModel('legal'),lifecycle=readPinnedModel('lifecycle');
 assert.equal(hash(lifecycle),'b550733a66ddecbf9f0e6c5f569b0621bfa7dbb806aa5b84b3e84725fd9f970b');
 bootstrapOwned(id,"begin;set local cheveni.qa_mode='FICTIONAL_ONLY';\n"+kernel+'\n'+lifecycle+'\n'+readFileSync(new URL('../D01-CHECKOUT-FICTIONAL-DO-NOT-INSTALL.sql',import.meta.url),'utf8')+'\ncommit;');
 seed();const dates=raw('select beta_start::text||beta_end::text from qa_lifecycle.enrollments;');assert.equal(j(`select qa_lifecycle.new_work_allowed('${M}');`).ok,false);assert.equal(guest().privateAccess,true);assert.equal(raw('select beta_start::text||beta_end::text from qa_lifecycle.enrollments;'),dates);pass('confirmed_D01_keeps_verified_stay_after_beta_expiry_without_new_work_clock_extension_or_billing');
 seed();raw(`update qa_d01.checkouts set check_out_at=clock_timestamp()-interval '1 second';`);assert.equal(guest().privateAccess,false);assert.equal(guest().safeHelp,true);assert.equal('property' in guest(),false);pass('checkout_prevails_over_a_wider_access_until_window');
 seed();raw("update qa_lifecycle.stays set access_until=clock_timestamp()-interval '1 second';");assert.equal(guest().ok,false);pass('earlier_access_end_is_not_extended_to_checkout_by_D01');
 seed();for(const kind of ['REVOKE','ERASURE_HOLD']){raw(`select qa_legal.revoke('${A}','${S}','${kind}');`);assert.equal(guest().ok,false);}pass('D01_does_not_override_prior_justified_revocation_or_erasure_hold');
 seed();raw('delete from qa_d01.checkouts;');assert.equal(guest().ok,false);assert.equal(clock().ok,false);assert.equal(raw('select count(*) from qa_lifecycle.events;'),'0');pass('missing_independent_checkout_evidence_denies_access_and_clock_without_events');
 assert.equal(raw("select not has_function_privilege('qa_lifecycle_bridge','qa_lifecycle.guest_read(text,uuid)','EXECUTE') and not has_function_privilege('qa_lifecycle_bridge','qa_lifecycle.start_clock(text,uuid)','EXECUTE') and not has_table_privilege('qa_d01_bridge','qa_d01.checkouts','INSERT,UPDATE,DELETE') and not has_function_privilege('qa_d01_bridge','qa_lifecycle.guest_read(text,uuid)','EXECUTE');"),'t');pass('old_bridge_cannot_bypass_checkout_wrapper_and_new_bridge_cannot_forge_cutoff');
 seed();holder=await openOwnedSession(id);waiter=await openOwnedSession(id);await holder.exec('set role qa_legal_owner;begin;select singleton from qa_legal.gate where singleton=1 for update;');raw("update qa_d01.checkouts set check_out_at=clock_timestamp()+interval '0.6 seconds';");{const p=waiter.query(`select qa_d01.guest_read('${H}','${ST}') as result`);p.catch(()=>{});await blocked();raw('select pg_sleep(0.8);');await holder.exec('commit;');assert.equal((await p).rows[0].result.ok,false);}pass('waiter_crossing_checkout_is_denied_after_gate_lock_even_with_later_access_until');
 seed();raw("update qa_lifecycle.enrollments set beta_start=null,beta_end=null;update qa_d01.checkouts set check_out_at=clock_timestamp()+interval '0.6 seconds';create function qa_d01.slow_clock() returns trigger language plpgsql as $$begin perform pg_sleep(0.8);return new;end$$;create trigger qa_slow before update on qa_lifecycle.enrollments for each row execute function qa_d01.slow_clock();");assert.throws(()=>clock(),/FIXTURE_DOCKER_FAILED_HOST/);assert.equal(raw('select count(*) from qa_lifecycle.enrollments where beta_start is not null;'),'0');assert.equal(raw('select count(*) from qa_lifecycle.events;'),'0');pass('clock_crossing_checkout_during_nested_write_rolls_back_all_clock_mutations');
}finally{await holder?.close();await waiter?.close();if(id)cleanup(id);}
assertNoResources();pass('D01_delta_removes_all_owned_resources');console.log(JSON.stringify({result:'D01_CHECKOUT_NEW_PASS',passed:checks.length,checks,old69Repeated:false,realCheckoutAuthorityVerified:false,operationalApproval:false,beta:'NO_GO'}));
