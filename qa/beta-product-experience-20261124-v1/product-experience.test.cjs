'use strict';
// Component DOM doubles and source checks only. No browser/provider/backend.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {pathToFileURL}=require('node:url'),path=require('node:path');
const {harness,response,settle}=require('../founder-journey-20261112-v1/dom-harness.cjs');
const productBaseline=process.execArgv.includes('--conditions=product-baseline');
const generated=import(pathToFileURL(path.resolve(__dirname,'../pilot-integration-20261112-v1/materialize.mjs'))).then(m=>m.build({productBaseline}).generated);
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const session={account_id:id(1),member_id:id(2),role:'owner'};
const text=n=>[n.textContent||'',...(n.children||[]).map(text)].join(' ');
const stay=(status='scheduled')=>({stay_id:id(6),property_id:id(4),property_internal_name:'ALOJAMIENTO_SINTETICO',status,check_in_at:'2026-12-01T18:00:00Z',check_out_at:'2026-12-02T18:00:00Z',access_from:'2026-12-01T18:00:00Z',access_until:'2026-12-02T18:00:00Z'});
async function panel({stays=[],properties=[],at='2026-11-24T20:00:00Z',deferredStay}={}){
 const g=await generated,h=harness('',{token:'SYNTHETIC_DISPLAY_ONLY_NOT_JWT'});
 let now=Date.parse(at);class Clock extends Date{static now(){return now;}}h.context.Date=Clock;
 h.context.fetch=(url,options)=>{h.calls.push({url,options});if(url.endsWith('/stays')&&deferredStay)return deferredStay;
  return Promise.resolve(response(200,{ok:true,session:{...session},...(url.endsWith('/properties')?{properties}:url.endsWith('/stays')?{stays}:{})}));};
 vm.runInContext(g['manager/manager-auth.js'],h.context);await settle();
 return Object.assign(h,{setNow:value=>{now=Date.parse(value);}});
}
test('product stays: cancellation, arrival and ended windows do not present dates as private access',async()=>{
 for(const [status,at,expected]of [
  ['cancelled','2026-11-24T20:00:00Z',/Acceso privado no disponible/],
  ['revoked','2026-12-01T20:00:00Z',/Acceso privado no disponible/],
  ['active','2026-12-03T20:00:00Z',/Estadía finalizada/],
  ['scheduled','2026-11-24T20:00:00Z',/Check-in pendiente/],
  ['active','2026-12-01T20:00:00Z',/requiere verificación vigente/]
 ]){
  const h=await panel({stays:[stay(status)],at}),visible=text(h.lists.get('#estadias .list'));
  assert.match(visible,expected);assert.doesNotMatch(visible,/Acceso: /);
  assert.ok(h.calls.every(c=>c.options.method==='GET'));
 }
});
test('product stays: invalid dates use a clear placeholder without echoing the raw value',async()=>{
 const h=await panel({stays:[{...stay(),check_in_at:'SYNTHETIC_INVALID_DATE'}]});
 const visible=text(h.lists.get('#estadias .list'));
 assert.doesNotMatch(visible,/SYNTHETIC_INVALID_DATE/);assert.match(visible,/Fecha no disponible/);
});
test('product QA: panel and property descriptions do not certify synthetic identity or real data',async()=>{
 const properties=[{property_id:id(4),internal_name:'PROPIEDAD_SINTETICA',property_status:'draft',member_role:'owner'}];
 const h=await panel({properties});
 assert.match(h.node('manager-session-label').textContent,/Vista QA/);
 assert.doesNotMatch(text(h.lists.get('#propiedades .list')),/dato real|propiedades reales/i);
 assert.equal(h.classes.has('manager-auth-pending'),false); // UI state, NOT Auth proof.
});
test('product work items: empty requests and incidents use neutral review messages',async()=>{
 const g=await generated;
 for(const kind of ['requests','incidents']){
  const h=await panel();h.context.CustomEvent=class extends Event{constructor(t,o){super(t);this.detail=o?.detail;}};
  const original=h.context.document.getElementById;
  h.context.document.getElementById=value=>value==='manager-'+kind+'-list'?h.lists.get('#'+value):original(value);
  h.context.fetch=async()=>response(200,{ok:true,[kind]:[],meta:{account_id:session.account_id,member_id:session.member_id,member_role:session.role,count:0}});
  vm.runInContext(g['manager/manager-'+kind+'.js'],h.context);await settle();
  const visible=text(h.lists.get('#manager-'+kind+'-list'));
  assert.doesNotMatch(visible,/reales|enviado|completado/i);assert.match(visible,/para revisar/);
 }
});
test('product late stay read: checkout presentation and consecutive stay identities remain separate',async()=>{
 let resolve;const pending=new Promise(r=>resolve=r),h=await panel({at:'2026-12-02T17:59:00Z',deferredStay:pending});
 h.setNow('2026-12-02T18:01:00Z');
 const first=stay('active'),second={...stay(),stay_id:id(7),check_in_at:first.check_out_at,check_out_at:'2026-12-03T18:00:00Z',access_from:first.check_out_at,access_until:'2026-12-03T18:00:00Z'};
 resolve(response(200,{ok:true,session:{...session},stays:[first,second]}));await settle();
 const rows=h.lists.get('#estadias .list').children;
 assert.deepEqual(rows.map(r=>r.dataset.stayId),[id(6),id(7)]);
 assert.match(text(rows[0]),/Estadía finalizada/);assert.match(text(rows[0]),/no disponible/);
 assert.doesNotMatch(text(rows[1]),/Estadía finalizada/);assert.ok(h.calls.every(c=>c.options.method==='GET'));
});
test('product pages SOURCE: one retained form, clear fixed configuration and no technical customer copy',async()=>{
 const g=await generated,p=g['manager/propiedad/index.html'];
 assert.equal((p.match(/<form\b/g)||[]).length,1);assert.match(p,/<form inert/);assert.match(p,/<fieldset disabled/);
 for(const field of ['street','number','floor','unit'])assert.match(p,new RegExp('name="'+field+'"'));
 for(const word of ['15:00','10:00','Español','Departamento','CABA'])assert.ok(p.includes(word));
 assert.match(p,/obligatoria/);assert.match(p,/No se creó ninguna propiedad/);
 for(const key of ['manager/propiedad/index.html','manager/planificar-estadia/index.html','manager/prearrival/index.html','manager/recorrido/index.html']){
  const source=g[key];assert.match(source,/connect-src 'none'/);assert.match(source,/form-action 'none'/);
  const main=source.match(/<main[\s\S]*?<\/main>/)[0];
  assert.doesNotMatch(main.replace(/<[^>]*>/g,' '),/\b(?:UNKNOWN|HELD|JWT|Native17|SQL|COMMIT|writer|reader|journal|CAS)\b/i);
  assert.match(source,/demostración|Demostración/);
 }
 const guest=g['manager/prearrival/index.html'];assert.match(guest,/Antes de llegar/);assert.match(guest,/Después del checkout/);assert.match(guest,/Che Vení Free/);
});
test('product mobile SOURCE: navigation includes knowledge/account and visible keyboard focus',async()=>{
 const g=await generated,index=g['manager/index.html'];
 const nav=index.match(/<div class="subnav mobile-nav"[\s\S]*?<\/div>/)[0];
 assert.match(nav,/href="#knowledge"/);assert.match(nav,/href="#soporte"/);assert.match(nav,/aria-label=/);
 const shared=g['manager/manager.css'];assert.match(shared,/:focus-visible/);assert.match(shared,/min-height:44px/);assert.match(shared,/overflow-wrap:anywhere/);
 for(const name of ['propiedad','planificar-estadia','prearrival','recorrido'])assert.match(g['manager/'+name+'/index.html'],/href="\/manager\/manager.css"/);
 assert.match(index,/href="#inicio"[^>]*>Ir al contenido/);
});
test('product planning: an inert submit explains uncertainty without sending, reading fields or claiming success',async()=>{
 const g=await generated,status={textContent:''};let submit,prevented=0;
 const form={addEventListener(name,fn){assert.equal(name,'submit');submit=fn;},querySelector(name){assert.equal(name,'[data-qa-status]');return status;}};
 vm.runInNewContext(g['manager/qa-planning.js'],{document:{querySelectorAll:()=>[form]},fetch(){throw Error('NO_NETWORK_ALLOWED');}});
 submit({preventDefault(){prevented++;}});
 assert.equal(prevented,1);assert.match(status.textContent,/sin confirmar/);assert.match(status.textContent,/no vuelvas a enviarlo/);
 assert.doesNotMatch(status.textContent,/UNKNOWN|HELD|realizada|creada|guardada/);
});
