-- QA LAB ONLY / NOT AUTHORIZED / NOT RUN. No data rows, passwords or tokens.
begin read only;
do $abort$ begin raise exception 'CATALOG_CAPTURE_REQUIRES_SEPARATE_LAB_AUTHORIZATION';end $abort$;
select current_user,session_user,current_database(),current_setting('server_version_num') as server_version_num,
 current_setting('transaction_isolation') as isolation,current_setting('transaction_read_only') as read_only,
 current_setting('session_replication_role') as replication_role,pg_backend_pid() as pid;
select rolname,rolcanlogin,rolsuper,rolbypassrls,rolinherit,rolcreatedb,rolcreaterole,rolreplication
 from pg_roles where rolname like 'cheveni_%' order by rolname;
select parent.rolname as parent,member.rolname as member,m.admin_option,m.inherit_option,m.set_option
 from pg_auth_members m join pg_roles parent on parent.oid=m.roleid join pg_roles member on member.oid=m.member
 where parent.rolname like 'cheveni_%' or member.rolname like 'cheveni_%' order by parent.rolname,member.rolname;
select n.nspname,p.oid::regprocedure::text as signature,r.rolname as owner,p.prosecdef,p.proconfig,p.provolatile,p.proleakproof,
 encode(sha256(convert_to(p.prosrc,'UTF8')),'hex') as body_sha256,
 p.prorettype::regtype::text as return_type,p.proargtypes::regtype[]::text as argument_types,
 a.grantee,a.privilege_type,a.is_grantable
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner
 left join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a on true
 where n.nspname in('concierge_incident_private_v1','concierge_runtime_qa_v2')
 order by n.nspname,signature,a.grantee,a.privilege_type;
select r.rolname,d.defaclnamespace::regnamespace::text,d.defaclobjtype,d.defaclacl
 from pg_default_acl d join pg_roles r on r.oid=d.defaclrole where r.rolname like 'cheveni_%';
select c.oid::regclass::text as relation,r.rolname as owner,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl,
 a.attnum,a.attname,a.atttypid::regtype::text as type,a.attnotnull,a.attacl
 from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles r on r.oid=c.relowner
 join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
 where n.nspname='concierge_incident_private_v1' or n.nspname='auth' and c.relname in('users','sessions')
 or n.nspname='public' and c.relname like 'concierge_%'
 order by relation,a.attnum;
select p.polrelid::regclass::text,p.polname,p.polcmd,p.polpermissive,p.polroles,
 pg_get_expr(p.polqual,p.polrelid) as using_expr,pg_get_expr(p.polwithcheck,p.polrelid) as with_check_expr
 from pg_policy p where p.polrelid in(select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('auth','public','concierge_incident_private_v1'));
select t.tgrelid::regclass::text,t.tgname,t.tgfoid::regprocedure::text,t.tgtype,t.tgenabled,t.tgisinternal,
 t.tgattr,t.tgnargs,encode(t.tgargs,'hex') as args_hex,pg_get_expr(t.tgqual,t.tgrelid) as qual,
 t.tgdeferrable,t.tginitdeferred,t.tgoldtable,t.tgnewtable,t.tgparentid
 from pg_trigger t where not t.tgisinternal and (t.tgname like 'incident_%' or t.tgname like 'cheveni_%');
select conrelid::regclass::text,conname,contype,convalidated,pg_get_constraintdef(oid)
 from pg_constraint where connamespace='concierge_incident_private_v1'::regnamespace;
select evtname,evtevent,evtenabled,evtfoid::regprocedure::text from pg_event_trigger;
-- pg_depend alone does NOT discover all late-bound PL/pgSQL body references.
-- Compare this with sealed static call/column/operator/cast/RLS inventory.
with recursive deps(classid,objid,objsubid,refclassid,refobjid,refobjsubid,deptype,depth,path) as(
 select d.classid,d.objid,d.objsubid,d.refclassid,d.refobjid,d.refobjsubid,d.deptype,1,
 array[d.classid::text||':'||d.objid::text,d.refclassid::text||':'||d.refobjid::text]
 from pg_depend d where d.classid='pg_proc'::regclass and d.objid in(select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='concierge_incident_private_v1')
 union all
 select d.classid,d.objid,d.objsubid,d.refclassid,d.refobjid,d.refobjsubid,d.deptype,x.depth+1,
 x.path||(d.refclassid::text||':'||d.refobjid::text)
 from deps x join pg_depend d on d.classid=x.refclassid and d.objid=x.refobjid
 where x.depth<32 and not(d.refclassid::text||':'||d.refobjid::text=any(x.path))
) select *,depth=32 as closure_limit_reached from deps;
-- Effective tests, not only explicit ACL. Run in the separately authorized lab
-- for EVERY declared login/owner and EVERY object in the closed inventory.
select r.rolname,p.oid::regprocedure::text,has_function_privilege(r.oid,p.oid,'EXECUTE') as effective_execute
 from pg_roles r cross join pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where r.rolname like 'cheveni_incident_%'
 and n.nspname in('concierge_incident_private_v1','concierge_runtime_qa_v2');
select r.rolname,c.oid::regclass::text,a.attname,
 has_column_privilege(r.oid,c.oid,a.attnum,'SELECT') as can_select,
 has_column_privilege(r.oid,c.oid,a.attnum,'INSERT') as can_insert,
 has_column_privilege(r.oid,c.oid,a.attnum,'UPDATE') as can_update
 from pg_roles r cross join pg_class c join pg_namespace n on n.oid=c.relnamespace
 join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
 where r.rolname like 'cheveni_incident_%' and n.nspname in('auth','public','concierge_incident_private_v1');

-- Owner and namespace privileges are not implied by a function EXECUTE grant.
select r.rolname,n.nspname,owner_.rolname as schema_owner,n.nspacl,
 has_schema_privilege(r.oid,n.oid,'USAGE') as can_use,
 has_schema_privilege(r.oid,n.oid,'CREATE') as can_create
 from pg_roles r cross join pg_namespace n join pg_roles owner_ on owner_.oid=n.nspowner
 where r.rolname like 'cheveni_incident_%' and n.nspname in('auth','public','concierge_runtime_qa_v2','concierge_incident_private_v1');
select r.rolname,c.oid::regclass::text,
 has_table_privilege(r.oid,c.oid,'DELETE') as can_delete,
 has_table_privilege(r.oid,c.oid,'TRUNCATE') as can_truncate,
 has_table_privilege(r.oid,c.oid,'TRIGGER') as can_trigger,
 has_table_privilege(r.oid,c.oid,'REFERENCES') as can_reference
 from pg_roles r cross join pg_class c join pg_namespace n on n.oid=c.relnamespace
 where r.rolname like 'cheveni_incident_%' and c.relkind in('r','p') and n.nspname in('auth','public','concierge_incident_private_v1');
rollback;
