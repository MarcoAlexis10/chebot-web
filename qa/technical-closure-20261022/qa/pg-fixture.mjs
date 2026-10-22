// Disposable PostgreSQL 17.11 only. No DEV/PROD transport exists in this module.
import {execFileSync,spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import path from 'node:path';
import {safeEnv} from '../approved/private-host.mjs';
export const IMAGE='postgres@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826';
export const LABEL='cheveni.technical.closure';
const instances=new Map();
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function raw(args,input,timeout=30000){try{return execFileSync('docker',args,{input,env:safeEnv(),timeout,maxBuffer:80*1024*1024,stdio:['pipe','pipe','pipe']});}catch{throw Error('FIXTURE_DOCKER_FAILED_'+String(args[0]).toUpperCase().replace(/[^A-Z]/g,''));}}
function endpoint(){if(process.env.DOCKER_HOST||process.env.DOCKER_CONTEXT)throw Error('DOCKER_OVERRIDE_REFUSED');const e=JSON.parse(raw(['context','inspect']))[0]?.Endpoints?.docker?.Host;if(e!=='unix:///var/run/docker.sock')throw Error('LOCAL_LINUX_DOCKER_ONLY');return e;}
export function cmd(args,input,timeout){return raw(['--host',endpoint(),...args],input,timeout);}
function inspect(kind,name){return JSON.parse(cmd([kind,'inspect',name]))[0];}
function names(id){if(!/^[a-f0-9]{24}$/.test(id))throw Error('FICTIONAL_ID_REQUIRED');return {container:'cv-tech-'+id,volume:'cv-tech-'+id,network:'cv-tech-'+id};}
export function assertFixture(id){const p=instances.get(id);if(!p)throw Error('OWNED_FIXTURE_REQUIRED');const n=names(id),c=JSON.parse(cmd(['inspect',n.container]))[0],v=inspect('volume',n.volume);
 if(c.Config.Labels?.[LABEL]!==id||v.Labels?.[LABEL]!==id||c.Config.Image!==IMAGE||c.HostConfig.Privileged||c.Mounts.length!==1||c.Mounts[0].Type!=='volume'||c.Mounts[0].Name!==n.volume||Object.values(c.HostConfig.PortBindings??{}).some(x=>x?.length)||Object.values(c.NetworkSettings.Ports??{}).some(x=>x?.length))throw Error('FIXTURE_ISOLATION_FAILED');
 if(p.kind==='source'){const net=inspect('network',n.network);if(!net.Internal||net.Labels?.[LABEL]!==id||Object.keys(c.NetworkSettings.Networks).join()!==n.network)throw Error('FIXTURE_ISOLATION_FAILED');}
 else if(c.HostConfig.NetworkMode!=='none')throw Error('REBUILD_EGRESS_NOT_CLOSED');
 return n;
}
export function sql(id,database,query){const n=assertFixture(id);if(!/^[a-z_]+$/.test(database))throw Error('FICTIONAL_DATABASE_REQUIRED');return cmd(['exec','-i',n.container,'psql','-X','-qAt','--username=postgres','--dbname='+database,'--set','ON_ERROR_STOP=1'],Buffer.from(query)).toString().trim();}
export async function startFixture(kind='source'){
 if(!['source','closed-target'].includes(kind))throw Error('FIXTURE_KIND_INVALID');
 const id=randomBytes(12).toString('hex'),n=names(id);instances.set(id,{kind});const label=['--label',LABEL+'='+id];
 try{
  cmd(['image','inspect',IMAGE]);
  if(kind==='source')cmd(['network','create','--internal',...label,n.network]);
  cmd(['volume','create',...label,n.volume]);
  const network=kind==='source'?['--network',n.network,'--network-alias','fixture-source','--network-alias','wrong-source']:['--network','none'];
  cmd(['run','--pull=never','--detach','--name',n.container,...label,...network,'--mount','type=volume,src='+n.volume+',dst=/var/lib/postgresql/data','--env','POSTGRES_HOST_AUTH_METHOD=trust',IMAGE]);
  let ready=false;for(let k=0;k<80;k++){try{sql(id,'postgres','select 1;');ready=true;break;}catch{await pause(200);}}
  if(!ready)throw Error('FIXTURE_START_TIMEOUT');
  if(kind==='source')await configureTls(id);
  return id;
 }catch(e){cleanup(id);throw e;}
}
function openssl(args){try{execFileSync('openssl',args,{stdio:['ignore','ignore','pipe'],timeout:15000});}catch{throw Error('FICTIONAL_CERTIFICATE_SETUP_FAILED');}}
async function configureTls(id){
 const n=assertFixture(id),dir=mkdtempSync(path.join(tmpdir(),'cv-tech-cert-'));
 try{
  const f=x=>path.join(dir,x);
  openssl(['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=CheVeniFictionalCA','-keyout',f('ca.key'),'-out',f('ca.crt')]);
  openssl(['req','-newkey','rsa:2048','-nodes','-subj','/CN=fixture-source','-keyout',f('server.key'),'-out',f('server.csr')]);
  writeFileSync(f('san.conf'),'subjectAltName=DNS:fixture-source\n');
  openssl(['x509','-req','-in',f('server.csr'),'-CA',f('ca.crt'),'-CAkey',f('ca.key'),'-CAcreateserial','-days','1','-extfile',f('san.conf'),'-out',f('server.crt')]);
  openssl(['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=WrongFictionalCA','-keyout',f('wrong.key'),'-out',f('wrong.crt')]);
  for(const [from,to] of [['server.key','/tmp/cv-server.key'],['server.crt','/tmp/cv-server.crt'],['ca.crt','/tmp/cv-ca.crt'],['wrong.crt','/tmp/cv-wrong-ca.crt']])cmd(['cp',f(from),n.container+':'+to]);
  cmd(['exec',n.container,'chown','postgres:postgres','/tmp/cv-server.key']);cmd(['exec',n.container,'chmod','600','/tmp/cv-server.key']);
  sql(id,'postgres',"alter system set ssl='on';alter system set ssl_cert_file='/tmp/cv-server.crt';alter system set ssl_key_file='/tmp/cv-server.key';");
  cmd(['exec','-i',n.container,'sh','-c','cat > /var/lib/postgresql/data/pg_hba.conf'],Buffer.from('local all all trust\nhostssl all fixture_reader all scram-sha-256\nhostnossl all all all reject\n'));
  sql(id,'postgres','select pg_reload_conf();');
  instances.get(id).password='FICTIONAL-'+randomBytes(20).toString('hex');
  const pw=instances.get(id).password;
  sql(id,'postgres',"create role fixture_reader login password '"+pw+"';create database fixture_source;");
  sql(id,'fixture_source',"create schema fixture;create table fixture.source_identity(marker text primary key);insert into fixture.source_identity values('"+id+"');grant usage on schema fixture to fixture_reader;grant select on all tables in schema fixture to fixture_reader;alter default privileges in schema fixture grant select on tables to fixture_reader;");
  await pause(300);
 }finally{rmSync(dir,{recursive:true,force:true});}
}
export async function makePgSource(id,{wrongHost=false,wrongCA=false}={}){
 if(instances.get(id)?.kind!=='source')throw Error('OWNED_SOURCE_REQUIRED');const n=assertFixture(id);
 const app='cv-tech-'+id;
 function prefix(program,args){return ['--host',endpoint(),'exec','-i','--env','PGSSLMODE=verify-full','--env','PGSSLROOTCERT='+(wrongCA?'/tmp/cv-wrong-ca.crt':'/tmp/cv-ca.crt'),'--env','PGCONNECT_TIMEOUT=3','--env','PGAPPNAME='+app,'--env','PGOPTIONS=-c default_transaction_read_only=on -c statement_timeout=30000 -c lock_timeout=2000',n.container,'sh','-c','IFS= read -r PGPASSWORD; export PGPASSWORD; exec "$@"','--',program,'--host='+(wrongHost?'wrong-source':'fixture-source'),'--port=5432','--username=fixture_reader','--dbname=fixture_source','--no-password',...args];}
 const input=()=>Buffer.from(instances.get(id).password+'\n');
 return {id,assertIsolated:async()=>assertFixture(id),
  probe:async()=>{
   let out;try{out=execFileSync('docker',prefix('psql',['-X','-qAt','--set','ON_ERROR_STOP=1','--command',"select json_build_object('database',current_database(),'marker',(select marker from fixture.source_identity),'version',current_setting('server_version'),'readOnly',current_setting('transaction_read_only')='on','tls',(select ssl from pg_stat_ssl where pid=pg_backend_pid()));"]),{input:input(),env:safeEnv(),timeout:7000,stdio:['pipe','pipe','pipe']});}catch{throw Error('TLS_OR_READONLY_SOURCE_PROBE_FAILED');}
   return JSON.parse(out.toString());},
  dump:()=>{const p=spawn('docker',prefix('pg_dump',['--format=custom','--lock-wait-timeout=2s']),{env:safeEnv(),stdio:['pipe','pipe','pipe']});p.stdin.on('error',()=>{});p.stdin.end(input());return p;},
  cancel:async()=>{sql(id,'postgres',"select pg_cancel_backend(pid) from pg_stat_activity where application_name='"+app+"' and pid<>pg_backend_pid();");}
 };
}
export function cleanup(id){
 const p=instances.get(id);if(!p)return;const n=names(id);
 // Only names selected by this process and labels bound to this random run.
 for(const [kind,name] of [['container',n.container],['volume',n.volume],...(p.kind==='source'?[['network',n.network]]:[])]){
  let found;try{found=JSON.parse(cmd([kind,'inspect',name]))[0];}catch{continue;}
  if((kind==='container'?found.Config.Labels:found.Labels)?.[LABEL]!==id)throw Error('UNOWNED_RESOURCE_NOT_REMOVED');
  cmd([kind,'rm',...(kind==='container'?['--force']:[]),name]);
 }
 instances.delete(id);
}
export function assertNoResources(){for(const kind of ['container','volume','network']){const out=cmd([kind,'ls',...(kind==='container'?['-a']:[]),'--filter','label='+LABEL,'--format',kind==='container'?'{{.Names}}':'{{.Name}}']).toString().trim();if(out)throw Error('OWNED_RESOURCE_REMAINS');}return true;}
