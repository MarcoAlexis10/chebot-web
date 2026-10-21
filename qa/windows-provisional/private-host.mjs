import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile,lstat,realpath,readdir,rm} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {tmpdir} from 'node:os';
export function safeEnv(){const e={};for(const k of ['PATH','Path','HOME','USERPROFILE','LOCALAPPDATA','APPDATA','TEMP','TMP','SystemRoot','SYSTEMROOT','WINDIR','ComSpec'])if(process.env[k])e[k]=process.env[k];return e;}
// Only non-secret path/ACL metadata. Never use this bridge for phrases or credentials.
function powershellMetadata(script,input){
 if(!input||Object.keys(input).some(k=>!['path','apply'].includes(k))||typeof input.path!=='string'||!path.isAbsolute(input.path)||(input.apply!==undefined&&typeof input.apply!=='boolean'))throw Error('NON_SECRET_HOST_METADATA_REQUIRED');
 const encoded=Buffer.from(JSON.stringify(input),'utf8').toString('base64');
 const prelude="$ErrorActionPreference='Stop';$p=([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('"+encoded+"')))|ConvertFrom-Json;";
 try{return execFileSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',prelude+script],{env:safeEnv(),encoding:'utf8',timeout:15000,maxBuffer:1024*1024,windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();}catch{throw Error('WINDOWS_PRIVATE_CHECK_FAILED');}
}
const aclScript=`
 $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User;
 if($p.apply){$a=New-Object Security.AccessControl.DirectorySecurity;$a.SetOwner($sid);$a.SetAccessRuleProtection($true,$false);
 foreach($s in @($sid.Value,'S-1-5-18','S-1-5-32-544')){$r=New-Object Security.AccessControl.FileSystemAccessRule((New-Object Security.Principal.SecurityIdentifier($s)),'FullControl','ContainerInherit,ObjectInherit','None','Allow');$a.AddAccessRule($r)};Set-Acl -LiteralPath $p.path -AclObject $a}
 $a=Get-Acl -LiteralPath $p.path;$rules=$a.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]);$ok=$a.AreAccessRulesProtected -and ($a.GetOwner([Security.Principal.SecurityIdentifier]).Value -eq $sid.Value);
 foreach($r in $rules){if($r.AccessControlType -eq 'Allow' -and $r.IdentityReference.Value -notin @($sid.Value,'S-1-5-18','S-1-5-32-544')){$ok=$false}};
 if(-not $ok){throw 'NTFS_PRIVATE_ACL_REQUIRED'};@{private=$true;sid=$sid.Value;powershell=$PSVersionTable.PSVersion.ToString()}|ConvertTo-Json -Compress;`;
export async function checkPrivate(directory,apply=false){
 if(process.platform==='win32')return JSON.parse(powershellMetadata(aclScript,{path:directory,apply}));
 const s=await lstat(directory);if(!s.isDirectory()||s.isSymbolicLink()||(s.mode&0o077)!==0)throw Error('PRIVATE_DIRECTORY_REQUIRED');return {private:true,sid:String(process.getuid()),powershell:null};
}
export async function createRun(base=tmpdir()){
 const id=randomBytes(12).toString('hex'),root=path.resolve(base,'cheveni-provisional-'+id);await mkdir(root,{mode:0o700});
 try{const acl=await checkPrivate(root,true);const roots={id,root,data:path.join(root,'data'),keys:path.join(root,'keys'),owner:acl.sid};
 await writeFile(path.join(root,'ownership.json'),JSON.stringify({kind:'CHEVENI_PROVISIONAL_FICTIONAL_RUN',...roots,pid:process.pid}),{flag:'wx',mode:0o600});
 await mkdir(roots.data,{mode:0o700});await mkdir(roots.keys,{mode:0o700});
 await checkPrivate(roots.data,process.platform==='win32');await checkPrivate(roots.keys,process.platform==='win32');return roots;
 }catch(e){await rm(root,{recursive:true,force:true});throw e;}
}
export async function assertRun(root){
 const s=await lstat(root);if(!s.isDirectory()||s.isSymbolicLink())throw Error('OWNED_RUN_REQUIRED');
 const mfile=path.join(root,'ownership.json');if((await lstat(mfile)).isSymbolicLink())throw Error('OWNED_RUN_REQUIRED');
 const p=JSON.parse(await readFile(mfile,'utf8'));const eq=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
 if(p.kind!=='CHEVENI_PROVISIONAL_FICTIONAL_RUN'||!/^[a-f0-9]{24}$/.test(p.id)||path.basename(root)!=='cheveni-provisional-'+p.id||!eq(await realpath(root),p.root)||!eq(path.resolve(root),p.root)||p.data!==path.join(p.root,'data')||p.keys!==path.join(p.root,'keys'))throw Error('OWNED_RUN_REQUIRED');
 const acl=await checkPrivate(root);if(acl.sid!==p.owner)throw Error('OWNED_RUN_REQUIRED');
 for(const d of [p.data,p.keys]){const s=await lstat(d);if(!s.isDirectory()||s.isSymbolicLink())throw Error('OWNED_RUN_REQUIRED');await checkPrivate(d);}
 return p;
}
export function processAlive(pid){if(!Number.isSafeInteger(pid)||pid<1)throw Error('PENDING_PID_INVALID');try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;return true;}}
export async function cleanPending(root,{operation,allowCurrent=false}={}){
 const r=await assertRun(root);let cleaned=0;
 for(const name of await readdir(root))if(name.startsWith('.provisional-pending-')&&(!operation||name==='.provisional-pending-'+operation)){
  const p=path.join(root,name),s=await lstat(p);if(!/^\.provisional-pending-[a-f0-9]{24}$/.test(name)||!s.isDirectory()||s.isSymbolicLink())throw Error('UNOWNED_PENDING_NOT_REMOVED');
  const files=await readdir(p);if(files.some(x=>!['pending-owner.json','dump.cva','dump.cclave'].includes(x)))throw Error('UNOWNED_PENDING_NOT_REMOVED');
  for(const f of files)if(!(await lstat(path.join(p,f))).isFile()||(await lstat(path.join(p,f))).isSymbolicLink())throw Error('UNOWNED_PENDING_NOT_REMOVED');
  const m=JSON.parse(await readFile(path.join(p,'pending-owner.json'),'utf8'));if(m.run!==r.id||m.operation!==name.slice('.provisional-pending-'.length))throw Error('UNOWNED_PENDING_NOT_REMOVED');
  if(!(allowCurrent&&m.pid===process.pid)&&processAlive(m.pid))throw Error('PENDING_PROCESS_STILL_ACTIVE');
  await rm(p,{recursive:true});cleaned++;
 }return {cleaned,completedFilesUntouched:true};
}
export async function removeFictionalRun(root){await assertRun(root);await rm(root,{recursive:true});}
export function verifyNode(){
 if(!/^24\.(19|21)\.0$/.test(process.versions.node))throw Error('NODE_24_19_OR_24_21_REQUIRED');
 if(process.platform==='win32'){
  const ok=powershellMetadata(`$s=Get-AuthenticodeSignature -LiteralPath $p.path;if($s.Status -ne 'Valid' -or $s.SignerCertificate.Subject -notmatch 'OpenJS|Node.js'){throw 'NODE_SIGNATURE_INVALID'};'VALID'`,{path:process.execPath});
  if(ok!=='VALID')throw Error('NODE_SIGNATURE_INVALID');
 }return {nodeVersion:process.versions.node,nodeSignature:process.platform==='win32'?'VALID':'not-a-Windows-host'};
}
