"""Narrow source-contract checks; never reports PostgreSQL compilation/runtime."""
import re
from review import segments

def body(sql,name):
    for st in segments(sql):
        if re.match(r'create\s+(?:or\s+replace\s+)?function\s+concierge_invite_private\.'+re.escape(name)+r'\s*\(',st['clean'],re.I):
            return st['clean']
    raise ValueError('FUNCTION_NOT_FOUND:'+name)

def findings(admission,reader,legacy):
    out=[]
    cap=body(admission,'capture_first_property_review_v1')
    read=body(reader,'read_property_capture_v2')
    check=body(legacy,'check_private_mutation_authority_v1')
    if not re.search(r'\(o\.request_id,o\.attempt_id,o\.session_id,o\.session_revision\)\s+is distinct from\s+\(old\.request_id,old\.first_attempt_id,old\.historical_session,old\.historical_session_revision\)',cap):
        out.append('KNOWN_HISTORICAL_BINDING_NOT_EXPLICIT')
    known=cap.split("'admission','KNOWN'",1)[0]
    if 'if after_cut is distinct from c then' not in known:
        out.append('KNOWN_CURRENT_CUT_NOT_RECHECKED')
    floor=read.find('perform concierge_invite_private.bootstrap_require_independent_floor_v1(c);')
    metadata=read.find('m:=concierge_invite_private.property_original_metadata_v1(')
    if floor<0 or metadata<0 or floor>metadata:
        out.append('METADATA_BEFORE_INDEPENDENT_FLOOR')
    if re.search(r'language plpgsql stable\b',check,re.I):
        out.append('CURRENT_AUTH_CHECK_STABLE_SNAPSHOT')
    if len(re.findall(r'from concierge_invite_private\.private_mutation_authority_v1\s*\(',check))!=1:
        out.append('AUTHORITY_CARDINALITY_AND_VALUE_FROM_DIFFERENT_CALLS')
    return out
