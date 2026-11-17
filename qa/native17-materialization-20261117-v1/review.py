#!/usr/bin/env python3
"""Offline review only: SQL lexical segmentation, pinned graph and held report.

This is NOT a PostgreSQL grammar parser, compiler, executor or installer.
No network/process/database imports; output cannot authorize a mutation.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parent
NAME=r'[a-z_][a-z_0-9]*(?:\.[a-z_][a-z_0-9]*)?'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def segments(sql):
    """Bounded PostgreSQL-like lexical subset; reject unsupported escape strings.

    Semicolons inside dollar bodies, standard strings and quoted identifiers are
    not statement separators. Nested block comments are handled. No SQL validity
    is inferred. Offsets are Python character positions, not UTF8 byte offsets.
    """
    if len(sql.encode('utf8'))>1048576 or '\0' in sql:
        raise ValueError('SQL_INPUT_BOUND')
    out=[];start=0;i=0;clean=[]
    while i<len(sql):
        if sql.startswith('--',i):
            end=sql.find('\n',i);end=len(sql) if end<0 else end
            clean.append(' '*(end-i));i=end;continue
        if sql.startswith('/*',i):
            begin=i;depth=1;i+=2
            while i<len(sql) and depth:
                if sql.startswith('/*',i):depth+=1;i+=2
                elif sql.startswith('*/',i):depth-=1;i+=2
                else:i+=1
            if depth:raise ValueError('UNTERMINATED_COMMENT')
            clean.append(' '*(i-begin));continue
        quote=sql[i] if sql[i] in "'\"" else None
        if quote:
            if quote=="'" and i and sql[i-1] in 'Ee' and (i<2 or not re.match(r'[\w$]',sql[i-2])):
                raise ValueError('ESCAPE_STRING_UNSUPPORTED')
            begin=i;i+=1
            while i<len(sql):
                if sql[i]==quote:
                    i+=1
                    if i<len(sql) and sql[i]==quote:i+=1;continue
                    break
                i+=1
            else:raise ValueError('UNTERMINATED_QUOTE')
            clean.append(sql[begin:i]);continue
        tag=re.match(r'\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$',sql[i:]) if sql[i]=='$' else None
        if tag:
            token=tag.group();end=sql.find(token,i+len(token))
            if end<0:raise ValueError('UNTERMINATED_DOLLAR_BODY')
            end+=len(token);clean.append(sql[i:end]);i=end;continue
        clean.append(sql[i]);i+=1
        if sql[i-1]==';':
            out.append(dict(start=start,end=i,raw=sql[start:i],clean=''.join(clean).strip()))
            start=i;clean=[]
    if ''.join(clean).strip():raise ValueError('UNTERMINATED_STATEMENT')
    return out

def kind(statement):
    s=statement['clean']
    for pattern,label in [
        (r'begin\s*;','transaction'),(r'rollback\s*;','transaction'),
        (r'do\s+\$','guard'),(r'create\s+role\b','roles'),
        (r'create\s+type\b','types'),(r'create\s+table\b','tables'),
        (r'create\s+(?:or\s+replace\s+)?function\b','functions'),
        (r'alter\s+(?:table|function)\b','object_changes'),
        (r'create\s+policy\b','policies'),(r'(?:grant|revoke)\b','privileges')]:
        if re.match(pattern,s,re.I):return label
    raise ValueError('UNCLASSIFIED_REVIEW_STATEMENT')

def declarations(sql):
    result=[]
    for st in segments(sql):
        m=re.match(r'create\s+(?:or\s+replace\s+)?(table|type|role|function)\s+('+NAME+r')',st['clean'],re.I)
        if not m:continue
        entry=dict(kind=m[1].lower(),name=m[2].lower())
        if entry['kind']=='function':
            args=re.match(r'\s*\(([^()]*)\)\s*returns\b',st['clean'][m.end():],re.I|re.S)
            if not args:raise ValueError('UNSUPPORTED_FUNCTION_HEADER')
            params=[x.strip().split() for x in args[1].split(',') if x.strip()]
            if any(len(x)!=2 for x in params):raise ValueError('UNSUPPORTED_PARAMETER_SHAPE')
            entry['argumentTypes']=[x[1].lower() for x in params]
        result.append(entry)
    return result

def foreign_key_closure(relations,roots):
    """Dependency graph from pinned historical evidence; never installed state."""
    by_name={r['name']:r for r in relations};visiting=set();done=set();order=[];missing=[]
    def visit(name):
        if name in done:return
        if name in visiting:raise ValueError('HISTORICAL_FK_CYCLE_REQUIRES_SEPARATE_PHASE')
        row=by_name.get(name)
        if row is None:missing.append(name);done.add(name);return
        visiting.add(name)
        for dep in sorted(row['foreignKeysRequire']):visit(dep)
        visiting.remove(name);done.add(name)
        order.append(dict(name=name,requires=row['foreignKeysRequire'],
                          sourceEvidence=row['createTableEvidence'],
                          nativeObjectPresent=None,sourceDdlKnown=bool(row['createTableEvidence'])))
    for root in roots:visit(root)
    return dict(order=order,missingIndexNodes=sorted(set(missing)),nativeVerified=False)

def check_guards(sql):
    stmts=segments(sql)
    if len(stmts)<3 or stmts[0]['clean'].lower()!='begin;' or kind(stmts[1])!='guard':
        raise ValueError('MISSING_OUTER_ABORT')
    if not re.fullmatch(r"do\s+\$\$begin\s+raise\s+exception\s+'[A-Z0-9_]+';\s*end\$\$;",stmts[1]['clean'],re.I):
        raise ValueError('UNREVIEWED_OUTER_ABORT')
    if stmts[-1]['clean'].lower()!='rollback;':raise ValueError('MISSING_ROLLBACK')
    for st in stmts:kind(st)
    return stmts

def assess(root=ROOT):
    manifest=json.loads((root/'SOURCE-LOCK.json').read_text())
    for item in manifest['packageInputs']:
        path=root/item['path']
        if path.is_symlink() or any(p.is_symlink() for p in path.parents):
            raise ValueError('INPUT_SYMLINK')
        data=path.read_bytes()
        if digest(data)!=item['sha256']:raise ValueError('INPUT_HASH_MISMATCH:'+item['path'])
    trace=json.loads((root/'PORT-TRACE.json').read_text())
    files={p.name:p.read_text() for p in sorted((root/'sql').glob('*.sql'))}
    if sorted(files)!=manifest['reviewSqlFiles']:raise ValueError('SQL_FILE_SET_DRIFT')
    defs=[];statements=[]
    for name,sql in files.items():
        for st in check_guards(sql):
            statements.append(dict(file=name,startChar=st['start'],endChar=st['end'],kind=kind(st),
                                   sha256=digest(st['raw'].encode())))
        defs.extend(declarations(sql))
    functions={d['name'] for d in defs if d['kind']=='function'}
    ports=[]
    for port in trace['ports']:
        declared=port['qualifiedName'] in functions
        # A declaration or caller-edited status is never source accreditation.
        ports.append(dict(signature=port['signature'],declarationInCandidate=declared,
                          sourceAccredited=False,status='HELD',reason=port['missingSource']))
    return dict(classification='OFFLINE_LEXICAL_REVIEW_NOT_POSTGRESQL_PARSE_OR_COMPILE',
                state='STOP_BEFORE_ANY_MUTATION',executionEnabled=False,sqlExecuted=False,
                installable=False,mutationSteps=[],protectedResolved=0,protectedRequired=len(ports),
                ports=ports,objects=defs,statementInventory=statements,
                requiredEvidence=['native catalog and exact signatures/owners/ACL/RLS',
                                  'current protected sources with independent floor',
                                  'approved original custody and independent dispatch history',
                                  'separate materialization seal and exact execution authorization'],
                note='Even edited input metadata cannot turn this reviewer into an installer. SQL bodies remain guarded.')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=ROOT)
    args=parser.parse_args()
    print(json.dumps(assess(args.root),indent=2,ensure_ascii=False))

if __name__=='__main__':
    main()
