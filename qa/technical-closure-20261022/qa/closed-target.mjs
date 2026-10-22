import {startFixture,assertFixture,sql,cmd} from './pg-fixture.mjs';
const targets=new WeakMap();
export async function createClosedTarget(){const id=await startFixture('closed-target'),token=Object.freeze({kind:'CLOSED_FICTIONAL_REBUILD'});targets.set(token,id);return {token,id};}
export async function restoreAllowedData(token,archive,journal){
 const id=targets.get(token);if(!id)throw Error('OWNED_CLOSED_TARGET_REQUIRED');
 const n=assertFixture(id);
 if(sql(id,'postgres',"select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname !~ '^pg_' and n.nspname<>'information_schema' and c.relkind in ('r','p','v','m','S','f');")!=='0')throw Error('EMPTY_CLOSED_TARGET_REQUIRED');
 // Trusted target DDL, not schema/roles/functions from the dump.
 sql(id,'postgres',"revoke all on database postgres from public;revoke all on schema public from public;create schema fixture;revoke all on schema fixture from public;create table fixture.business(id integer primary key,tenant text not null,property text not null,value text not null);create schema recovery_control;revoke all on schema recovery_control from public;create table recovery_control.state(closed boolean not null check(closed),journal_sequence bigint not null);insert into recovery_control.state values(true,"+journal.sequence+");");
 cmd(['exec','-i',n.container,'pg_restore','--username=postgres','--dbname=postgres','--schema=fixture','--table=business','--data-only','--no-owner','--no-acl','--single-transaction','--exit-on-error'],archive);
 return {fictionalDataRebuilt:true,networkMode:'none',dataTablesImported:['fixture.business'],
  authSessionsImported:false,refreshTokensImported:false,invitationsImported:false,outboxImported:false,temporaryAccessImported:false,sourceRolesOrAclImported:false};
}
