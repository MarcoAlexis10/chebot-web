/** PostgreSQL 17 adapter. Hard fenced to disposable fictional Docker resources. */
import {execFileSync,spawn} from 'node:child_process';
import {Readable} from 'node:stream';
import {randomBytes} from 'node:crypto';
import {mkdir,mkdtemp,link,lstat,rm} from 'node:fs/promises';
import path from 'node:path';
import {sealFictionalStream,openVerifiedFictionalEnvelope} from './online-provisional-crypto.mjs';

export const PG_IMAGE='postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826';
export const LABEL='cheveni.provisional.lab';
const cleanEnv=()=>({PATH:process.env.PATH,HOME:process.env.HOME,LANG:'C.UTF-8'});
export function docker(args,input){
  try{return execFileSync('docker',args,{input,env:cleanEnv(),timeout:30000,maxBuffer:80*1024*1024,stdio:['pipe','pipe','pipe']});}
  catch(e){
    const stderr=String(e.stderr??'');const x=Error('FICTIONAL_DOCKER_COMMAND_FAILED');x.exitStatus=e.status;x.systemCode=e.code;
    x.reason=Object.entries({SCHEMA_EXISTS:/schema .* already exists/i,ROLE_MISSING:/role .* does not exist/i,CONSTRAINT:/violates|foreign key|check constraint/i,PERMISSION:/permission denied|must be owner/i,ARCHIVE:/archive|input file.*not/i,TRANSACTION:/transaction.*read.only/i}).filter(([,re])=>re.test(stderr)).map(([name])=>name);
    // Only a fixed classification is exposed; no SQL, payload, or credentials.
    throw x;
  }
}
export function assertFixture(container,id){
  if(process.env.CHEVENI_PROVISIONAL_LAB!=='fictional-only'||!/^[a-f0-9]{12}$/.test(id)||
    !['cheveni_prov_source_'+id,'cheveni_prov_target_'+id].includes(container))throw Error('FICTIONAL_RESOURCE_REQUIRED');
  if(process.env.DOCKER_HOST&&!process.env.DOCKER_HOST.startsWith('unix://'))throw Error('LOCAL_DOCKER_REQUIRED');
  const context=JSON.parse(docker(['context','inspect']).toString())[0];
  if(!context.Endpoints?.docker?.Host?.startsWith('unix://'))throw Error('LOCAL_DOCKER_REQUIRED');
  const c=JSON.parse(docker(['inspect',container]).toString())[0];
  const nets=Object.keys(c.NetworkSettings.Networks??{});
  if(c.Name!=='/'+container||c.Config.Labels?.[LABEL]!==id||c.Config.Image!==PG_IMAGE||
    nets.length!==1||nets[0]!=='cheveni-prov-'+id||
    Object.values(c.HostConfig.PortBindings??{}).some(x=>x?.length)||
    Object.values(c.NetworkSettings.Ports??{}).some(x=>x?.length)||c.HostConfig.Privileged||
    c.Mounts.some(m=>m.Type!=='volume'||!['cheveni-prov-source-'+id,'cheveni-prov-target-'+id].includes(m.Name)))
    throw Error('FICTIONAL_RESOURCE_NOT_ISOLATED');
  const n=JSON.parse(docker(['network','inspect',nets[0]]).toString())[0];
  if(n.Internal!==true||n.Labels?.[LABEL]!==id)throw Error('FICTIONAL_RESOURCE_NOT_ISOLATED');
  for(const m of c.Mounts){const v=JSON.parse(docker(['volume','inspect',m.Name]).toString())[0];if(v.Labels?.[LABEL]!==id)throw Error('FICTIONAL_VOLUME_REQUIRED');}
}
export function sql(container,id,database,text){
  assertFixture(container,id);
  if(!['a1_source','a1_target','postgres'].includes(database))throw Error('FICTIONAL_DATABASE_REQUIRED');
  return docker(['exec','-i',container,'psql','-X','-qAt','--set=ON_ERROR_STOP=1','--username=postgres','--dbname='+database,'--file=-'],Buffer.from(text)).toString().trim();
}
export function holdSnapshot(container,id){
  assertFixture(container,id);
  const p=spawn('docker',['exec','-i',container,'psql','-X','-qAt','--set=ON_ERROR_STOP=1','--username=postgres','--dbname=a1_source'],{env:cleanEnv(),stdio:['pipe','pipe','pipe']});
  p.stderr.resume();let buffer='';let resolved=false;let timer;
  p.stdin.on('error',()=>{});
  const snapshot=new Promise((resolve,reject)=>{
    timer=setTimeout(()=>{p.kill('SIGTERM');reject(Error('SNAPSHOT_EXPORT_TIMEOUT'));},15000);
    p.stdout.on('data',b=>{buffer+=b.toString();const m=buffer.match(/(?:^|\n)([0-9A-F]+-[0-9A-F]+-[0-9A-F]+)(?:\n|$)/i);if(m&&!resolved){resolved=true;clearTimeout(timer);resolve(m[1]);}});
    p.on('error',()=>{clearTimeout(timer);reject(Error('SNAPSHOT_PROCESS_FAILED'));});
    p.on('close',()=>{clearTimeout(timer);if(!resolved)reject(Error('SNAPSHOT_EXPORT_FAILED'));});
  });
  const closed=new Promise(resolve=>p.on('close',resolve));
  p.stdin.write('begin isolation level repeatable read read only; select pg_export_snapshot();\n');
  return {snapshot,release:async()=>{p.stdin.end('rollback;\n');await closed;},process:p};
}
export async function captureFictionalPostgres({container,id,snapshot,privateDirectory,basename,passphrase,onFirstChunk,table}){
  assertFixture(container,id);
  if(!/^[0-9A-F]+-[0-9A-F]+-[0-9A-F]+$/i.test(snapshot))throw Error('FICTIONAL_SNAPSHOT_REQUIRED');
  if(table!==undefined&&!['app.events','auth_fake.sessions'].includes(table))throw Error('FICTIONAL_TABLE_REQUIRED');
  if(!path.isAbsolute(privateDirectory)||!/^[a-z0-9-]{1,40}$/i.test(basename))throw Error('PRIVATE_PATH_REQUIRED');
  await mkdir(privateDirectory,{recursive:true,mode:0o700});
  const dataFile=path.join(privateDirectory,basename+'.cva'),keyFile=path.join(privateDirectory,basename+'.cclave');
  for(const file of [dataFile,keyFile]){try{await lstat(file);throw Error('EXISTING_BACKUP_PRESERVED');}catch(e){if(e.code!=='ENOENT')throw e;}}
  const staging=await mkdtemp(path.join(privateDirectory,'.provisional-pending-'));
  let producerStarted=false,producerExited=false;
  async function* archive(){
    producerStarted=true;
    const application='cheveni-prov-dump-'+randomBytes(6).toString('hex');
    const args=['exec','-e','PGAPPNAME='+application,'-e','PGOPTIONS=-c default_transaction_read_only=on -c statement_timeout=30000',container,
      'pg_dump','--username=postgres','--dbname=a1_source','--format=custom','--compress=0','--lock-wait-timeout=2s','--snapshot='+snapshot,...(table?['--table='+table]:[])];
    const p=spawn('docker',args,{env:cleanEnv(),stdio:['ignore','pipe','pipe']});p.stderr.resume();
    const closed=new Promise(resolve=>{p.once('error',()=>resolve({code:-1}));p.once('close',(code,signal)=>{producerExited=true;resolve({code,signal});});});
    let first=true;
    try{
      for await(const chunk of p.stdout){if(first){first=false;await onFirstChunk?.({producerRunning:p.exitCode===null});}yield chunk;}
      const exit=await closed;
      if(exit.code!==0)throw Error('PG_DUMP_FAILED');
    }finally{if(!producerExited){
      try{sql(container,id,'a1_source',"select pg_terminate_backend(pid) from pg_stat_activity where application_name='"+application+"';");}finally{p.kill('SIGTERM');await closed;}
    }}
  }
  let staged,linkedKey=false,linkedData=false;
  async function unlinkOwned(destination,original){try{const [a,b]=await Promise.all([lstat(destination),lstat(original)]);if(a.ino===b.ino&&a.dev===b.dev)await rm(destination);}catch(e){if(e.code!=='ENOENT')throw e;}}
  try{
    staged=await sealFictionalStream({source:Readable.from(archive()),privateDirectory:staging,basename,passphrase});
    if(!producerStarted||!producerExited)throw Error('PG_DUMP_COMPLETION_NOT_VERIFIED');
    const checked=await openVerifiedFictionalEnvelope({...staged,passphrase});
    try{if(checked.subarray(0,5).toString()!=='PGDMP')throw Error('NOT_PG_CUSTOM_ARCHIVE');}finally{checked.fill(0);}
    // Hard links provide no-clobber publication. Data appears only after its wrapped key.
    await link(staged.keyFile,keyFile);linkedKey=true;
    await link(staged.dataFile,dataFile);linkedData=true;
    return {...staged,dataFile,keyFile,postgresStreamCompleted:true,scope:'ONE_PG_DUMP_CUSTOM_STREAM',source:'FICTIONAL_QA_ONLY',databaseSnapshot:'RUNTIME_FICTIONAL_ONLY',integralRecoveryVerified:false};
  }catch(e){
    if(linkedData)await unlinkOwned(dataFile,staged.dataFile);
    if(linkedKey)await unlinkOwned(keyFile,staged.keyFile);
    throw e;
  }finally{await rm(staging,{recursive:true,force:true});}
}
export async function restoreFictionalPostgres({container,id,dataFile,keyFile,passphrase,maxBytes}){
  assertFixture(container,id);
  if(!container.startsWith('cheveni_prov_target_'))throw Error('FICTIONAL_TARGET_REQUIRED');
  const archive=await openVerifiedFictionalEnvelope({dataFile,keyFile,passphrase,maxBytes});
  try{
    if(archive.subarray(0,5).toString()!=='PGDMP')throw Error('NOT_PG_CUSTOM_ARCHIVE');
    if(sql(container,id,'a1_target',"select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname not like 'pg_%' and n.nspname<>'information_schema' and c.relkind in ('r','p','v','m','f','S');")!=='0')throw Error('FICTIONAL_TARGET_NOT_EMPTY');
    // --list may stop after the TOC and close stdin early. Parse the complete archive instead.
    docker(['exec','-i',container,'pg_restore','--file=/dev/null'],archive);
    // Archive authenticated in memory before any SQL. A restore error rolls back DDL and data.
    docker(['exec','-i',container,'pg_restore','--username=postgres','--dbname=a1_target','--single-transaction','--exit-on-error'],archive);
    return {fictionalPostgresRestoreVerified:true,integralRecoveryVerified:false,realCaptureExecuted:false,authFunctionalRestoreVerified:false};
  }finally{archive.fill(0);}
}
