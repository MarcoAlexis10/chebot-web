import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {createContractsCandidate} from './candidate.mjs';import {build} from './materialize.mjs';import {build as previous} from '../functional-night-20261112-v1/materialize.mjs';
test('founder contract composition keeps every operational step held, preserves UNKNOWN and reuses original inert journey assets',async()=>{
 let reads=0;const poison=new Proxy({},{get(){reads++;throw Error('NO_ADAPTER')}}),c=createContractsCandidate(poison);
 for(const call of [()=>c.property(poison),()=>c.propertyCapture.write(poison),()=>c.stay(poison),()=>c.catalog.produce(poison),()=>c.request(poison),()=>c.incident.execute(poison,poison)]){const r=await call();assert.equal(r.operationalApproval,false);assert.equal(r.state==='HELD'||r.status==='HELD'||String(r.state).includes('HELD')||String(r.state).includes('MISSING'),true);}
 assert.equal((await c.propertyCapture.read({state:'COMMITTED'})).state,'UNKNOWN');assert.equal((await c.reconcile({state:'COMMIT'})).state,'UNKNOWN');assert.equal((await c.reconcileIncident({state:'COMMIT'})).state,'UNKNOWN');assert.equal(reads,0);
 const r=build(),g=r.generated,old=previous().generated;assert.equal(r.legalPublication.approved,false);assert.equal(Object.keys(g).length,18);let assets=0;
 for(const [p,s]of Object.entries(g)){
  if(/\.(js|css)$/.test(p)){assert.equal(s,old[p],p);assets++;if(p.endsWith('.js'))new vm.Script(s,{filename:p});}
  if(!p.endsWith('.html'))continue;assert.match(s,/connect-src 'none'/);assert.match(s,/form-action 'none'/);assert.doesNotMatch(s,/<form(?! inert)/);assert.doesNotMatch(s,/<input[^>]+value="[^"]+"/);
  for(const m of s.matchAll(/(?:href|src)="([^"#][^"]*)"/g)){const [url,fragment]=m[1].split('#'),key=url.replace(/^\//,'').replace(/\/$/,'/index.html');assert.ok(g[key],key);if(fragment)assert.ok(g[key].includes(`id="${fragment}"`));}
 }
 assert.equal(assets,10);assert.match(g['manager/planificar-estadia/index.html'],/INVALIDATE_PRIOR_STAY_BINDINGS/);assert.match(g['manager/propiedad/index.html'],/Suspend pausa el lanzamiento completo/);assert.match(g['manager/prearrival/index.html'],/productor protegido ausente/);
});
