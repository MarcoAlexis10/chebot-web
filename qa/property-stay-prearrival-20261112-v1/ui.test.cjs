'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {build}=require('./materialize.cjs');
test('held property/stay/prearrival journey has local destinations, inert blank forms and a submit handler that never reads or transmits inputs',()=>{
 const {generated,legalPublication}=build();assert.equal(legalPublication.approved,false);
 const pages=['manager/propiedad/index.html','manager/planificar-estadia/index.html','manager/prearrival/index.html'];
 for(const p of pages){const s=generated[p];assert.match(s,/connect-src 'none'/);assert.match(s,/form-action 'none'/);assert.match(s,/NO-GO/);assert.doesNotMatch(s,/<form(?! inert)/);assert.doesNotMatch(s,/<input[^>]+value="[^"]+"/);
  for(const m of s.matchAll(/href="([^"#]+)(?:#[^"]*)?"/g)){const key=m[1].replace(/^\//,'').replace(/\/$/,'/index.html');assert.ok(generated[key],`unresolved QA navigation: ${key}`);}
 }
 assert.match(generated['manager/index.html'],/href="\/manager\/propiedad\/">Revisar configuración retenida/);assert.match(generated['manager/index.html'],/href="\/manager\/planificar-estadia\/">Planificar estadía retenida/);assert.match(generated[pages[0]],/name="language" disabled/);assert.match(generated[pages[0]],/ABI privado/);assert.match(generated[pages[1]],/UNKNOWN/);assert.match(generated[pages[2]],/loader privado/);
 let prevented=0,reads=0,writes=0,handler;const status={textContent:''};const form={addEventListener:(name,f)=>{assert.equal(name,'submit');handler=f},querySelector:()=>status};
 Object.defineProperty(form,'elements',{get(){reads++;throw Error('PRIVATE_INPUT_READ')}});
 const denied=()=>{writes++;throw Error('IO_FORBIDDEN')};
 vm.runInNewContext(fs.readFileSync(require.resolve('./planning-ui.js'),'utf8'),{document:{querySelectorAll:()=>[form]},fetch:denied,localStorage:{getItem:denied,setItem:denied},sessionStorage:{getItem:denied,setItem:denied}},{timeout:1000});
 handler({preventDefault(){prevented++}});assert.equal(prevented,1);assert.equal(reads,0);assert.equal(writes,0);assert.match(status.textContent,/UNKNOWN/);
});
