import {createCipheriv,createDecipheriv,createHash,randomBytes,timingSafeEqual,scryptSync} from 'node:crypto';
export const PROJECT='tyvwgsdzqipusodxtydv';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const REQUIRED=['database-full','application','auth-data','storage-data','vault-data','managed-ddl','roles','roles-ddl','catalog','storage-bytes','external-config','vault-root','revocations'];
function derive(pass,salt){if(typeof pass!=='string'||pass.length<20)fail('FRASE_DE_CLAVE_MINIMO_20_CARACTERES');return scryptSync(pass,salt,32,{N:131072,r:8,p:1,maxmem:192*1024*1024});}
export function wrapKey(key,pass){if(key.length!==32)fail('CLAVE_INVALIDA');const salt=randomBytes(16),iv=randomBytes(12),c=createCipheriv('aes-256-gcm',derive(pass,salt),iv);c.setAAD(Buffer.from('CHE-VENI-CUSTODIA-v2'));return Buffer.concat([Buffer.from('CVK2'),salt,iv,c.update(key),c.final(),c.getAuthTag()]);}
export function unwrapKey(bytes,pass){if(bytes.length!==80||bytes.subarray(0,4).toString()!=='CVK2')fail('CLAVE_CIFRADA_INVALIDA');try{const c=createDecipheriv('aes-256-gcm',derive(pass,bytes.subarray(4,20)),bytes.subarray(20,32));c.setAAD(Buffer.from('CHE-VENI-CUSTODIA-v2'));c.setAuthTag(bytes.subarray(-16));return Buffer.concat([c.update(bytes.subarray(32,-16)),c.final()]);}catch{fail('CLAVE_O_FRASE_INVALIDAS');}}
export function fail(code){throw new Error(code);}
export function validateSource(s){
 if(s.project!==PROJECT||s.database!=='postgres'||s.port!==5432)fail('DESTINO_DEV_INVALIDO');
 const direct=s.host==='db.'+PROJECT+'.supabase.co'&&s.user==='postgres';
 const pool=/^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(s.host??'')&&s.user==='postgres.'+PROJECT;
 if(!direct&&!pool)fail('DESTINO_DEV_INVALIDO');
 if(typeof s.ca!=='string'||!s.ca.includes('-----BEGIN CERTIFICATE-----'))fail('CERTIFICADO_CA_REQUERIDO');
 if(!s.password||!s.storageKey||!s.managementToken)fail('ACCESO_PRIVADO_INCOMPLETO');
}
export function validateReceipts(r){
 if(r.confirmation!=='RESPALDAR DEV'||r.project!==PROJECT||r.ownerReviewed!==true)fail('AUTORIZACION_LOCAL_REQUERIDA');
 for(const name of ['windowReference','independentJournalReference'])if(typeof r[name]!=='string'||r[name].trim().length<6)fail('RECIBOS_INCOMPLETOS');
 if(!Array.isArray(r.fencedWriters)||!Array.from({length:10},(_,i)=>'W'+String(i+1).padStart(2,'0')).every(w=>r.fencedWriters.includes(w)))fail('ESCRITORES_NO_CERRADOS');
}
export function part(name,bytes){return {name,length:bytes.length,sha256:sha(bytes),base64:bytes.toString('base64')};}
export function validatePayload(p){
 if(p.format!==2||p.project!==PROJECT||!Array.isArray(p.parts))fail('FORMATO_INVALIDO');
 const names=new Set();let size=0;
 for(const a of p.parts){if(typeof a.name!=='string'||names.has(a.name)||!Number.isSafeInteger(a.length)||a.length<0)fail('COMPONENTE_INVALIDO');names.add(a.name);const b=Buffer.from(a.base64,'base64');size+=b.length;if(size>512*1024*1024)fail('RESPALDO_DEMASIADO_GRANDE');if(b.length!==a.length||sha(b)!==a.sha256)fail('INTEGRIDAD_INVALIDA');}
 if(REQUIRED.some(n=>!names.has(n)))fail('RESPALDO_INCOMPLETO');
 return p;
}
export function encryptPayload(p,key){
 validatePayload(p);if(key.length!==32)fail('CLAVE_INVALIDA');
 const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);c.setAAD(Buffer.from('CHE-VENI-A1-WINDOWS-v2'));
 return Buffer.concat([Buffer.from('CVA2'),iv,c.update(Buffer.from(JSON.stringify(p))),c.final(),c.getAuthTag()]);
}
export function decryptPayload(bytes,key){
 if(key.length!==32||bytes.length<32||bytes.subarray(0,4).toString()!=='CVA2')fail('ARCHIVO_O_CLAVE_INVALIDOS');
 try{const c=createDecipheriv('aes-256-gcm',key,bytes.subarray(4,16));c.setAAD(Buffer.from('CHE-VENI-A1-WINDOWS-v2'));c.setAuthTag(bytes.subarray(-16));return validatePayload(JSON.parse(Buffer.concat([c.update(bytes.subarray(16,-16)),c.final()])));}catch{fail('ARCHIVO_O_CLAVE_INVALIDOS');}
}
export function unpack(p,name){const a=p.parts.find(x=>x.name===name);if(!a)fail('COMPONENTE_AUSENTE');return Buffer.from(a.base64,'base64');}
export function journalGuard(p,current){const old=unpack(p,'revocations');if(!current.length||!timingSafeEqual(Buffer.from(sha(old)),Buffer.from(sha(current))))fail('REVOCACIONES_CAMBIARON');}
export function summary(p){return {status:'integridad_verificada',project:PROJECT,components:p.parts.length,createdAt:p.createdAt,fictional:p.fictional===true,externalConfigurationComplete:p.externalConfigurationComplete===true,realRestoreVerified:false,operationalApproval:false};}
export function validateDiscardable(info,network,runId){
 if(!/^[a-f0-9]{12}$/.test(runId))fail('DESTINO_LOCAL_INVALIDO');
 const expected='cheveni_a1_'+runId;
 if(info.Name!=='/supabase_db_'+expected||network.Name!=='cheveni-a1-'+runId||network.Internal!==true||network.Labels?.['cheveni.a1.discardable']!==runId||!info.NetworkSettings?.Networks?.[network.Name]||Object.keys(info.NetworkSettings.Networks).length!==1)fail('DESTINO_LOCAL_INVALIDO');
 const ports=info.NetworkSettings.Ports??{};
 for(const bindings of Object.values({...ports,...(info.HostConfig?.PortBindings??{})}))for(const b of bindings??[])if(b.HostIp!=='127.0.0.1')fail('PUERTO_NO_PRIVADO');
}
