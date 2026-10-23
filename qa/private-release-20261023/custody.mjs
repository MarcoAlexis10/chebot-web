// Durable custody is deliberately a DIFFERENT kind from disposable QA runs.
import {mkdir,writeFile,readFile,lstat,realpath,open,link,rm,readdir} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';import path from 'node:path';
import {execFileSync} from 'node:child_process';import {createReadStream} from 'node:fs';
import {safeEnv,powershellModules,checkPrivate} from '../technical-closure-20261022/approved/private-host.mjs';
const owned=new WeakMap();
const eq=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
export async function privateRegular(file){
 const s=await lstat(file);if(!s.isFile()||s.isSymbolicLink()||!eq(await realpath(file),path.resolve(file)))throw Error('PRIVATE_REGULAR_FILE_REQUIRED');
 if(process.platform!=='win32'&&(s.uid!==process.getuid()||(s.mode&0o077)!==0))throw Error('PRIVATE_FILE_OWNER_REQUIRED');
 await checkPrivate(path.dirname(file));return s;
}
export async function createCustody(base){
 if(typeof base!=='string'||!path.isAbsolute(base))throw Error('LOCAL_ABSOLUTE_CUSTODY_BASE_REQUIRED');
 if(process.platform==='win32'){
  // Windows TEMP may use a legitimate 8.3 spelling. Reject reparse ancestors,
  // then use the physical long path, never weaken checks by accepting junctions.
  let current=path.resolve(base);if(!/^[a-z]:\\/i.test(current))throw Error('LOCAL_NTFS_FIXED_DISK_REQUIRED');
  for(;;){if((await lstat(current)).isSymbolicLink())throw Error('CUSTODY_REPARSE_ANCESTOR_REJECTED');const parent=path.dirname(current);if(parent===current)break;current=parent;}
  base=await realpath(base);const drive=base[0].toUpperCase();
  const script=powershellModules+"Import-Module ($PSHOME+'\\Modules\\CimCmdlets\\CimCmdlets.psd1');$v=Get-CimInstance -ClassName Win32_LogicalDisk -Filter \"DeviceID='"+drive+":'\";if($v.DriveType -ne 3 -or $v.FileSystem -ne 'NTFS'){throw 'LOCAL_NTFS_FIXED_DISK_REQUIRED'}";
  try{execFileSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{env:safeEnv(),timeout:10000,stdio:['ignore','pipe','pipe'],windowsHide:true});}catch{throw Error('LOCAL_NTFS_FIXED_DISK_REQUIRED');}
 }else if(!eq(await realpath(base),path.resolve(base)))throw Error('LOCAL_ABSOLUTE_CUSTODY_BASE_REQUIRED');
 const id=randomBytes(12).toString('hex'),root=path.join(base,'cheveni-custody-'+id);await mkdir(root,{mode:0o700});
 try{
  const owner=(await checkPrivate(root,true)).sid;
  for(const name of ['data','keys','receipts']){await mkdir(path.join(root,name),{mode:0o700});await checkPrivate(path.join(root,name),process.platform==='win32');}
  const m={kind:'CHEVENI_DURABLE_CUSTODY_V1',id,root,owner};await writeFile(path.join(root,'custody.json'),JSON.stringify(m),{flag:'wx',mode:0o600});
  return await openCustody(root);
 }catch{await rm(root,{recursive:true,force:true});throw Error('CUSTODY_CREATION_FAILED');}
}
export async function openCustody(root){
 const s=await lstat(root);if(!s.isDirectory()||s.isSymbolicLink()||!eq(await realpath(root),path.resolve(root)))throw Error('OWNED_CUSTODY_REQUIRED');
 await privateRegular(path.join(root,'custody.json'));const m=JSON.parse(await readFile(path.join(root,'custody.json'),'utf8'));
 if(m.kind!=='CHEVENI_DURABLE_CUSTODY_V1'||!/^[a-f0-9]{24}$/.test(m.id)||path.basename(root)!=='cheveni-custody-'+m.id||!eq(m.root,path.resolve(root))||(await checkPrivate(root)).sid!==m.owner)throw Error('OWNED_CUSTODY_REQUIRED');
 for(const n of ['data','keys','receipts']){const d=path.join(root,n),s=await lstat(d);if(!s.isDirectory()||s.isSymbolicLink())throw Error('OWNED_CUSTODY_REQUIRED');await checkPrivate(d);}
 const token=Object.freeze({kind:'DURABLE_CUSTODY_CAPABILITY'});owned.set(token,m);return token;
}
export async function assertCustody(token){const m=owned.get(token);if(!m)throw Error('OWNED_CUSTODY_REQUIRED');await openCustody(m.root);return {...m,data:path.join(m.root,'data'),keys:path.join(m.root,'keys'),receipts:path.join(m.root,'receipts')};}
export async function lockCustody(token){
 const m=await assertCustody(token),file=path.join(m.root,'.capture-lock'),f=await open(file,'wx',0o600);const st=await f.stat({bigint:true});await f.writeFile(JSON.stringify({operation:randomBytes(12).toString('hex'),pid:process.pid}));await f.close();
 return async()=>{const now=await lstat(file,{bigint:true});if(now.ino!==st.ino||now.dev!==st.dev)throw Error('FOREIGN_CUSTODY_LOCK_PRESERVED');await rm(file);};
}
export async function publishPair(token,pair,name){
 const m=await assertCustody(token);if(!/^[a-z0-9-]{1,40}$/.test(name))throw Error('SAFE_CAPTURE_NAME_REQUIRED');
 const dataFile=path.join(m.data,name+'.cva'),keyFile=path.join(m.keys,name+'.cclave');
 await privateRegular(pair.dataFile);await privateRegular(pair.keyFile);
 let keyLinked=false;
 try{await link(pair.keyFile,keyFile);keyLinked=true;await link(pair.dataFile,dataFile);}
 catch(e){if(keyLinked){const [a,b]=await Promise.all([lstat(keyFile,{bigint:true}),lstat(pair.keyFile,{bigint:true})]);if(a.ino===b.ino&&a.dev===b.dev)await rm(keyFile);}throw Error(e.code==='EEXIST'?'EXISTING_CAPTURE_PRESERVED':'CAPTURE_PUBLICATION_FAILED');}
 return {dataFile,keyFile};
}
export async function pairDigest(pair){
 const d=await privateRegular(pair.dataFile),k=await privateRegular(pair.keyFile);
 if(d.size<1||d.size>64*1024*1024+8192||k.size!==80)throw Error('PRIVATE_CIPHER_PAIR_SIZE_INVALID');
 async function digest(file,max){const h=createHash('sha256');let n=0;for await(const b of createReadStream(file)){n+=b.length;if(n>max)throw Error('PRIVATE_CIPHER_PAIR_SIZE_INVALID');h.update(b);}return h.digest('hex');}
 return {dataSha256:await digest(pair.dataFile,64*1024*1024+8192),keySha256:await digest(pair.keyFile,80)};
}
export async function writeReceipt(token,name,receipt){
 const m=await assertCustody(token);if(!/^[a-z0-9-]{1,40}$/.test(name))throw Error('SAFE_CAPTURE_NAME_REQUIRED');
 const file=path.join(m.receipts,name+'.json');await writeFile(file,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});return file;
}
// No recursive deletion API exists for durable custody. Only caller-owned TEMP
// runs use the old disposable cleanup, which rejects this marker/prefix.
export async function assertNoTemporaryRuns(token){const m=await assertCustody(token);if((await readdir(m.root)).some(n=>n.startsWith('cheveni-provisional-')))throw Error('PRIVATE_TEMPORARY_SESSION_REMAINS');return true;}

export async function requireVacantCapture(token,name){
 if(typeof name!=='string'||!/^[a-z0-9-]{1,40}$/.test(name))throw Error('SAFE_CAPTURE_NAME_REQUIRED');
 const m=await assertCustody(token);
 for(const f of [path.join(m.data,name+'.cva'),path.join(m.keys,name+'.cclave'),path.join(m.receipts,name+'.json')]){
  try{await lstat(f);throw Error('EXISTING_CAPTURE_PRESERVED');}catch(e){if(e.code!=='ENOENT')throw e;}
 }
}
