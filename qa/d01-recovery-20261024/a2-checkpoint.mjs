// Disposable QA capability only. No DSN, remote transport, operator approval or real restore.
import {Readable} from 'node:stream';import {createHash,randomBytes} from 'node:crypto';
import {readFile,copyFile,unlink,lstat} from 'node:fs/promises';import {constants} from 'node:fs';import path from 'node:path';
import {startFixture,assertFixture,sql,cmd,cleanup} from '../technical-closure-20261022/qa/pg-fixture.mjs';
import {assertRun,checkPrivate} from '../technical-closure-20261022/approved/private-host.mjs';
import {sealFictionalStream,openVerifiedFictionalEnvelope} from '../technical-closure-20261022/envelope-v2.mjs';
import {awaitFinalPostmaster} from './qa/owned-final-postmaster.mjs';
const checkpoints=new WeakMap(),targets=new WeakMap(),sha=b=>createHash('sha256').update(b).digest('hex');
const ROLES_SQL='create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;';
const rolesQuery="select coalesce(jsonb_agg(to_jsonb(t) order by rolname),'[]'::jsonb) from(select rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit,rolvaliduntil,rolconfig from pg_roles where rolname not like 'pg_%' and rolname<>'postgres')t;";
function closed(id){const n=assertFixture(id);if(JSON.parse(cmd(['inspect',n.container]))[0].HostConfig.NetworkMode!=='none')throw Error('OWNED_CLOSED_FIXTURE_REQUIRED');return n;}
function empty(id){return sql(id,'postgres',"select not exists(select from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname !~ '^pg_' and n.nspname<>'information_schema' and c.relkind in('r','p','v','m','S','f')) and not exists(select from pg_roles where rolname not like 'pg_%' and rolname<>'postgres') and not exists(select from pg_namespace where nspname not like 'pg_%' and nspname not in('public','information_schema'));")==='t';}
export function fixtureFingerprint(id){
 const n=closed(id);
 const schema=cmd(['exec',n.container,'pg_dump','--username=postgres','--dbname=postgres','--schema-only']).toString();
 // PostgreSQL adds randomized psql restriction keys. No schema/ACL statement is removed.
 const normalized=schema.split('\n').filter(x=>!/^\\(?:un)?restrict [A-Za-z0-9]+$/.test(x)).join('\n');
 const roles=sql(id,'postgres',rolesQuery);
 const memberships=sql(id,'postgres',"select coalesce(jsonb_agg(to_jsonb(t) order by role_name,member_name,grantor_name),'[]'::jsonb) from(select r.rolname role_name,m.rolname member_name,g.rolname grantor_name,a.admin_option,a.inherit_option,a.set_option from pg_auth_members a join pg_roles r on r.oid=a.roleid join pg_roles m on m.oid=a.member join pg_roles g on g.oid=a.grantor where r.rolname not like 'pg_%')t;");
 const business=sql(id,'postgres',"select jsonb_build_object('accounts',(select jsonb_agg(to_jsonb(a) order by id) from public.concierge_accounts a),'business',(select jsonb_agg(to_jsonb(b) order by id) from qa_checkpoint.business b));");
 const sequences=sql(id,'postgres',"select coalesce(jsonb_agg(to_jsonb(s) order by schemaname,sequencename),'[]'::jsonb) from pg_sequences s where schemaname not like 'pg_%' and schemaname<>'information_schema';");
 return Object.freeze({schemaSha256:sha(normalized),rolesSha256:sha(roles),membershipsSha256:sha(memberships),businessSha256:sha(business),sequencesSha256:sha(sequences)});
}
async function validFiles(p){
 await assertRun(p.roots.root);
 for(const f of [p.dataFile,p.keyFile]){const st=await lstat(f);if(!st.isFile()||st.isSymbolicLink()||(st.mode&0o077)!==0)throw Error('PRIVATE_CHECKPOINT_FILES_REQUIRED');await checkPrivate(path.dirname(f));}
 if(sha(await readFile(p.dataFile))!==p.dataSha256||sha(await readFile(p.keyFile))!==p.keySha256)throw Error('CHECKPOINT_CIPHERTEXT_INTEGRITY_DENIED');
}
function remember(p){const token=Object.freeze({kind:'A2_FICTIONAL_PRECOMMIT_CHECKPOINT'});checkpoints.set(token,p);return Object.freeze({token,dataFile:p.dataFile,keyFile:p.keyFile,fingerprint:p.fingerprint,operationalApproval:false});}
export async function prepareCheckpoint({sourceId,roots}){
 const n=closed(sourceId);await assertRun(roots.root);
 if(sql(sourceId,'postgres',"select to_regnamespace('concierge_private') is null and not exists(select from pg_roles where rolname like 'cheveni_%') and to_regclass('qa_checkpoint.business') is not null;")!=='t')throw Error('TRUSTED_PRE_A2_FIXTURE_BASELINE_REQUIRED');
 if(sql(sourceId,'postgres',"select count(*) from pg_roles where rolname not like 'pg_%' and rolname<>'postgres';")!=='3'||sql(sourceId,'postgres',"select bool_and(not rolcanlogin and not rolsuper and not rolcreatedb and not rolcreaterole and not rolreplication and rolbypassrls=(rolname='service_role') and rolconfig is null) from pg_roles where rolname in('anon','authenticated','service_role');")!=='t')throw Error('FIXED_FICTIONAL_ROLES_REQUIRED');
 const fingerprint=fixtureFingerprint(sourceId),passphrase='FICTIONAL_ONLY_'+randomBytes(32).toString('hex');
 let archive=cmd(['exec',n.container,'pg_dump','--username=postgres','--dbname=postgres','--format=custom']);
 if(archive.length>32*1024*1024||archive.subarray(0,5).toString()!=='PGDMP')throw Error('BOUNDED_FIXTURE_ARCHIVE_REQUIRED');
 let saved;
 try{saved=await sealFictionalStream({source:Readable.from([archive]),privateDirectory:roots.data,basename:'before-a2',passphrase});}finally{archive.fill(0);}
 const keyFile=path.join(roots.keys,'before-a2.cclave');
 let keyCopied=false;try{await copyFile(saved.keyFile,keyFile,constants.COPYFILE_EXCL);keyCopied=true;await unlink(saved.keyFile);}catch{await unlink(saved.dataFile).catch(()=>{});await unlink(saved.keyFile).catch(()=>{});if(keyCopied)await unlink(keyFile).catch(()=>{});throw Error('QA_KEY_CUSTODY_TRANSFER_FAILED_EXISTING_FILES_PRESERVED');}
 const p={sourceId,roots,dataFile:saved.dataFile,keyFile,passphrase,fingerprint,dataSha256:sha(await readFile(saved.dataFile)),keySha256:sha(await readFile(keyFile))};
 await validFiles(p);return remember(p);
}
export async function copyCheckpointForQa(checkpoint,roots){
 const p=checkpoints.get(checkpoint);if(!p)throw Error('TRUSTED_CHECKPOINT_CAPABILITY_REQUIRED');await validFiles(p);await assertRun(roots.root);
 const dataFile=path.join(roots.data,'before-a2.cva'),keyFile=path.join(roots.keys,'before-a2.cclave');
 let dataCopied=false,keyCopied=false;try{await copyFile(p.dataFile,dataFile,constants.COPYFILE_EXCL);dataCopied=true;await copyFile(p.keyFile,keyFile,constants.COPYFILE_EXCL);keyCopied=true;}catch{if(dataCopied)await unlink(dataFile).catch(()=>{});if(keyCopied)await unlink(keyFile).catch(()=>{});throw Error('QA_COPY_FAILED_EXISTING_FILES_PRESERVED');}
 return remember({...p,roots,dataFile,keyFile});
}
export async function createRecoveryTarget(){
 const id=await startFixture('closed-target');try{await awaitFinalPostmaster(id);}catch(e){cleanup(id);throw e;}
 const token=Object.freeze({kind:'A2_FICTIONAL_NEW_QUARANTINE_TARGET'});targets.set(token,{id,state:'EMPTY'});return {id,token};
}
export async function rebuildCheckpoint(checkpoint,target){
 const p=checkpoints.get(checkpoint),t=targets.get(target);
 if(!p)throw Error('TRUSTED_CHECKPOINT_CAPABILITY_REQUIRED');if(!t)throw Error('NEW_QUARANTINE_TARGET_CAPABILITY_REQUIRED');
 closed(t.id);if(t.id===p.sourceId||t.state!=='EMPTY')throw Error('FRESH_DISTINCT_TARGET_REQUIRED');
 if(!empty(t.id))throw Error('TARGET_NOT_EMPTY_PRESERVED');
 await validFiles(p);
 let archive;
 try{archive=await openVerifiedFictionalEnvelope({dataFile:p.dataFile,keyFile:p.keyFile,passphrase:p.passphrase,maxBytes:32*1024*1024});}
 catch{throw Error('AUTHENTICATED_CHECKPOINT_REQUIRED_TARGET_UNTOUCHED');}
 if(archive.subarray(0,5).toString()!=='PGDMP'){archive.fill(0);throw Error('PG_CUSTOM_CHECKPOINT_REQUIRED');}
 t.state='IN_PROGRESS';
 try{
  sql(t.id,'postgres',ROLES_SQL);
  const n=closed(t.id);cmd(['exec','-i',n.container,'pg_restore','--username=postgres','--dbname=postgres','--clean','--if-exists','--single-transaction','--exit-on-error'],archive);
  const actual=fixtureFingerprint(t.id);
  if(JSON.stringify(actual)!==JSON.stringify(p.fingerprint))throw Error('POSTRESTORE_FINGERPRINT_MISMATCH');
  t.state='REBUILT_CLOSED';
  return Object.freeze({fictionalPostCommitRebuildVerified:true,fullFixtureDatabaseRestored:true,fingerprint:actual,networkMode:'none',restoredPreA2PrivilegesRemainQuarantined:true,canOpenGuestAccess:false,realA2RollbackVerified:false,integralRecoveryVerified:false,authFunctionalRestoreVerified:false,vaultRestored:false,storageRestored:false,independentRevocationsReconciled:false,operationalApproval:false,beta:'NO_GO'});
 }catch{
  t.state='FAILED_CLOSED';
  try{cleanup(t.id);}catch{throw Error('A2_REBUILD_FAILED_OWNED_TARGET_CLEANUP_REQUIRED');}
  throw Error('A2_REBUILD_FAILED_OWNED_TARGET_REMOVED_CHECKPOINT_KEPT');
 }finally{archive.fill(0);}
}
