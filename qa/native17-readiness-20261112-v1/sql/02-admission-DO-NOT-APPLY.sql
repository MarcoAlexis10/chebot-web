-- QA REVIEW ONLY / DO NOT APPLY / NOT AUTHORIZED FOR EXECUTION.
begin;
do $abort$ begin raise exception 'CHEVENI_REVIEW_DO_NOT_APPLY';end $abort$;

-- Admission is not effect history. Reserving the old intent_binding row would
-- cause the existing writer to return RECONCILIATION_REQUIRED on its first use.
create table concierge_incident_private_v1.admission_v2(
 user_id uuid not null,intent_id uuid not null,attempt_id uuid not null,dispatch_id uuid not null unique,
 session_id uuid not null,token_expires_at bigint not null,original_ref uuid not null,
 provider_binding_ref uuid not null,authority_revision bigint not null,restriction_revision bigint not null,
 state text not null check(state in('RESERVED','DISPATCH_CLAIMED')),
 primary key(user_id,intent_id),unique(user_id,attempt_id),
 unique(user_id,intent_id,original_ref,provider_binding_ref)
);
alter table concierge_incident_private_v1.intent_binding add constraint intent_admission_provider_fk
 foreign key(user_id,intent_id,original_ref,provider_binding_ref) references concierge_incident_private_v1.admission_v2(user_id,intent_id,original_ref,provider_binding_ref);
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
declare prior concierge_incident_private_v1.admission_v2%rowtype;o uuid;sc jsonb;rev record;original_ jsonb;
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

 perform concierge_incident_private_v1.assert_provider_v2(p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,o,p_authority,p_restriction,p_binding,p_floor);
 select * into prior from concierge_incident_private_v1.admission_v2 where user_id=p_user and intent_id=p_intent for update;
 if found then
  if prior.original_ref is distinct from o then raise insufficient_privilege using message='KNOWN_ORIGINAL_CONTRADICTORY_UNKNOWN';end if;
  -- Return original metadata only; never promote KNOWN to NEW/dispatch.
  return to_jsonb(prior)||jsonb_build_object('state','KNOWN');
 end if;
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

revoke all on all functions in schema concierge_incident_private_v1 from public;
rollback;
