"""Static cross-file/decision validation. Not a SQL parser or executor."""
from pathlib import Path
import ast
import hashlib
import json
import re

ROOT=Path(__file__).resolve().parent
def check():
    derivation=json.loads((ROOT/'DERIVATION.json').read_text())
    catalog=json.loads((ROOT/'EXPECTED-CATALOG.json').read_text())
    plan=json.loads((ROOT/'NATIVE-PLAN.json').read_text())
    deps=json.loads((ROOT/'DEPENDENCIES.json').read_text())
    assert len(derivation['sqlArtifacts'])==7
    definitions={};owners={};grants=set();table_columns={};bodies={};definers={};execute=set();signatures={}
    for f in derivation['sqlArtifacts']:
        s=(ROOT/f['path']).read_text()
        assert hashlib.sha256(s.encode()).hexdigest()==f['sha256'],f['path']
        assert s.index('raise exception')<min([s.find(k) for k in ['create ','select current_user'] if s.find(k)>=0]or[len(s)])
        assert s.strip().endswith('rollback;')
        for m in re.finditer(r'create(?: or replace)? function\s+concierge_incident_private_v1\.(\w+)\(([^)]*)\)(.*?)(\$[A-Za-z_]*\$)(.*?)\4\s*;',s,re.I|re.S):
            definitions[m[1]]=hashlib.sha256(m[5].encode()).hexdigest()
            bodies[m[1]]=m[5];definers[m[1]]=bool(re.search(r'security\s+definer',m[3],re.I))
            argtypes=[a.strip().split(None,1)[1] for a in m[2].split(',')] if m[2].strip() else []
            signatures[m[1]]='concierge_incident_private_v1.'+m[1]+'('+','.join(argtypes)+')'
        for m in re.finditer(r'alter function (concierge_incident_private_v1\.\w+\([^)]*\)) owner to (\w+);',s):owners[m[1]]=m[2]
        for m in re.finditer(r'grant (select|insert|update)\(([^)]*)\) on ([\w.]+) to (\w+);',s):
            grants.add((m[1].upper(),m[3],m[4],frozenset(m[2].split(','))))
        for m in re.finditer(r'grant execute on function ([\w.]+\([^)]*\)) to (\w+);',s):execute.add((m[1],m[2]))
        for m in re.finditer(r'create table (concierge_incident_private_v1\.\w+)\((.*?)\n\);',s,re.S):
            table_columns[m[1]]=re.findall(r'\b(\w+)\s+(?:uuid|bigint|boolean|text)\b',m[2])
    assert len(definitions)==len(catalog['functions'])==33
    for f in catalog['functions']:
        assert definitions[f['name']]==f['bodySha256'],f['name']
        assert signatures[f['name']]==f['signature'],(f['name'],'argument ABI differs')
        assert owners[f['signature']]==f['owner'],f['name']
        assert definers[f['name']]==f['securityDefiner'],f['name']
        actual_calls=sorted(set(re.findall(r'concierge_incident_private_v1\.(\w+)\s*\(',bodies[f['name']])))
        assert actual_calls==f['calls'],(f['name'],actual_calls,f['calls'])
    expected={(g['kind'],g['object'],g['role'],frozenset(g['columns'])) for g in catalog['grants'] if g['kind']!='EXECUTE'}
    assert grants==expected,{'missing':list(expected-grants),'extra':list(grants-expected)}
    assert execute=={(g['object'],g['role']) for g in catalog['grants'] if g['kind']=='EXECUTE'},'EXECUTE text/manifest mismatch'
    byname={f['name']:f for f in catalog['functions']};bysig={f['signature']:f for f in catalog['functions']};visited=set()
    def traverse(name,caller):
        if (name,caller) in visited:return
        visited.add((name,caller));f=byname[name]
        assert caller==f['owner'] or (f['signature'],caller) in execute,(name,caller,'missing EXECUTE')
        effective=f['owner'] if definers[name] else caller
        for called in f['calls']:traverse(called,effective)
    for login,entries in catalog['entries'].items():
        for entry in entries:traverse(bysig[entry]['name'],login)
    assert table_columns==catalog['tableColumns'],'column order/projection differs from DDL'
    assert len(catalog['roles'])==8 and sum(r['login'] for r in catalog['roles'])==3
    assert len([s for entries in catalog['entries'].values() for s in entries])==5
    assert not catalog['nativeObserved'] and not catalog['effectiveMinimumPrivilegeAccredited']
    ids={d['id'] for d in deps['dependencies']};assert ids=={'D'+str(i) for i in range(1,9)}
    assert all(not d['operationallyAccredited'] and (ROOT/d['artifact']).is_file() for d in deps['dependencies'])
    assert [c['id'] for c in plan['cases']]==['N'+str(i).zfill(2) for i in range(1,13)]
    fields=['artifacts','dependencies','actors','preconditions','expected','evidence','abort','costAndIsolation','doesNotDemonstrate']
    for c in plan['cases']:
        assert all(k in c for k in fields) and all(c[k] for k in fields if k!='dependencies'),c['id']
        assert set(c['dependencies'])<=ids and set(c['actors'])<=plan['actors'].keys()
        assert all((ROOT/a).is_file() for a in c['artifacts'])
        assert c['result']=='NOT_RUN' and c['authorization'] is False
        assert c['authClass']=='SYNTHETIC_AUTH_ONLY' and c['costAndIsolation']['newSpendAllowed'] is False
    assert plan['executableMaterializationSha'] is None
    assert plan['host']=='HOST_NOT_AVAILABLE' and plan['state']=='NOT_AUTHORIZED_NOT_RUN'
    assert plan['managedProviderTests']['networkAllowed'] is False
    for f in ROOT.glob('*.py'):ast.parse(f.read_text(),filename=str(f))
    return {'classification':'STATIC_ONLY','sqlHashesVerified':7,'functionBodiesOwnersVerified':33,'roles':8,'entries':5,
      'columnGrantRowsVerified':len(grants),'executeGrantsVerified':len(execute),'effectiveCallContextsChecked':len(visited),
      'tableColumnsAndOrderVerified':len(table_columns),'plannedCasesSchemaVerified':12,
      'dependencyContractsVerified':8,'nativeCasesExecuted':0,'sqlParsedOrExecuted':False,'hostAccredited':False,'nativeAuthorization':False,'betaDecision':'NO-GO'}

if __name__=='__main__':print(json.dumps(check(),indent=2))
