import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {captureReal} from './backup.mjs';
import {decryptPayload,summary,sha,fail,wrapKey,unwrapKey} from './core.mjs';
import {restoreIsolated} from './restore-isolated.mjs';
let input='';for await(const c of process.stdin){input+=c;if(input.length>600*1024*1024)fail('ENTRADA_DEMASIADO_GRANDE');}
try{
 const p=input?JSON.parse(input):{};let result;
 if(process.argv[2]==='key-create'){
  const key=randomBytes(32);result={key:key.toString('base64'),wrapped:wrapKey(key,p.passphrase).toString('base64')};
 }else if(process.argv[2]==='key-open')result={key:unwrapKey(readFileSync(p.keyFile),p.passphrase).toString('base64')};
 else if(process.argv[2]==='capture'){
  if(!p.output||existsSync(p.output))fail('SALIDA_REQUIERE_ARCHIVO_NUEVO');const b=await captureReal(p);writeFileSync(resolve(p.output),b.encrypted,{flag:'wx',mode:0o600});result={...b.result,encryptedSha256:sha(b.encrypted)};
 }else if(process.argv[2]==='verify')result=summary(decryptPayload(readFileSync(p.backup),Buffer.from(p.key,'base64')));
 else if(process.argv[2]==='restore-local')result=await restoreIsolated({...p,encrypted:readFileSync(p.backup),key:Buffer.from(p.key,'base64'),currentJournal:readFileSync(p.currentJournal)});
 else fail('MODO_DESCONOCIDO');
 console.log(JSON.stringify({ok:true,...result}));
}catch(e){const code=/^[A-Z][A-Z0-9_]+$/.test(e.message)?e.message:(/^[A-Z][A-Z0-9_]+$/.test(e.code??'')?e.code:(e.name==='SyntaxError'?'ENTRADA_JSON_INVALIDA':'OPERACION_PRIVADA_FALLO'));console.log(JSON.stringify({ok:false,code,operationalApproval:false}));process.exitCode=1;}
