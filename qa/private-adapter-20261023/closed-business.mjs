// Six existing Concierge tables in quarantine. No source DDL or access objects.
import {readFileSync} from 'node:fs';
import {lstat,realpath} from 'node:fs/promises';import path from 'node:path';
import {checkPrivate} from '../technical-closure-20261022/approved/private-host.mjs';
import {openVerifiedFictionalEnvelope} from '../technical-closure-20261022/envelope-v2.mjs';
import {assertFixture,sql,cmd} from '../technical-closure-20261022/qa/pg-fixture.mjs';
import {reconcileRecoveryFrontier} from './recovery-frontier.mjs';
export const TABLES=Object.freeze(['concierge_accounts','concierge_account_members','concierge_buildings','concierge_properties','concierge_knowledge_items','concierge_knowledge_versions']);
// Six tables, not the whole application. Auth identifiers and all access/jobs omitted.
const seed=readFileSync(new URL('../technical-closure-20261022/qa/a2-input/test/fixtures/concierge-runtime-dev-schema.sql',import.meta.url),'utf8');
const definitions=TABLES.map(name=>{
 const start=seed.indexOf('create table public."'+name+'"('),end=seed.indexOf('\n);',start);
 if(start<0||end<start)throw Error('PINNED_TRUSTED_TABLE_DEFINITION_REQUIRED');return seed.slice(start,end+3);
}).join('\n');
function closed(id){const n=assertFixture(id),c=JSON.parse(cmd(['inspect',n.container]))[0];if(c.HostConfig.NetworkMode!=='none')throw Error('CLOSED_QUARANTINE_REQUIRED');return n;}
export async function rebuildBusinessQuarantine({targetId,dataFile,keyFile,passphrase,frontier}){
 for(const file of [dataFile,keyFile]){const st=await lstat(file),dir=path.dirname(file);
  const eq=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
  if(!st.isFile()||st.isSymbolicLink()||!eq(await realpath(file),path.resolve(file)))throw Error('PRIVATE_ARCHIVE_REQUIRED');await checkPrivate(dir);}
 const n=closed(targetId);
 if(sql(targetId,'postgres',"select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname !~ '^pg_' and n.nspname<>'information_schema' and c.relkind in ('r','p','v','m','S','f');")!=='0')throw Error('EMPTY_QUARANTINE_REQUIRED');
 const archive=await openVerifiedFictionalEnvelope({dataFile,keyFile,passphrase});let created=false;
 try{
  if(archive.subarray(0,5).toString()!=='PGDMP')throw Error('PG_CUSTOM_ARCHIVE_REQUIRED');
  reconcileRecoveryFrontier(frontier);
  sql(targetId,'postgres','begin;revoke all on database postgres from public;revoke all on schema public from public;'+definitions+TABLES.map(t=>'create unique index on public.'+t+'(id);alter table public.'+t+' enable row level security;alter table public.'+t+' force row level security;revoke all on public.'+t+' from public;').join('')+'commit;');
  created=true;
  cmd(['exec','-i',n.container,'pg_restore','--username=postgres','--dbname=postgres','--schema=public',...TABLES.flatMap(t=>['--table='+t]),'--data-only','--no-owner','--no-acl','--single-transaction','--exit-on-error'],archive);
  // Missing tables are NOT certified by pg_restore exit 0: insist on the exact TOC.
  const toc=cmd(['exec','-i',n.container,'pg_restore','--list'],archive).toString();
  for(const t of TABLES)if(!new RegExp('TABLE DATA public '+t+' ').test(toc))throw Error('REQUIRED_BUSINESS_TABLE_NOT_CAPTURED');
  const invalid=sql(targetId,'postgres',`select
   (select count(*) from concierge_account_members m where not exists(select from concierge_accounts a where a.id=m.account_id))+
   (select count(*) from concierge_buildings b where not exists(select from concierge_accounts a where a.id=b.account_id))+
   (select count(*) from concierge_properties p where not exists(select from concierge_accounts a where a.id=p.account_id) or (p.building_id is not null and not exists(select from concierge_buildings b where b.id=p.building_id and b.account_id=p.account_id)))+
   (select count(*) from concierge_knowledge_items k where not exists(select from concierge_accounts a where a.id=k.account_id) or (k.property_id is not null and not exists(select from concierge_properties p where p.id=k.property_id and p.account_id=k.account_id)) or (k.building_id is not null and not exists(select from concierge_buildings b where b.id=k.building_id and b.account_id=k.account_id)))+
   (select count(*) from concierge_knowledge_versions v where not exists(select from concierge_knowledge_items k where k.id=v.knowledge_item_id and k.account_id=v.account_id) or not exists(select from concierge_account_members m where m.id=v.created_by_member_id and m.account_id=v.account_id) or (v.approved_by_member_id is not null and not exists(select from concierge_account_members m where m.id=v.approved_by_member_id and m.account_id=v.account_id)))+
   (select count(*) from concierge_knowledge_items k where k.current_version_id is not null and not exists(select from concierge_knowledge_versions v where v.id=k.current_version_id and v.knowledge_item_id=k.id and v.account_id=k.account_id));`);
  if(invalid!=='0')throw Error('TENANT_OR_REFERENCE_RECONCILIATION_FAILED');
  // Quarantine never activates the imported account/member/property or knowledge.
  sql(targetId,'postgres',"begin;update concierge_accounts set status='testing';update concierge_account_members set status='revoked',revoked_at=now();update concierge_properties set status='draft';update concierge_knowledge_items set status='review';update concierge_knowledge_versions set status='draft';commit;");
  return {businessTablesQuarantined:TABLES.length,sourceDDLExecuted:false,sourceAuthOrAccessImported:false,
   sourceACLImported:false,accessOpen:false,integralRecoveryVerified:false,operationalApproval:false};
 }catch(e){
  if(created)try{sql(targetId,'postgres',TABLES.map(t=>'drop table if exists public.'+t+' cascade;').join(''));}catch{throw Error('QUARANTINE_FAILED__OWNED_TARGET_CLEANUP_REQUIRED');}
  throw Error(/^(CURRENT_|TENANT_|REQUIRED_|PG_CUSTOM|EMPTY_)/.test(e.message)?e.message:'QUARANTINE_REBUILD_FAILED_CLOSED');
 }finally{archive.fill(0);}
}
