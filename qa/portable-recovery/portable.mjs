import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export function localStatus(s){
  if(s.API_URL!=='http://127.0.0.1:54321' || !/^postgres(?:ql)?:\/\/postgres:postgres@127\.0\.0\.1:54322\/postgres$/.test(s.DB_URL)) throw Error('LOCAL_DESTINATION_REQUIRED');
  return s;
}
export function seal(bytes,key){
  if(key.length!==32) throw Error('KEY_LENGTH');
  const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);
  c.setAAD(Buffer.from('portable-recovery-v1'));
  return Buffer.concat([Buffer.from('PR01'),iv,c.update(bytes),c.final(),c.getAuthTag()]);
}
export function open(bytes,key){
  if(key.length!==32||bytes.length<32||bytes.subarray(0,4).toString()!=='PR01')throw Error('INVALID_ENVELOPE');
  const c=createDecipheriv('aes-256-gcm',key,bytes.subarray(4,16));
  c.setAAD(Buffer.from('portable-recovery-v1')); c.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([c.update(bytes.subarray(16,-16)),c.final()]);
}
export function verifyJournal(expected,current){
  if(!/^[a-f0-9]{64}$/.test(expected)||expected!==current)throw Error('REVOCATION_JOURNAL_CHANGED');
}
export function verifyParts(parts){
  const names=new Set();
  for(const p of parts){
    if(names.has(p.name)||!Number.isInteger(p.length)||p.length<0)throw Error('INVALID_PART');names.add(p.name);
    const bytes=Buffer.from(p.base64,'base64');
    if(bytes.length!==p.length||sha256(bytes)!==p.sha256)throw Error('INTEGRITY_FAILED');
  }
  for(const n of ['application','auth','vault','storage','storage-files','roles','configuration','managed-ddl'])if(!names.has(n))throw Error('INCOMPLETE_BACKUP');
}
export function partsFrom(buffers){return Object.entries(buffers).map(([name,b])=>({name,length:b.length,sha256:sha256(b),base64:b.toString('base64')}));}
