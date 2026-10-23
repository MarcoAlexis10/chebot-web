// Prepared private libpq transport. The only minted capabilities are owned QA sources.
// A future DEV release requires a separate review/authorization; no flag enables it.
import {spawn} from 'node:child_process';
import {randomBytes, X509Certificate} from 'node:crypto';
import {safeEnv} from '../technical-closure-20261022/approved/private-host.mjs';
import {assertFixture,sql,cmd,IMAGE} from '../technical-closure-20261022/qa/pg-fixture.mjs';
export const remoteConnectionEnabled=false;
export function prepareDevCapture(){throw Error('DEV_TRANSPORT_NOT_RELEASED__SPECIFIC_AUTHORIZATION_REQUIRED');}
const capabilities=new WeakSet(),LABEL='cheveni.private.client.qa';
export const isPrivateQASource=s=>capabilities.has(s);
export function pgpassLine({host,port,database,user,password}){
 const fields=[host,String(port),database,user,password];
 if(fields.some(s=>typeof s!=='string'||s.length===0||s.length>1024||/[\r\n\0*]/.test(s)))throw Error('PRIVATE_PGPASS_INPUT_REJECTED');
 return fields.map(s=>s.replaceAll('\\','\\\\').replaceAll(':','\\:')).join(':')+'\n';
}
// Credentials arrive on stdin AFTER inspect, never Docker Config.Env/argv/logs.
// Only tmpfs is writable. No host bind, published port, secret environment or service.
const SCRIPT=`set -eu
umask 077
IFS= read -r passline
IFS= read -r ca64
printf '%s\\n' "$passline" > /run/cheveni/pgpass
printf '%s' "$ca64" | base64 -d > /run/cheveni/root.crt
unset passline ca64
exec env -i PATH=/usr/lib/postgresql/17/bin:/usr/local/bin:/usr/bin:/bin HOME=/run/cheveni LANG=C.UTF-8 \
PGPASSFILE=/run/cheveni/pgpass PGSSLROOTCERT=/run/cheveni/root.crt \
PGSSLMODE=verify-full PGGSSENCMODE=disable PGCHANNELBINDING=require \
PGCONNECT_TIMEOUT=3 PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=30000 -c lock_timeout=2000' "$@"
`;
export function assertClientShape(c,{id,network}){
 if(c.Config.Labels?.[LABEL]!==id||c.Config.Image!==IMAGE||!c.HostConfig.ReadonlyRootfs||c.HostConfig.Privileged||
 !c.HostConfig.CapDrop?.includes('ALL')||!c.HostConfig.SecurityOpt?.includes('no-new-privileges')||
 c.HostConfig.Binds?.length||Object.values(c.HostConfig.PortBindings??{}).some(x=>x?.length)||
 Object.keys(c.NetworkSettings.Networks).join()!==network||
 Object.keys(c.HostConfig.Tmpfs??{}).join()!=='/run/cheveni'||
 !c.HostConfig.Tmpfs['/run/cheveni'].includes('size=1048576')||
 c.Mounts.some(x=>x.Type!=='tmpfs'))throw Error('PRIVATE_CLIENT_ISOLATION_FAILED');
 return true;
}
export async function ownedPrivateQASource(sourceId,{wrongHost=false,wrongCA=false,beforeStart}={}){
 // assertFixture checks a process-owned source on an INTERNAL Docker network.
 const owned=assertFixture(sourceId),network=owned.network;
 const net=JSON.parse(cmd(['network','inspect',network]))[0];
 if(!net.Internal)throw Error('OWNED_INTERNAL_QA_NETWORK_REQUIRED');
 const ca=cmd(['exec',owned.container,'cat',wrongCA?'/tmp/cv-wrong-ca.crt':'/tmp/cv-ca.crt']);
 if(!new X509Certificate(ca).ca)throw Error('QA_CA_REQUIRED');
 const password='FICTIONAL-PGPASS-'+randomBytes(24).toString('hex')+':\\end';
 // Generated fictional credential only. It never appears in public output.
 const q=s=>"'"+s.replaceAll("'","''")+"'";
 sql(sourceId,'fixture_source',"set standard_conforming_strings=on;do $$ begin if not exists(select from pg_roles where rolname='private_reader') then create role private_reader login bypassrls;end if;end $$;alter role private_reader password "+q(password)+";grant usage on schema fixture,public to private_reader;grant select on all tables in schema fixture,public to private_reader;grant select on all sequences in schema fixture,public to private_reader;");
 // The existing fixture HBA only admits fixture_reader. Add this exact QA
 // role/database with SCRAM; never weaken authentication or touch a live source.
 cmd(['exec','-i',owned.container,'sh','-c','cat >> /var/lib/postgresql/data/pg_hba.conf'],Buffer.from('hostssl fixture_source private_reader all scram-sha-256\n'));
 sql(sourceId,'postgres','select pg_reload_conf();');
 // Capture all visible schemas. A missing grant aborts, rather than adding excludes.
 const host=wrongHost?'wrong-source':'fixture-source',user='private_reader';
 let secret=Buffer.from(pgpassLine({host,port:5432,database:'fixture_source',user,password})+ca.toString('base64')+'\n');
 const clients=new Map();
 function remove(name,id){
  const exists=cmd(['container','ls','-a','--filter','name=^/'+name+'$','--format','{{.Names}}']).toString().trim();
  if(!exists){clients.delete(name);return;}
  const c=JSON.parse(cmd(['inspect',name]))[0];
  if(c.Config.Labels?.[LABEL]!==id)throw Error('UNOWNED_PRIVATE_CLIENT_PRESERVED');
  cmd(['rm','--force',name]);clients.delete(name);
 }
 function start(program,args){
  assertFixture(sourceId);if(!secret)throw Error('PRIVATE_SOURCE_DISPOSED');
  const id=randomBytes(12).toString('hex'),name='cv-private-'+id;
  // No volume declaration inherited from the postgres image: explicitly use
  // entrypoint sh, and mount its image-declared PGDATA as ephemeral tmpfs too.
  const invocation=(args.length===1&&['--help','--version'].includes(args[0]))?[program,...args]:[program,'--host='+host,'--port=5432','--username='+user,'--dbname=fixture_source','--no-password',...args];
  const create=['create','-i','--name',name,'--label',LABEL+'='+id,'--pull=never','--network',network,
   '--read-only','--cap-drop=ALL','--security-opt=no-new-privileges',
   '--tmpfs','/run/cheveni:rw,noexec,nosuid,nodev,size=1048576,mode=0700',
   '--mount','type=tmpfs,destination=/var/lib/postgresql/data,tmpfs-size=1048576',
   '--entrypoint','/bin/sh',IMAGE,'-c',SCRIPT,'--',...invocation];
  cmd(create,undefined,5000);clients.set(name,id);
  try{
   const c=JSON.parse(cmd(['inspect',name],undefined,5000))[0];assertClientShape(c,{id,network});
   beforeStart?.({inspection:c,credentialBytes:secret.length});
   const endpoint=JSON.parse(cmd(['context','inspect']))[0].Endpoints.docker.Host;
   const child=spawn('docker',['--host',endpoint,'start','--attach','--interactive',name],{env:safeEnv(),stdio:['pipe','pipe','pipe'],windowsHide:true});
   child.stdin.on('error',()=>{});child.stdin.end(secret);
   return {child,name,id};
  }catch{remove(name,id);throw Error('PRIVATE_CLIENT_START_FAILED');}
 }
 async function collect(program,args){
  const {child,name,id}=start(program,args),chunks=[];let bytes=0,diagnostic=false,failed=false;
  const timer=setTimeout(()=>{failed=true;try{remove(name,id);}finally{child.kill();}},7000);
  child.stderr.on('data',()=>{diagnostic=true;});
  try{
   const closed=new Promise(resolve=>{child.once('error',()=>resolve(-1));child.once('close',resolve);});
   for await(const b of child.stdout){bytes+=b.length;if(bytes>32768){failed=true;break;}chunks.push(b);}
   const exit=failed?-1:await closed;if(failed||exit!==0||diagnostic)throw Error('PRIVATE_LIBPQ_PREFLIGHT_FAILED__EXIT_'+(Number.isInteger(exit)?exit:'UNKNOWN')+'__DIAGNOSTIC_'+diagnostic);
   return Buffer.concat(chunks);
  }finally{clearTimeout(timer);remove(name,id);child.kill();}
 }
 const source={id:sourceId,
  assertIsolated:async()=>{assertFixture(sourceId);},
  probe:async()=>{
   const help=(await collect('pg_dump',['--help'])).toString();if(!help.includes('--lock-wait-timeout'))throw Error('PG17_HELP_CONTRACT_REQUIRED');
   // Help invocation must not consume a connection; connection flags are ignored by --help.
   const query="begin read only;select json_build_object('database',current_database(),'marker',(select marker from fixture.source_identity),'version',current_setting('server_version'),'readOnly',current_setting('transaction_read_only')='on','tls',(select ssl from pg_stat_ssl where pid=pg_backend_pid()),'user',current_user);rollback;";
   let p;try{p=JSON.parse((await collect('psql',['-X','-qAt','--set','ON_ERROR_STOP=1','--command',query])).toString());}catch{throw Error('PRIVATE_TLS_OR_SOURCE_PROBE_FAILED');}
   if(p.user!==user)throw Error('PRIVATE_SOURCE_ROLE_MISMATCH');return p;
  },
  dump:()=>start('pg_dump',['--format=custom','--lock-wait-timeout=2s']).child,
  cancel:async()=>{for(const [name,id]of clients)remove(name,id);},
  dispose:async()=>{try{for(const [name,id]of clients)remove(name,id);}finally{secret?.fill(0);secret=null;}}
 };
 capabilities.add(source);return Object.freeze(source);
}
export function assertNoPrivateClients(){if(cmd(['container','ls','-a','--filter','label='+LABEL,'--format','{{.Names}}']).toString().trim())throw Error('PRIVATE_CLIENT_REMAINS');return true;}
