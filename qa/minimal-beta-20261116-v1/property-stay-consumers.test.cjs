'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const {harness,response,settle}=require('../founder-journey-20261112-v1/dom-harness.cjs');
const generated=require('../pilot-integration-20261112-v1/compose.cjs').build().generated;
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const session={account_id:id(1),member_id:id(2),role:'owner'};
const text=node=>[node.textContent||'',...(node.children||[]).map(text)].join(' ');
test('minimum pilot: original property receipt schema reaches the retained panel without invented fields or writes',async()=>{
 const {parseManagerPropertyReceipt}=await import(pathToFileURL(path.resolve(__dirname,'../../../backend/concierge-manager-property-receipt.js')));
 const raw={property_id:id(4),internal_name:'SYNTHETIC_CABA_PROPERTY',property_status:'draft',member_role:'owner',can_manage_stays:true,can_manage_incidents:true,can_approve_requests:true,can_manage_knowledge:true,can_manage_secrets:true,can_manage_team:true};
 const properties=parseManagerPropertyReceipt([raw],{memberRole:'owner'});assert.ok(properties);assert.equal(properties[0].property_id,raw.property_id);
 assert.equal(parseManagerPropertyReceipt([{...raw,unselected_private_field:'SYNTHETIC_CANARY'}],{memberRole:'owner'}),null);
 const h=harness(generated['manager/manager-auth.js'],{token:'SYNTHETIC_NOT_JWT',fetcher:async url=>response(200,{ok:true,session:{...session},...(url.endsWith('/properties')?{properties}:url.endsWith('/stays')?{stays:[]}: {})})});await settle();
 const visible=text(h.lists.get('#propiedades .list'));assert.equal(h.classes.has('manager-auth-pending'),false);assert.match(visible,/SYNTHETIC_CABA_PROPERTY/);assert.match(visible,/Borrador/);assert.match(visible,/owner/);assert.doesNotMatch(visible,/CANARY/);
 assert.equal(h.calls.length,3);assert.ok(h.calls.every(x=>x.options.method==='GET'));
});
test('minimum pilot: original stay DTO projection preserves two consecutive stays and the panel CABA date display',async()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../../../backend/concierge-manager-stays.js'),'utf8');
 const start=source.indexOf('  const stays = staysPayload.map((stay) => ({'),end=source.indexOf('\n  }));',start);assert.ok(start>=0&&end>start);
 const project=vm.runInNewContext('(staysPayload,propertyNameById)=>{'+source.slice(start,end+7)+'\nreturn stays;}',{Map},{timeout:1000});
 const raw=[0,1].map(n=>({id:id(5+n),property_id:id(4),check_in_at:`2026-12-0${1+n}T18:00:00Z`,check_out_at:`2026-12-0${2+n}T18:00:00Z`,access_from:`2026-12-0${1+n}T18:00:00Z`,access_until:`2026-12-0${2+n}T18:00:00Z`,status:'scheduled',created_at:'2026-11-16T15:00:00Z',updated_at:'2026-11-16T15:00:00Z'}));
 const stays=JSON.parse(JSON.stringify(project(raw,new Map([[id(4),'SYNTHETIC_CABA_PROPERTY']]))));
 assert.equal(stays[0].stay_id,raw[0].id);assert.equal(stays[1].stay_id,raw[1].id);assert.notEqual(stays[0].stay_id,stays[1].stay_id);assert.equal(stays[0].check_out_at,stays[1].check_in_at);
 const h=harness('',{token:'SYNTHETIC_NOT_JWT'});class Clock extends Date{static now(){return Date.parse('2026-11-16T15:00:00Z')}}h.context.Date=Clock;
 h.context.fetch=(url,options)=>{h.calls.push({url,options});return Promise.resolve(response(200,{ok:true,session:{...session},...(url.endsWith('/properties')?{properties:[]}:url.endsWith('/stays')?{stays}: {})}))};
 vm.runInContext(generated['manager/manager-auth.js'],h.context);await settle();
 const rows=h.lists.get('#estadias .list').children;assert.equal(rows.length,2);assert.deepEqual(rows.map(r=>r.dataset.stayId),[id(5),id(6)]);assert.ok(rows.every(r=>r.dataset.stayStatus==='scheduled'));assert.match(text(rows[0]),/15:00/);assert.match(text(rows[1]),/SYNTHETIC_CABA_PROPERTY/);
 assert.equal(h.classes.has('manager-auth-pending'),false);assert.ok(h.calls.every(x=>x.options.method==='GET'));assert.equal(h.calls.length,3);
 // DTO identity/date presentation only, NOT SQL overlap exclusion or guest access.
});
