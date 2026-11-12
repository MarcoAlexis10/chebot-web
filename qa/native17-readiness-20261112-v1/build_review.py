"""Deterministic text successor of seven pinned review SQLs. NEVER runs SQL."""
from pathlib import Path
import hashlib
import json
import re

ROOT=Path(__file__).resolve().parent
OLD=ROOT.parent/'incident-native17-review-20261111-v1'
MANIFEST=ROOT.parent/'reviews/incident-native17-review-20261111/PACKAGE-MANIFEST.json'
SCHEMA='concierge_incident_private_v1'
def replace(s,a,b,n=1):
    assert s.count(a)==n,(a,s.count(a),n)
    return s.replace(a,b)
def functions(s):
    pat=r'create(?: or replace)? function\s+('+SCHEMA+r'\.\w+)\(([^)]*)\)(.*?)(\$[A-Za-z_]*\$)(.*?)\4\s*;'
    return list(re.finditer(pat,s,re.S|re.I))

def main():
    source=json.loads(MANIFEST.read_text())
    for f in source['packageFiles']:
        assert hashlib.sha256((OLD.parent.parent/f['path']).read_bytes()).hexdigest()==f['sha256'],f['path']
    files={p.name:p.read_text() for p in sorted(OLD.glob('*.sql'))};assert len(files)==7
    base=files['00-source-base-DO-NOT-APPLY.sql']
    # No UPDATE privilege added to immutable intent history. Global fence is
    # mandatory in the entries. SQL-native fence coverage is STILL unproved.
    base=base.replace('where user_id=p_user and intent_id=p_intent for update;','where user_id=p_user and intent_id=p_intent;')
    base=replace(base,'user_id uuid not null,intent_id uuid not null,original_ref uuid not null,','user_id uuid not null,intent_id uuid not null,original_ref uuid not null,provider_binding_ref uuid not null,')
    base=replace(base,'dispatch_id uuid not null unique,original_ref uuid not null,','dispatch_id uuid not null unique,original_ref uuid not null,provider_binding_ref uuid not null,')
    base=replace(base,'unique(user_id,intent_id,original_ref)\n','unique(user_id,intent_id,original_ref),unique(user_id,intent_id,original_ref,provider_binding_ref)\n')
    base=replace(base,'references concierge_incident_private_v1.intent_binding(user_id,intent_id,original_ref)\n','references concierge_incident_private_v1.intent_binding(user_id,intent_id,original_ref),\n foreign key(user_id,intent_id,original_ref,provider_binding_ref) references concierge_incident_private_v1.intent_binding(user_id,intent_id,original_ref,provider_binding_ref)\n')
    # Old unbound ABIs remain explicit denials, never silently adapting a ref.
    for tag in ['writer','reader']:
        pattern=r'(as \$'+tag+r'\$).*?(\$'+tag+r'\$;)'
        base,n=re.subn(pattern,r"\1\nbegin raise insufficient_privilege using message='LEGACY_UNBOUND_ENTRY_HELD';end \2",base,flags=re.S);assert n==1
    base=re.sub(r'grant execute on function concierge_incident_private_v1\.(?:change_state_v1|read_effect_v1)\([^;]+;\n','',base)
    files['00-source-base-DO-NOT-APPLY.sql']=base

    s=files['02-admission-DO-NOT-APPLY.sql']
    s=replace(s,"primary key(user_id,intent_id),unique(user_id,attempt_id)\n","primary key(user_id,intent_id),unique(user_id,attempt_id),\n unique(user_id,intent_id,original_ref,provider_binding_ref)\n")
    marker='alter table concierge_incident_private_v1.admission_v2 owner'
    s=replace(s,marker,"alter table concierge_incident_private_v1.intent_binding add constraint intent_admission_provider_fk\n foreign key(user_id,intent_id,original_ref,provider_binding_ref) references concierge_incident_private_v1.admission_v2(user_id,intent_id,original_ref,provider_binding_ref);\n"+marker)
    s=replace(s,'o uuid;sc jsonb;rev record;','o uuid;sc jsonb;rev record;original_ jsonb;')
    a="if o is null then raise insufficient_privilege using message='ORIGINAL_REFERENCE_UNAVAILABLE';end if;"
    b=a+"""
 original_:=concierge_incident_private_v1.original_intent_v1(p_user,p_intent,o);
 if original_ is null or jsonb_typeof(original_) is distinct from 'object'
 or (select count(*) from jsonb_object_keys(original_))<>9
 or not(original_ ?& array['originalRef','userId','intentId','operation','accountId','memberId','propertyId','stayId','arguments'])
 or (original_->>'originalRef',original_->>'userId',original_->>'intentId',original_->>'operation')
 is distinct from (o::text,p_user::text,p_intent::text,'concierge_manager_set_incident_state'::text)
 or (original_->>'accountId',original_->>'memberId',original_->>'propertyId',original_->>'stayId')
 is distinct from (sc->'rows'->0->>'accountId',sc->'rows'->0->>'memberId',sc->'rows'->0->>'propertyId',sc->'rows'->0->>'stayId')
 or jsonb_typeof(original_->'arguments') is distinct from 'object'
 or (original_->'arguments'->>'p_incident_id',original_->'arguments'->>'p_account_member_id')
 is distinct from (p_incident::text,sc->'rows'->0->>'memberId')
 then raise insufficient_privilege using message='ADMISSION_ORIGINAL_SCOPE_UNKNOWN';end if;
"""
    s=replace(s,a,b)
    s=replace(s,"if found then return to_jsonb(prior)||jsonb_build_object('state','KNOWN');end if;","""if found then
  if prior.original_ref is distinct from o then raise insufficient_privilege using message='KNOWN_ORIGINAL_CONTRADICTORY_UNKNOWN';end if;
  -- Return original metadata only; never promote KNOWN to NEW/dispatch.
  return to_jsonb(prior)||jsonb_build_object('state','KNOWN');
 end if;""")
    files['02-admission-DO-NOT-APPLY.sql']=s

    s=files['03-bound-entries-DO-NOT-APPLY.sql']
    s=replace(s,'where user_id=p_user and intent_id=p_intent for update;','where user_id=p_user and intent_id=p_intent;')
    s=replace(s,'insert into concierge_incident_private_v1.intent_binding values(p_user,p_intent,p_original,p_account,p_member,p_property,p_stay,p_incident);','insert into concierge_incident_private_v1.intent_binding values(p_user,p_intent,p_original,p_provider_binding,p_account,p_member,p_property,p_stay,p_incident);')
    s=replace(s,"p_dispatch,p_original,rev.recovery_epoch,'DISPATCH_CLAIMED',null);","p_dispatch,p_original,p_provider_binding,rev.recovery_epoch,'DISPATCH_CLAIMED',null);")
    s=replace(s,'if a.attempt_id is distinct from p_attempt','if a.provider_binding_ref is distinct from p_provider_binding or b.provider_binding_ref is distinct from p_provider_binding or a.attempt_id is distinct from p_attempt')
    final=' perform concierge_incident_private_v1.assert_provider_v2(p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,p_original,p_authority,rev.restriction_revision,p_provider_binding,p_floor);\n'
    s=replace(s,' -- This row/result is not a receipt',final+' -- This row/result is not a receipt')
    s=replace(s," return jsonb_build_object('state','EFFECT_OBSERVED'",final+" return jsonb_build_object('state','EFFECT_OBSERVED'")
    files['03-bound-entries-DO-NOT-APPLY.sql']=s

    s=files['04-acl-rls-DO-NOT-APPLY.sql']
    s=s.replace('row_visible_v2(user_id,intent_id,null::uuid)','row_visible_v2(user_id,intent_id,provider_binding_ref)')
    s=re.sub(r'(create policy \w+ on [\w.]+) for ',r'\1 as restrictive for ',s)
    source_tables=sorted(set(re.findall(r'create policy \w+ on ((?:public|auth)\.\w+)',s)))
    enforcement='\n'.join(f'alter table {t} enable row level security;\nalter table {t} force row level security;' for t in source_tables)+'\n'
    s=replace(s,'create policy incident_review_0_v2',enforcement+'create policy incident_review_0_v2')
    for table in ['intent_binding','attempt_binding']:
        s=re.sub(r'(grant (?:select|insert)\()([^)]*)(\) on concierge_incident_private_v1\.'+table+r' to )',lambda m:m[1]+m[2]+',provider_binding_ref'+m[3],s)
    files['04-acl-rls-DO-NOT-APPLY.sql']=s

    s=files['05-catalog-capture-NOT-RUN.sql']
    s=replace(s,"r.rolname in('cheveni_incident_scope_backend_v1','cheveni_incident_writer_backend_v1','cheveni_incident_readback_backend_v1')","r.rolname like 'cheveni_incident_%'")
    extra="""
-- Owner and namespace privileges are not implied by a function EXECUTE grant.
select r.rolname,n.nspname,owner_.rolname as schema_owner,n.nspacl,
 has_schema_privilege(r.oid,n.oid,'USAGE') as can_use,
 has_schema_privilege(r.oid,n.oid,'CREATE') as can_create
 from pg_roles r cross join pg_namespace n join pg_roles owner_ on owner_.oid=n.nspowner
 where r.rolname like 'cheveni_incident_%' and n.nspname in('auth','public','concierge_runtime_qa_v2','concierge_incident_private_v1');
select r.rolname,c.oid::regclass::text,
 has_table_privilege(r.oid,c.oid,'DELETE') as can_delete,
 has_table_privilege(r.oid,c.oid,'TRUNCATE') as can_truncate,
 has_table_privilege(r.oid,c.oid,'TRIGGER') as can_trigger,
 has_table_privilege(r.oid,c.oid,'REFERENCES') as can_reference
 from pg_roles r cross join pg_class c join pg_namespace n on n.oid=c.relnamespace
 where r.rolname like 'cheveni_incident_%' and c.relkind in('r','p') and n.nspname in('auth','public','concierge_incident_private_v1');
"""
    files['05-catalog-capture-NOT-RUN.sql']=replace(s,'rollback;',extra+'rollback;')
    # Revoke PUBLIC at each review segment that defines functions; this does not
    # make separate files/installations authorized or resolve DDL transient ACL.
    for name,s in files.items():
        if functions(s):s=replace(s,'rollback;','revoke all on all functions in schema '+SCHEMA+' from public;\nrollback;')
        files[name]=s
    out=ROOT/'sql';out.mkdir(exist_ok=True)
    for name,s in files.items():
        assert s.index('raise exception')<min([s.find(k) for k in ['create ','select current_user'] if s.find(k)>=0]or[len(s)])
        (out/name).write_text(s)

    catalog=json.loads((OLD/'EXPECTED-CATALOG.json').read_text())
    definitions={m[1].split('.')[-1]:m for s in files.values() for m in functions(s)}
    for f in catalog['functions']:f['bodySha256']=hashlib.sha256(definitions[f['name']][5].encode()).hexdigest()
    for g in catalog['grants']:
        if g['kind'] in ['SELECT','INSERT'] and g['object'] in [SCHEMA+'.intent_binding',SCHEMA+'.attempt_binding']:g['columns'].append('provider_binding_ref')
    for name in ['intent_binding','attempt_binding']:
        cols=catalog['tableColumns'][SCHEMA+'.'+name]
        cols.insert(cols.index('original_ref')+1,'provider_binding_ref')
    for p in catalog['policies']:
        p['mode']='RESTRICTIVE'
        p['predicate']=p['predicate'].replace('row_visible_v2(user_id,intent_id,null::uuid)','row_visible_v2(user_id,intent_id,provider_binding_ref)')
    # New admission calls original_intent; effective caller remains writer.
    byname={f['name']:f for f in catalog['functions']}
    byname['admit_v2']['calls']=sorted(set(byname['admit_v2']['calls']+['original_intent_v1']))
    for name in ['change_state_v1','read_effect_v1']:byname[name]['calls']=[]
    for name in ['change_state_bound_v2','read_effect_bound_v2']:byname[name]['calls']=sorted(set(byname[name]['calls']+['assert_provider_v2']))
    catalog['effectTableProviderScopeProjectionImplemented']=True
    catalog['projectionScope']='REVIEW_TEXT_ONLY_NOT_INSTALLED; source/provider bridges still closed'
    catalog['permissivePolicyBaselineAccredited']=False
    catalog['allProposedPoliciesRestrictive']=True
    (ROOT/'EXPECTED-CATALOG.json').write_text(json.dumps(catalog,indent=2)+'\n')
    provider=(OLD/'provider-binding.mjs').read_text()
    provider=replace(provider,"verifiedIdentity(e.proof,token,time.now());\n    const q=", "verifiedIdentity(e.proof,token,time.now());if(ticket.response.expiresAtMs<=time.now())fail();\n    const q=")
    (ROOT/'provider-binding.mjs').write_text(provider)
    (ROOT/'provider-binding.d.mts').write_text((OLD/'provider-binding.d.mts').read_text())
    report={'sourceHead':'4d4467042560a56ac7af0633e7c93064d2fad2b0','sourcePackageFilesVerified':len(source['packageFiles']),
       'sqlArtifacts':[{'path':'sql/'+n,'sourceSha256':hashlib.sha256((OLD/n).read_bytes()).hexdigest(),'sha256':hashlib.sha256(s.encode()).hexdigest()} for n,s in files.items()],
       'notInstaller':True,'sqlExecuted':False,'nativeAuthorization':False,'betaDecision':'NO-GO'}
    (ROOT/'DERIVATION.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'generatedSql':7,'sourceFilesVerified':len(source['packageFiles']),'sqlExecuted':False}))

if __name__=='__main__':main()
