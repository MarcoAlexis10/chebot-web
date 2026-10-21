import {readFile,readdir,lstat,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
export async function verifyPackage(directory=root){
 const m=JSON.parse(await readFile(path.join(directory,'MANIFEST.json'),'utf8'));if(m.package!=='CHE-VENI-PROVISIONAL-WINDOWS-20261021'||!Array.isArray(m.files)||m.files.length<10)throw Error('MANIFEST_INVALID');
 const names=new Set(['MANIFEST.json']);for(const f of m.files){if(typeof f.path!=='string'||!/^[a-zA-Z0-9_.-]+$/.test(f.path)||names.has(f.path)||!Number.isSafeInteger(f.bytes)||f.bytes<0||!/^[a-f0-9]{64}$/.test(f.sha256))throw Error('MANIFEST_INVALID');names.add(f.path);const p=path.join(directory,f.path),s=await lstat(p);if(!s.isFile()||s.isSymbolicLink())throw Error('PACKAGE_FILE_INVALID');const b=await readFile(p);if(b.length!==f.bytes||createHash('sha256').update(b).digest('hex')!==f.sha256)throw Error('PACKAGE_FILE_CHANGED');}
 const actual=await readdir(directory);if(actual.length!==names.size||actual.some(n=>!names.has(n)))throw Error('PACKAGE_UNEXPECTED_FILES');return {manifestFiles:m.files.length,manifestVerified:true};
}
async function main(){
 const p=await verifyPackage();const modes=['DIAGNOSTICO-LOCAL','LABORATORIO-FICTICIO','PREPARAR-CAPTURA','CAPTURA-REAL-PENDIENTE-AUTORIZACION','VERIFICAR-ARCHIVOS','RESTAURAR-SOLO-DESTINO-DESCARTABLE','LIMPIAR-PENDIENTES','--help'];
 const mode=process.argv[2]??'DIAGNOSTICO-LOCAL';if(process.argv.length>3||!modes.includes(mode))throw Error('MODE_INVALID');
 if(mode==='--help')return {ok:true,...p,modes,remoteConnectionEnabled:false};
 const plan=await import('./future-dev-plan.mjs');
 if(mode==='CAPTURA-REAL-PENDIENTE-AUTORIZACION')return plan.realCapture();
 if(mode==='PREPARAR-CAPTURA')return {ok:true,...p,...plan.preparationPlan()};
 const host=await import('./private-host.mjs');const node=host.verifyNode();
 if(mode==='DIAGNOSTICO-LOCAL'){
  let docker={localDocker:false,code:'NOT_CHECKED'};try{docker=(await import('./docker-fictional.mjs')).dockerCheck();}catch(e){docker={localDocker:false,code:/^[A-Z0-9_]+$/.test(e.message)?e.message:'DOCKER_NOT_VERIFIED'};}
  return {ok:true,...p,...node,mode,hostPlatform:process.platform,docker,ntfsAcl:'CHECKED_ONLY_ON_NEW_PRIVATE_RUN',remoteConnectionEnabled:false,realCaptureApproved:false,installationsPerformed:false,downloadsPerformed:false};
 }
 if(mode==='LABORATORIO-FICTICIO')return {ok:true,...await (await import('./package-lab.mjs')).packageLab()};
 const input=await (await import('./private-input.mjs')).privateInput(mode==='LIMPIAR-PENDIENTES'?'pending':'verify');if(!input)return {ok:true,cancelled:true};
 try{
  if(mode==='VERIFICAR-ARCHIVOS')return {ok:true,...await (await import('./provisional-crypto.mjs')).verifyFictionalEnvelope(input)};
  if(mode==='LIMPIAR-PENDIENTES'){const r=await host.assertRun(input.root);if(host.processAlive(r.pid))throw Error('RUN_PROCESS_STILL_ACTIVE');const files=await host.cleanPending(input.root);const resources=(await import('./docker-fictional.mjs')).cleanupResource(r.id);return {ok:true,...files,...resources};}
  return {ok:true,...await (await import('./package-lab.mjs')).packageRestore(input)};
 }finally{if(input.passphrase)input.passphrase='';}
}
if(process.argv[1]&&await realpath(path.resolve(process.argv[1]))===await realpath(fileURLToPath(import.meta.url))){
 try{console.log(JSON.stringify(await main()));}catch(e){console.log(JSON.stringify({ok:false,code:/^[A-Z0-9_]+$/.test(e.message)?e.message:'PROVISIONAL_OPERATION_FAILED',remoteConnectionEnabled:false,realCaptureApproved:false,integralRecoveryVerified:false}));process.exitCode=1;}
}
