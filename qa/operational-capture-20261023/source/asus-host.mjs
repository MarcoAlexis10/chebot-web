import path from 'node:path';import {execFileSync} from 'node:child_process';
import {mkdir,lstat,realpath} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {safeEnv,powershellModules,checkPrivate,verifyNode} from './private-host.mjs';
import {dockerCheck} from './docker-fictional.mjs';
import {AUTHORIZATION,DEV,validateExecutionContext} from './policy.mjs';
export function localMachineMetadata(){
 if(process.platform!=='win32')throw Error('WINDOWS_METADATA_ONLY');
 const script=powershellModules+"Import-Module ($PSHOME+'\\Modules\\CimCmdlets\\CimCmdlets.psd1');$c=Get-CimInstance Win32_ComputerSystem;$p=Get-CimInstance Win32_ComputerSystemProduct;$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value;@{manufacturer=$c.Manufacturer;uuid=$p.UUID;sid=$sid}|ConvertTo-Json -Compress";
 let h;try{h=JSON.parse(execFileSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{env:safeEnv(),timeout:15000,encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true}));}catch{throw Error('ASUS_LOCAL_IDENTITY_CHECK_FAILED');}
 if(typeof h.uuid!=='string'||!h.uuid||/^0+(?:-0+)*$/.test(h.uuid)||typeof h.sid!=='string')throw Error('ASUS_LOCAL_IDENTITY_CHECK_FAILED');
 return h;
}
export function readLocalHostContext(){
 if(process.platform!=='win32'||!process.stdin.isTTY||!process.stdout.isTTY)throw Error('ASUS_LOCAL_OWNER_SESSION_REQUIRED');
 verifyNode();
 const h=localMachineMetadata();
 const c={platform:process.platform,inputTTY:process.stdin.isTTY,outputTTY:process.stdout.isTTY,
  ci:['CI','GITHUB_ACTIONS','CODESPACES','CODEX_APPS_MCP_URL'].some(k=>Boolean(process.env[k])),
  remoteSession:['SSH_CONNECTION','SSH_CLIENT','SSH_TTY'].some(k=>Boolean(process.env[k]))||/^RDP-/i.test(process.env.SESSIONNAME??''),
  manufacturer:h.manufacturer,machineBinding:createHash('sha256').update(h.uuid+'|'+h.sid+'|'+AUTHORIZATION).digest('hex'),authorization:AUTHORIZATION,project:DEV};
 validateExecutionContext(c);dockerCheck();return c;
}
export async function privateHome(){
 const base=process.env.LOCALAPPDATA;
 if(!base||!path.isAbsolute(base)||! /^[a-z]:\\/i.test(base))throw Error('LOCAL_APPDATA_REQUIRED');
 let p=path.resolve(base);for(;;){if((await lstat(p)).isSymbolicLink())throw Error('LOCAL_REPARSE_ANCESTOR_REJECTED');const parent=path.dirname(p);if(p===parent)break;p=parent;}
 const home=path.join(await realpath(base),'CheVeni-Captura-20261023');
 try{await mkdir(home,{mode:0o700});await checkPrivate(home,true);}catch(e){if(e.code!=='EEXIST')throw e;}
 if((await lstat(home)).isSymbolicLink()||path.resolve(home).toLowerCase()!==(await realpath(home)).toLowerCase())throw Error('PRIVATE_HOME_REQUIRED');
 await checkPrivate(home);return home;
}
