#!/usr/bin/env python3
"""Bounded subset inventory. No SQL parser, execution or install generation.

This deliberately separates composite TYPE names from FUNCTION definitions:
a type named property_original_metadata_v1 does not implement its resolver.
Comments cannot satisfy a declaration. Missing/unknown remains HELD.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
QUALIFIED = r'(?:concierge_invite_private|public|auth)\.[a-z_][a-z_0-9]*'

def without_comments(sql):
    # Supported artifacts contain no nested comments. Reject rather than
    # misclassify any future unsupported block comment or quoted identifier.
    if '/*' in sql or re.search(r'\b(?:create|alter)\s+(?:table|type|function)\s+"', sql, re.I):
        raise ValueError('UNSUPPORTED_SQL_INVENTORY_SHAPE')
    return re.sub(r'--[^\n]*', '', sql)

def inventory(files):
    definitions, uses = [], {}
    for path, raw in sorted(files.items()):
        if len(raw) > 1048576:
            raise ValueError('ARTIFACT_SIZE_LIMIT')
        sql = without_comments(raw)
        for kind, name in re.findall(r'\bcreate\s+(?:or\s+replace\s+)?(table|type|function)\s+('+QUALIFIED+r')', sql, re.I):
            definitions.append(dict(kind=kind.lower(), name=name.lower(), source=path))
        for name, args in re.findall(r'\bcreate\s+(?:or\s+replace\s+)?function\s+('+QUALIFIED+r')\s*\(([^()]*)\)\s*returns', sql, re.I):
            entry = next(x for x in definitions if x['kind']=='function' and x['name']==name.lower() and x['source']==path)
            parameters = [a.strip().split() for a in args.split(',') if a.strip()]
            if any(len(a)!=2 for a in parameters):
                raise ValueError('UNSUPPORTED_PARAMETER_SHAPE')
            entry['parameters'] = parameters
        uses[path] = sorted(set(re.findall(QUALIFIED, sql)))
    return dict(definitions=definitions, qualifiedReferences=uses)

def review(files, profile):
    result = inventory(files)
    defined_functions = {x['name'] for x in result['definitions'] if x['kind']=='function'}
    missing = []
    for port in profile['requiredMissingPorts']:
        name = 'concierge_invite_private.' + port['name'].split('(')[0]
        if name not in defined_functions:
            missing.append(dict(name=port['name'], status=port['status'], requirements=port['requirements']))
    text = '\n'.join(without_comments(s) for s in files.values())
    return dict(classification='STATIC_SUBSET_INVENTORY_NOT_SQL_COMPILATION', state='HELD',
                sqlExecuted=False, installationAuthorized=False,
                definitions=result['definitions'], qualifiedReferences=result['qualifiedReferences'],
                unresolvedProtectedFunctions=missing,
                closure=dict(schemaUsageGrantsEmitted=bool(re.search(r'grant\s+usage\s+on\s+schema',text,re.I)),
                             typeUsageGrantsEmitted=bool(re.search(r'grant\s+usage\s+on\s+type',text,re.I)),
                             dependencyExecuteGrantsEmitted=bool(re.search(r'grant\s+execute',text,re.I))),
                note='Declared names/columns/grants are not effective catalog privileges. No installer emitted.')

def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--profile',type=Path,default=ROOT.parent/'protected-property-engineering-20261116-v1/PORTS-AND-ROLES.json')
    args=p.parse_args(argv)
    files={f.name:f.read_text() for f in sorted((ROOT/'sql').glob('*.sql'))}
    return review(files,json.loads(args.profile.read_text()))

if __name__=='__main__':
    print(json.dumps(main(),indent=2))
