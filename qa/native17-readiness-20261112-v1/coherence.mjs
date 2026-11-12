// Narrow cross-artifact checks for the sealed SQL text; NOT a SQL parser/engine.
import {readFileSync} from 'node:fs';
export const names=['00-roles-DO-NOT-APPLY.sql','00-source-base-DO-NOT-APPLY.sql','01-revisions-DO-NOT-APPLY.sql','02-admission-DO-NOT-APPLY.sql','03-bound-entries-DO-NOT-APPLY.sql','04-acl-rls-DO-NOT-APPLY.sql','05-catalog-capture-NOT-RUN.sql'];
export function loadPacket(url){return Object.fromEntries(names.map(n=>[n,readFileSync(new URL(n,url),'utf8')]))}
export function inspectPacket(p){
 const findings=[],add=(id,files,detail)=>findings.push({id,files,detail});
 const base=p[names[1]],admit=p[names[3]],bound=p[names[4]],acl=p[names[5]],capture=p[names[6]];
 for(const n of names)if(!/raise exception/.test(p[n])||!p[n].trim().endsWith('rollback;'))add('ABORT_MISSING',[n],'Review text must remain aborted and end in rollback');
 for(const [n,s] of [[names[1],base],[names[4],bound]])if(/from concierge_incident_private_v1\.intent_binding[^;]*for update/i.test(s)&&!/grant update\([^)]*\) on concierge_incident_private_v1\.intent_binding/.test(acl))add('IMMUTABLE_INTENT_LOCK_PRIVILEGE',[n,names[5]],'FOR UPDATE needs UPDATE; immutable history must use the already-required fence without widening ACL');
 const policies=[...acl.matchAll(/create policy[^;]+;/g)].map(m=>m[0]);
 if(policies.some(s=>!s.includes(' as restrictive ')))add('PERMISSIVE_POLICY_BYPASS',[names[5]],'Default permissive policy can OR with an existing broader policy');
 for(const table of new Set(policies.map(s=>s.match(/ on ([\w.]+)/)[1])))if(!acl.includes('alter table '+table+' enable row level security;')||!acl.includes('alter table '+table+' force row level security;'))add('RLS_ENABLE_FORCE_UNSPECIFIED',[names[5]],table);
 if(/row_visible_v2\(user_id,intent_id,null::uuid\)/.test(acl)||!base.includes('provider_binding_ref uuid not null'))add('EFFECT_PROVIDER_PROJECTION_MISSING',[names[1],names[5]],'Effect policies cannot correlate the provider without immutable row projection');
 if(!admit.includes('KNOWN_ORIGINAL_CONTRADICTORY_UNKNOWN'))add('KNOWN_ORIGINAL_NOT_COMPARED',[names[3]],'Must not disclose prior history before protected original-reference equality');
 for(const tag of ['writer','reader']){
  const body=bound.split('as $'+tag+'$')[1]?.split('$'+tag+'$')[0]||'';
  const last=body.lastIndexOf('return jsonb_build_object');
  if(body.lastIndexOf('assert_provider_v2(')<body.lastIndexOf('current_revisions_v1(')||last<0)add('PROVIDER_FINAL_REVALIDATION_MISSING',[names[4]],tag+' must revalidate after final authority/floor reads');
 }
 if(!capture.includes("r.rolname like 'cheveni_incident_%'")||!capture.includes('has_schema_privilege'))add('CAPTURE_OWNER_SCHEMA_GAP',[names[6]],'Capture effective function and schema privileges of owners as well as logins');
 return Object.freeze({classification:'STATIC_TEXT_CROSS_ARTIFACT',findings,sqlExecuted:false,parserUsed:false,operationalApproval:false});
}
