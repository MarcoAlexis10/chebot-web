import {createHash} from 'node:crypto';

// Importing has no side effects. The supplied client must already be authorized
// for the target. This module never connects, reads env, grants or applies SQL.
export const executorRoles=['cheveni_runtime_executor','cheveni_intake_executor','cheveni_invite_executor','cheveni_evidence_executor'];
export const boundaryRoles=[...executorRoles,'cheveni_evidence_verifier'];
export const guardedTables=['concierge_pending_actions','concierge_guest_identities','concierge_stays','concierge_stay_members','concierge_guest_invites','concierge_sessions','concierge_guest_phone_changes','concierge_guest_channels'];
export const privateTables=['intake_policies_v1','intake_authorizations_v1','runtime_policies_v1','runtime_authorizations_v1','invite_policies_v1','invite_authorizations_v1','verified_evidence_events_v1','verified_evidence_heads_v1'];
const helpers=['concierge_reveal_secret','concierge_resolve_manager_web_context','concierge_list_manager_web_properties','concierge_authorize_manager_member_action','concierge_authorize_manager_web_action','concierge_resolve_knowledge','concierge_activate_knowledge_version','concierge_reject_knowledge_version','concierge_manager_set_incident_state','concierge_propose_incident_learning','concierge_complete_notification','concierge_record_notification_meta_acceptance','concierge_record_notification_meta_delivery'];
const apiRoles=['anon','authenticated','service_role','cheveni_evidence_verifier'];
const isProtectedFunction=f=>f.schema==='concierge_private'||f.definer===true||helpers.includes(f.name)||/TRUSTED_BACKEND_ROLE_REQUIRED|INDEPENDENT_VERIFIER_ROLE_REQUIRED/.test(f.body);
export const sha256=value=>createHash('sha256').update(value).digest('hex');

// One catalog-only SELECT gives a consistent snapshot. No user rows, Vault
// values, credentials or pg_authid/password columns are read or returned.
export async function installationSnapshot(client){
 const sql=`with functions as (
  select p.oid,n.nspname as schema,p.proname as name,n.nspname||'.'||p.proname||'('||pg_catalog.oidvectortypes(p.proargtypes)||')' as signature,
   p.prosrc as body,l.lanname as language,r.rolname as owner,p.prosecdef as definer,p.proisstrict as strict,p.proleakproof as leakproof,
   p.provolatile as volatility,p.proparallel as parallel,p.proconfig as config,
   pg_catalog.pg_get_function_result(p.oid) as returns,coalesce(pg_catalog.pg_get_expr(p.proargdefaults,0),'') as defaults,
   exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) x where x.grantee=0 and x.privilege_type='EXECUTE') as public_execute,
   (select jsonb_object_agg(v.name,case when actor.oid is null then false else pg_catalog.has_function_privilege(actor.oid,p.oid,'EXECUTE') end)
    from unnest($1::text[]) v(name) left join pg_catalog.pg_roles actor on actor.rolname=v.name) as execute
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  join pg_catalog.pg_roles r on r.oid=p.proowner join pg_catalog.pg_language l on l.oid=p.prolang
  where n.nspname='concierge_private' or (n.nspname='public' and left(p.proname,10)='concierge_')
 ), tables as (
  select c.oid,n.nspname as schema,c.relname as name,c.relrowsecurity as rls,
   exists(select 1 from pg_catalog.aclexplode(coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) x
    where x.grantee=0 and (n.nspname='concierge_private' or x.privilege_type=any(array['INSERT','UPDATE','DELETE','TRUNCATE'])))
   or exists(select 1 from pg_catalog.pg_attribute a cross join lateral pg_catalog.aclexplode(a.attacl) x
    where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped and x.grantee=0
    and (n.nspname='concierge_private' or x.privilege_type=any(array['INSERT','UPDATE']))) as public_access,
   (select jsonb_object_agg(v.name,case when actor.oid is null then false else
     pg_catalog.has_table_privilege(actor.oid,c.oid,case when n.nspname='concierge_private' then 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER' else 'INSERT,UPDATE,DELETE,TRUNCATE' end)
     or exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
      and pg_catalog.has_column_privilege(actor.oid,c.oid,a.attnum,case when n.nspname='concierge_private' then 'SELECT,INSERT,UPDATE,REFERENCES' else 'INSERT,UPDATE' end)) end)
    from unnest($1::text[]) v(name) left join pg_catalog.pg_roles actor on actor.rolname=v.name) as access
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where c.relkind in ('r','p') and ((n.nspname='public' and c.relname=any($2::text[])) or (n.nspname='concierge_private' and c.relname=any($3::text[])))
 ), policies as (
  select t.schema||'.'||t.name||'.'||p.polname as signature,p.polcmd as command,p.polpermissive as permissive,
   (select jsonb_agg(case when actor=0 then 'PUBLIC' else r.rolname end order by case when actor=0 then 'PUBLIC' else r.rolname end)
    from unnest(p.polroles) actor left join pg_catalog.pg_roles r on r.oid=actor) as roles,
   pg_catalog.pg_get_expr(p.polqual,p.polrelid) as using,pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid) as check
  from pg_catalog.pg_policy p join tables t on t.oid=p.polrelid
 ), roles as (
  select rolname as name,rolsuper as superuser,rolinherit as inherit,rolcreaterole as create_role,rolcreatedb as create_db,rolcanlogin as login,rolreplication as replication,rolbypassrls as bypass_rls
  from pg_catalog.pg_roles where rolname=any($4::text[])
 ), elevated_api as (
  select count(*)::int as count from pg_catalog.pg_roles actor cross join pg_catalog.pg_roles target
  where actor.rolname=any(array['anon','authenticated','service_role','authenticator']) and target.rolname=any($4::text[])
   and pg_catalog.pg_has_role(actor.oid,target.oid,'MEMBER')
 ), elevated_logins as (
  select count(*)::int as count from pg_catalog.pg_roles actor cross join pg_catalog.pg_roles target
  where actor.rolcanlogin and not actor.rolsuper and target.rolname=any($5::text[])
   and (pg_catalog.pg_has_role(actor.oid,target.oid,'SET') or pg_catalog.pg_has_role(actor.oid,target.oid,'USAGE'))
 ), vault as (
  select coalesce(bool_or(ns.oid is not null and c.oid is not null and actor.oid is not null
   and pg_catalog.has_schema_privilege(actor.oid,ns.oid,'USAGE') and pg_catalog.has_table_privilege(actor.oid,c.oid,'SELECT')),false) as backend_read
  from (values(1)) seed(x) left join pg_catalog.pg_namespace ns on ns.nspname='vault'
  left join pg_catalog.pg_class c on c.relnamespace=ns.oid and c.relname='decrypted_secrets'
  left join pg_catalog.pg_roles actor on actor.rolname='service_role'
 ) select jsonb_build_object(
  'functions',coalesce((select jsonb_agg(to_jsonb(f)-'oid' order by signature) from functions f),'[]'::jsonb),
  'tables',coalesce((select jsonb_agg(to_jsonb(t)-'oid' order by schema,name) from tables t),'[]'::jsonb),
  'roles',coalesce((select jsonb_agg(r order by name) from roles r),'[]'::jsonb),
  'policies',coalesce((select jsonb_agg(p order by signature) from policies p),'[]'::jsonb),
  'api_role_count',(select count(*)::int from pg_catalog.pg_roles where rolname=any(array['anon','authenticated','service_role'])),
  'api_elevations',(select count from elevated_api),'executor_logins',(select count from elevated_logins),
  'vault_backend_read',(select backend_read from vault)) as snapshot`;
 return (await client.query(sql,[apiRoles,guardedTables,privateTables,boundaryRoles,executorRoles])).rows[0].snapshot;
}

function fingerprint(f){
 return sha256(JSON.stringify([f.body,f.language,f.owner,f.definer,f.strict,f.leakproof,f.volatility,f.parallel,[...(f.config||[])].sort(),f.returns,f.defaults]));
}
export function makeInstallationContract(snapshot,bundleSha256){
 for(const f of snapshot.functions){
  if(isProtectedFunction(f)
   &&(f.public_execute||f.execute.anon||f.execute.authenticated))throw Error('UNSAFE_SOURCE_FUNCTION_ACL');
 }
 return {format:1,bundleSha256,functions:snapshot.functions.map(f=>({signature:f.signature,fingerprint:fingerprint(f),
  ...(isProtectedFunction(f)?{execute:f.execute,public_execute:f.public_execute}:{})})),
  policies:snapshot.policies.map(p=>({signature:p.signature,fingerprint:policyFingerprint(p)}))};
}
function policyFingerprint(p){return sha256(JSON.stringify([p.command,p.permissive,p.roles,p.using,p.check]));}

export async function auditConciergeInstallation({client,contract,bundleSha256,requireVault=true}){
 const result={status:'blocked',operationalApproval:false,scope:'reviewed-functions-and-capability-boundaries',issues:[]};
 // Refuse structurally invalid inputs without opening a database connection.
 const validEntry=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&typeof x.signature==='string'&&x.signature.trim()===x.signature&&x.signature.length>0&&typeof x.fingerprint==='string'&&/^[a-f0-9]{64}$/.test(x.fingerprint);
 const validAcl=x=>!Object.hasOwn(x,'execute')&&!Object.hasOwn(x,'public_execute')||
  (x.execute!==null&&typeof x.execute==='object'&&!Array.isArray(x.execute)&&typeof x.public_execute==='boolean'&&
   Object.keys(x.execute).length===apiRoles.length&&apiRoles.every(r=>Object.hasOwn(x.execute,r)&&typeof x.execute[r]==='boolean'));
 const issue=(code,object)=>result.issues.push({code,...(object?{object}:{} )});
 if(contract?.format!==1||!Array.isArray(contract.functions)||contract.functions.length===0||!Array.isArray(contract.policies)||contract.policies.length===0||contract.functions.some(f=>!validEntry(f)||!validAcl(f))||contract.policies.some(p=>!validEntry(p))||new Set(contract.functions.map(f=>f.signature)).size!==contract.functions.length||new Set(contract.policies.map(p=>p.signature)).size!==contract.policies.length||typeof bundleSha256!=='string'||!/^[a-f0-9]{64}$/.test(bundleSha256)||contract.bundleSha256!==bundleSha256){issue('INSTALLATION_CONTRACT_INVALID_OR_STALE');return result;}
 try{
  const s=await installationSnapshot(client),actual=new Map(s.functions.map(f=>[f.signature,f]));
  const expected=new Set(contract.functions.map(f=>f.signature));
  for(const f of contract.functions){
   const found=actual.get(f.signature);
   if(!found){issue('FUNCTION_MISSING',f.signature);continue;}
   if(fingerprint(found)!==f.fingerprint)issue('FUNCTION_DEFINITION_DRIFT',f.signature);
   // The live function determines its boundary. A caller cannot disable this
   // invariant by stripping the expected ACL from an otherwise valid contract.
   if(isProtectedFunction(found)&&!f.execute)issue('PROTECTED_FUNCTION_ACL_CONTRACT_MISSING',f.signature);
   if(f.execute&&(found.public_execute!==f.public_execute||apiRoles.some(r=>found.execute[r]!==f.execute[r])))issue('FUNCTION_EXECUTE_DRIFT',f.signature);
   if(isProtectedFunction(found)&&(found.public_execute||found.execute.anon||found.execute.authenticated))issue('FUNCTION_CAPABILITY_EXPOSED',f.signature);
  }
  if(s.functions.some(f=>!expected.has(f.signature)))issue('UNREVIEWED_CONCIERGE_FUNCTIONS');
  const policies=new Map(s.policies.map(p=>[p.signature,p])),expectedPolicies=new Set(contract.policies.map(p=>p.signature));
  for(const p of contract.policies){const found=policies.get(p.signature);if(!found)issue('RLS_POLICY_MISSING',p.signature);else if(policyFingerprint(found)!==p.fingerprint)issue('RLS_POLICY_DRIFT',p.signature);}
  if(s.policies.some(p=>!expectedPolicies.has(p.signature)))issue('UNREVIEWED_RLS_POLICIES');
  if(s.api_role_count!==3)issue('API_ROLE_MISSING');
  for(const name of boundaryRoles){
   const role=s.roles.find(r=>r.name===name);
   if(!role){issue('BOUNDARY_ROLE_MISSING',name);continue;}
   if(['superuser','inherit','create_role','create_db','login','replication','bypass_rls'].some(key=>role[key]!==false))issue('BOUNDARY_ROLE_UNSAFE',name);
  }
  for(const [schema,names] of [['public',guardedTables],['concierge_private',privateTables]])for(const name of names){
   const table=s.tables.find(t=>t.schema===schema&&t.name===name),object=schema+'.'+name;
   if(!table){issue('PROTECTED_TABLE_MISSING',object);continue;}
   if(table.rls!==true)issue('PROTECTED_TABLE_RLS_DISABLED',object);
   if(table.public_access||apiRoles.some(r=>table.access[r]))issue('PROTECTED_TABLE_CAPABILITY_EXPOSED',object);
  }
  if(s.api_elevations!==0)issue('API_ROLE_CAN_ASSUME_BOUNDARY_ROLE');
  if(s.executor_logins!==0)issue('INSTALLER_EXECUTOR_CAPABILITY_OPEN');
  if(requireVault&&s.vault_backend_read!==true)issue('VAULT_BACKEND_READ_MISSING');
  result.vaultAclChecked=requireVault;result.functionCount=contract.functions.length;result.policyCount=contract.policies.length;result.protectedTableCount=guardedTables.length+privateTables.length;
  if(result.issues.length===0)result.status='structure_verified';
 }catch{issue('INSTALLATION_AUDIT_UNAVAILABLE');}
 return result;
}
