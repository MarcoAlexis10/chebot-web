// Static assembly checks only; this does NOT launch a browser or HTTP server.
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {build} from './materialize.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),g=build().generated;
const pins=JSON.parse(fs.readFileSync(path.join(here,'SOURCE-PINS.json'),'utf8'));
for(const item of pins.sources){
 const folder=item.repository==='chebot-web'?'web':item.repository==='chebot-backend'?'backend':null;assert.ok(folder);
 const file=path.resolve(here,'../../..',folder,item.path);assert.ok(file.startsWith(path.resolve(here,'../../..',folder)+path.sep));
 const bytes=fs.readFileSync(file);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,'Source drift '+item.path);
 assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex'),item.gitBlob);
}
const manifest=JSON.parse(fs.readFileSync(path.join(here,'OVERLAY-MANIFEST.json'),'utf8'));
let scripts=0,inline=0,html=0,links=0;
for(const [file,source]of Object.entries(g)){
 if(file.endsWith('.js')){new vm.Script(source,{filename:file});scripts++;}
 if(!file.endsWith('.html'))continue;html++;
 assert.match(source,/connect-src 'none'/);assert.match(source,/form-action 'none'/);
 for(const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(match[1].trim()){new vm.Script(match[1],{filename:file});inline++;}
 for(const match of source.matchAll(/(?:href|src)="([^"\s]+)"/g)){
  const url=match[1];if(!url.startsWith('/'))continue;
  let [target,fragment]=url.split('#');if(target.endsWith('/'))target+='index.html';target=target.slice(1);
  assert.ok(Object.hasOwn(g,target),'Missing generated target '+url+' from '+file);links++;
  if(fragment)assert.ok(new RegExp('id=["\x27]'+fragment+'["\x27]').test(g[target]),'Missing anchor '+url);
 }
}
for(const file of manifest.files){const text=fs.readFileSync(path.join(here,file.path),'utf8');assert.equal(text,g[file.path.replace(/^overlays\//,'')]);assert.equal(createHash('sha256').update(text).digest('hex'),file.sha256);}
assert.equal(manifest.networkAllowed,false);assert.equal(manifest.formsInert,true);
console.log(JSON.stringify({classification:'STATIC_ASSEMBLY_CHECK',pinnedSources:pins.sources.length,html,scripts,inline,localLinks:links,overlayFiles:manifest.files.length,actualAuthVerified:false,browserExecuted:false,sqlExecuted:false,servicesStarted:0}));
