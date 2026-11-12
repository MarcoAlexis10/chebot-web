// Comparator of a declared proposal graph only, never a native ACL attestation.
export function reviewIncidentProfile(p){
 const errors=[],triples=[['cheveni_incident_scope_backend_v1','cheveni_incident_scope_owner_v1','current_resolution_v1'],['cheveni_incident_writer_backend_v1','cheveni_incident_writer_owner_v1','change_state_v1'],['cheveni_incident_readback_backend_v1','cheveni_incident_readback_owner_v1','read_effect_v1']];
 const eq=(a,b)=>Array.isArray(a)&&new Set(a).size===a.length&&JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
 const logins=triples.map(x=>x[0]),roleNames=[...triples.flatMap(x=>x.slice(0,2)),'cheveni_incident_data_owner_v1'];
 if(!eq(p.roles.map(x=>x.name),roleNames)||p.roles.some(r=>r.login!==logins.includes(r.name)))errors.push('EXACT_NOLOGIN_OWNERS');
 for(const [name,kind] of [['native_gate_v1','scope'],['current_revisions_v1','scope'],['original_intent_v1','writer'],['dispatch_claim_v1','writer']]){
  const f=p.functions[name];if(!f||f.securityDefiner!==false||f.owner!==`cheveni_incident_${kind}_owner_v1`||f.held!==true)errors.push('PRIVATE_HELPER_OWNER');
 }
 if(!eq(Object.keys(p.entries),triples.map(x=>x[0]))||!eq(p.publicExecute,[])||!eq(p.loginTablePrivileges,[])||p.schemaCreateForLogins!==false)errors.push('EXPOSED_ENTRY_OR_PRIVILEGE');
 for(const [login,owner,entry] of triples){
  const l=p.roles.find(x=>x.name===login),o=p.roles.find(x=>x.name===owner),f=p.functions[entry];
  if(!eq(p.entries[login],[entry])||!l||!o||l.login!==true||o.login!==false||l.ownsDataTables!==false||o.ownsDataTables!==false||!f||f.owner!==owner||f.securityDefiner!==true||f.held!==true)errors.push('CALLER_OWNER_PAIR');
 }
 if(new Set(p.roles.map(x=>x.name)).size!==p.roles.length)errors.push('DUPLICATE_ROLE');
 for(const r of p.roles)if(['superuser','bypassRls','inherit','createDb','createRole','replication'].some(k=>r[k]!==false)||!eq(r.memberships,[])||!eq(r.setRoles,[]))errors.push('ROLE_CLOSURE');
 const reachable=new Set();function visit(name,path=new Set()){
  const f=p.functions[name];if(!f||path.has(name)){errors.push('UNKNOWN_OR_CYCLIC_HELPER');return;}
  reachable.add(name);if(f.mutates!==false)errors.push('READER_REACHES_MUTATOR');
  const next=new Set([...path,name]);for(const c of f.calls)visit(c,next);
 }
 visit('read_effect_v1');
 for(const name of ['intent_binding','attempt_binding']){const r=p.rls[name];if(!r||r.enabled!==true||r.force!==true||!eq(r.readerCommands,['SELECT']))errors.push('READER_RLS');}
 for(const s of p.ownerColumnRequirements.readerOwner)if(!s.endsWith(':SELECT'))errors.push('READER_COLUMN_WRITE');
 return Object.freeze({state:errors.length?'HELD_PROFILE_MISMATCH':'PROFILE_REVIEW_MATCHED',errors:Object.freeze(errors),readerReachable:Object.freeze([...reachable].sort()),nativeObserved:false,minimumPrivilegeAccredited:false,operationalApproval:false});
}
