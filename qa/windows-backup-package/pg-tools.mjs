import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
export const PG_IMAGE='postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826';
export function localCommand(exe,args,{input,env,maxBuffer=256*1024*1024}={}){
 try{return execFileSync(exe,args,{input,env:env??process.env,maxBuffer,stdio:['pipe','pipe','pipe'],windowsHide:true,timeout:180000});}catch(e){const x=Error('HERRAMIENTA_LOCAL_FALLO');x.operation=exe+' '+args[0];x.exitStatus=e.status;x.sqlLine=String(e.stderr??'').match(/<stdin>:(\d+):/)?.[1];throw x;}
}
export function assertLocalDocker(){
 if(process.env.DOCKER_HOST||process.env.DOCKER_CONTEXT)throw Error('DOCKER_REMOTO_O_OVERRIDE_NO_PERMITIDO');
 let endpoint;try{endpoint=JSON.parse(localCommand('docker',['context','inspect','--format','{{json .Endpoints.docker.Host}}']).toString().trim());}catch{throw Error('DOCKER_LOCAL_NO_VERIFICADO');}
 if(!(typeof endpoint==='string'&&(endpoint.startsWith('unix:///')||endpoint.toLowerCase().startsWith('npipe://'))))throw Error('DOCKER_REMOTO_NO_PERMITIDO');
}
export function remotePgTools(s){
 assertLocalDocker();
 const dir=mkdtempSync(join(tmpdir(),'cheveni-public-ca-')),ca=join(dir,'source-ca.pem');writeFileSync(ca,s.ca,{mode:0o600});
 const clean={...process.env};for(const n of Object.keys(clean))if(n.startsWith('PG'))delete clean[n];
 Object.assign(clean,{PGHOST:s.host,PGPORT:'5432',PGUSER:s.user,PGDATABASE:'postgres',PGPASSWORD:s.password,PGSSLMODE:'verify-full',PGSSLROOTCERT:'/source-ca.pem',PGOPTIONS:'-c default_transaction_read_only=on -c statement_timeout=120000',PGCONNECT_TIMEOUT:'15'});
 return {run:(command,args)=>localCommand('docker',['run','--rm','--pull=never','--mount','type=bind,source='+ca+',target=/source-ca.pem,readonly',...['PGHOST','PGPORT','PGUSER','PGDATABASE','PGPASSWORD','PGSSLMODE','PGSSLROOTCERT','PGOPTIONS','PGCONNECT_TIMEOUT'].flatMap(n=>['-e',n]),PG_IMAGE,command,...args],{env:clean}),close:()=>{clean.PGPASSWORD='';rmSync(dir,{recursive:true,force:true});}};
}
