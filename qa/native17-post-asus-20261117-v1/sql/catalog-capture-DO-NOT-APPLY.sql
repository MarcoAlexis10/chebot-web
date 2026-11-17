-- REVIEW_ONLY_NOT_EXECUTED. DO NOT APPLY. Bounded metadata proposal only.
-- Native N01/N11/BPF03 requires separately approved capture and real observer.
begin read only;
do $$begin raise exception 'NATIVE17_CATALOG_CAPTURE_NOT_AUTHORIZED';end$$;

select pg_catalog.current_setting('server_version_num') as server_version_num,
 session_user,current_user,pg_catalog.pg_backend_pid(),
 pg_catalog.current_setting('transaction_isolation') as transaction_isolation,
 pg_catalog.current_setting('listen_addresses') as listen_addresses;

select rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,
 rolreplication,rolbypassrls,rolconnlimit
from pg_catalog.pg_roles where rolname like 'cheveni\_%' escape '\'
order by rolname limit 2000;

select r.rolname as role,m.rolname as member,a.admin_option,a.inherit_option,a.set_option
from pg_catalog.pg_auth_members a
join pg_catalog.pg_roles r on r.oid=a.roleid
join pg_catalog.pg_roles m on m.oid=a.member
where r.rolname like 'cheveni\_%' escape '\' or m.rolname like 'cheveni\_%' escape '\'
order by r.rolname,m.rolname limit 2000;

select n.nspname,p.proname,pg_catalog.pg_get_function_identity_arguments(p.oid) as args,
 pg_catalog.pg_get_function_result(p.oid) as result,r.rolname as owner,
 l.lanname,p.prosecdef,p.provolatile,p.proconfig,p.proacl,
 pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex') as source_sha256
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
join pg_catalog.pg_roles r on r.oid=p.proowner
join pg_catalog.pg_language l on l.oid=p.prolang
where n.nspname='concierge_invite_private'
order by p.proname,args limit 2000;

select n.nspname,c.relname,r.rolname as owner,c.relrowsecurity,c.relforcerowsecurity,c.relacl
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
join pg_catalog.pg_roles r on r.oid=c.relowner
where n.nspname='concierge_invite_private'
 or (n.nspname='public' and c.relname in ('concierge_accounts','concierge_account_members',
 'concierge_manager_web_identities','concierge_properties','concierge_buildings'))
order by n.nspname,c.relname limit 2000;

select n.nspname,c.relname,a.attname,a.attacl
from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid=a.attrelid
join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where a.attnum>0 and not a.attisdropped and (n.nspname='concierge_invite_private'
 or (n.nspname='public' and c.relname in ('concierge_accounts','concierge_account_members',
 'concierge_manager_web_identities','concierge_properties','concierge_buildings')))
order by n.nspname,c.relname,a.attnum limit 2000;

select n.nspname,n.nspacl from pg_catalog.pg_namespace n
where n.nspname in ('public','auth','concierge_invite_private') order by n.nspname;
select n.nspname,t.typname,r.rolname as owner,t.typacl
from pg_catalog.pg_type t join pg_catalog.pg_namespace n on n.oid=t.typnamespace
join pg_catalog.pg_roles r on r.oid=t.typowner
where n.nspname='concierge_invite_private' order by t.typname limit 2000;
select pg_catalog.pg_get_userbyid(d.defaclrole) as owner,n.nspname,d.defaclobjtype,d.defaclacl
from pg_catalog.pg_default_acl d left join pg_catalog.pg_namespace n on n.oid=d.defaclnamespace
where d.defaclnamespace=0 or n.nspname in ('public','auth','concierge_invite_private')
order by owner,n.nspname,d.defaclobjtype limit 2000;

select n.nspname,c.relname,p.polname,p.polpermissive,p.polroles,p.polcmd
from pg_catalog.pg_policy p join pg_catalog.pg_class c on c.oid=p.polrelid
join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='concierge_invite_private' or (n.nspname='public' and c.relname in
 ('concierge_accounts','concierge_account_members','concierge_manager_web_identities','concierge_properties'))
order by n.nspname,c.relname,p.polname limit 2000;

select n.nspname,c.relname,t.tgname,t.tgtype,t.tgenabled,
 t.tgfoid::regprocedure as routine,t.tgattr,
 pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_triggerdef(t.oid,false),'UTF8')),'hex') as definition_sha256
from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid
join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal and (n.nspname in ('auth','concierge_invite_private')
 or (n.nspname='public' and c.relname in ('concierge_accounts','concierge_account_members',
 'concierge_manager_web_identities','concierge_properties')))
order by n.nspname,c.relname,t.tgname limit 2000;
select extname,extversion from pg_catalog.pg_extension order by extname limit 100;

-- Raw catalog ACLs require expansion including PUBLIC/implicit defaults,
-- membership SET/INHERIT and transitive EXECUTE. Not an effective-ACL verdict.
-- Policy expressions, constraints/indexes, dependency graph and exact revoker
-- completeness still require the existing approved catalog capture closure.
-- Hitting any row ceiling is INCOMPLETE/ABORT, never successful truncation.
-- No table values, phone/address/unit, tokens, query texts or keys collected.
rollback;
