import {readFile,readdir,lstat} from 'node:fs/promises';import {createHash} from 'node:crypto';
import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
async function verify(){
 const m=JSON.parse(await readFile(path.join(root,'MANIFEST.json'),'utf8'));
 if(m.package!=='CHEVENI_NEW_ADAPTER_FICTIONAL_ONLY_20261022'||!Array.isArray(m.files)||m.files.length<10)throw Error('PACKAGE_MANIFEST_INVALID');
 const names=new Set(['MANIFEST.json']);
 for(const f of m.files){if(!/^[A-Za-z0-9_.-]+$/.test(f.name)||names.has(f.name)||!Number.isSafeInteger(f.bytes)||f.bytes<0||!/^[a-f0-9]{64}$/.test(f.sha256))throw Error('PACKAGE_MANIFEST_INVALID');names.add(f.name);const p=path.join(root,f.name),s=await lstat(p);if(!s.isFile()||s.isSymbolicLink())throw Error('PACKAGE_FILE_INVALID');const b=await readFile(p);if(b.length!==f.bytes||createHash('sha256').update(b).digest('hex')!==f.sha256)throw Error('PACKAGE_FILE_CHANGED');}
 const actual=await readdir(root);if(actual.length!==names.size||actual.some(n=>!names.has(n)))throw Error('PACKAGE_UNEXPECTED_FILE');return m.files.length;
}
try{
 const files=await verify();if(process.platform!=='win32')throw Error('WINDOWS_DESKTOP_LAB_ONLY');
 if(process.argv.length>3||process.argv[2]&&process.argv[2]!=='--diagnostic')throw Error('MODE_NOT_ALLOWED');
 const h=await import('./approved/private-host.mjs');h.verifyNode();
 if(process.argv[2]==='--diagnostic')console.log(JSON.stringify({result:'NEW_WINDOWS_PACKAGE_DIAGNOSTIC_PASS',manifestFiles:files,remoteConnectionEnabled:false,dockerContacted:false}));
 else console.log(JSON.stringify({manifestFiles:files,...await (await import('./desktop-lab.mjs')).desktopFocusedLab()}));
}catch(e){console.log(JSON.stringify({ok:false,code:/^[A-Z0-9_]+$/.test(e.message)?e.message:'NEW_ADAPTER_LAB_FAILED',remoteConnectionEnabled:false,realCaptureExecuted:false,integralRecoveryVerified:false}));process.exitCode=1;}
