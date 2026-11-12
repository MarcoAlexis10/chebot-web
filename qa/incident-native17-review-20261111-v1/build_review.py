"""Generate retained SQL text and metadata. Never connects to or executes SQL."""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parent
OLD = ROOT.parent / 'incident-authority-closure-20261111-v1'
SCHEMA = 'concierge_incident_private_v1'
HEADER = "-- QA REVIEW ONLY / DO NOT APPLY / NOT AUTHORIZED FOR EXECUTION.\nbegin;\ndo $abort$ begin raise exception 'CHEVENI_REVIEW_DO_NOT_APPLY';end $abort$;\n"
END = '\nrollback;\n'

def write(name, text):
    (ROOT / name).write_text(HEADER + text + END)

def main():
    policy = json.loads((ROOT / 'revision-policy.json').read_text())
    revision = '''
-- No bootstrap row/default revision. Provenance and current independent floor
-- must exist before any source can admit an authority cut.
create table concierge_incident_private_v1.authority_clock_v2(
 singleton boolean primary key check(singleton),
 project_ref text not null check(project_ref='tjdgrzzeuuihhqnzvaox'),
 dataset_id text not null check(dataset_id~'^[a-f0-9]{64}$'),
 recovery_epoch bigint not null check(recovery_epoch between 1 and 9007199254740991),
 authority_revision bigint not null check(authority_revision between 1 and 9007199254740991),
 bootstrap_provenance_ref uuid not null
);
alter table concierge_incident_private_v1.authority_clock_v2 owner to cheveni_incident_data_owner_v1;
alter table concierge_incident_private_v1.authority_clock_v2 enable row level security;
alter table concierge_incident_private_v1.authority_clock_v2 force row level security;

create function concierge_incident_private_v1.review_prerequisites_v2(p_kind text) returns void
language plpgsql security invoker set search_path='' as $held$
begin
 if current_setting('transaction_isolation')<>'read committed' or current_setting('session_replication_role')<>'origin' then raise insufficient_privilege using message='INCIDENT_ISOLATION_HELD';end if;
 -- No environmental switch. Exact role/caller/catalog/launch/legal/privacy,
 -- managed revokers and independent provenance require a NEW reviewed artifact.
 raise insufficient_privilege using message='INCIDENT_V2_PROTECTED_SOURCES_NOT_ACCREDITED';
end $held$;

create function concierge_incident_private_v1.protected_floor_v2()
returns table(dataset_id text,recovery_epoch bigint,authority_revision bigint,restriction_sequence bigint,inventory_digest text,journal_id text,restriction_digest text,observed_at timestamptz,expires_at timestamptz,authority_commit_ref uuid)
language sql security invoker set search_path='' as $floor$
 select null::text,null::bigint,null::bigint,null::bigint,null::text,null::text,null::text,null::timestamptz,null::timestamptz,null::uuid where false
$floor$;

create or replace function concierge_incident_private_v1.current_revisions_v1(p_user uuid,p_session uuid,p_incident uuid)
returns table(authority_revision bigint,restriction_revision bigint,dataset_id text,recovery_epoch bigint,inventory_digest text,restriction_journal_id text,restriction_digest text)
language plpgsql security definer set search_path='' set lock_timeout='2s' as $cut$
declare s record;f record;n integer;
begin
 perform concierge_incident_private_v1.review_prerequisites_v2('REVISION_READ');
 perform pg_advisory_xact_lock(1129728581,1);
 select * into strict s from concierge_incident_private_v1.authority_clock_v2 where singleton and project_ref='tjdgrzzeuuihhqnzvaox';
 select count(*) into n from concierge_incident_private_v1.protected_floor_v2();
 if n<>1 then raise insufficient_privilege using message='INDEPENDENT_FLOOR_REQUIRED';end if;
 select * into strict f from concierge_incident_private_v1.protected_floor_v2();
 if (s.dataset_id,s.recovery_epoch,s.authority_revision) is distinct from (f.dataset_id,f.recovery_epoch,f.authority_revision)
 or f.authority_commit_ref is null or f.observed_at is null or f.expires_at is null
 or f.observed_at>clock_timestamp() or f.expires_at<=clock_timestamp() or f.expires_at<=f.observed_at
 or f.expires_at-f.observed_at>interval '5 seconds'
 or f.inventory_digest is null or f.inventory_digest!~'^[a-f0-9]{64}$'
 or f.restriction_digest is null or f.restriction_digest!~'^[a-f0-9]{64}$'
 or f.journal_id is null or f.journal_id!~'^[a-z0-9_]{1,64}$'
 or f.restriction_sequence is null or f.restriction_sequence not between 1 and 9007199254740991 then raise insufficient_privilege using message='CURRENT_AUTHORITY_CUT_UNAVAILABLE';end if;
 return query select s.authority_revision,f.restriction_sequence,s.dataset_id,s.recovery_epoch,f.inventory_digest,f.journal_id,f.restriction_digest;
end $cut$;

create function concierge_incident_private_v1.revision_before_v2() returns trigger
language plpgsql security definer set search_path='' as $before$
begin
 perform concierge_incident_private_v1.review_prerequisites_v2('REVOCATION_FENCE');
 perform pg_advisory_xact_lock(1129728581,1);return null;
end $before$;

create function concierge_incident_private_v1.revision_step_v2() returns void
language plpgsql security definer set search_path='' as $step$
declare n integer;
begin
 perform concierge_incident_private_v1.review_prerequisites_v2('REVISION_ADVANCE');
 -- BEFORE STATEMENT fence must already be attested before a business row lock.
 update concierge_incident_private_v1.authority_clock_v2 c set authority_revision=c.authority_revision+1
 where singleton and project_ref='tjdgrzzeuuihhqnzvaox' and c.authority_revision<9007199254740991;
 get diagnostics n=row_count;if n<>1 then raise exception 'AUTHORITY_CLOCK_UNINITIALIZED_OR_EXHAUSTED';end if;
 -- A native commit does not advance an independent witness automatically.
 -- Until witness observes this exact revision, reads/admissions stay held.
end $step$;

create function concierge_incident_private_v1.revision_changed_v2() returns trigger
language plpgsql security definer set search_path='' as $changed$
begin perform concierge_incident_private_v1.revision_step_v2();return null;end $changed$;
'''
    hooks = []
    for table, columns in policy.items():
        slug = table.replace('.', '_')
        before = 'incident_revision_before_v2'
        changed = 'incident_revision_changed_v2'
        updated = 'incident_revision_update_v2'
        fn = f'revision_update_{slug}_v2'
        predicate = 'true' if columns is None else ('exists((select ' + ','.join(columns) + ' from old_rows except select ' + ','.join(columns) + ' from new_rows) union all (select ' + ','.join(columns) + ' from new_rows except select ' + ','.join(columns) + ' from old_rows))')
        revision += f"\ncreate function {SCHEMA}.{fn}() returns trigger language plpgsql security definer set search_path='' as $update$ begin if {predicate} then perform {SCHEMA}.revision_step_v2();end if;return null;end $update$;\n"
        revision += f'create trigger {before} before insert or update or delete or truncate on {table} for each statement execute function {SCHEMA}.revision_before_v2();\n'
        revision += f'create trigger {changed} after insert or delete or truncate on {table} for each statement execute function {SCHEMA}.revision_changed_v2();\n'
        revision += f'create trigger {updated} after update on {table} referencing old table as old_rows new table as new_rows for each statement execute function {SCHEMA}.{fn}();\n'
        hooks.extend([{'table': table, 'name': name, 'function': function, 'tgtype': tgtype, 'criticalColumns': columns} for name, function, tgtype in [(before,'revision_before_v2',62),(changed,'revision_changed_v2',44),(updated,fn,16)]])
    write('01-revisions-DO-NOT-APPLY.sql', revision)
    (ROOT/'HOOK-MATRIX.json').write_text(json.dumps({'hooks':hooks,'lockOrder':['shared fence 1129728581/1 before protected DML','authority clock row','admission row','intent/effect/attempt rows','business incident row'],'counterBootstrap':'NOT_IMPLEMENTED; no invented initial revision','externalWitness':'Exact committed authority revision required; no equality with restrictionSequence is assumed','nativeObserved':False},indent=2)+'\n')

    admission = '''
-- Admission is not effect history. Reserving the old intent_binding row would
-- cause the existing writer to return RECONCILIATION_REQUIRED on its first use.
create table concierge_incident_private_v1.admission_v2(
 user_id uuid not null,intent_id uuid not null,attempt_id uuid not null,dispatch_id uuid not null unique,
 session_id uuid not null,token_expires_at bigint not null,original_ref uuid not null,
 provider_binding_ref uuid not null,authority_revision bigint not null,restriction_revision bigint not null,
 state text not null check(state in('RESERVED','DISPATCH_CLAIMED')),
 primary key(user_id,intent_id),unique(user_id,attempt_id)
);
alter table concierge_incident_private_v1.admission_v2 owner to cheveni_incident_data_owner_v1;
alter table concierge_incident_private_v1.admission_v2 enable row level security;
alter table concierge_incident_private_v1.admission_v2 force row level security;

create function concierge_incident_private_v1.provider_binding_v2(p_ref uuid)
returns table(provider_binding_ref uuid,user_id uuid,session_id uuid,token_expires_at bigint,intent_id uuid,attempt_id uuid,dispatch_id uuid,original_ref uuid,authority_revision bigint,restriction_revision bigint,dataset_id text,recovery_epoch bigint,inventory_digest text,journal_id text,restriction_digest text,expires_at timestamptz)
language sql security invoker set search_path='' as $provider$
 select null::uuid,null::uuid,null::uuid,null::bigint,null::uuid,null::uuid,null::uuid,null::uuid,null::bigint,null::bigint,null::text,null::bigint,null::text,null::text,null::text,null::timestamptz where false
$provider$;

create function concierge_incident_private_v1.original_reference_v2(p_user uuid,p_intent uuid,p_binding uuid) returns uuid
language plpgsql security invoker set search_path='' as $original$
begin raise insufficient_privilege using message='ORIGINAL_PROVENANCE_PRIVACY_CUSTODY_NOT_ACCREDITED';end $original$;

create function concierge_incident_private_v1.assert_provider_v2(p_user uuid,p_session uuid,p_exp bigint,p_intent uuid,p_attempt uuid,p_dispatch uuid,p_original uuid,p_authority bigint,p_restriction bigint,p_binding uuid,p_floor jsonb) returns void
language plpgsql security invoker set search_path='' as $verify$
declare n integer;b record;
begin
 select count(*) into n from concierge_incident_private_v1.provider_binding_v2(p_binding);
 if n<>1 then raise insufficient_privilege using message='PROTECTED_PROVIDER_BINDING_MISSING';end if;
 select * into strict b from concierge_incident_private_v1.provider_binding_v2(p_binding);
 if (b.provider_binding_ref,b.user_id,b.session_id,b.token_expires_at,b.intent_id,b.attempt_id,b.dispatch_id,b.original_ref,b.authority_revision,b.restriction_revision)
 is distinct from (p_binding,p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,p_original,p_authority,p_restriction)
 or b.expires_at is null or b.expires_at<=clock_timestamp() or p_exp is null or p_exp<=extract(epoch from clock_timestamp())
 or b.dataset_id is null or b.recovery_epoch is null or b.inventory_digest is null or b.journal_id is null or b.restriction_digest is null
 or (b.dataset_id,b.recovery_epoch,b.inventory_digest,b.journal_id,b.restriction_digest) is distinct from
 (p_floor->>'datasetId',(p_floor->>'recoveryEpoch')::bigint,p_floor->>'inventoryDigest',p_floor->>'restrictionJournalId',p_floor->>'restrictionDigest')
 then raise insufficient_privilege using message='PROVIDER_BINDING_CHANGED';end if;
end $verify$;

create function concierge_incident_private_v1.assert_floor_v2(p_floor jsonb,p_user uuid,p_session uuid,p_exp bigint,p_incident uuid,p_attempt uuid,p_authority bigint) returns void
language plpgsql security invoker set search_path='' as $fullfloor$
declare sc jsonb;rev record;
begin
 sc:=concierge_incident_private_v1.current_resolution_v1(p_user,p_session,p_exp,p_incident,p_attempt)->'rows'->0;
 select * into strict rev from concierge_incident_private_v1.current_revisions_v1(p_user,p_session,p_incident);
 if p_authority is distinct from rev.authority_revision or p_floor is distinct from jsonb_build_object(
 'userId',p_user,'sessionId',p_session,'accountId',sc->>'accountId','memberId',sc->>'memberId','propertyId',sc->>'propertyId','stayId',sc->>'stayId','incidentId',p_incident,
 'authorityVersion',rev.authority_revision,'restrictionVersion',rev.restriction_revision,'datasetId',rev.dataset_id,'recoveryEpoch',rev.recovery_epoch,
 'inventoryDigest',rev.inventory_digest,'restrictionJournalId',rev.restriction_journal_id,'restrictionDigest',rev.restriction_digest)
 then raise insufficient_privilege using message='ADMISSION_FULL_FLOOR_CHANGED';end if;
end $fullfloor$;

create function concierge_incident_private_v1.admit_v2(p_user uuid,p_session uuid,p_exp bigint,p_intent uuid,p_attempt uuid,p_dispatch uuid,p_incident uuid,p_authority bigint,p_restriction bigint,p_binding uuid,p_floor jsonb)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $admit$
declare prior concierge_incident_private_v1.admission_v2%rowtype;o uuid;sc jsonb;rev record;
begin
 perform concierge_incident_private_v1.native_gate_v1('WRITE');
 perform concierge_incident_private_v1.review_prerequisites_v2('ADMISSION_PRIVACY');
 perform pg_advisory_xact_lock(1129728581,1);
 sc:=concierge_incident_private_v1.current_resolution_v1(p_user,p_session,p_exp,p_incident,p_attempt);
 select * into strict rev from concierge_incident_private_v1.current_revisions_v1(p_user,p_session,p_incident);
 if (p_authority,p_restriction) is distinct from (rev.authority_revision,rev.restriction_revision) then raise insufficient_privilege using message='ADMISSION_AUTHORITY_CHANGED';end if;
 perform concierge_incident_private_v1.assert_floor_v2(p_floor,p_user,p_session,p_exp,p_incident,p_attempt,p_authority);
 o:=concierge_incident_private_v1.original_reference_v2(p_user,p_intent,p_binding);
 if o is null then raise insufficient_privilege using message='ORIGINAL_REFERENCE_UNAVAILABLE';end if;
 perform concierge_incident_private_v1.assert_provider_v2(p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,o,p_authority,p_restriction,p_binding,p_floor);
 select * into prior from concierge_incident_private_v1.admission_v2 where user_id=p_user and intent_id=p_intent for update;
 if found then return to_jsonb(prior)||jsonb_build_object('state','KNOWN');end if;
 insert into concierge_incident_private_v1.admission_v2 values(p_user,p_intent,p_attempt,p_dispatch,p_session,p_exp,o,p_binding,p_authority,p_restriction,'RESERVED');
 return jsonb_build_object('state','NEW','original_ref',o,'provider_binding_ref',p_binding);
end $admit$;

create function concierge_incident_private_v1.claim_dispatch_v2(p_user uuid,p_session uuid,p_exp bigint,p_intent uuid,p_attempt uuid,p_dispatch uuid,p_incident uuid,p_binding uuid,p_floor jsonb)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $claim$
declare a concierge_incident_private_v1.admission_v2%rowtype;rev record;
begin
 perform concierge_incident_private_v1.native_gate_v1('WRITE');
 perform pg_advisory_xact_lock(1129728581,1);
 perform concierge_incident_private_v1.current_resolution_v1(p_user,p_session,p_exp,p_incident,p_attempt);
 select * into strict rev from concierge_incident_private_v1.current_revisions_v1(p_user,p_session,p_incident);
 perform concierge_incident_private_v1.assert_floor_v2(p_floor,p_user,p_session,p_exp,p_incident,p_attempt,rev.authority_revision);
 select * into strict a from concierge_incident_private_v1.admission_v2 where user_id=p_user and intent_id=p_intent for update;
 if (a.session_id,a.token_expires_at,a.attempt_id,a.dispatch_id,a.provider_binding_ref,a.authority_revision,a.restriction_revision,a.state)
 is distinct from (p_session,p_exp,p_attempt,p_dispatch,p_binding,rev.authority_revision,rev.restriction_revision,'RESERVED'::text)
 then raise insufficient_privilege using message='DISPATCH_ALREADY_CLAIMED_OR_CHANGED';end if;
 perform concierge_incident_private_v1.assert_provider_v2(p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,a.original_ref,rev.authority_revision,rev.restriction_revision,p_binding,p_floor);
 update concierge_incident_private_v1.admission_v2 set state='DISPATCH_CLAIMED' where user_id=p_user and intent_id=p_intent;
 return jsonb_build_object('state','DISPATCH_CLAIMED','provider_binding_ref',p_binding,'dispatch_id',p_dispatch);
end $claim$;
'''
    write('02-admission-DO-NOT-APPLY.sql', admission)

    original = (OLD/'incident-only-DO-NOT-APPLY.sql').read_text()
    blocks=[]
    for old_name,new_name,tag in [('change_state_v1','change_state_bound_v2','writer'),('read_effect_v1','read_effect_bound_v2','reader')]:
        start=original.index(f'create function {SCHEMA}.{old_name}(')
        end=original.index(f'end ${tag}$;',start)+len(f'end ${tag}$;')
        block=original[start:end].replace(old_name,new_name,1)
        marker='p_floor jsonb)';assert marker in block
        block=block.replace(marker,'p_floor jsonb,p_provider_binding uuid)',1)
        fence=' perform pg_advisory_xact_lock(1129728581,1);'
        if tag=='writer':
            check="""
 perform concierge_incident_private_v1.assert_claimed_admission_v2(p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,p_original,p_authority,(p_floor->>'restrictionVersion')::bigint,p_provider_binding,p_floor);
"""
            block=block.replace(fence,fence+check,1)
            # A new helper carries provider_ref; the old 9-field false port is
            # not an approved fallback and is never treated as provider proof.
            old='concierge_incident_private_v1.dispatch_claim_v1(p_user,p_intent,p_attempt,p_dispatch,p_session,p_exp,p_original,p_authority,p_floor) is distinct from true'
            assert old in block
            block=block.replace(old,'concierge_incident_private_v1.bound_claim_matches_v2(p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,p_original,p_authority,(p_floor->>\'restrictionVersion\')::bigint,p_provider_binding,p_floor) is distinct from true')
        else:
            check="""
 perform concierge_incident_private_v1.assert_claimed_admission_v2(p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,p_original,p_authority,(p_floor->>'restrictionVersion')::bigint,p_provider_binding,p_floor);
"""
            block=block.replace(fence,fence+check,1)
        block=block.replace("'dispatchId',p_dispatch);","'dispatchId',p_dispatch,'providerBindingRef',p_provider_binding);")
        block=block.replace("'state','EFFECT_OBSERVED','originalRef'","'state','EFFECT_OBSERVED','providerBindingRef',p_provider_binding,'originalRef'")
        blocks.append(block)
    bridges='''
create function concierge_incident_private_v1.bound_claim_matches_v2(p_user uuid,p_session uuid,p_exp bigint,p_intent uuid,p_attempt uuid,p_dispatch uuid,p_original uuid,p_authority bigint,p_restriction bigint,p_binding uuid,p_floor jsonb)
returns boolean language plpgsql security invoker set search_path='' as $matches$
declare a concierge_incident_private_v1.admission_v2%rowtype;
begin
 perform concierge_incident_private_v1.assert_provider_v2(p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,p_original,p_authority,p_restriction,p_binding,p_floor);
 select * into strict a from concierge_incident_private_v1.admission_v2 where user_id=p_user and intent_id=p_intent;
 return (a.session_id,a.token_expires_at,a.attempt_id,a.dispatch_id,a.original_ref,a.provider_binding_ref,a.authority_revision,a.restriction_revision,a.state)
 is not distinct from (p_session,p_exp,p_attempt,p_dispatch,p_original,p_binding,p_authority,p_restriction,'DISPATCH_CLAIMED'::text);
end $matches$;
create function concierge_incident_private_v1.assert_claimed_admission_v2(p_user uuid,p_session uuid,p_exp bigint,p_intent uuid,p_attempt uuid,p_dispatch uuid,p_original uuid,p_authority bigint,p_restriction bigint,p_binding uuid,p_floor jsonb)
returns void language plpgsql security invoker set search_path='' as $assert$
begin
 if concierge_incident_private_v1.bound_claim_matches_v2(p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,p_original,p_authority,p_restriction,p_binding,p_floor) is distinct from true then raise insufficient_privilege using message='BOUND_ADMISSION_REQUIRED';end if;
end $assert$;
'''
    write('03-bound-entries-DO-NOT-APPLY.sql',bridges+'\n'.join(blocks))
    (ROOT/'GENERATION.json').write_text(json.dumps({'source':'../incident-authority-closure-20261111-v1/incident-only-DO-NOT-APPLY.sql','sourceSha256':hashlib.sha256(original.encode()).hexdigest(),'writerArity':17,'readerArity':10,'oldEntriesAreFallback':False,'sqlExecuted':False},indent=2)+'\n')

if __name__=='__main__':
    main()
