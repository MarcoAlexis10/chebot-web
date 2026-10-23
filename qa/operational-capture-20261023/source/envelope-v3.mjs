/**
 * CHE VENI A1: private provisional V3 envelope. No transport or source approval.
 * Unlike CVA2, this format deliberately cannot be accepted by the integral restore.
 * This module NEVER connects to Supabase or spawns pg_dump.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'node:crypto';
import { mkdir, open, readFile, rm, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable, Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

const PROJECT = 'tyvwgsdzqipusodxtydv';
const DATA_MAGIC = Buffer.from('CVP3');
const KEY_MAGIC = Buffer.from('CVK5');
const GCM_TAG_BYTES = 16;
const NONCE_BYTES = 12;
const SCRYPT = Object.freeze({N:32768,r:8,p:1,maxmem:64*1024*1024});
const MAX_HEADER = 4096;
const KEY_FILE_SIZE = 4+16+NONCE_BYTES+32+GCM_TAG_BYTES;

export function provisionalMetadata() {
  return Object.freeze({
    format:'CVP3', project:PROJECT, mode:'ONLINE_PROVISIONAL', source:'PRIVATE_PROVISIONAL_ADAPTER_V3',
    postgresScope:'ONE_PG_DUMP_CUSTOM_STREAM', databaseSnapshot:'COVERAGE_REQUIRES_SEPARATE_PRIVATE_RECEIPT',
    writersClosed:false, fullRecoveryVerified:false, integralRecoveryVerified:false,
    authFunctionalRestoreVerified:false, externalConfigurationRestored:false,
    vaultRoot:'NOT_CAPTURED', storageBytes:'NOT_CAPTURED',
    revocations:'NOT_CAPTURED', roles:'NOT_CAPTURED',
    canOpenGuestAccess:false,
  });
}
function checkPassphrase(passphrase) {
  if (typeof passphrase !== 'string' || passphrase.length < 20 || passphrase.length > 1024)
    throw Error('LOCAL_PASSPHRASE_REQUIRED_MIN_20_CHARS');
}
function keySeal(raw, passphrase) {
  const salt=randomBytes(16), nonce=randomBytes(NONCE_BYTES);
  const wrapping=scryptSync(passphrase,salt,32,SCRYPT);
  try{
    const cipher=createCipheriv('aes-256-gcm',wrapping,nonce);
    cipher.setAAD(KEY_MAGIC);
    const sealed=Buffer.concat([cipher.update(raw),cipher.final()]);
    if(sealed.length!==32)throw Error('KEY_LENGTH_INVARIANT');
    return Buffer.concat([KEY_MAGIC,salt,nonce,sealed,cipher.getAuthTag()]);
  }finally{wrapping.fill(0);}
}
function keyOpen(bytes, passphrase){
  if(bytes.length!==KEY_FILE_SIZE||!bytes.subarray(0,4).equals(KEY_MAGIC)) throw Error('KEY_ENVELOPE_INVALID');
  const salt=bytes.subarray(4,20),nonce=bytes.subarray(20,32),sealed=bytes.subarray(32,64),tag=bytes.subarray(64,80);
  const wrapping=scryptSync(passphrase,salt,32,SCRYPT);
  try{
    const decipher=createDecipheriv('aes-256-gcm',wrapping,nonce);
    decipher.setAAD(KEY_MAGIC);decipher.setAuthTag(tag);
    const k=Buffer.concat([decipher.update(sealed),decipher.final()]);
    if(k.length!==32)throw Error('KEY_LENGTH_INVARIANT');
    return k;
  }catch{throw Error('KEY_INTEGRITY_OR_PASSPHRASE_INVALID');}
  finally{wrapping.fill(0);}
}
function safeHeader(){
  const json=Buffer.from(JSON.stringify(provisionalMetadata()));
  if(json.length>MAX_HEADER)throw Error('HEADER_TOO_LARGE');
  const n=Buffer.alloc(4);n.writeUInt32BE(json.length);
  return Buffer.concat([DATA_MAGIC,n,json]);
}
async function writeCompletely(handle,chunk){
  let offset=0;
  while(offset<chunk.length){
    const {bytesWritten}=await handle.write(chunk,offset,chunk.length-offset);
    if(bytesWritten<=0)throw Error('ENCRYPTED_FILE_WRITE_INCOMPLETE');
    offset+=bytesWritten;
  }
}
function rejectPaths(directory,basename){
  if(!path.isAbsolute(directory) || typeof basename!=='string' || !/^[a-z0-9-]{1,40}$/i.test(basename))
    throw Error('PRIVATE_ABSOLUTE_DIRECTORY_AND_SAFE_BASENAME_REQUIRED');
}
/** Caller must establish authority separately; this primitive never does: ciphertext written to .cva; wrapped key to .cclave. */
export async function sealPrivateStream({source,privateDirectory,basename,passphrase}) {
  checkPassphrase(passphrase);rejectPaths(privateDirectory,basename);
  if(!(source instanceof Readable))throw Error('PRIVATE_SOURCE_STREAM_REQUIRED');
  await mkdir(privateDirectory,{recursive:true,mode:0o700});
  const dataFile=path.join(privateDirectory,basename+'.cva');
  const keyFile=path.join(privateDirectory,basename+'.cclave');
  const raw=randomBytes(32),nonce=randomBytes(NONCE_BYTES),prefix=safeHeader();
  let dataHandle=null,keyHandle=null,dataCreated=false,keyCreated=false;
  const digest=createHash('sha256');let bytes=0;
  try{
    // Exclusive file creation prevents accidental overwrite of custodial material.
    dataHandle=await open(dataFile,'wx',0o600);dataCreated=true;
    await writeCompletely(dataHandle,Buffer.concat([prefix,nonce]));
    const cipher=createCipheriv('aes-256-gcm',raw,nonce);cipher.setAAD(prefix);
    const counter=new Transform({transform(chunk,_enc,cb){bytes+=chunk.length;digest.update(chunk);cb(null,chunk);}});
    // Write data as it arrives; never stage an unencrypted dump on disk.
    const sink=new Writable({write(chunk,_enc,cb){writeCompletely(dataHandle,chunk).then(()=>cb(),cb);}});
    await pipeline(source,counter,cipher,sink);
    if(bytes===0)throw Error('EMPTY_PRIVATE_STREAM_NOT_A_BACKUP');
    await writeCompletely(dataHandle,cipher.getAuthTag());
    await dataHandle.sync(); await dataHandle.close();dataHandle=null;
    keyHandle=await open(keyFile,'wx',0o600);keyCreated=true;
    await writeCompletely(keyHandle,keySeal(raw,passphrase));
    await keyHandle.sync();await keyHandle.close();keyHandle=null;
    return {dataFile,keyFile,plaintextBytes:bytes,plaintextSha256:digest.digest('hex'),
      mode:'ONLINE_PROVISIONAL',integralRecoveryVerified:false};
  }catch(e){
    await dataHandle?.close().catch(()=>{});await keyHandle?.close().catch(()=>{});
    if(dataCreated)await rm(dataFile,{force:true}).catch(()=>{});
    if(keyCreated)await rm(keyFile,{force:true}).catch(()=>{});
    throw e;
  }finally{raw.fill(0);}
}
async function readHeader(file){
  const f=await open(file,'r');
  try{
    const base=Buffer.alloc(8);if((await f.read(base,0,8,0)).bytesRead!==8)throw Error('DATA_ENVELOPE_TRUNCATED');
    if(!base.subarray(0,4).equals(DATA_MAGIC))throw Error('NOT_PROVISIONAL_FORMAT');
    const len=base.readUInt32BE(4);
    if(len<20||len>MAX_HEADER)throw Error('PROVISIONAL_HEADER_SIZE_INVALID');
    const hdr=Buffer.alloc(len+NONCE_BYTES);
    if((await f.read(hdr,0,hdr.length,8)).bytesRead!==hdr.length)throw Error('DATA_ENVELOPE_TRUNCATED');
    const rawHeader=Buffer.concat([base,hdr.subarray(0,len)]);
    const header=JSON.parse(hdr.subarray(0,len).toString('utf8'));
    if(header?.project!==PROJECT||header?.mode!=='ONLINE_PROVISIONAL'||header?.source!=='PRIVATE_PROVISIONAL_ADAPTER_V3'||
      header?.integralRecoveryVerified!==false||header?.writersClosed!==false||header?.canOpenGuestAccess!==false)
      throw Error('PROVISIONAL_SCOPE_INVALID');
    return {header,rawHeader,nonce:hdr.subarray(len),cipherStart:8+len+NONCE_BYTES};
  }finally{await f.close();}
}
/** Authenticates entire encrypted file; output is hash/count ONLY, never rows or secrets. */
export async function verifyPrivateEnvelope({dataFile,keyFile,passphrase}){
  checkPassphrase(passphrase);
  const keyBytes=await readFile(keyFile),raw=keyOpen(keyBytes,passphrase);
  try{
    const {header,rawHeader,nonce,cipherStart}=await readHeader(dataFile);
    const size=(await stat(dataFile)).size;
    if(size<cipherStart+GCM_TAG_BYTES)throw Error('DATA_ENVELOPE_TRUNCATED');
    const f=await open(dataFile,'r'); let tag;
    try{tag=Buffer.alloc(GCM_TAG_BYTES);if((await f.read(tag,0,GCM_TAG_BYTES,size-GCM_TAG_BYTES)).bytesRead!==GCM_TAG_BYTES)throw Error('DATA_ENVELOPE_TRUNCATED');}
    finally{await f.close();}
    const decipher=createDecipheriv('aes-256-gcm',raw,nonce);decipher.setAAD(rawHeader);decipher.setAuthTag(tag);
    const hash=createHash('sha256');let bytes=0;
    const discard=new Writable({write(chunk,_enc,cb){bytes+=chunk.length;hash.update(chunk);cb();}});
    try{
      const from=createReadStream(dataFile,{start:cipherStart,end:size-GCM_TAG_BYTES-1});
      await pipeline(from,decipher,discard);
    }catch{throw Error('DATA_ENVELOPE_INTEGRITY_INVALID');}
    return {mode:header.mode,project:PROJECT,authenticated:true,plaintextBytes:bytes,
      plaintextSha256:hash.digest('hex'),fullRecoveryVerified:false,integralRecoveryVerified:false,
      sourceAttestationVerified:false};
  }finally{raw.fill(0);}
}

/** Bounded authenticated plaintext for an owned private closed target. Nothing reaches SQL before GCM final. */
export async function openVerifiedPrivateEnvelope({dataFile,keyFile,passphrase,maxBytes=64*1024*1024}) {
  checkPassphrase(passphrase);
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>64*1024*1024)throw Error('QA_MEMORY_LIMIT_INVALID');
  const chunks=[];let total=0;
  for await(const chunk of createReadStream(dataFile)){
    total+=chunk.length;
    if(total>maxBytes+MAX_HEADER+64)throw Error('QA_ARCHIVE_TOO_LARGE');
    chunks.push(chunk);
  }
  const b=Buffer.concat(chunks);
  if(b.length<8||!b.subarray(0,4).equals(DATA_MAGIC))throw Error('NOT_PROVISIONAL_FORMAT');
  const n=b.readUInt32BE(4),start=8+n+NONCE_BYTES;
  if(n<20||n>MAX_HEADER||b.length<start+GCM_TAG_BYTES+1)throw Error('DATA_ENVELOPE_TRUNCATED');
  let header;
  try{header=JSON.parse(b.subarray(8,8+n).toString('utf8'));}catch{throw Error('PROVISIONAL_HEADER_INVALID');}
  if(header.project!==PROJECT||header.mode!=='ONLINE_PROVISIONAL'||header.source!=='PRIVATE_PROVISIONAL_ADAPTER_V3'||
    header.integralRecoveryVerified!==false||header.writersClosed!==false||header.canOpenGuestAccess!==false)
    throw Error('PROVISIONAL_SCOPE_INVALID');
  if(b.length-start-GCM_TAG_BYTES>maxBytes)throw Error('QA_ARCHIVE_TOO_LARGE');
  const raw=keyOpen(await readFile(keyFile),passphrase);
  let clear;
  try{
    const d=createDecipheriv('aes-256-gcm',raw,b.subarray(8+n,start));
    d.setAAD(b.subarray(0,8+n));d.setAuthTag(b.subarray(-GCM_TAG_BYTES));
    clear=d.update(b.subarray(start,-GCM_TAG_BYTES));
    let tail;
    try{tail=d.final();}catch{clear.fill(0);throw Error('DATA_ENVELOPE_INTEGRITY_INVALID');}
    return Buffer.concat([clear,tail]);
  }finally{raw.fill(0);if(clear)clear.fill(0);}
}


