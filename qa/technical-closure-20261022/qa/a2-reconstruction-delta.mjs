// New reconstruction differences only, not the approved 103-test suite.
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';import {spawn} from 'node:child_process';
import {startFixture,assertFixture,sql,cmd,cleanup,assertNoResources} from './pg-fixture.mjs';
import {safeEnv} from '../approved/private-host.mjs';
import {auditConciergeInstallation} from './a2-input/qa/installation/audit.mjs';
const file=p=>readFileSync(new URL('./a2-input/'+p,import.meta.url),'utf8');
const q=x=>x===null?'NULL':Array.isArray(x)?'ARRAY['+x.map(q).join(',')+']::text[]':typeof x==='number'?String(x):"'"+String(x).replaceAll("'","''")+"'";
let id,writer;const checks=[],pass=x=>{checks.push(x);console.log('PASS '+x);};
try{
 id=await startFixture('closed-target');
 const baseline=['test/fixtures/concierge-runtime-dev-schema.sql','test/fixtures/concierge-runtime-dev-functions.sql','test/fixtures/concierge-runtime-dev-indexes-triggers.sql'];
 for(const p of baseline)sql(id,'postgres',file(p));
 sql(id,'postgres',"grant usage on schema public to anon,authenticated,service_role;grant select,insert,update,delete on all tables in schema public to service_role;grant usage,select on all sequences in schema public to service_role;create table auth.sessions_fixture(counter int not null);insert into auth.sessions_fixture values(0);insert into concierge_accounts(id,display_name,status,default_language,timezone,founding_manager,beta_started_at,beta_ends_at,created_at,updated_at) values('11111111-1111-4111-8111-111111111111','FICTIONAL RECOVERY CLOCK','testing','es','America/Argentina/Buenos_Aires',false,'2026-10-01T00:00:00Z','2026-10-31T00:00:00Z',now(),now());");
 const before=sql(id,'postgres',"select beta_started_at::text||'|'||beta_ends_at::text from concierge_accounts;");
 const n=assertFixture(id),sequence=Array.from({length:40},()=>"update auth.sessions_fixture set counter=counter+1;select pg_sleep(0.05);").join('\n');
 writer=spawn('docker',['exec','-i',n.container,'psql','-X','-qAt','--username=postgres','--dbname=postgres','--set','ON_ERROR_STOP=1'],{env:safeEnv(),stdio:['pipe','pipe','pipe']});writer.stderr.on('data',()=>{});
 const begun=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('FICTIONAL_WRITER_START_TIMEOUT')),5000);writer.stdout.on('data',b=>{if(b.toString().includes('FICTIONAL_WRITER_STARTED')){clearTimeout(timer);resolve();}});});
 const done=new Promise(resolve=>{writer.on('close',resolve);writer.on('error',()=>resolve(-1));});writer.stdin.end("select 'FICTIONAL_WRITER_STARTED';\n"+sequence);await begun;
 const bundle=file('ops/drafts/BA-BETA-ATOMIC-ACL-BUNDLE-PRELEGAL-DO-NOT-APPLY.sql'),hash=createHash('sha256').update(bundle).digest('hex');assert.equal(hash,'f12b5b10f3120eeda3bbbc6d48604a894b63169c6ed66743f2895d499a516846');
 sql(id,'postgres',bundle);assert.equal(await done,0);
 assert.equal(sql(id,'postgres','select counter from auth.sessions_fixture;'),'40');
 assert.equal(sql(id,'postgres',"select beta_started_at::text||'|'||beta_ends_at::text from concierge_accounts;"),before);
 pass('pinned_application_install_leaves_concurrent_fictional_Auth_writer_and_existing_trial_dates_intact');
 const client={query:async(text,args=[])=>{const expanded=text.replace(/\$(\d+)\b/g,(_,i)=>q(args[Number(i)-1]));return {rows:JSON.parse(sql(id,'postgres',"select coalesce(json_agg(t),'[]'::json) from ("+expanded.replace(/;\s*$/,'')+") t;"))};}};
 const contract=JSON.parse(file('qa/installation/contract.json'));
 const clean=await auditConciergeInstallation({client,contract,bundleSha256:hash,requireVault:false});
 assert.equal(clean.status,'structure_verified',JSON.stringify(clean.issues));pass('catalog_after_new_concurrent_install_matches_pinned_130_function_70_policy_contract');
 sql(id,'postgres','alter role cheveni_runtime_executor login;');
 const contaminated=await auditConciergeInstallation({client,contract,bundleSha256:hash,requireVault:false});
 assert.equal(contaminated.status,'blocked');assert.ok(contaminated.issues.some(x=>x.code==='BOUNDARY_ROLE_UNSAFE'));pass('restored_unsafe_role_attribute_detected_without_repairing_grants_to_make_audit_pass');
 // Preserve the blocked result; never approve installation or reopen traffic.
 assert.equal(clean.operationalApproval,false);assert.equal(contaminated.operationalApproval,false);pass('even_verified_fictional_catalog_is_not_A2_rollback_or_operational_approval');
}finally{if(writer&&writer.exitCode===null)writer.kill();if(id)cleanup(id);}
assertNoResources();pass('new_A2_delta_disposable_cluster_cleaned');
console.log(JSON.stringify({result:'A2_RECONSTRUCTION_DIFFERENCES_ONLY',checks,passed:checks.length,realAuthTested:false,realRollbackVerified:false,operationalApproval:false}));
