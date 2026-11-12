"""Static review compiler: SQL/ACL/catalog expectation files only; no SQL driver."""
from pathlib import Path
import sys
sys.dont_write_bytecode = True
import hashlib
import json
import re
from build_review import ROOT, OLD, SCHEMA, HEADER, END, write

PREFIX='cheveni_incident_'
SCOPE=PREFIX+'scope_owner_v1'
WRITER=PREFIX+'writer_owner_v1'
READER=PREFIX+'readback_owner_v1'
REVISION=PREFIX+'revision_owner_v2'
DATA=PREFIX+'data_owner_v1'
LOGINS={PREFIX+'scope_backend_v1':['current_resolution_v1'],PREFIX+'writer_backend_v1':['admit_v2','claim_dispatch_v2','change_state_bound_v2'],PREFIX+'readback_backend_v1':['read_effect_bound_v2']}

def function_specs(text):
    pattern=r'create(?: or replace)? function\s+('+re.escape(SCHEMA)+r'\.\w+)\(([^)]*)\)(.*?)(\$[A-Za-z_]*\$)(.*?)\4\s*;'
    out=[]
    for m in re.finditer(pattern,text,re.I|re.S):
        name=m[1].split('.')[1]
        types=[arg.strip().split(None,1)[1] for arg in m[2].split(',')] if m[2].strip() else []
        owner=REVISION if name.startswith('revision_') else WRITER if name in ['original_intent_v1','dispatch_claim_v1','original_reference_v2','assert_provider_v2','bound_claim_matches_v2','assert_claimed_admission_v2','admit_v2','claim_dispatch_v2','change_state_v1','change_state_bound_v2'] else READER if name.startswith('read_effect') else SCOPE
        out.append({'name':name,'signature':m[1]+'('+','.join(types)+')','owner':owner,'securityDefiner':bool(re.search(r'security\s+definer',m[3],re.I)),'bodySha256':hashlib.sha256(m[5].encode()).hexdigest(),'body':m[5],'arity':len(types)})
    return out

def main():
    base=(OLD/'incident-only-DO-NOT-APPLY.sql').read_text()
    (ROOT/'00-source-base-DO-NOT-APPLY.sql').write_text(base)
    roles=list(LOGINS)+[SCOPE,WRITER,READER,REVISION,DATA]
    role_sql='\n'.join(f'create role {r} {"LOGIN" if r in LOGINS else "NOLOGIN"} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;' for r in roles)
    write('00-roles-DO-NOT-APPLY.sql',role_sql+'\n-- No password, connection, owner membership or credentials are installed.\n')
    specs={}
    for name in ['00-source-base-DO-NOT-APPLY.sql','01-revisions-DO-NOT-APPLY.sql','02-admission-DO-NOT-APPLY.sql','03-bound-entries-DO-NOT-APPLY.sql']:
        for f in function_specs((ROOT/name).read_text()):specs[f['name']]=f
    # Known native functions remain external pinned dependencies, not redefined.
    external={
      'concierge_runtime_qa_v2.concierge_authorize_manager_member_action(uuid,uuid,text)':SCOPE,
      'concierge_runtime_qa_v2.concierge_manager_set_incident_state(uuid,uuid,text,text)':WRITER}
    acl='''
create function concierge_incident_private_v1.row_visible_v2(p_user uuid,p_intent uuid,p_binding uuid) returns boolean
language sql security definer set search_path='' as $rowpolicy$
 select count(*)=1 from concierge_incident_private_v1.provider_binding_v2(p_binding) b
 where p_binding is not null and b.user_id=p_user and b.intent_id=p_intent and b.expires_at is not null and b.expires_at>clock_timestamp()
$rowpolicy$;
create function concierge_incident_private_v1.source_row_visible_v2(p_relation text,p_ids uuid[]) returns boolean
language sql security definer set search_path='' as $protected_scope$
 -- Native17 INDEPENDENT_PROTECTED_SCOPE still has no accredited producer.
 -- No GUC/JWT/client metadata or recursive read of the protected source table.
 select false
$protected_scope$;
'''
    for f in function_specs(acl):specs[f['name']]=f
    calls={}
    for name,f in specs.items():
        calls[name]=sorted(set(re.findall(re.escape(SCHEMA)+r'\.(\w+)\s*\(',f['body'])))
    grants=[]
    def execute(target,role):
        row={'kind':'EXECUTE','object':target,'role':role}
        if row not in grants:grants.append(row)
    for login,names in LOGINS.items():
        for name in names:execute(specs[name]['signature'],login)
    for f in specs.values():
        for called in calls[f['name']]:
            if called not in specs:raise ValueError('UNRESOLVED_LOCAL_CALL '+called)
            if specs[called]['owner']!=f['owner']:execute(specs[called]['signature'],f['owner'])
    # A SECURITY INVOKER helper retains its ACTUAL caller role, not its owner.
    # Propagate context through the whole graph instead of stopping at one hop.
    visited=set()
    def propagate(name,caller):
        key=(name,caller)
        if key in visited:return
        visited.add(key)
        f=specs[name]
        if f['owner']!=caller:execute(f['signature'],caller)
        actual=f['owner'] if f['securityDefiner'] else caller
        for called in calls[name]:propagate(called,actual)
    for login,names in LOGINS.items():
        for name in names:propagate(name,login)
    for name,f in specs.items():propagate(name,f['owner'])
    for sig,role in external.items():execute(sig,role)
    # Exact columns actually reached by the reused native invoker functions.
    scope_columns={
      'auth.users':'id,email_confirmed_at,banned_until',
      'auth.sessions':'id,user_id,not_after',
      'public.concierge_manager_web_identities':'auth_user_id,member_id,account_id,status,revoked_at',
      'public.concierge_account_members':'id,account_id,role,status',
      'public.concierge_accounts':'id,status',
      'public.concierge_properties':'id,account_id,status,city',
      'public.concierge_stays':'id,account_id,property_id',
      'public.concierge_incidents':'id,account_id,property_id,stay_id,status',
      'public.concierge_member_property_permissions':'account_id,member_id,property_id,can_manage_stays,can_manage_incidents,can_approve_requests,can_manage_knowledge,can_manage_secrets,can_manage_team'}
    writer_columns={
      'public.concierge_account_members':'id,account_id,role,status',
      'public.concierge_member_property_permissions':'account_id,member_id,property_id,can_manage_incidents',
      'public.concierge_incidents':'id,account_id,property_id,stay_id,status,manager_intervention_required,closed_at,updated_at'}
    tablecols={}
    for text in [base,(ROOT/'01-revisions-DO-NOT-APPLY.sql').read_text(),(ROOT/'02-admission-DO-NOT-APPLY.sql').read_text()]:
        for m in re.finditer(r'create table '+re.escape(SCHEMA)+r'\.(\w+)\((.*?)\n\);',text,re.S):
            tablecols[SCHEMA+'.'+m[1]]=re.findall(r'\b(\w+)\s+(?:uuid|bigint|boolean|text)\b',m[2])
    for role,mapping in [(SCOPE,scope_columns),(WRITER,writer_columns)]:
        for relation,cols in mapping.items():grants.append({'kind':'SELECT','object':relation,'columns':cols.split(','),'role':role})
    for relation,cols in tablecols.items():
        targets=[SCOPE,REVISION] if relation.endswith('authority_clock_v2') else [WRITER,READER]
        for role in targets:grants.append({'kind':'SELECT','object':relation,'columns':cols,'role':role})
        if not relation.endswith('authority_clock_v2'):grants.append({'kind':'INSERT','object':relation,'columns':cols,'role':WRITER})
    for relation,cols,role in [(SCHEMA+'.authority_clock_v2',['authority_revision'],REVISION),(SCHEMA+'.admission_v2',['state'],WRITER),(SCHEMA+'.attempt_binding',['state','resulting_status'],WRITER),('public.concierge_incidents',['status','manager_intervention_required','closed_at','updated_at'],WRITER)]:
        grants.append({'kind':'UPDATE','object':relation,'columns':cols,'role':role})
    for relation,cols in [('public.concierge_incident_events','account_id,incident_id,actor_type,actor_ref,event_type,event_summary'),('public.concierge_audit_events','account_id,actor_type,actor_ref,property_id,stay_id,action_type,entity_type,entity_id,result,reason_code')]:
        grants.append({'kind':'INSERT','object':relation,'columns':cols.split(','),'role':WRITER})
    for f in specs.values():acl+=f"\nalter function {f['signature']} owner to {f['owner']};"
    acl+='\nrevoke all on all functions in schema '+SCHEMA+' from public,anon,authenticated,service_role,'+','.join(LOGINS)+';\n'
    acl+='revoke all on all tables in schema '+SCHEMA+' from public,anon,authenticated,service_role,'+','.join(LOGINS)+';\n'
    acl+='grant usage on schema '+SCHEMA+' to '+','.join(roles[:-1])+';\n'
    for role in [SCOPE,WRITER]:acl+=f'grant usage on schema concierge_runtime_qa_v2,public to {role};\n'
    acl+=f'grant usage on schema auth to {SCOPE};\n'
    for g in grants:
        if g['kind']=='EXECUTE':acl+=f"grant execute on function {g['object']} to {g['role']};\n"
        else:acl+=f"grant {g['kind'].lower()}({','.join(g['columns'])}) on {g['object']} to {g['role']};\n"
    policies=[]
    for relation in tablecols:
        if relation.endswith('authority_clock_v2'):
            for role,commands in [(SCOPE,['SELECT']),(REVISION,['SELECT','UPDATE'])]:
                for command in commands:
                    predicate="singleton and project_ref='tjdgrzzeuuihhqnzvaox'"
                    policies.append({'table':relation,'role':role,'command':command,'predicate':predicate})
        else:
            ref='provider_binding_ref' if relation.endswith('admission_v2') else 'null::uuid'
            # Existing effect tables lack provider_ref; protected source must
            # resolve their user/intent binding. Until then deny, never TRUE.
            predicate=f'{SCHEMA}.row_visible_v2(user_id,intent_id,{ref})'
            for role,commands in [(READER,['SELECT']),(WRITER,['SELECT','INSERT']+(['UPDATE'] if not relation.endswith('intent_binding') else []))]:
                for command in commands:policies.append({'table':relation,'role':role,'command':command,'predicate':predicate})
    for role,mapping in [(SCOPE,scope_columns),(WRITER,writer_columns)]:
        for relation in mapping:
            cols=mapping[relation].split(',');ids=[c for c in cols if c=='id' or c.endswith('_id')]
            array='array['+','.join(ids)+']::uuid[]'
            policies.append({'table':relation,'role':role,'command':'SELECT','predicate':f"{SCHEMA}.source_row_visible_v2('{relation}',{array})"})
    # Business INVOKER needs command-specific RLS as well as its column ACL.
    # These predicates stay false until protected source scope is accredited.
    for relation,command,ids in [
      ('public.concierge_incidents','UPDATE',['id','account_id','property_id','stay_id']),
      ('public.concierge_incident_events','INSERT',['account_id','incident_id']),
      ('public.concierge_audit_events','INSERT',['account_id','property_id','stay_id'])]:
        policies.append({'table':relation,'role':WRITER,'command':command,'predicate':f"{SCHEMA}.source_row_visible_v2('{relation}',array[{','.join(ids)}]::uuid[])"})
    for i,p in enumerate(policies):
        name='incident_review_'+str(i)+'_v2'
        if p['table'].startswith(SCHEMA+'.'):acl+=f"alter table {p['table']} enable row level security;\nalter table {p['table']} force row level security;\n"
        clause='with check' if p['command']=='INSERT' else 'using'
        acl+=f"create policy {name} on {p['table']} for {p['command'].lower()} to {p['role']} {clause}({p['predicate']})"
        if p['command']=='UPDATE':acl+=f" with check({p['predicate']})"
        acl+=';\n'
    for role in [WRITER,READER]:execute(specs['row_visible_v2']['signature'],role)
    for role in [SCOPE,WRITER]:execute(specs['source_row_visible_v2']['signature'],role)
    # Policy helper EXECUTE is owner-only; never granted to a LOGIN.
    for g in grants:
        if g['kind']=='EXECUTE' and ('row_visible_v2' in g['object']):acl+=f"grant execute on function {g['object']} to {g['role']};\n"
    hooks=json.loads((ROOT/'HOOK-MATRIX.json').read_text())
    # Rebuilding ACL must not append the same derived metadata hooks twice.
    hooks['hooks']=[h for h in hooks['hooks'] if h.get('mode')!='FENCE_ONLY_NO_AUTHORITY_INCREMENT']
    for name in ['intent_binding','attempt_binding','admission_v2']:
        table=SCHEMA+'.'+name
        acl+=f'create trigger incident_metadata_fence_v2 before insert or update or delete or truncate on {table} for each statement execute function {SCHEMA}.revision_before_v2();\n'
        hooks['hooks'].append({'table':table,'name':'incident_metadata_fence_v2','function':'revision_before_v2','tgtype':62,'mode':'FENCE_ONLY_NO_AUTHORITY_INCREMENT'})
    write('04-acl-rls-DO-NOT-APPLY.sql',acl)
    (ROOT/'HOOK-MATRIX.json').write_text(json.dumps(hooks,indent=2)+'\n')
    manifest={'roles':[{'name':r,'login':r in LOGINS,'inherit':False,'superuser':False,'bypassRls':False,'memberships':[],'setRoles':[]} for r in roles],
      'entries':{r:[specs[n]['signature'] for n in names] for r,names in LOGINS.items()},
      'functions':[{k:v for k,v in f.items() if k!='body'}|{'calls':calls[f['name']]} for f in specs.values()],
      'grants':grants,'policies':policies,'tableColumns':tablecols,'externalNativeDependencies':external,
      'captureRequiredFor':['actual owners and function body hashes','default ACL/PUBLIC and role membership SET/INHERIT closure','all transitive functions/operators/casts/policies/triggers','RLS source context and independent provider/original/floor custody'],
      'nativeObserved':False,'effectiveMinimumPrivilegeAccredited':False,'rlsSourceContextImplemented':False,'effectTableProviderScopeProjectionImplemented':False,'operationalApproval':False}
    (ROOT/'EXPECTED-CATALOG.json').write_text(json.dumps(manifest,indent=2)+'\n')

if __name__=='__main__':main()
