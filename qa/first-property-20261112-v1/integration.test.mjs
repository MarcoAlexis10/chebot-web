import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {createFirstPropertyCandidate} from './candidate.mjs';import {build} from './materialize.mjs';import {build as previous} from '../functional-contracts-20261112-v1/materialize.mjs';
test('founder review, draft, independent read and configuration compose held without trusting ACK, callbacks, role fields or restored client original',async()=>{
 let reads=0;const poison=new Proxy({},{get(){reads++;throw Error();}}),c=createFirstPropertyCandidate(poison);
 for(const f of [c.propertyCapture.prepare,c.propertyCapture.write]){const r=await f(poison);assert.equal(r.receipt,null);assert.equal(r.dispatchPerformed,false);}
 for(const raw of [poison,{state:'COMMITTED',propertyId:'client-property',original:{trusted:true}},undefined]){const r=await c.captureReader.read(raw);assert.equal(r.state,'UNKNOWN');assert.equal(r.propertyId,null);assert.equal(r.automaticRetryAllowed,false);assert.equal((await c.propertyCapture.read(raw)).state,'UNKNOWN');const ready=await c.prepareConfiguration(raw);assert.equal(ready.propertyId,null);assert.equal(ready.entityRevisionAvailable,false);}
 for(const f of [c.property,c.stay,c.request])assert.equal((await f(poison)).operationalApproval,false);assert.equal(reads,0);
});
test('structured capture UI replaces the incompatible free-address form, preserves original assets, closes all local links and cannot submit or use network',()=>{
 const r=build(),g=r.generated,old=previous().generated;assert.equal(Object.keys(g).length,18);assert.equal(r.legalPublication.approved,false);let assets=0;
 for(const [p,s]of Object.entries(g)){
  if(/\.(js|css)$/.test(p)){assets++;assert.equal(s,old[p]);if(p.endsWith('.js'))new vm.Script(s,{filename:p});}
  if(!p.endsWith('.html'))continue;assert.match(s,/connect-src 'none'/);assert.match(s,/form-action 'none'/);assert.doesNotMatch(s,/<form(?! inert)/);assert.doesNotMatch(s,/<input[^>]+value="[^"]+"/);
  for(const m of s.matchAll(/(?:href|src)="([^"#][^"]*)"/g)){const [u,fragment]=m[1].split('#'),k=u.replace(/^\//,'').replace(/\/$/,'/index.html');assert.ok(g[k],k);if(fragment)assert.ok(g[k].includes(`id="${fragment}"`));}
  for(const m of s.matchAll(/href="#([^"]+)"/g))assert.ok(s.includes(`id="${m[1]}"`));
 }
 assert.equal(assets,10);const p=g['manager/propiedad/index.html'];for(const field of ['street','number','floor','unit'])assert.match(p,new RegExp('<input name="'+field+'"[^>]+disabled>'));assert.doesNotMatch(p,/name="address"|name="floorOrUnit"/);assert.match(p,/Borrador retenido: no creado/);assert.match(p,/Lectura: UNKNOWN/);assert.match(p,/no prueba COMMIT externo/);assert.match(p,/configuracion-retenida/);
});
