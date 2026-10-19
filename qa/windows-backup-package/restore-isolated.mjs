import {localCommand,PG_IMAGE,assertLocalDocker} from './pg-tools.mjs';
import {decryptPayload,unpack,stableJSON,journalGuard,validateDiscardable,sha,fail} from './core.mjs';
import {dataDigest,managedLayout,relationSql,functionSql,roleQuery} from './backup.mjs';
const q=n=>'"'+n.replaceAll('"','""')+'"';
const lit=s=>"'"+s.replaceAll("'","''")+"'";
function psql(container,sql){return localCommand('docker',['exec','-i',container,'psql','--username=supabase_admin','--dbname=postgres','-X','-q','-A','-t','--set=ON_ERROR_STOP=1','--file=-'],{input:Buffer.from('set search_path=pg_catalog;\n'+sql)}).toString('utf8').trim();}
export function sqlClient(container){return {query:async(sql,values=[])=>{if(values.length){if(values.length!==1||!Array.isArray(values[0]))fail('CONSULTA_LOCAL_INVALIDA');sql=sql.replace('$1','ARRAY['+values[0].map(lit).join(',')+']::text[]');}const text=psql(container,'select coalesce(jsonb_agg(to_jsonb(t)),\'[]\' ) from ('+sql.replace(/;\s*$/,'')+') t;');return {rows:JSON.parse(text)};}};}
function normalizeDDL(b){return b.toString().split('\n').filter(s=>!s.startsWith('--')&&!s.startsWith('\\restrict ')&&!s.startsWith('\\unrestrict ')).join('\n').trim();}
export function customRoles(source,target){
 const names=new Set(target.roles.map(r=>r.rolname)),missing=source.roles.filter(r=>!names.has(r.rolname));
 for(const r of missing)if(r.rolconnlimit!==-1||r.rolvaliduntil!==null||(r.rolconfig?.length??0)>0||r.rolcanlogin||r.rolsuper||r.rolcreatedb||r.rolcreaterole||r.rolreplication||r.rolbypassrls||r.rolname.startsWith('pg_')||r.rolname.startsWith('supabase_'))fail('ROL_REQUIERE_RECONCILIACION_PRIVADA');
 let sql='set local role postgres;\n';
 for(const r of missing)sql+='create role '+q(r.rolname)+' nologin '+(r.rolinherit?'inherit':'noinherit')+' nosuperuser nocreatedb nocreaterole noreplication nobypassrls;\n';sql+='reset role;\n';
 const changed=new Set(missing.map(r=>r.rolname));
 for(const m of source.memberships??[])if(changed.has(m.role)||changed.has(m.member)){sql+='set local role '+q(m.grantor)+';\ngrant '+q(m.role)+' to '+q(m.member)+' with admin '+Boolean(m.admin)+',inherit '+Boolean(m.inherit)+',set '+Boolean(m.set)+';\nreset role;\n';}
 return {sql,missing};
}
export function objectAclClosure(catalog,roleNames){
 // Fresh-object defaults can add rights that pg_restore does not revoke.
 // Close only each restored object, never global default privileges.
 const principals=['PUBLIC',...new Set(roleNames)].map(r=>r==='PUBLIC'?'public':q(r)).join(',');
 const objects=[...(catalog.applicationRelations??[]).map(r=>({...r,kind:r.relkind==='S'?'SEQUENCE':'TABLE',identity:q(r.nspname)+'.'+q(r.relname)})),...(catalog.applicationFunctions??[]).map(f=>({...f,kind:f.prokind==='p'?'PROCEDURE':'FUNCTION',identity:q(f.nspname)+'.'+q(f.proname)+'('+f.arguments+')'}))];
 let sql='';
 for(const o of objects){
  if((o.acl??[]).some(a=>a.grantor!==o.owner))fail('OTORGANTES_ACL_REQUIEREN_RECONCILIACION_PRIVADA');
  const allowed=o.kind==='TABLE'?['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']:o.kind==='SEQUENCE'?['SELECT','UPDATE','USAGE']:['EXECUTE'];
  sql+='set local role '+q(o.owner)+';\nrevoke all on '+o.kind+' '+o.identity+' from '+principals+' cascade;\n';
  for(const a of o.acl??[]){if(!allowed.includes(a.privilege_type))fail('ACL_REQUIERE_REVISION_PRIVADA');sql+='grant '+a.privilege_type+' on '+o.kind+' '+o.identity+' to '+(a.grantee==='PUBLIC'?'public':q(a.grantee))+(a.is_grantable?' with grant option':'')+';\n';}
  sql+='reset role;\n';
 }
 return sql;
}
export function isolateBootstrap({container,network,runId}){
 assertLocalDocker();
 if(!/^[a-f0-9]{12}$/.test(runId)||container!=='supabase_db_cheveni_a1_'+runId||network!=='cheveni-a1-'+runId)fail('DESTINO_LOCAL_INVALIDO');
 const net=JSON.parse(localCommand('docker',['network','inspect',network]))[0];
 if(net.Name!==network||net.Labels?.['cheveni.a1.discardable']!==runId)fail('DESTINO_LOCAL_INVALIDO');
 const ids=localCommand('docker',['ps','-a','--filter','network='+network,'--format','{{.ID}}']).toString().trim().split('\n').filter(Boolean);
 const members=ids.map(id=>JSON.parse(localCommand('docker',['inspect',id]))[0]);
 if(!members.some(c=>c.Name==='/'+container)||members.some(c=>!c.Name.endsWith('_cheveni_a1_'+runId)||(c.Name!=='/'+container&&c.State.Running)))fail('BOOTSTRAP_LOCAL_NO_CERRADO');
 for(const c of members){for(const bs of Object.values(c.NetworkSettings.Ports??{}))for(const b of bs??[])if(b.HostIp!=='127.0.0.1')fail('PUERTO_NO_PRIVADO');}
 for(const c of members)localCommand('docker',['network','disconnect','--force',network,c.Id]);
 localCommand('docker',['network','rm',network]);
 localCommand('docker',['network','create','--internal','--label','cheveni.a1.discardable='+runId,'-o','com.docker.network.bridge.host_binding_ipv4=127.0.0.1',network]);
 localCommand('docker',['network','connect',network,container]);
 const info=JSON.parse(localCommand('docker',['inspect',container]))[0],isolated=JSON.parse(localCommand('docker',['network','inspect',network]))[0];validateDiscardable(info,isolated,runId);
 return {status:'destino_vacio_aislado_antes_de_cargar_respaldo'};
}
export async function restoreIsolated({encrypted,key,currentJournal,container,network,runId}){
 assertLocalDocker();
 const info=JSON.parse(localCommand('docker',['inspect',container]))[0],net=JSON.parse(localCommand('docker',['network','inspect',network]))[0];validateDiscardable(info,net,runId);
 if(!/\/(?:supabase\/)?postgres:17\./.test(info.Config.Image))fail('IMAGEN_LOCAL_NO_COMPATIBLE');
 const p=decryptPayload(encrypted,key);journalGuard(p,currentJournal);
 const catalog=JSON.parse(unpack(p,'catalog')),storage=JSON.parse(unpack(p,'storage-bytes'));
 if(storage.some(b=>b.files.length>0||b.bucket))fail('STORAGE_NO_VACIO_REQUIERE_RECONCILIACION_PRIVADA');
 const client=sqlClient(container);
 if((await client.query('select count(*)::int n from auth.users')).rows[0].n!==0)fail('DESTINO_NO_VACIO');
 if(await managedLayout(client)!==catalog.managedLayout)fail('DDL_ADMINISTRADO_INCOMPATIBLE');
 const dump=localCommand('docker',['exec',container,'pg_dump','--username=supabase_admin','--dbname=postgres','--schema=auth','--schema=storage','--schema-only','--format=custom']);
 const sourceDdl=localCommand('docker',['run','--rm','-i','--pull=never','--network','none',PG_IMAGE,'pg_restore','--file=-'],{input:unpack(p,'managed-ddl')});
 // Cloud projects may legitimately customize managed triggers or policies.
 // Require an independently reviewed reconciliation receipt rather than
 // silently dropping those changes or replaying all managed DDL as admin.
 const targetDdl=localCommand('docker',['run','--rm','-i','--pull=never','--network','none',PG_IMAGE,'pg_restore','--file=-'],{input:dump});
 if(sha(normalizeDDL(sourceDdl))!==sha(normalizeDDL(targetDdl)))fail('CUSTOMIZACIONES_ADMINISTRADAS_REQUIEREN_REVISION');
 const target=(await client.query("select jsonb_build_object('roles',(select jsonb_agg(jsonb_build_object('rolname',rolname)) from pg_roles)) roles")).rows[0].roles;
 const sourceRoles=JSON.parse(unpack(p,'roles')),roles=customRoles(sourceRoles,target);
 const toc=localCommand('docker',['run','--rm','-i','--pull=never','--network','none',PG_IMAGE,'pg_restore','--list'],{input:unpack(p,'application')}).toString();
 // Existing bootstrap schemas/extensions/defaults are not dropped wholesale.
 const list=toc.split('\n').filter(s=>s.startsWith(';')||!s.trim()||!(/\bSCHEMA - public\b|\bEXTENSION\b|\bDEFAULT ACL\b/.test(s))).join('\n');
 // pg_restore's TOC is kept only inside a short-lived isolated tool container.
 const framed=Buffer.from(Buffer.from(list).toString('base64')+'\n'+unpack(p,'application').toString('base64'));
 const app=localCommand('docker',['run','--rm','-i','--pull=never','--network','none',PG_IMAGE,'sh','-c','umask 077; mkdir /tmp/a1; IFS= read -r toc; printf "%s" "$toc" | base64 -d > /tmp/a1/toc; base64 -d > /tmp/a1/input; pg_restore --use-list=/tmp/a1/toc --file=- /tmp/a1/input'],{input:framed});
 const appSql=app.toString();
 if(/\bDEFAULT PRIVILEGES\b/.test(appSql))fail('DEFAULT_ACL_REQUIERE_REVISION_PRIVADA');
 const components=['auth-data','vault-data','storage-data'].map(n=>localCommand('docker',['run','--rm','-i','--pull=never','--network','none',PG_IMAGE,'pg_restore','--file=-'],{input:unpack(p,n)}));
 const clear=[];for(const schema of ['auth','vault','storage']){const tables=(await client.query('select tablename from pg_tables where schemaname='+lit(schema)+' order by tablename')).rows;if(tables.length)clear.push('truncate '+tables.map(t=>q(schema)+'.'+q(t.tablename)).join(',')+' cascade;');}
 const closure=objectAclClosure(catalog,[...sourceRoles.roles,...target.roles].map(r=>r.rolname));
 const sql=Buffer.concat([Buffer.from("set local session_replication_role='replica';\n"+roles.sql+clear.join('\n')+'\n'),...components,Buffer.from(appSql+'\n'+closure),Buffer.from("\nset local session_replication_role='origin';\n")]);
 localCommand('docker',['exec','-i',container,'psql','--username=supabase_admin','--dbname=postgres','-X','--single-transaction','--set=ON_ERROR_STOP=1','--file=-'],{input:sql});
 const root=JSON.parse(unpack(p,'vault-root')).root_key;if(!/^[a-fA-F0-9]{64}$/.test(root))fail('RAIZ_INVALIDA');
 localCommand('docker',['exec','-i','--user','postgres',container,'sh','-c',"umask 077; cat > /tmp/cheveni-a1-root; printf '#!/bin/sh\\ncat /tmp/cheveni-a1-root\\n' > /tmp/cheveni-a1-getkey; chmod 700 /tmp/cheveni-a1-getkey"],{input:Buffer.from(root)});
 psql(container,"alter system set vault.getkey_script='/tmp/cheveni-a1-getkey';");localCommand('docker',['restart',container]);
 let ready=false;for(let i=0;i<60;i++){try{await client.query('select 1 n');ready=true;break;}catch{}await new Promise(r=>setTimeout(r,300));}if(!ready)fail('DESTINO_LOCAL_NO_RESPONDE');
 if(await dataDigest(client,[...catalog.appSchemas,'auth','vault','storage'])!==catalog.dataDigest)fail('DATOS_RESTAURADOS_NO_COINCIDEN');
 const recoveredRoles=(await client.query(roleQuery)).rows[0].roles,customNames=new Set(roles.missing.map(r=>r.rolname));
 if(stableJSON(recoveredRoles.roles.filter(r=>customNames.has(r.rolname)))!==stableJSON(sourceRoles.roles.filter(r=>customNames.has(r.rolname)))||stableJSON((recoveredRoles.memberships??[]).filter(m=>customNames.has(m.role)||customNames.has(m.member)))!==stableJSON((sourceRoles.memberships??[]).filter(m=>customNames.has(m.role)||customNames.has(m.member))))fail('ROLES_O_GRANTORS_NO_COINCIDEN');
 const restoredRelations=(await client.query(relationSql,[catalog.appSchemas])).rows,restoredFunctions=(await client.query(functionSql,[catalog.appSchemas])).rows;
 if(stableJSON(restoredRelations)!==stableJSON(catalog.applicationRelations)||stableJSON(restoredFunctions)!==stableJSON(catalog.applicationFunctions)){const e=Error('ACL_O_OBJETOS_REQUIEREN_RECONCILIACION');e.catalogDifferences={relationsSameCount:restoredRelations.length===catalog.applicationRelations.length,functionsSameCount:restoredFunctions.length===catalog.applicationFunctions.length,relationFields:['nspname','relname','relkind','owner','relrowsecurity','relforcerowsecurity','acl'].filter(f=>catalog.applicationRelations.some((r,i)=>stableJSON(r[f])!==stableJSON(restoredRelations[i]?.[f]))),functionFields:['nspname','proname','prokind','arguments','owner','prosecdef','acl','definition'].filter(f=>catalog.applicationFunctions.some((r,i)=>stableJSON(r[f])!==stableJSON(restoredFunctions[i]?.[f])))};throw e;}
 const decrypted=(await client.query('select coalesce(bool_and(decrypted_secret is not null),true) ok from vault.decrypted_secrets')).rows[0].ok;if(!decrypted)fail('VAULT_NO_RECUPERADO');
 return {status:'datos_aplicacion_auth_vault_verificados_en_destino_descartable',fictional:p.fictional===true,operationalApproval:false,integralRecoveryVerified:false,externalConfigurationRestored:false,remaining:'roles/default ACL administrados, configuración/proveedores y revisión independiente actuales'};
}
