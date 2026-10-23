import {readFile,readdir,lstat,realpath} from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
export async function verifyPreparedBundle(directory){
 const eq=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
 if(!eq(path.resolve(directory),await realpath(directory)))throw Error('RELEASE_DIRECTORY_ALIAS_REJECTED');
 const file=path.join(directory,'MANIFEST.json'),st=await lstat(file);if(!st.isFile()||st.isSymbolicLink()||st.size>65536)throw Error('RELEASE_MANIFEST_REJECTED');
 const bytes=await readFile(file),m=JSON.parse(bytes);if(m.kind!=='CHEVENI_PRIVATE_PREPARED_V1'||m.devEnabled!==false||!Array.isArray(m.files)||m.files.length>100)throw Error('RELEASE_MANIFEST_REJECTED');
 const names=m.files.map(x=>x.name);if(new Set(names).size!==names.length||names.some(n=>typeof n!=='string'||!/^[a-zA-Z0-9_.-]+$/.test(n)||n==='MANIFEST.json'))throw Error('RELEASE_MANIFEST_REJECTED');
 const actual=(await readdir(directory)).sort();if(actual.join('|')!==[...names,'MANIFEST.json'].sort().join('|'))throw Error('RELEASE_FILE_SET_MISMATCH');
 for(const e of m.files){const p=path.join(directory,e.name),s=await lstat(p);if(!s.isFile()||s.isSymbolicLink()||s.size>2*1024*1024||!/^([a-f0-9]{64})$/.test(e.sha256))throw Error('RELEASE_FILE_REJECTED');if(createHash('sha256').update(await readFile(p)).digest('hex')!==e.sha256)throw Error('RELEASE_FILE_HASH_MISMATCH');}
 return {manifestFiles:m.files.length,manifestSha256:createHash('sha256').update(bytes).digest('hex'),devEnabled:false};
}
