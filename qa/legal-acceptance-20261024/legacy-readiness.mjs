// Read-only aggregate for the reviewed legacy signup surface; NOT all writers.
// Only consumed by the closed PostgreSQL fixture in this delivery.
export const legacyReadinessSql=`with api as(
 select r.oid,r.rolname from pg_roles r where r.rolname in('anon','authenticated','service_role','qa_legal_bridge')
),reachable as(
 select distinct r.oid,r.rolname,r.rolsuper,r.rolcreaterole from pg_roles r join api a on(r.oid=a.oid or pg_has_role(a.oid,r.oid,'SET') or pg_has_role(a.oid,r.oid,'USAGE'))
),targets as(
 select p.oid,p.proowner from pg_proc p where p.oid in(
 to_regprocedure('public.concierge_submit_manager_signup_request(text,text,text,text,boolean,boolean)'),
 to_regprocedure('public.concierge_record_manager_signup_screening(uuid,uuid,text)'),
 to_regprocedure('public.concierge_resolve_manager_signup_followup(uuid,uuid,text)'))
),tables as(
 select c.oid,c.relowner,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') and left(c.relname,25)='concierge_manager_signup_'
)
select jsonb_build_object('ready',
 (select count(*) from api)=4 and (select count(*) from targets)=3 and
 (select count(*) from tables where relname in('concierge_manager_signup_invites','concierge_manager_signup_screenings'))=2 and
 not exists(select 1 from reachable where rolsuper or rolcreaterole) and
 not exists(select 1 from reachable r cross join targets t where t.proowner=r.oid or has_function_privilege(r.oid,t.oid,'EXECUTE')) and
 not exists(select 1 from reachable r cross join tables t where t.relowner=r.oid or has_table_privilege(r.oid,t.oid,'INSERT,UPDATE,DELETE,TRUNCATE') or has_any_column_privilege(r.oid,t.oid,'INSERT,UPDATE')),
 'knownSurfaceOnly',true,'operationalApproval',false,'beta','NO_GO') as result`;
