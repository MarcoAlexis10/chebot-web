'use strict';
// Execute only the original PURE DTO projection function, not the handler,
// Auth verifier, SQL, build.js or server. DOM/fetch are explicit doubles.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {harness,response,settle}=require('../founder-journey-20261112-v1/dom-harness.cjs');
const generated=require('../pilot-integration-20261112-v1/compose.cjs').build().generated;
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const session={account_id:id(1),member_id:id(2),role:'owner'};
function pureProjector(file,name){
 const source=fs.readFileSync(path.resolve(__dirname,'../../../backend',file),'utf8');
 const start=source.indexOf('function '+name+'('),end=source.indexOf('\n}',start);assert.ok(start>=0&&end>start);
 return vm.runInNewContext('('+source.slice(start,end+2)+')',{Map},{timeout:1000,filename:file+':'+name});
}
const text=node=>[node.textContent||'',...(node.children||[]).map(text)].join(' ');
for(const kind of ['requests','incidents'])test('minimum pilot: original '+kind+' projector and retained panel agree on a populated DTO',async()=>{
 const row={id:id(3),account_id:id(1),property_id:id(4),stay_id:id(5),created_at:'2026-12-01T15:00:00Z',updated_at:'2026-12-01T16:00:00Z',
  // These canaries are synthetic, not personal values; projection must omit
  // them. The complete handler still enforces its own receipt/scope schema.
  unselected_private_field:'SYNTHETIC_ROW_CANARY',
  ...(kind==='requests'?{request_type:'late_checkout',status:'completed',requested_value:'SYNTHETIC_REQUEST',requested_at_time:'2026-12-01T16:00:00Z',approved_value:null,approved_at_time:null,approved_until:null,decision_source:null,decision_at:null,communicated_at:null,completed_at:'2026-12-01T17:00:00Z',cancelled_at:null}:{category:'plumbing',severity:'low',status:'closed',summary:'SYNTHETIC_INCIDENT',manager_intervention_required:false,mediated_without_direct_contact:true,guest_confirmed_resolved:true,resolution_summary:null,used_knowledge_item_id:null,opened_at:'2026-12-01T15:00:00Z',resolved_at:'2026-12-01T16:00:00Z',closed_at:'2026-12-01T17:00:00Z'})};
 const property={id:id(4),internal_name:'SYNTHETIC_PROPERTY',city:'CABA',status:'active',unselected_private_field:'SYNTHETIC_PROPERTY_CANARY'};
 const fn=pureProjector('concierge-manager-'+kind+'.js',kind==='requests'?'requestForClient':'incidentForClient');
 const dto=JSON.parse(JSON.stringify(fn(row,new Map([[property.id,property]]))));
 assert.equal(dto.id,row.id);assert.equal(dto.stay_id,row.stay_id);assert.equal(dto.property_id,property.id);assert.doesNotMatch(JSON.stringify(dto),/CANARY/);
 const h=harness(generated['manager/manager-auth.js'],{token:'SYNTHETIC_NOT_JWT',fetcher:async url=>response(200,{ok:true,session:{...session},...(url.endsWith('/properties')?{properties:[]}:url.endsWith('/stays')?{stays:[]}: {})})});await settle();
 h.context.CustomEvent=class extends Event{constructor(t,o){super(t);this.detail=o.detail}};
 const original=h.context.document.getElementById;h.context.document.getElementById=k=>k==='manager-'+kind+'-list'?h.lists.get('#'+k):original(k);
 h.context.fetch=(url,options)=>{h.calls.push({url,options});assert.equal(options.method,'GET');return Promise.resolve(response(200,{ok:true,[kind]:[dto],meta:{account_id:session.account_id,member_id:session.member_id,member_role:session.role,count:1}}))};
 vm.runInContext(generated['manager/manager-'+kind+'.js'],h.context);await settle();
 assert.equal(h.classes.has('manager-auth-pending'),false);const list=h.lists.get('#manager-'+kind+'-list');assert.equal(list.children.length,1);
 const visible=text(list);assert.match(visible,/SYNTHETIC_PROPERTY/);assert.doesNotMatch(visible,/CANARY/);assert.match(visible,kind==='requests'?/SYNTHETIC_REQUEST/:/SYNTHETIC_INCIDENT/);
 assert.ok(h.calls.every(x=>x.options.method==='GET'));assert.equal(h.calls.length,4);
});
