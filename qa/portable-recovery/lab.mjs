import assert from 'node:assert/strict';
import {Client} from 'pg';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {localStatus,seal,open,sha256,partsFrom,verifyParts,verifyJournal} from './portable.mjs';

// Generic fixture only. No hosted-project mode, account, cloud key or private
// application source. This is not an exporter or restorer for a hosted project.
assert.equal(process.env.PORTABLE_RECOVERY_MODE,'fictional-local-only');
assert.ok(process.env.RUNNER_TEMP);
const dir=join(process.env.RUNNER_TEMP,'portable-stack');
const custody=join(process.env.RUNNER_TEMP,'portable-recovery-custody');
mkdirSync(dir,{recursive:true,mode:0o700});mkdirSync(custody,{recursive:true,mode:0o700});
let db,status,pg,storage,services=[];let count=0;
const pass=label=>console.log('PORTABLE_PASS '+(++count)+' '+label);
function cmd(exe,args,input){
 try{return execFileSync(exe,args,{input,maxBuffer:128*1024*1024,stdio:['pipe','pipe','pipe'],timeout:240000});}
 catch(e){throw Error('LOCAL_COMMAND_FAILED '+exe+' '+(e.status??'timeout')+' '+(/permission denied/i.test(String(e.stderr))?'PERMISSION_DENIED':/unhealthy/i.test(String(e.stderr))?'UNHEALTHY':/already exists/i.test(String(e.stderr))?'EXISTS':'MASKED_OUTPUT'));}
}
const docker=(args,input)=>cmd('docker',args,input);
const quote=s=>'"'+s.replaceAll('"','""')+'"';
const delay=()=>new Promise(r=>setTimeout(r,300));
async function connect(){
 for(let i=0;i<80;i++){
  try{db=new Client({host:'127.0.0.1',port:54322,user:'postgres',password:'postgres',database:'postgres',ssl:false,connectionTimeoutMillis:2000});db.on('error',()=>{});await db.connect();await db.query('select 1');return;}
  catch{await db?.end().catch(()=>{});await delay();}
 }throw Error('LOCAL_DB_NOT_READY');
}
async function api(path,{method='POST',body,key=status.SERVICE_ROLE_KEY,token=key,binary=false}={}){
 const response=await fetch(status.API_URL+path,{method,redirect:'error',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':binary?'application/octet-stream':'application/json'},...(body!==undefined?{body:binary?body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 return {ok:response.ok,status:response.status,data:binary&&method==='GET'?Buffer.from(await response.arrayBuffer()):await response.json().catch(()=>null)};
}
async function start(){
 cmd('supabase',['start','--workdir',dir,'--network-id','portable-recovery-only','--agent','no','--exclude','realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor']);
 status=localStatus(JSON.parse(cmd('supabase',['status','--workdir',dir,'--agent','no','-o','json'])));
 const ids=docker(['ps','--filter','network=portable-recovery-only','--format','{{.ID}}']).toString().trim().split('\n');
 services=[];pg=undefined;storage=undefined;
 for(const id of ids){assert.match(id,/^[a-f0-9]{12,64}$/);const info=JSON.parse(docker(['inspect',id]))[0];
  if(/supabase\/postgres:17\./.test(info.Config.Image)){pg=id;assert.deepEqual(info.NetworkSettings.Ports['5432/tcp'],[{HostIp:'127.0.0.1',HostPort:'54322'}]);}
  else {services.push(id);if(/storage-api:/.test(info.Config.Image))storage={id,image:info.Config.Image};}
 }
 assert.ok(pg);assert.ok(storage);await connect();
 assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,0,'fresh fixture stack only');
}
async function destroy(){await db?.end().catch(()=>{});db=undefined;cmd('supabase',['stop','--workdir',dir,'--no-backup','--agent','no']);}
async function setRoot(root){
 assert.match(root,/^[a-f0-9]{64}$/);
 docker(['exec','-i','--user','postgres',pg,'sh','-c',"umask 077; cat > /tmp/portable-vault.key; printf '#!/bin/sh\\ncat /tmp/portable-vault.key\\n' > /tmp/portable-vault-getkey; chmod 700 /tmp/portable-vault-getkey"],Buffer.from(root));
 // Local container administrator only; never a proposed hosted privilege.
 docker(['exec','-i',pg,'psql','--username=supabase_admin','--dbname=postgres','--set=ON_ERROR_STOP=1','--file=-'],Buffer.from("alter system set vault.getkey_script='/tmp/portable-vault-getkey';"));
 await db.end();db=undefined;docker(['restart',pg]);await connect();
}
async function layout(){return sha256(JSON.stringify((await db.query("select table_schema,table_name,column_name,ordinal_position,udt_schema,udt_name,is_nullable,column_default from information_schema.columns where table_schema in ('auth','storage','vault') order by 1,2,4")).rows));}
async function dataDigest(schemas){
 const tables=(await db.query("select schemaname,tablename from pg_tables where schemaname=any($1) order by 1,2",[schemas])).rows;const hashes=[];
 for(const t of tables){const r=await db.query('select md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text)::text,\'[]\')) digest from '+quote(t.schemaname)+'.'+quote(t.tablename)+' x');hashes.push([t.schemaname,t.tablename,r.rows[0].digest]);}
 return sha256(JSON.stringify(hashes));
}
const email='portable-fixture@example.invalid',password='Fictional-password-only-'+randomBytes(16).toString('hex');
const root=randomBytes(32).toString('hex'),key=randomBytes(32),canary=randomBytes(30).toString('hex');
const roleSql='create role portable_reader nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;\ncreate role portable_member nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;\ngrant portable_reader to portable_member with admin false,inherit false,set true;\n';
let sourceLayout,sourceDigest,oldRefresh,userId,secretId,sourcePg,blob;
try{
 cmd('supabase',['init','--workdir',dir,'--yes','--agent','no']);
 docker(['network','create','-o','com.docker.network.bridge.host_binding_ipv4=127.0.0.1','portable-recovery-only']);
 await start();sourcePg=pg;await setRoot(root);
 pass('fresh source stack; exact loopback endpoints; separate random Vault root');
 const created=await api('/auth/v1/admin/users',{body:{email,password,email_confirm:true}});assert.ok(created.ok);userId=created.data.id;
 const login=await api('/auth/v1/token?grant_type=password',{key:status.ANON_KEY,body:{email,password}});assert.ok(login.ok);oldRefresh=login.data.refresh_token;
 assert.ok((await api('/auth/v1/logout?scope=global',{key:status.ANON_KEY,token:login.data.access_token})).ok);
 pass('real Auth identity/password and pre-checkpoint revoked refresh fixture');
 await db.query(roleSql);
 await db.query("create schema portable_app; create table portable_app.visits(id bigint generated by default as identity primary key,user_id uuid references auth.users(id),revoked boolean not null default false); alter table portable_app.visits enable row level security; alter table portable_app.visits force row level security; create policy own_visit on portable_app.visits to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid()); revoke all on schema portable_app from public; grant usage on schema portable_app to portable_reader; grant select on portable_app.visits to portable_reader");
 await db.query('insert into portable_app.visits(user_id,revoked) values($1,true)',[userId]);
 secretId=(await db.query("select vault.create_secret($1,'portable-fictional') id",[canary])).rows[0].id;
 assert.ok((await api('/storage/v1/bucket',{body:{id:'portable-fixture',name:'portable-fixture',public:false,file_size_limit:4096,allowed_mime_types:['application/octet-stream']}})).ok);
 blob=randomBytes(1031);
 assert.ok((await api('/storage/v1/object/portable-fixture/nested/fixture.bin',{body:blob,binary:true})).ok);
 assert.deepEqual((await api('/storage/v1/object/authenticated/portable-fixture/nested/fixture.bin',{method:'GET',binary:true})).data,blob);
 await db.query("create policy portable_fixture_deny on storage.objects for select to authenticated using(false)");
 pass('fixture foreign key, sequence, RLS, custom roles, Vault ciphertext and private nested Storage bytes');
 // All non-database services, including Auth and Storage, are stopped before
 // the snapshot. Database/role changes are solely owned by this fixture script.
 docker(['stop',...services]);
 sourceLayout=await layout();
 await db.query('begin isolation level repeatable read read only');
 const snapshot=(await db.query('select pg_export_snapshot() id')).rows[0].id;assert.match(snapshot,/^[0-9A-F-]+$/i);
 const dump=args=>docker(['exec',pg,'pg_dump','--username=supabase_admin','--dbname=postgres','--format=custom','--snapshot='+snapshot,...args]);
 sourceDigest=await dataDigest(['portable_app','auth','vault','storage']);
 const buffers={application:dump(['--schema=portable_app']),auth:dump(['--schema=auth','--data-only']),vault:dump(['--table=vault.secrets','--data-only']),storage:dump(['--schema=storage','--data-only']),'managed-ddl':dump(['--schema=auth','--schema=storage','--schema=vault','--schema-only']),roles:Buffer.from(roleSql),configuration:Buffer.from(JSON.stringify({siteUrl:'https://fictional.example.invalid',smtpConfigured:false,allowSends:false})), 'storage-files':docker(['cp',storage.id+':/var/lib/storage/.','-'])};
 await db.query('rollback');
 const journal=sha256('fixture-revoked-at-checkpoint'),parts=partsFrom(buffers);verifyParts(parts);
 const envelope=seal(Buffer.from(JSON.stringify({version:1,root,sourceLayout,sourceDigest,journal,parts})),key);
 const backupPath=join(custody,'fixture-backup.aesgcm');writeFileSync(backupPath,envelope,{mode:0o600});
 pass('coherent exported snapshot covers explicit managed data, managed DDL, role fixture, local Storage volume and external configuration');
 const bad=Buffer.from(envelope);bad[30]^=1;assert.throws(()=>open(bad,key));assert.throws(()=>open(envelope,randomBytes(32)));
 assert.throws(()=>verifyJournal(journal,sha256('new-independent-revocation')));
 pass('encrypted archive tampering, missing decryption key and stale revocation journal reject before restoration');
 await destroy();
 assert.equal(docker(['ps','-a','--filter','id='+sourcePg,'--format','{{.ID}}']).toString().trim(),'');
 await start();assert.notEqual(pg,sourcePg);assert.equal((await db.query('select count(*)::int n from vault.secrets')).rows[0].n,0);
 assert.equal((await db.query("select count(*)::int n from pg_roles where rolname like 'portable_%'")).rows[0].n,0);
 pass('source containers and persisted source volumes destroyed; target freshly bootstrapped');
 const restored=JSON.parse(open(readFileSync(backupPath),key));verifyParts(restored.parts);verifyJournal(restored.journal,journal);
 assert.equal(await layout(),restored.sourceLayout,'managed service schema layout drift blocks data restore');
 const bytes=Object.fromEntries(restored.parts.map(p=>[p.name,Buffer.from(p.base64,'base64')]));
 docker(['stop',...services]);
 const clear=[];
 for(const s of ['auth','vault','storage']){const ts=(await db.query('select tablename from pg_tables where schemaname=$1 order by tablename',[s])).rows;if(ts.length)clear.push('truncate '+ts.map(t=>quote(s)+'.'+quote(t.tablename)).join(',')+' cascade;');}
 const sql=Buffer.concat([Buffer.from("set local session_replication_role='replica';\n"+bytes.roles+'\n'+clear.join('\n')+'\n'),...['application','auth','vault','storage'].map(n=>docker(['exec','-i',pg,'pg_restore','--file=-'],bytes[n])),Buffer.from("\ncreate policy portable_fixture_deny on storage.objects for select to authenticated using(false);\nset local session_replication_role='origin';\n")]);
 docker(['exec','-i',pg,'psql','--username=supabase_admin','--dbname=postgres','--single-transaction','--set=ON_ERROR_STOP=1','--file=-'],sql);
 pass('application DDL, Auth data, Vault ciphertext, Storage metadata and custom roles restored atomically to fresh compatible bootstrap');
 let wrongRootDenied=false;
 try{await db.query('select decrypted_secret from vault.decrypted_secrets where id=$1',[secretId]);}catch{wrongRootDenied=true;}
 assert.equal(wrongRootDenied,true);
 pass('fresh target root cannot decrypt copied Vault ciphertext');
 await setRoot(restored.root);
 assert.equal((await db.query('select decrypted_secret=$1 as matches from vault.decrypted_secrets where id=$2',[canary,secretId])).rows[0].matches,true);
 pass('separately captured fictional root restores Vault decryption in new cluster');
 // No cloud or S3 storage is involved. The file backend volume is restored
 // separately from PostgreSQL; the metadata alone cannot restore file bytes.
 docker(['run','--rm','-i','--network','none','--volumes-from',storage.id,'--user','root','--entrypoint','tar',storage.image,'-xf','-','-C','/var/lib/storage'],bytes['storage-files']);
 assert.equal(await dataDigest(['portable_app','auth','vault','storage']),restored.sourceDigest);
 assert.equal((await db.query("select relrowsecurity and relforcerowsecurity as ok from pg_class where oid='portable_app.visits'::regclass")).rows[0].ok,true);
 assert.equal((await db.query("select count(*)::int n from pg_auth_members m join pg_roles r on m.roleid=r.oid join pg_roles u on m.member=u.oid where r.rolname='portable_reader' and u.rolname='portable_member' and not m.admin_option and not m.inherit_option and m.set_option")).rows[0].n,1);
 const next=(await db.query('insert into portable_app.visits(user_id) values($1) returning id',[userId])).rows[0].id;assert.equal(next,'2');
 pass('ordinary-table digests, RLS flags, role membership options and identity sequence recover');
 const cfg=join(custody,'restored-fictional-config.json');writeFileSync(cfg,bytes.configuration,{mode:0o600});assert.equal(sha256(readFileSync(cfg)),sha256(buffers.configuration));
 docker(['start',...services]);
 let recovered;
 for(let i=0;i<80;i++){try{recovered=await api('/auth/v1/token?grant_type=password',{key:status.ANON_KEY,body:{email,password}});if(recovered.ok)break;}catch{}await delay();}
 assert.ok(recovered?.ok,'real Auth login after fresh-cluster restore');
 assert.equal((await api('/auth/v1/token?grant_type=refresh_token',{key:status.ANON_KEY,body:{refresh_token:oldRefresh}})).ok,false);
 pass('restored real Auth password works; checkpoint-revoked refresh stays denied');
 let download;
 for(let i=0;i<60;i++){try{download=await api('/storage/v1/object/authenticated/portable-fixture/nested/fixture.bin',{method:'GET',binary:true});if(download.ok)break;}catch{}await delay();}
 assert.ok(download?.ok);assert.deepEqual(download.data,blob);
 assert.equal((await api('/storage/v1/object/authenticated/portable-fixture/nested/fixture.bin',{method:'GET',key:status.ANON_KEY,binary:true})).ok,false);
 pass('real private Storage nested file recovers byte-for-byte; anonymous download stays denied');
 console.log('PORTABLE_RECOVERY_RESULT '+JSON.stringify({checks:count,status:'fictional_fresh_cluster_recovery_verified',cloudProjectRecovery:false,cloudRootExportTested:false,cloudStorageRecoveryTested:false,providerConfigurationRestored:false,emailsSent:0,paidServices:0}));
}catch(e){console.error('PORTABLE_RECOVERY_FAILED '+String(e.message).replace(/https?:\/\/\S+/g,'[masked-url]').slice(0,400));process.exitCode=1;}
finally{
 try{await destroy();console.log('PORTABLE_SOURCE_AND_TARGET_DESTROYED');}catch{console.log('LOCAL_CLEANUP_DEFERRED_TO_ALWAYS_STEP');}
 rmSync(custody,{recursive:true,force:true});
}
