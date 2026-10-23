// No unattended capture command, environment switch or public connection path.
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';import {createInterface} from 'node:readline/promises';
import {verifyPreparedBundle} from './integrity.mjs';
import {readLocalHostContext,privateHome} from './asus-host.mjs';
import {armLocalSession,DEV} from './policy.mjs';
import {makeSourcePlan,installTrustedCa,captureOnceLocally} from './local-capture.mjs';
import {checkUnused,readClaim} from './one-shot.mjs';import {privateRegular} from './custody.mjs';
import {requireDistinctDownloadedPair} from './distinct-copy.mjs';
async function ask(text){
 const r=createInterface({input:process.stdin,output:process.stdout,terminal:true,historySize:0});
 try{return (await r.question(text)).trim();}finally{r.close();}
}
export async function main(args=process.argv.slice(2)){
 const directory=path.dirname(fileURLToPath(import.meta.url));
 const verified=await verifyPreparedBundle(directory);
 if(args.length===1&&args[0]==='--verify-only')return {result:'OPERATIONAL_FILES_VERIFIED',...verified,sourceConnected:false};
 if(args.length)throw Error('PRIVATE_RELEASE_COMMAND_REJECTED');
 const context=readLocalHostContext(),home=await privateHome();
 console.log('CHE VENI — UNA captura provisional DEV. Sin recuperación integral.');
 console.log('No pegues URL, contraseñas ni frases en esta pantalla de opciones. Los secretos tienen entrada oculta propia.');
 if(await ask('Confirmá que estás presencialmente en tu ASUS privada, sin grabación de pantalla ni transcripción. Escribí ASUS: ')!=='ASUS')throw Error('ASUS_OWNER_ATTESTATION_REQUIRED');
 armLocalSession(context);
 console.log('1 Captura única | 2 Verificar copia descargada de Drive | 3 Restauración limitada (requiere journal independiente) | 4 Estado local');
 const op=await ask('Elegí una opción: ');
 if(op==='4'){
  const c=await readClaim(home);console.log('Intento ya registrado. No reintentar. Custodia local: '+c.custodyRoot);
  return {result:'PRIVATE_CLAIM_FOUND',captureSuccessNotInferred:true};
 }
 if(op==='1'){
  await checkUnused(home);
  console.log('Usá la CA obtenida del panel Supabase del proyecto DEV '+DEV+', mediante tu sesión HTTPS confiable. Si no la tenés, cerrá aquí: no se conecta.');
  const caPath=await ask('Ruta local absoluta del archivo CA público (sin comillas): ');
  if(await ask('¿Confirmaste el proyecto exacto y la procedencia confiable de esa CA? Escribí CA-DEV-CONFIABLE: ')!=='CA-DEV-CONFIABLE')throw Error('TRUSTED_DEV_CA_REQUIRED');
  const ca=await installTrustedCa({file:caPath,home,ownerAttested:true});
  const host=await ask('Host exacto de Connect DEV: conexión directa o Session pooler 5432, sin URL ni contraseña: ');
  const sourcePlan=makeSourcePlan(host,ca.caSha256);
  console.log('Un pg_dump, sin reintentos, máximo 64 MiB y 35 s. Cliente 17.11; servidor distinto: detener.');
  console.log('Anotá en papel una frase única de al menos 20 caracteres. No la guardes en Drive ni en archivos.');
  if(await ask('Para consumir esta autorización una sola vez, escribí CAPTURAR-DEV-UNA-VEZ: ')!=='CAPTURAR-DEV-UNA-VEZ')throw Error('ASUS_CAPTURE_CONFIRMATION_REQUIRED');
  const result=await captureOnceLocally({home,machineBinding:context.machineBinding,sourcePlan,...ca});
  console.log('Captura cifrada y autenticada. Custodia local: '+result.custodyRoot);
  console.log('Conservá data, keys y receipts. Próximo paso: subir SOLO .cva y .cclave a Drive privado, en carpetas distintas. Frase únicamente en papel.');
  console.log('La captura todavía NO acredita copia en Drive ni restauración. No compartas archivos ni recibos privados por chat.');
  return {result:'ONE_CAPTURE_ENCRYPTED',integralRecoveryVerified:false,driveRoundtripVerified:false,restoreVerified:false};
 }
 if(op==='2'||op==='3'){
  const claim=await readClaim(home);if(claim.machineBinding!==context.machineBinding)throw Error('ASUS_MACHINE_BINDING_MISMATCH');
  const runtime=await import('./runtime.mjs');
  if(op==='3'){
   console.log('Requiere journal independiente real, baseline completo, clave pública/floor fuera de la custodia y testigo actual firmado. No fabriques esos documentos.');
   if(await ask('¿El custodio ya los entregó? Escribí JOURNAL-REAL-DISPONIBLE o cerrá: ')!=='JOURNAL-REAL-DISPONIBLE')throw Error('CURRENT_INDEPENDENT_REVOCATIONS_REQUIRED');
   const r=runtime.prepareRecoveryChallenge();console.log('Desafío nuevo para el custodio (no es contraseña): '+r);
  }
  console.log('Usá el esquema privado de LEEME. El JSON contiene solo rutas y metadatos; nunca credenciales/frases.');
  const config=await ask('Ruta absoluta del JSON privado de '+(op==='2'?'verificación':'restauración')+': ');
  const st=await privateRegular(config);if(st.size>65536)throw Error('PRIVATE_CONFIG_TOO_LARGE');
  const c=JSON.parse(await readFile(config));if(c.custodyRoot!==claim.custodyRoot||c.captureName!=='dev-provisional-20261023')throw Error('PRIVATE_CONFIG_CAPTURE_MISMATCH');
  if(op==='2')await requireDistinctDownloadedPair(c);
  await (op==='2'?runtime.executeRealCopyVerification(config):runtime.executeRealRestore(config));
  console.log(op==='2'?'Hashes y cifrado coinciden. La privacidad y procedencia Drive requieren comprobación del propietario.':'Restauración limitada verificada y destino eliminado. Sigue sin recuperación integral.');
  return {result:'PRIVATE_VERIFICATION_COMPLETED',integralRecoveryVerified:false,operationalApproval:false};
 }
 throw Error('PRIVATE_RELEASE_COMMAND_REJECTED');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().then(r=>console.log(JSON.stringify(r))).catch(e=>{
  const code=/^[A-Z][A-Z0-9_]{1,150}$/.test(e.message)?e.message:'PRIVATE_OPERATION_FAILED__DETAILS_REDACTED';
  console.error('DETENIDO: '+code);console.error('No repitas una captura iniciada. Conservá la custodia y el registro local. Compartí solo este código, nunca secretos ni recibos.');process.exitCode=1;
 });
}
