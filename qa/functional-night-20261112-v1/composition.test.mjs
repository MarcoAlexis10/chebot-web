import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {build} from './materialize.mjs';
import previous from '../property-stay-prearrival-20261112-v1/materialize.cjs';
test('full retained journey reuses prior assets, resolves local links/anchors and never presents missing legal documents as published',()=>{
 const {generated:g,legalPublication}=build();assert.equal(legalPublication.approved,false);assert.equal(Object.keys(g).length,18);const old=previous.build().generated;
 let unchanged=0;for(const [p,s]of Object.entries(g)){
  if(p.endsWith('.js'))new vm.Script(s,{filename:p});
  if(p.endsWith('.js')&&p!=='manager/manager-auth.js'||p.endsWith('.css')){assert.equal(s,old[p],p);unchanged++;}
  if(!p.endsWith('.html'))continue;
  assert.match(s,/connect-src 'none'/);assert.match(s,/form-action 'none'/);assert.doesNotMatch(s,/<form(?! inert)/);assert.doesNotMatch(s,/<input[^>]+value="[^"]+"/);
  for(const m of s.matchAll(/(?:href|src)="([^"#][^"]*)"/g)){
   const url=m[1];assert.ok(url.startsWith('/manager/'),url);const [pathname,fragment]=url.split('#'),key=pathname.slice(1).replace(/\/$/,'/index.html');assert.ok(g[key],key);if(fragment)assert.ok(g[key].includes(`id="${fragment}"`),key+'#'+fragment);
  }
 }
 assert.equal(unchanged,9);assert.match(g['manager/activar/index.html'],/Documento de condiciones retenido/);assert.match(g['manager/activar/index.html'],/Documento de privacidad retenido/);
 assert.match(g['manager/propiedad/index.html'],/property\.decision/);assert.match(g['manager/planificar-estadia/index.html'],/stay\.guest\.bind/);assert.match(g['manager/recorrido/index.html'],/403: rechazo de permisos/);
});
