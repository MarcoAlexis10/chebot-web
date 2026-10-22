// NEW package transport. The previously approved Unix-only QA adapter is untouched.
import {execFileSync,spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {Readable} from 'node:stream';
import {safeEnv} from './private-host.mjs';
import {openVerifiedFictionalEnvelope} from './provisional-crypto.mjs';
import {sealPackageFixture} from './package-io.mjs';
// RepoDigests on Docker Desktop stores repository@digest, not repository:tag@digest.
// Keep the exact approved immutable digest; do not fall back to a mutable tag.
export const IMAGE='postgres@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826';
const LABEL='cheveni.windows.provisional';
export function validateEndpoint(endpoint,platform=process.platform){
 const ok=platform==='win32'?/^npipe:\/{2,4}\.\/pipe\/(docker_engine|dockerDesktopLinuxEngine)$/.test(endpoint):platform==='linux'&&endpoint==='unix:///var/run/docker.sock';
 if(!ok)throw Error('LOCAL_DOCKER_ENDPOINT_REQUIRED');return true;
}
function raw(args,input,timeout){try{return execFileSync('docker',args,{input,env:safeEnv(),timeout,maxBuffer:80*1024*1024,stdio:['pipe','pipe','pipe'],windowsHide:true});}catch{throw Error('FICTIONAL_DOCKER_OPERATION_FAILED');}}
export function command(args,input,timeout=30000){
 if(process.env.DOCKER_HOST||process.env.DOCKER_CONTEXT)throw Error('DOCKER_OVERRIDE_NOT_ALLOWED');
 if(args[0]==='context'&&args[1]==='inspect')return raw(args,input,timeout);
 const c=JSON.parse(raw(['context','inspect'],undefined,5000))[0],endpoint=c.Endpoints?.docker?.Host;validateEndpoint(endpoint);
 return raw(['--host',endpoint,...args],input,timeout);
}
export function dockerCheck(){
 if(process.env.DOCKER_HOST||process.env.DOCKER_CONTEXT)throw Error('DOCKER_OVERRIDE_NOT_ALLOWED');
 const c=JSON.parse(command(['context','inspect'],undefined,5000))[0];validateEndpoint(c.Endpoints?.docker?.Host);
 if(command(['info','--format','{{.OSType}}'],undefined,5000).toString().trim()!=='linux')throw Error('DOCKER_LINUX_ENGINE_REQUIRED');
 command(['image','inspect',IMAGE],undefined,5000);return {localDocker:true,linuxEngine:true,pinnedImagePresent:true,downloadsPerformed:false};
}
export function resourceNames(id){if(!/^[a-f0-9]{24}$/.test(id))throw Error('FICTIONAL_RESOURCE_REQUIRED');return {container:'cheveni_winprov_'+id,network:'cheveni-winprov-'+id,volume:'cheveni-winprov-'+id};}
export function assertResource(id){dockerCheck();const n=resourceNames(id),c=JSON.parse(command(['inspect',n.container]))[0],net=JSON.parse(command(['network','inspect',n.network]))[0],v=JSON.parse(command(['volume','inspect',n.volume]))[0];
 if(c.Name!=='/'+n.container||c.Config.Labels?.[LABEL]!==id||c.Config.Image!==IMAGE||c.HostConfig.Privileged||net.Internal!==true||net.Labels?.[LABEL]!==id||v.Labels?.[LABEL]!==id||Object.keys(c.NetworkSettings.Networks).join()!==n.network||Object.values(c.HostConfig.PortBindings??{}).some(x=>x?.length)||Object.values(c.NetworkSettings.Ports??{}).some(x=>x?.length)||c.Mounts.length!==1||c.Mounts[0].Type!=='volume'||c.Mounts[0].Name!==n.volume)throw Error('FICTIONAL_RESOURCE_NOT_ISOLATED');return n;
}
export async function startResource(id){dockerCheck();const n=resourceNames(id),label=['--label',LABEL+'='+id];
 try{command(['network','create','--internal',...label,n.network]);command(['volume','create',...label,n.volume]);command(['run','--detach','--name',n.container,...label,'--network',n.network,'--mount','type=volume,src='+n.volume+',dst=/var/lib/postgresql/data','--env','POSTGRES_HOST_AUTH_METHOD=trust',IMAGE]);
 let ready=false;for(let i=0;i<70;i++){try{command(['exec',n.container,'psql','-X','-qAt','--username=postgres','--dbname=postgres','--command','select 1'],undefined,3000);ready=true;break;}catch{await new Promise(r=>setTimeout(r,100));}}if(!ready)throw Error('FICTIONAL_POSTGRES_NOT_READY');assertResource(id);return n;
 }catch(e){cleanupResource(id);throw e;}
}
export function sql(id,database,text){const n=assertResource(id);if(!['postgres','fixture_source','fixture_target'].includes(database))throw Error('FICTIONAL_DATABASE_REQUIRED');return command(['exec','-i',n.container,'psql','-X','-qAt','--username=postgres','--dbname='+database,'--set=ON_ERROR_STOP=1','--file=-'],Buffer.from(text)).toString().trim();}
export function cleanupResource(id){const n=resourceNames(id);for(const [kind,name] of [['container',n.container],['volume',n.volume],['network',n.network]]){
 const args=kind==='container'?['ps','-a']:kind==='volume'?['volume','ls']:['network','ls'];const names=command([...args,'--filter','label='+LABEL+'='+id,'--format',kind==='container'?'{{.Names}}':'{{.Name}}']).toString().trim().split('\n');
 if(names.includes(name)){const info=JSON.parse(command(kind==='container'?['inspect',name]:[kind,'inspect',name]))[0];if((kind==='container'?info.Config.Labels:info.Labels)?.[LABEL]!==id)throw Error('RESOURCE_OWNERSHIP_INVALID');command(kind==='container'?['rm','-f',name]:[kind,'rm',name]);}
 if(command([...args,'--filter','label='+LABEL+'='+id,'--format',kind==='container'?'{{.ID}}':'{{.Name}}']).toString().trim())throw Error('RESOURCE_CLEANUP_INCOMPLETE');
 }return {ownResourcesRemoved:true};}
export async function captureFixture({id,roots,basename,passphrase,onChunk}){
 const n=assertResource(id);const endpoint=JSON.parse(command(['context','inspect']))[0].Endpoints.docker.Host;validateEndpoint(endpoint);let exited=false;
 async function* producer(){const app='winprov-'+randomBytes(8).toString('hex');const p=spawn('docker',['--host',endpoint,'exec','-e','PGAPPNAME='+app,'-e','PGOPTIONS=-c default_transaction_read_only=on -c statement_timeout=30000',n.container,'pg_dump','--username=postgres','--dbname=fixture_source','--format=custom','--lock-wait-timeout=2s'],{env:safeEnv(),stdio:['ignore','pipe','pipe'],windowsHide:true});p.stderr.resume();
 const closed=new Promise(resolve=>{p.on('error',()=>resolve(-1));p.on('close',code=>{exited=true;resolve(code);});});let first=true;
 const deadline=setTimeout(()=>p.stdout.destroy(Error('PG_DUMP_TIMEOUT')),35000);deadline.unref();
 let bytes=0;try{for await(const chunk of p.stdout){bytes+=chunk.length;if(bytes>64*1024*1024)throw Error('QA_ARCHIVE_TOO_LARGE');if(first){first=false;await onChunk?.();}yield chunk;}if(await closed!==0)throw Error('PG_DUMP_FAILED');}
 finally{clearTimeout(deadline);if(!exited){try{sql(id,'postgres',"select pg_terminate_backend(pid) from pg_stat_activity where application_name='"+app+"';");}finally{p.kill('SIGTERM');await closed;}}}
 }
 return sealPackageFixture({roots,basename,passphrase,source:Readable.from(producer())});
}
export async function restoreFixture({id,dataFile,keyFile,passphrase}){
 const archive=await openVerifiedFictionalEnvelope({dataFile,keyFile,passphrase});
 try{if(archive.subarray(0,5).toString()!=='PGDMP')throw Error('PG_CUSTOM_ARCHIVE_REQUIRED');const n=assertResource(id);
 if(sql(id,'fixture_target',"select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname !~ '^pg_' and n.nspname <> 'information_schema' and c.relkind in ('r','p','v','m','S','f');")!=='0')throw Error('EMPTY_DISCARDABLE_TARGET_REQUIRED');
 command(['exec','-i',n.container,'pg_restore','--file=/dev/null'],archive);command(['exec','-i',n.container,'pg_restore','--username=postgres','--dbname=fixture_target','--single-transaction','--exit-on-error'],archive);
 return {fictionalRestore:true,integralRecoveryVerified:false,realCaptureExecuted:false};
 }finally{archive.fill(0);}
}
