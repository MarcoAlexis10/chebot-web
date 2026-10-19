import {Client} from 'pg';
import {part,PROJECT,stableJSON,validateSource,validateReceipts,encryptPayload,decryptPayload,sha,fail,summary} from './core.mjs';
import {remotePgTools,assertLocalDocker} from './pg-tools.mjs';
const managed=new Set(['auth','storage','vault','extensions','cron','net','graphql','graphql_public','realtime','supabase_migrations','supabase_functions','_analytics','_realtime','pgsodium','pgsodium_masks']);
const qi=n=>'"'+n.replaceAll('"','""')+'"';
export const relationSql="select n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner) owner,c.relrowsecurity,c.relforcerowsecurity,(select jsonb_agg(to_jsonb(x) order by x.grantee,x.grantor,x.privilege_type) from (select case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end grantee,pg_get_userbyid(a.grantor) grantor,a.privilege_type,a.is_grantable from aclexplode(coalesce(c.relacl,acldefault(case when c.relkind='S' then 'S'::\"char\" else 'r'::\"char\" end,c.relowner))) a) x) acl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=any($1) and c.relkind in ('r','p','v','m','S','f') order by 1,2";
export const functionSql="select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) arguments,pg_get_userbyid(p.proowner) owner,p.prosecdef,(select jsonb_agg(to_jsonb(x) order by x.grantee,x.grantor,x.privilege_type) from (select case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end grantee,pg_get_userbyid(a.grantor) grantor,a.privilege_type,a.is_grantable from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a) x) acl,md5(pg_get_functiondef(p.oid)) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=any($1) and p.prokind in ('f','p') order by 1,2,3";
export async function dataDigest(db,schemas){
 const names=(await db.query("select schemaname,tablename from pg_tables where schemaname=any($1) order by 1,2",[schemas])).rows,out=[];
 for(const t of names){const d=(await db.query('select md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text)::text,\'[]\')) hash from '+qi(t.schemaname)+'.'+qi(t.tablename)+' x')).rows[0].hash;out.push([t.schemaname,t.tablename,d]);}
 return sha(JSON.stringify(out));
}
export async function managedLayout(db){return sha(stableJSON((await db.query("select table_schema,table_name,column_name,ordinal_position,udt_schema,udt_name,is_nullable,column_default from information_schema.columns where table_schema in ('auth','storage','vault') order by 1,2,4")).rows));}
export const roleQuery="select jsonb_build_object('roles',(select jsonb_agg(to_jsonb(r) order by rolname) from (select rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit,rolvaliduntil,rolconfig from pg_roles) r),'memberships',(select jsonb_agg(jsonb_build_object('role',r.rolname,'member',u.rolname,'grantor',g.rolname,'admin',m.admin_option,'inherit',m.inherit_option,'set',m.set_option) order by r.rolname,u.rolname,g.rolname) from pg_auth_members m join pg_roles r on r.oid=m.roleid join pg_roles u on u.oid=m.member join pg_roles g on g.oid=m.grantor)) roles";
export async function storageExport(request){
 const buckets=await request('bucket');if(!Array.isArray(buckets))fail('STORAGE_INVALIDO');const all=[];let total=0,objects=0;
 for(const bucket of buckets){if(bucket.type&&bucket.type!=='STANDARD')fail('STORAGE_ESPECIAL_REQUIERE_RESPALDO_ADICIONAL');const pending=[''],seen=new Set(),files=[];
  while(pending.length){const prefix=pending.pop();if(seen.has(prefix)||seen.size>10000)fail('STORAGE_LISTADO_INVALIDO');seen.add(prefix);
   for(let offset=0;;offset+=100){if(offset>1000000)fail('STORAGE_LIMITE');const page=await request('object/list/'+encodeURIComponent(bucket.id),{prefix,offset,limit:100,sortBy:{column:'name',order:'asc'}});if(!Array.isArray(page))fail('STORAGE_INVALIDO');
    for(const item of page){const name=(prefix?prefix+'/':'')+item.name;if(!item.id&&!item.metadata){pending.push(name);continue;}if(++objects>10000)fail('STORAGE_LIMITE');const raw=await request('object/authenticated/'+encodeURIComponent(bucket.id)+'/'+name.split('/').map(encodeURIComponent).join('/'),undefined,true);total+=raw.length;if(total>128*1024*1024)fail('STORAGE_REQUIERE_STREAMING');files.push({name,metadata:item,length:raw.length,sha256:sha(raw),base64:raw.toString('base64')});}
    if(page.length<100)break;
   }
  }all.push({bucket,files});
 }return Buffer.from(JSON.stringify(all));
}
export async function snapshot({db,runPg,storage,root,external,journal,receipts,fictional=false}){
 const parts=[];let size=0;const add=(name,b)=>{size+=b.length;if(b.length>128*1024*1024||size>400*1024*1024)fail('RESPALDO_REQUIERE_STREAMING');parts.push(part(name,b));};
 await db.query('begin isolation level repeatable read read only');
 try{
 const id=(await db.query('select pg_export_snapshot() id')).rows[0].id;if(!/^[0-9A-F-]+$/i.test(id))fail('SNAPSHOT_INVALIDO');
 const schemas=(await db.query("select nspname from pg_namespace where nspname not like 'pg_%' and nspname<>'information_schema' order by nspname")).rows.map(x=>x.nspname);
 const app=schemas.filter(n=>!managed.has(n));if(!app.includes('public')||app.some(n=>!/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(n)))fail('ESQUEMAS_REQUIEREN_REVISION');
 const deps=(await db.query("select (select count(*)::int from pg_foreign_table) foreign_tables,(select count(*)::int from pg_largeobject_metadata) large_objects,(select jsonb_agg(datname order by datname) from pg_database where not datistemplate) databases")).rows[0];
 if(deps.foreign_tables||deps.large_objects||(!fictional&&deps.databases.some(n=>n!=='postgres')))fail('DEPENDENCIAS_REQUIEREN_PLAN_ADICIONAL');
 const roles=(await db.query(roleQuery)).rows[0].roles,layout=await managedLayout(db),digests=await dataDigest(db,[...app,'auth','vault','storage']);
 const dump=args=>runPg('pg_dump',['--format=custom','--snapshot='+id,...args]);
 add('database-full',dump([]));add('application',dump(app.map(n=>'--schema='+n)));add('auth-data',dump(['--schema=auth','--data-only']));add('storage-data',dump(['--schema=storage','--data-only']));add('vault-data',dump(['--table=vault.secrets','--data-only']));add('managed-ddl',dump(['--schema=auth','--schema=storage','--schema-only']));add('roles',Buffer.from(JSON.stringify(roles)));add('roles-ddl',runPg('pg_dumpall',['--database=postgres','--roles-only','--no-role-passwords']));
 // Object definitions/ACLs are archived. Do not replay managed DDL blindly.
 const acl=(await db.query(relationSql,[app])).rows,functions=(await db.query(functionSql,[app])).rows;
 add('catalog',Buffer.from(JSON.stringify({appSchemas:app,managedLayout:layout,dataDigest:digests,dependencies:deps,applicationRelations:acl,applicationFunctions:functions,postgres:(await db.query('show server_version')).rows[0].server_version})));
 add('storage-bytes',await storage());add('external-config',Buffer.from(JSON.stringify(external)));add('vault-root',Buffer.from(JSON.stringify({root_key:root})));add('revocations',journal);
 await db.query('rollback');await db.query('begin read only');if(JSON.stringify((await db.query(roleQuery)).rows[0].roles)!==JSON.stringify(roles))fail('ROLES_CAMBIARON');await db.query('rollback');
 return {format:2,project:PROJECT,createdAt:new Date().toISOString(),fictional,externalConfigurationComplete:external.status==='captured_owner_reviewed',parts,receipts,operationalApproval:false};
 }catch(e){await db.query('rollback').catch(()=>{});throw e;}
}
export async function captureReal(input){
 if(process.env.CI||process.env.GITHUB_ACTIONS)fail('CAPTURA_REAL_BLOQUEADA_EN_CI');
 if((process.env.CODESPACES||process.env.CLOUD_SHELL)&&!(input.privateEnvironment?.ownerVerified===true&&input.privateEnvironment?.noPaymentMethod===true&&input.privateEnvironment?.freeQuotaVerified===true&&input.privateEnvironment?.noPublicPorts===true))fail('CLOUD_PRIVADA_Y_GRATUITA_NO_VERIFICADA');
 if(process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0')fail('TLS_NO_VERIFICADO');
 validateSource(input.source);validateReceipts(input.receipts);
 assertLocalDocker();
 const key=Buffer.from(input.key,'base64');if(key.length!==32||!input.journal)fail('CUSTODIA_INCOMPLETA');
 const journal=Buffer.from(input.journal,'base64');if(!journal.length)fail('REGISTRO_REVOCACIONES_REQUERIDO');
 const r=await fetch('https://api.supabase.com/v1/projects/'+PROJECT+'/pgsodium',{headers:{Authorization:'Bearer '+input.source.managementToken},redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)fail('RAIZ_VAULT_NO_DISPONIBLE');const root=(await r.json()).root_key;if(!/^[a-fA-F0-9]{64}$/.test(root??''))fail('RAIZ_VAULT_INVALIDA');
 const db=new Client({host:input.source.host,port:5432,user:input.source.user,password:input.source.password,database:'postgres',ssl:{rejectUnauthorized:true,ca:input.source.ca,servername:input.source.host},connectionTimeoutMillis:15000,application_name:'cheveni-private-readonly-backup'});
 const tools=remotePgTools(input.source);
 try{await db.connect();const payload=await snapshot({db,runPg:tools.run,root,external:input.external??{},journal,receipts:input.receipts,storage:()=>storageExport(async(path,body,binary)=>{const response=await fetch('https://'+PROJECT+'.supabase.co/storage/v1/'+path,{method:body?'POST':'GET',redirect:'error',headers:{Authorization:'Bearer '+input.source.storageKey,apikey:input.source.storageKey,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});if(!response.ok)fail('STORAGE_LECTURA_FALLO');return binary?Buffer.from(await response.arrayBuffer()):response.json();})});const encrypted=encryptPayload(payload,key);decryptPayload(encrypted,key);return {encrypted,result:summary(payload)};}finally{tools.close();await db.end().catch(()=>{});}
}
