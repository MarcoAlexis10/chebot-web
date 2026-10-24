// NEW audit-before-decision integration only. Every successful lab ends ROLLBACK.
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {startFixture,sql,cleanup,assertNoResources} from '../../technical-closure-20261022/qa/pg-fixture.mjs';
import {auditConciergeInstallation} from '../../technical-closure-20261022/qa/a2-input/qa/installation/audit.mjs';
import {auditConsumerRpcAcl} from '../../technical-closure-20261022/qa/a2-input/qa/installation/consumer-acl.mjs';
import {openOwnedSession} from './owned-session.mjs';
const read=p=>readFileSync(new URL('../../technical-closure-20261022/qa/a2-input/'+p,import.meta.url),'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex'),bundle=read('ops/drafts/BA-BETA-ATOMIC-ACL-BUNDLE-PRELEGAL-DO-NOT-APPLY.sql'),contract=JSON.parse(read('qa/installation/contract.json'));
assert.equal(hash(bundle),'f12b5b10f3120eeda3bbbc6d48604a894b63169c6ed66743f2895d499a516846');assert.equal(hash(read('qa/installation/contract.json')),'3d47ba86e774491e97e1aa9d9cb8cb7bc291b533cd661f7a761d41e1929e54d1');assert.equal(hash(read('qa/installation/consumer-contract.json')),'a492d7d5e56d6bfa66837cc01433849c2d74d0a31f289413de5e36bd397a24f1');
assert(/commit;\s*$/i.test(bundle));const held=bundle.replace(/commit;\s*$/i,'');
let id;const checks=[],pass=s=>{checks.push(s);console.log('PASS '+s);};
try{
 id=await startFixture('closed-target');
 for(const f of ['schema','functions','indexes-triggers'])sql(id,'postgres',read('test/fixtures/concierge-runtime-dev-'+f+'.sql'));
 for(const mode of ['clean','tampered-acl','lost-session']){
  const session=await openOwnedSession(id);try{
   await session.exec(held);
   assert.equal(sql(id,'postgres',"select to_regnamespace('concierge_private') is null;"),'t');
   if(mode==='lost-session'){await session.abort();assert.equal(sql(id,'postgres',"select to_regnamespace('concierge_private') is null;"),'t');pass('session_loss_does_not_reconnect_or_make_an_installation_decision');continue;}
   if(mode==='tampered-acl')await session.exec('grant select on concierge_private.runtime_policies_v1 to authenticated;');
   const structural=await auditConciergeInstallation({client:session,contract,bundleSha256:hash(bundle),requireVault:false});
   const consumer=await auditConsumerRpcAcl(session);
   const afterPid=(await session.query('select pg_backend_pid() as pid')).rows[0].pid;assert.equal(afterPid,session.pid);
   if(mode==='clean'){assert.equal(structural.status,'structure_verified');assert.equal(consumer.status,'consumer_rpc_acl_verified');pass('both_approved_auditors_observe_uncommitted_A2_on_the_same_backend_session');}
   else{assert.equal(structural.status,'blocked');assert(structural.issues.some(x=>x.code==='PROTECTED_TABLE_CAPABILITY_EXPOSED'));pass('precommit_catalog_gate_detects_new_table_grant_drift_before_any_commit');}
   await session.exec('rollback;');
   assert.equal(sql(id,'postgres',"select to_regnamespace('concierge_private') is null and not exists(select from pg_roles where rolname like 'cheveni_%');"),'t');
   if(mode==='clean')pass('clean_audit_still_rolls_back_without_installing_or_authorizing_A2');
  }finally{await session.close();}
 }
}finally{if(id)cleanup(id);}
assertNoResources();pass('new_same_session_cases_leave_no_owned_resources');
console.log(JSON.stringify({result:'A2_SAME_SESSION_PREPARATION_PASS',checks,passed:checks.length,operationalApproval:false,commitExecuted:false,postCommitRollbackVerified:false,requireVault:false,realTargetUsed:false}));
