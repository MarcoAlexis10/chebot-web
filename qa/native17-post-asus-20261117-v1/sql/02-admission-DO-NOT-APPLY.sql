-- REVIEW_ONLY_NOT_EXECUTED. DO NOT APPLY. No payload table or installed source.
begin;
do $$begin raise exception 'PROPERTY_ADMISSION_REVIEW_ONLY';end$$;

-- Ephemeral resolver output, NOT a persisted second address/unit copy.
create type concierge_invite_private.property_original_payload_v1 as (
 original_ref uuid,request_id uuid,intent_id uuid,attempt_id uuid,key bytea,
 user_id uuid,session_id uuid,session_revision bigint,account_id uuid,member_id uuid,
 operation text,address text,floor_or_unit text
);
create type concierge_invite_private.property_original_metadata_v1 as (
 original_ref uuid,request_id uuid,intent_id uuid,attempt_id uuid,key bytea,
 user_id uuid,session_id uuid,session_revision bigint,account_id uuid,member_id uuid,
 operation text,provenance_ref uuid
);
create table concierge_invite_private.property_admission_v1 (
 principal_id uuid not null,intent_id uuid not null,request_id uuid not null unique,
 first_attempt_id uuid not null unique,original_ref uuid not null unique,key bytea not null check(octet_length(key)=32),
 historical_session uuid not null,historical_session_revision bigint not null check(historical_session_revision>0),
 account_id uuid not null,member_id uuid not null,operation text not null check(operation='property_create'),
 authority_revision bigint not null check(authority_revision>0),restrictions_revision bigint not null check(restrictions_revision>0),
 inventory_revision bigint not null check(inventory_revision>0),founder_revision bigint not null check(founder_revision>0),quota_revision bigint not null check(quota_revision>0),jurisdiction_revision bigint not null check(jurisdiction_revision>0),
 dataset bytea not null check(octet_length(dataset)=32),recovery_epoch bigint not null check(recovery_epoch>0),
 inventory_digest bytea not null check(octet_length(inventory_digest)=32),
 restriction_digest bytea not null check(octet_length(restriction_digest)=32),
 restriction_journal text not null,bootstrap_ref uuid not null,authority_commit uuid not null,
 phase text not null check(phase in ('admitted','dispatch_claimed','function_returned','unknown')),
 admitted_at timestamptz not null,claimed_at timestamptz,function_returned_at timestamptz,
 primary key(principal_id,intent_id),unique(principal_id,key)
);
-- No address/floor, JWT, personal hash, unbounded JSON snapshot, or client original.
-- p_key is the EXISTING opaque intent key; key equality is not argument equality.
create table concierge_invite_private.property_dispatch_context_v1 (
 backend_pid integer not null,transaction_id xid8 not null,
 principal_id uuid not null,intent_id uuid not null,request_id uuid not null,
 attempt_id uuid not null,original_ref uuid not null,
 primary key(backend_pid,transaction_id),
 foreign key(principal_id,intent_id) references concierge_invite_private.property_admission_v1(principal_id,intent_id)
);
alter table concierge_invite_private.property_admission_v1 enable row level security;
alter table concierge_invite_private.property_admission_v1 force row level security;
alter table concierge_invite_private.property_dispatch_context_v1 enable row level security;
alter table concierge_invite_private.property_dispatch_context_v1 force row level security;
revoke all on concierge_invite_private.property_admission_v1,
 concierge_invite_private.property_dispatch_context_v1 from public,anon,authenticated,service_role;

-- Retained composition, not a second capture primitive. Login name MUST remain
-- historical because the inner writer checks session_user without SET ROLE.
create function concierge_invite_private.capture_first_property_review_v1(
 p_request uuid,p_intent uuid,p_attempt uuid,p_original_ref uuid,p_key bytea
) returns jsonb language plpgsql security definer set search_path='' set lock_timeout='500ms' as $$
declare c concierge_invite_private.property_current_cut_v1;
 o concierge_invite_private.property_original_payload_v1;
 old concierge_invite_private.property_admission_v1;
 ignored_function_result jsonb; historical_capture record;
begin
 raise exception 'PROPERTY_ADMISSION_NOT_ACCREDITED';
 if session_user::text<>'cheveni_private_mutation_backend_v1'
 or current_user::text<>'cheveni_property_admission_owner_v1'
 or pg_catalog.current_setting('transaction_isolation')<>'read committed'
 or p_request is null or p_intent is null or p_attempt is null or p_original_ref is null
 or p_key is null or octet_length(p_key)<>32 then raise exception 'PROPERTY_ADMISSION_HELD';end if;
 perform pg_catalog.pg_advisory_xact_lock(1129728581,1);
 -- Current relation/provider is checked even on KNOWN. This cut alone neither
 -- grants a second write nor requires the property inventory to be empty.
 c:=concierge_invite_private.bootstrap_current_cut_v1(p_request,'identity_only',p_original_ref);
 perform concierge_invite_private.validate_property_cut_review_v1(c,p_request,'identity_only');
 perform concierge_invite_private.bootstrap_require_independent_floor_v1(c);
 perform concierge_invite_private.bootstrap_require_complete_catalog_v1();
 select * into old from concierge_invite_private.property_admission_v1
 where principal_id=c.user_id and intent_id=p_intent for update;
 if found then
  if (old.original_ref,old.key,old.account_id,old.member_id,old.operation)
  is distinct from (p_original_ref,p_key,c.account_id,c.member_id,'property_create'::text)
  then raise exception 'PRIVATE_COMMAND_CONFLICT';end if;
  c:=concierge_invite_private.bootstrap_current_cut_v1(p_request,'property_capture_read',p_original_ref);
 perform concierge_invite_private.validate_property_cut_review_v1(c,p_request,'property_capture_read');
  perform concierge_invite_private.bootstrap_require_independent_floor_v1(c);
  if (c.user_id,c.account_id,c.member_id) is distinct from (old.principal_id,old.account_id,old.member_id)
  then raise exception 'PROPERTY_CURRENT_READ_HELD';end if;
 o:=concierge_invite_private.property_original_payload_v1(p_original_ref,c);
 -- Resolver must corroborate protected provenance and exact original values.
 -- Unavailable original raises/returns UNKNOWN to the caller, never NEW.
 if o.original_ref is distinct from p_original_ref or o.intent_id is distinct from p_intent
 or o.key is distinct from p_key or o.operation is distinct from 'property_create'
 or (o.user_id,o.account_id,o.member_id) is distinct from (c.user_id,c.account_id,c.member_id)
 then raise exception 'PROPERTY_ORIGINAL_UNAVAILABLE_OR_CONFLICT';end if;
  -- Protected comparator reads the original, not a hash or caller snapshot.
  perform concierge_invite_private.property_require_original_equal_v1(old.original_ref,p_original_ref);
  select address,floor_or_unit into historical_capture from concierge_invite_private.property_capture_v1
   where principal_id=old.principal_id and intent_id=old.intent_id;
  if found and (historical_capture.address,historical_capture.floor_or_unit)
   is distinct from (o.address,o.floor_or_unit) then raise exception 'PRIVATE_COMMAND_CONFLICT';end if;
  return jsonb_build_object('state','UNKNOWN','admission','KNOWN',
   'automaticRetryAllowed',false,'privateResult',null);
 end if;
 -- A reused key with another intent is a conflict; no second identity/effect.
 if exists(select from concierge_invite_private.property_admission_v1
  where principal_id=c.user_id and key=p_key)
 then raise exception 'PRIVATE_COMMAND_CONFLICT';end if;
 -- Missing local ledger is not a proof of no previous effect after restore.
 if exists(select from concierge_invite_private.manager_result_v1 where principal_id=c.user_id and intent_id=p_intent)
 or exists(select from concierge_invite_private.property_capture_v1 where principal_id=c.user_id and intent_id=p_intent)
 then return jsonb_build_object('state','UNKNOWN','admission','TRUSTED_HISTORY_REQUIRED','automaticRetryAllowed',false);end if;
 perform concierge_invite_private.property_require_no_prior_dispatch_v1(p_original_ref,p_intent,p_key);
 c:=concierge_invite_private.resolve_first_property_review_v1(p_request,p_original_ref,null);
 o:=concierge_invite_private.property_original_payload_v1(p_original_ref,c);
 -- Resolver must corroborate protected provenance and exact original values.
 -- Unavailable original raises/returns UNKNOWN to the caller, never NEW.
 if o.original_ref is distinct from p_original_ref or o.intent_id is distinct from p_intent
 or o.key is distinct from p_key or o.operation is distinct from 'property_create'
 or (o.user_id,o.account_id,o.member_id) is distinct from (c.user_id,c.account_id,c.member_id)
 then raise exception 'PROPERTY_ORIGINAL_UNAVAILABLE_OR_CONFLICT';end if;
 if o.request_id is distinct from p_request or o.attempt_id is distinct from p_attempt
 or (o.user_id,o.session_id,o.session_revision,o.account_id,o.member_id)
 is distinct from (c.user_id,c.session_id,c.session_revision,c.account_id,c.member_id)
 then raise exception 'PROPERTY_ORIGINAL_BINDING_HELD';end if;
 perform concierge_invite_private.property_require_original_cut_v1(p_original_ref,c);
 insert into concierge_invite_private.property_admission_v1
 (principal_id,intent_id,request_id,first_attempt_id,original_ref,key,historical_session,historical_session_revision,
 account_id,member_id,operation,authority_revision,restrictions_revision,inventory_revision,founder_revision,
 quota_revision,jurisdiction_revision,dataset,recovery_epoch,inventory_digest,restriction_digest,
 restriction_journal,bootstrap_ref,authority_commit,phase,admitted_at)
 values(c.user_id,p_intent,p_request,p_attempt,p_original_ref,p_key,c.session_id,c.session_revision,
 c.account_id,c.member_id,'property_create',c.authority_revision,c.restrictions_revision,c.inventory_revision,
 c.founder_revision,c.quota_revision,c.jurisdiction_revision,c.dataset,c.recovery_epoch,c.inventory_digest,
 c.restriction_digest,c.restriction_journal,c.bootstrap_ref,c.authority_commit,'admitted',clock_timestamp());
 -- Only this NEW invocation proceeds. No public resume/claim endpoint.
 update concierge_invite_private.property_admission_v1 set phase='dispatch_claimed',claimed_at=clock_timestamp()
 where principal_id=c.user_id and intent_id=p_intent and phase='admitted';
 if not found then raise exception 'PROPERTY_DISPATCH_ALREADY_CLAIMED';end if;
 insert into concierge_invite_private.property_dispatch_context_v1
 values(pg_backend_pid(),pg_current_xact_id(),c.user_id,p_intent,p_request,p_attempt,p_original_ref);
 -- No client GUC or metadata can create this transaction-local binding.
 -- Exactly the historical eleven arguments, without discarded payload fields.
 ignored_function_result:=concierge_invite_private.write_property_capture_v1(
 c.user_id,c.session_id,c.expiry,c.member_id,'owner',c.authority_revision,
 c.account_id,p_intent,p_key,o.address,o.floor_or_unit);
 update concierge_invite_private.property_admission_v1
 set phase='function_returned',function_returned_at=clock_timestamp()
 where principal_id=c.user_id and intent_id=p_intent;
 delete from concierge_invite_private.property_dispatch_context_v1
 where backend_pid=pg_backend_pid() and transaction_id=pg_current_xact_id();
 -- Function result/ACK is NOT a COMMIT, effect readback, journal or witness.
 return jsonb_build_object('state','UNKNOWN','admission','NEW_FUNCTION_RETURNED',
  'automaticRetryAllowed',false,'externalCommitVerified',false,'privateResult',null);
end$$;
revoke all on function concierge_invite_private.capture_first_property_review_v1(uuid,uuid,uuid,uuid,bytea)
 from public,anon,authenticated,service_role;

-- Proposed narrow successor of the existing EMPTY source, not a blanket grant.
-- It cannot run outside this protected current transaction. Other operations
-- still return no rows. No SET ROLE; no fallback to REST or create_stay.
create or replace function concierge_invite_private.private_mutation_authority_v1(
 p_user uuid,p_session uuid,p_expiry bigint,p_property uuid,p_operation text
) returns table(account_id uuid,member_id uuid,member_role text,authority_revision bigint)
language plpgsql volatile security invoker set search_path='' as $$
declare d concierge_invite_private.property_dispatch_context_v1;
 a concierge_invite_private.property_admission_v1;
 c concierge_invite_private.property_current_cut_v1;
begin
 raise exception 'PROPERTY_LEGACY_AUTHORITY_BINDING_NOT_ACCREDITED';
 if session_user::text<>'cheveni_private_mutation_backend_v1'
 or current_user::text<>'cheveni_private_mutation_owner_v1'
 or p_operation is distinct from 'property_create' or p_property is not null then return;end if;
 select * into d from concierge_invite_private.property_dispatch_context_v1
 where backend_pid=pg_backend_pid() and transaction_id=pg_current_xact_id();
 if not found or d.principal_id is distinct from p_user then return;end if;
 select * into strict a from concierge_invite_private.property_admission_v1
 where principal_id=d.principal_id and intent_id=d.intent_id;
 if a.phase is distinct from 'dispatch_claimed' or a.original_ref is distinct from d.original_ref
 or a.first_attempt_id is distinct from d.attempt_id or a.request_id is distinct from d.request_id
 or a.historical_session is distinct from p_session then return;end if;
 c:=concierge_invite_private.resolve_first_property_review_v1(d.request_id,d.original_ref,null);
 if (c.user_id,c.session_id,c.expiry,c.session_revision,c.account_id,c.member_id,
 c.authority_revision,c.restrictions_revision,c.inventory_revision,c.founder_revision,c.quota_revision,
 c.jurisdiction_revision,c.dataset,c.recovery_epoch,c.inventory_digest,c.restriction_digest,
 c.restriction_journal,c.bootstrap_ref,c.authority_commit)
 is distinct from
 (p_user,p_session,p_expiry,a.historical_session_revision,a.account_id,a.member_id,
 a.authority_revision,a.restrictions_revision,a.inventory_revision,a.founder_revision,a.quota_revision,
 a.jurisdiction_revision,a.dataset,a.recovery_epoch,a.inventory_digest,a.restriction_digest,
 a.restriction_journal,a.bootstrap_ref,a.authority_commit) then return;end if;
 return query select c.account_id,c.member_id,'owner'::text,c.authority_revision;
end$$;
revoke all on function concierge_invite_private.private_mutation_authority_v1(uuid,uuid,bigint,uuid,text)
 from public,anon,authenticated,service_role;
rollback;
