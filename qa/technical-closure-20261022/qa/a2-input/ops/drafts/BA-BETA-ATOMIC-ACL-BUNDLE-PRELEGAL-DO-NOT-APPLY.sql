-- REVIEW BUNDLE ONLY. PRELEGAL / DO NOT APPLY TO SHARED DATABASES.
-- First installation candidate, not an idempotent migration or authorization.
-- One transaction: either all new capability boundaries install or none do.
-- Review every consumer first. No approved policy/evidence is seeded.
begin;
revoke insert,update,delete,truncate on public.concierge_pending_actions from public,anon,authenticated,service_role;
do $$ declare cols text;begin
 select string_agg(quote_ident(attname),',') into cols from pg_attribute where attrelid='public.concierge_pending_actions'::regclass and attnum>0 and not attisdropped;
 execute 'revoke insert ('||cols||'),update ('||cols||') on public.concierge_pending_actions from public,anon,authenticated,service_role';
end $$;
revoke insert,update,delete,truncate on public.concierge_guest_identities from public,anon,authenticated,service_role;
do $$ declare cols text;begin
 select string_agg(quote_ident(attname),',') into cols from pg_attribute where attrelid='public.concierge_guest_identities'::regclass and attnum>0 and not attisdropped;
 execute 'revoke insert ('||cols||'),update ('||cols||') on public.concierge_guest_identities from public,anon,authenticated,service_role';
end $$;
revoke insert,update,delete,truncate on public.concierge_stays from public,anon,authenticated,service_role;
do $$ declare cols text;begin
 select string_agg(quote_ident(attname),',') into cols from pg_attribute where attrelid='public.concierge_stays'::regclass and attnum>0 and not attisdropped;
 execute 'revoke insert ('||cols||'),update ('||cols||') on public.concierge_stays from public,anon,authenticated,service_role';
end $$;
revoke insert,update,delete,truncate on public.concierge_stay_members from public,anon,authenticated,service_role;
do $$ declare cols text;begin
 select string_agg(quote_ident(attname),',') into cols from pg_attribute where attrelid='public.concierge_stay_members'::regclass and attnum>0 and not attisdropped;
 execute 'revoke insert ('||cols||'),update ('||cols||') on public.concierge_stay_members from public,anon,authenticated,service_role';
end $$;
revoke insert,update,delete,truncate on public.concierge_guest_invites from public,anon,authenticated,service_role;
do $$ declare cols text;begin
 select string_agg(quote_ident(attname),',') into cols from pg_attribute where attrelid='public.concierge_guest_invites'::regclass and attnum>0 and not attisdropped;
 execute 'revoke insert ('||cols||'),update ('||cols||') on public.concierge_guest_invites from public,anon,authenticated,service_role';
end $$;
revoke insert,update,delete,truncate on public.concierge_sessions from public,anon,authenticated,service_role;
do $$ declare cols text;begin
 select string_agg(quote_ident(attname),',') into cols from pg_attribute where attrelid='public.concierge_sessions'::regclass and attnum>0 and not attisdropped;
 execute 'revoke insert ('||cols||'),update ('||cols||') on public.concierge_sessions from public,anon,authenticated,service_role';
end $$;
revoke insert,update,delete,truncate on public.concierge_guest_phone_changes from public,anon,authenticated,service_role;
do $$ declare cols text;begin
 select string_agg(quote_ident(attname),',') into cols from pg_attribute where attrelid='public.concierge_guest_phone_changes'::regclass and attnum>0 and not attisdropped;
 execute 'revoke insert ('||cols||'),update ('||cols||') on public.concierge_guest_phone_changes from public,anon,authenticated,service_role';
end $$;
revoke insert,update,delete,truncate on public.concierge_guest_channels from public,anon,authenticated,service_role;
do $$ declare cols text;begin
 select string_agg(quote_ident(attname),',') into cols from pg_attribute where attrelid='public.concierge_guest_channels'::regclass and attnum>0 and not attisdropped;
 execute 'revoke insert ('||cols||'),update ('||cols||') on public.concierge_guest_channels from public,anon,authenticated,service_role';
end $$;

-- COMPONENT GUEST-INTAKE-ATOMIC-V1-PRELEGAL-DO-NOT-APPLY.sql
-- PRELEGAL REVIEW PROPOSAL. DO NOT APPLY TO SHARED DATABASES.
-- No legal policy/evidence is seeded. All API grants are explicitly revoked.
-- Trusted policy/evidence enrollment, retention and legal sign-off remain pending.

create schema if not exists concierge_private;
revoke all on schema concierge_private from public, anon, authenticated, service_role;
create table concierge_private.intake_policies_v1 (
  policy_key text primary key,
  notice_version text not null,
  notice_sha256 text not null check (notice_sha256 ~ '^[0-9a-f]{64}$'),
  legal_basis_code text not null check (length(trim(legal_basis_code))>0),
  delivery_assurance_code text not null check (length(trim(delivery_assurance_code))>0),
  review_reference text not null check (length(trim(review_reference))>0),
  approved_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (expires_at>approved_at)
);
create table concierge_private.intake_authorizations_v1 (
  evidence_id uuid not null unique,
  account_id uuid not null references public.concierge_accounts(id),
  property_id uuid not null,
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  policy_key text not null references concierge_private.intake_policies_v1(policy_key),
  notice_sha256 text not null check (notice_sha256 ~ '^[0-9a-f]{64}$'),
  delivery_assurance_code text not null,
  source_reference text not null check (length(trim(source_reference))>0),
  delivered_at timestamptz not null,
  verified_at timestamptz not null,
  expires_at timestamptz not null,
  authorization_state text not null check (authorization_state in ('authorized','opposed','revoked')),
  revoked_at timestamptz,
  primary key(account_id,property_id,subject_hash),
  foreign key(property_id,account_id) references public.concierge_properties(id,account_id),
  check(delivered_at<=verified_at and expires_at>verified_at),
  check((authorization_state='authorized' and revoked_at is null)
     or (authorization_state<>'authorized' and revoked_at is not null))
);
create table concierge_private.intake_operations_v1 (
  operation_id uuid primary key,
  account_id uuid not null,
  manager_id uuid not null,
  property_id uuid not null,
  pending_id uuid not null unique references public.concierge_pending_actions(id),
  evidence_id uuid not null references concierge_private.intake_authorizations_v1(evidence_id),
  policy_key text not null references concierge_private.intake_policies_v1(policy_key),
  received_at timestamptz not null,
  payload_digest text not null,
  stay_id uuid references public.concierge_stays(id),
  invite_id uuid references public.concierge_guest_invites(id),
  check ((stay_id is null)=(invite_id is null))
);
alter table concierge_private.intake_policies_v1 enable row level security;
alter table concierge_private.intake_authorizations_v1 enable row level security;
alter table concierge_private.intake_operations_v1 enable row level security;
revoke all on all tables in schema concierge_private from public, anon, authenticated, service_role;

-- Internal helper: checks and locks current server-owned authority/evidence.
-- These records can only be enrolled by a separately approved trusted service;
-- a manager checkbox or supplied timestamps/flags cannot create them.
create function concierge_private.check_intake_v1(
  p_manager_id uuid,p_account_id uuid,p_property_id uuid,p_subject_hash text,p_received_at timestamptz
) returns table(reason text,evidence_id uuid,policy_key text)
language plpgsql security invoker set search_path=''
as $$
declare v_e concierge_private.intake_authorizations_v1%rowtype;
  v_p concierge_private.intake_policies_v1%rowtype; v_auth record;
begin
  perform 1 from public.concierge_accounts a where a.id=p_account_id and a.status in ('testing','active') for share;
  if not found then return query select 'ACCOUNT_NOT_ACTIVE'::text,null::uuid,null::text; return; end if;
  perform 1 from public.concierge_account_members m
    where m.id=p_manager_id and m.account_id=p_account_id and m.status='active' for share;
  if not found then return query select 'MANAGER_PERMISSION_DENIED'::text,null::uuid,null::text; return; end if;
  perform 1 from public.concierge_properties p where p.id=p_property_id and p.account_id=p_account_id
    and p.status='active' and p.city='Buenos Aires' for share;
  if not found then return query select 'PROPERTY_SCOPE_DENIED'::text,null::uuid,null::text; return; end if;
  select * into v_auth from public.concierge_authorize_manager_member_action(p_manager_id,p_property_id,'manage_stays');
  if v_auth.result is distinct from 'allow' or v_auth.account_id is distinct from p_account_id then
    return query select 'MANAGER_PERMISSION_DENIED'::text,null::uuid,null::text; return;
  end if;
  if p_received_at is null or p_received_at>clock_timestamp() then
    return query select 'INGESTION_CLOCK_INVALID'::text,null::uuid,null::text; return;
  end if;
  select e.* into v_e from concierge_private.intake_authorizations_v1 e
    where e.account_id=p_account_id and e.property_id=p_property_id and e.subject_hash=p_subject_hash for update;
  if not found then return query select 'PRIOR_NOTICE_EVIDENCE_MISSING'::text,null::uuid,null::text; return; end if;
  select p.* into v_p from concierge_private.intake_policies_v1 p where p.policy_key=v_e.policy_key for share;
  if not found or v_p.revoked_at is not null or v_p.expires_at<=clock_timestamp()
      or v_p.approved_at>p_received_at then
    return query select 'APPROVED_POLICY_REQUIRED'::text,null::uuid,null::text; return;
  end if;
  if v_e.authorization_state<>'authorized' or v_e.revoked_at is not null
      or v_e.expires_at<=clock_timestamp() or v_e.verified_at>p_received_at
      or v_e.delivered_at>=p_received_at or v_p.approved_at>v_e.delivered_at or v_e.notice_sha256<>v_p.notice_sha256
      or v_e.delivery_assurance_code<>v_p.delivery_assurance_code then
    return query select 'PRIOR_NOTICE_AUTHORIZATION_INVALID'::text,null::uuid,null::text; return;
  end if;
  return query select 'allow'::text,v_e.evidence_id,v_e.policy_key;
end;
$$;

create function public.concierge_create_guarded_pending_stay_v1(
  p_operation_id uuid,p_manager_id uuid,p_account_id uuid,p_property_id uuid,
  p_received_at timestamptz,p_guest_phone_hash text,p_guest_display_name text,
  p_check_in_at timestamptz,p_check_out_at timestamptz,p_language text
) returns table(result text,reason_code text,operation_id uuid,pending_id uuid)
language plpgsql security invoker set search_path=''
as $$
declare v_guard record; v_op concierge_private.intake_operations_v1%rowtype;
  v_payload jsonb; v_digest text; v_pending uuid;
begin
  if p_operation_id is null or p_guest_phone_hash is null or p_guest_phone_hash !~ '^[0-9a-f]{64}$'
    or p_guest_display_name is null or length(trim(p_guest_display_name)) not between 1 and 160
    or p_language is null or p_language not in ('es','en','it','pt')
    or p_check_in_at is null or p_check_out_at is null or p_check_out_at<=p_check_in_at
    or p_received_at is null or p_received_at<clock_timestamp()-interval '5 minutes' then
    return query select 'deny'::text,'DRAFT_INVALID'::text,p_operation_id,null::uuid; return;
  end if;
  -- Serialize competing drafts from the same authenticated manager, including retries.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('cheveni-intake:'||p_manager_id::text,0));
  select * into v_guard from concierge_private.check_intake_v1(p_manager_id,p_account_id,p_property_id,p_guest_phone_hash,p_received_at);
  if v_guard.reason is distinct from 'allow' then
    return query select 'deny'::text,v_guard.reason::text,p_operation_id,null::uuid; return;
  end if;
  v_payload:=jsonb_build_object('guest_phone_hash',p_guest_phone_hash,'guest_display_name',trim(p_guest_display_name),
    'check_in_at',p_check_in_at,'check_out_at',p_check_out_at,'access_from',p_check_in_at,'access_until',p_check_out_at,'language',p_language);
  v_digest:=encode(sha256(convert_to(v_payload::text,'UTF8')),'hex');
  select o.* into v_op from concierge_private.intake_operations_v1 o where o.operation_id=p_operation_id;
  if found then
    if v_op.account_id<>p_account_id or v_op.manager_id<>p_manager_id or v_op.property_id<>p_property_id or v_op.payload_digest<>v_digest then
      return query select 'deny'::text,'OPERATION_SCOPE_MISMATCH'::text,p_operation_id,null::uuid; return;
    end if;
    return query select 'existing'::text,null::text,p_operation_id,v_op.pending_id; return;
  end if;
  if exists(select 1 from public.concierge_pending_actions a where a.actor_account_member_id=p_manager_id and a.status='pending' and a.expires_at>clock_timestamp()) then
    return query select 'deny'::text,'MANAGER_ALREADY_HAS_PENDING_ACTION'::text,p_operation_id,null::uuid; return;
  end if;
  update public.concierge_pending_actions a set status='expired'
    where a.actor_account_member_id=p_manager_id and a.status='pending' and a.expires_at<=clock_timestamp();
  insert into public.concierge_pending_actions(account_id,actor_type,actor_account_member_id,action_type,summary,property_id,target_entity_type,payload_jsonb,status,expires_at)
    values(p_account_id,'account_member',p_manager_id,'create_stay','Nueva estadía pendiente',p_property_id,'stay',v_payload,'pending',clock_timestamp()+interval '15 minutes')
    returning id into v_pending;
  insert into concierge_private.intake_operations_v1(operation_id,account_id,manager_id,property_id,pending_id,evidence_id,policy_key,received_at,payload_digest)
    values(p_operation_id,p_account_id,p_manager_id,p_property_id,v_pending,v_guard.evidence_id,v_guard.policy_key,p_received_at,v_digest);
  select * into v_guard from concierge_private.check_intake_v1(p_manager_id,p_account_id,p_property_id,p_guest_phone_hash,p_received_at);
  if v_guard.reason is distinct from 'allow' then raise exception 'PRIVACY_EVIDENCE_EXPIRED_DURING_WRITE'; end if;
  return query select 'created'::text,null::text,p_operation_id,v_pending;
end;
$$;

create function public.concierge_execute_guarded_pending_stay_v1(p_pending_id uuid,p_manager_id uuid,p_account_id uuid)
returns table(result text,reason_code text,pending_id uuid,stay_id uuid,invite_id uuid)
language plpgsql security invoker set search_path=''
as $$
declare v_a public.concierge_pending_actions%rowtype; v_op concierge_private.intake_operations_v1%rowtype;
  v_guard record; v_created record; v_reason text;
begin
  -- Same manager lock before pending/property/evidence locks as draft creation.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('cheveni-intake:'||p_manager_id::text,0));
  select a.* into v_a from public.concierge_pending_actions a where a.id=p_pending_id and a.account_id=p_account_id
    and a.actor_account_member_id=p_manager_id and a.actor_type='account_member' and a.action_type='create_stay' for update;
  if not found then return query select 'deny'::text,'PENDING_ACTION_OUT_OF_SCOPE'::text,p_pending_id,null::uuid,null::uuid; return; end if;
  select o.* into v_op from concierge_private.intake_operations_v1 o where o.pending_id=p_pending_id and o.manager_id=p_manager_id and o.account_id=p_account_id;
  if not found then return query select 'deny'::text,'LEGACY_PENDING_EVIDENCE_REQUIRED'::text,p_pending_id,null::uuid,null::uuid; return; end if;
  if v_op.property_id is distinct from v_a.property_id then
    return query select 'deny'::text,'PENDING_SCOPE_CHANGED'::text,p_pending_id,null::uuid,null::uuid; return;
  end if;
  if v_op.payload_digest<>encode(sha256(convert_to(v_a.payload_jsonb::text,'UTF8')),'hex') then
    return query select 'deny'::text,'PENDING_PAYLOAD_CHANGED'::text,p_pending_id,null::uuid,null::uuid; return;
  end if;
  select * into v_guard from concierge_private.check_intake_v1(p_manager_id,p_account_id,v_a.property_id,v_a.payload_jsonb->>'guest_phone_hash',v_op.received_at);
  if v_guard.reason is distinct from 'allow' or v_guard.evidence_id is distinct from v_op.evidence_id or v_guard.policy_key is distinct from v_op.policy_key then
    return query select 'deny'::text,'CURRENT_EVIDENCE_REQUIRED'::text,p_pending_id,null::uuid,null::uuid; return;
  end if;
  if v_a.status='executed' and v_op.stay_id is not null and v_op.invite_id is not null then
    return query select 'created'::text,null::text,p_pending_id,v_op.stay_id,v_op.invite_id; return;
  end if;
  if v_a.status<>'pending' or v_a.expires_at<=clock_timestamp() then
    return query select 'deny'::text,'CONFIRMATION_NOT_PENDING_OR_EXPIRED'::text,p_pending_id,null::uuid,null::uuid; return;
  end if;
  begin
    update public.concierge_pending_actions set status='confirmed',confirmed_at=clock_timestamp() where id=p_pending_id;
    select * into v_created from public.concierge_manager_create_stay(p_manager_id,v_a.property_id,
      v_a.payload_jsonb->>'guest_phone_hash',v_a.payload_jsonb->>'guest_display_name',
      (v_a.payload_jsonb->>'check_in_at')::timestamptz,(v_a.payload_jsonb->>'check_out_at')::timestamptz,
      (v_a.payload_jsonb->>'access_from')::timestamptz,(v_a.payload_jsonb->>'access_until')::timestamptz,v_a.payload_jsonb->>'language');
    if v_created.result is distinct from 'created' or v_created.stay_id is null or v_created.invite_id is null then
      v_reason:=coalesce(v_created.reason_code,'STAY_CREATE_FAILED');
      raise exception using errcode='P0001',message='GUARDED_STAY_CREATE_DENIED';
    end if;
    select * into v_guard from concierge_private.check_intake_v1(p_manager_id,p_account_id,v_a.property_id,v_a.payload_jsonb->>'guest_phone_hash',v_op.received_at);
    if v_guard.reason is distinct from 'allow' then
      v_reason:='CURRENT_EVIDENCE_REQUIRED'; raise exception using errcode='P0001',message='GUARDED_STAY_CREATE_DENIED';
    end if;
    update public.concierge_pending_actions set status='executed',executed_at=clock_timestamp(),stay_id=v_created.stay_id,target_entity_id=v_created.stay_id where id=p_pending_id;
    update concierge_private.intake_operations_v1 set stay_id=v_created.stay_id,invite_id=v_created.invite_id where operation_id=v_op.operation_id;
  exception when sqlstate 'P0001' then
    -- Roll back identity/stay writes even when the legacy RPC returned a denial
    -- after having created an identity. Keep the pending action unchanged.
    return query select 'deny'::text,v_reason,p_pending_id,null::uuid,null::uuid; return;
  end;
  return query select 'created'::text,null::text,p_pending_id,v_created.stay_id,v_created.invite_id;
end;
$$;
create function public.concierge_guest_intake_readiness_v1(p_manager_id uuid,p_account_id uuid,p_property_id uuid)
returns table(result text,reason_code text)
language plpgsql security invoker set search_path=''
as $$
declare v_auth record;
begin
 select * into v_auth from public.concierge_authorize_manager_member_action(p_manager_id,p_property_id,'manage_stays');
 if v_auth.result is distinct from 'allow' or v_auth.account_id is distinct from p_account_id then
   return query select 'hold'::text,'MANAGER_PERMISSION_DENIED'::text; return;
 end if;
 if not exists(select 1 from public.concierge_accounts a where a.id=p_account_id and a.status in ('testing','active')) then
   return query select 'hold'::text,'ACCOUNT_NOT_ACTIVE'::text; return;
 end if;
 if not exists(select 1 from public.concierge_properties p where p.id=p_property_id and p.account_id=p_account_id and p.status='active' and p.city='Buenos Aires') then
   return query select 'hold'::text,'PROPERTY_SCOPE_DENIED'::text; return;
 end if;
 if not exists(select 1 from concierge_private.intake_policies_v1 p where p.revoked_at is null and p.approved_at<=clock_timestamp() and p.expires_at>clock_timestamp()) then
   return query select 'hold'::text,'APPROVED_POLICY_REQUIRED'::text; return;
 end if;
 return query select 'ready'::text,null::text;
end;
$$;
-- Scoped housekeeping replaces direct backend PATCH access to pending rows.
create function public.concierge_expire_manager_pending_v1(p_manager_id uuid,p_account_id uuid)
returns table(result text,affected_count integer)
language plpgsql security invoker set search_path=''
as $$ declare v_count integer; begin
 perform 1 from public.concierge_account_members m join public.concierge_accounts a on a.id=m.account_id
  where m.id=p_manager_id and m.account_id=p_account_id and m.status='active' and a.status in ('active','testing') for share of m,a;
 if not found then return query select 'deny'::text,0;return;end if;
 update public.concierge_pending_actions a set status='expired'
  where a.account_id=p_account_id and a.actor_account_member_id=p_manager_id and a.actor_type='account_member' and a.status='pending' and a.expires_at<=clock_timestamp();
 get diagnostics v_count=row_count;
 return query select 'ok'::text,v_count;
end $$;
create function public.concierge_reject_manager_pending_v1(p_pending_id uuid,p_manager_id uuid,p_account_id uuid)
returns table(result text)
language plpgsql security invoker set search_path=''
as $$ declare v_count integer;begin
 perform 1 from public.concierge_account_members m join public.concierge_accounts a on a.id=m.account_id
  where m.id=p_manager_id and m.account_id=p_account_id and m.status='active' and a.status in ('active','testing') for share of m,a;
 if not found then return query select 'deny'::text;return;end if;
 update public.concierge_pending_actions a set status='rejected',rejected_at=clock_timestamp()
  where a.id=p_pending_id and a.account_id=p_account_id and a.actor_account_member_id=p_manager_id and a.actor_type='account_member' and a.status='pending';
 get diagnostics v_count=row_count;
 return query select case when v_count=1 then 'rejected' else 'not_pending' end::text;
end $$;
revoke all on function public.concierge_expire_manager_pending_v1(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.concierge_reject_manager_pending_v1(uuid,uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.concierge_guest_intake_readiness_v1(uuid,uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function concierge_private.check_intake_v1(uuid,uuid,uuid,text,timestamptz) from public,anon,authenticated,service_role;
revoke all on function public.concierge_create_guarded_pending_stay_v1(uuid,uuid,uuid,uuid,timestamptz,text,text,timestamptz,timestamptz,text) from public,anon,authenticated,service_role;
revoke all on function public.concierge_execute_guarded_pending_stay_v1(uuid,uuid,uuid) from public,anon,authenticated,service_role;


-- COMPONENT GUEST-RUNTIME-AUTHORITY-V1-PRELEGAL-DO-NOT-APPLY.sql
-- PRELEGAL CANDIDATE ONLY. DO NOT APPLY TO SHARED DATABASES.
-- Requires approved policy/enrollment and a reviewed ACL bundle. No real policy seeded.

create schema if not exists concierge_private;
revoke all on schema concierge_private from public,anon,authenticated;
create role cheveni_runtime_executor nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
-- A non-superuser installer needs SET for OWNER TO and inherited ownership
-- privileges for subsequent ACL edits. Only the installing administrator gets
-- these transaction-local capabilities; both options close before commit.
grant cheveni_runtime_executor to current_user with set true;
grant cheveni_runtime_executor to current_user with inherit true;
grant usage on schema public,concierge_private to cheveni_runtime_executor;
create table concierge_private.runtime_policies_v1(
 policy_key text primary key,purpose text not null check(purpose in ('guest_session','guest_access','stay_change','phone_replacement','guest_notification')),
 notice_sha256 text not null check(notice_sha256 ~ '^[0-9a-f]{64}$'),
 legal_basis_code text not null check(length(trim(legal_basis_code))>0),
 review_reference text not null check(length(trim(review_reference))>0),
 identity_assurance_code text not null check(length(trim(identity_assurance_code))>0),
 delivery_assurance_code text not null check(length(trim(delivery_assurance_code))>0),
 approved_at timestamptz not null,expires_at timestamptz not null,revoked_at timestamptz,
 lock_version bigint not null default 0,check(expires_at>approved_at)
);
create table concierge_private.runtime_authorizations_v1(
 evidence_id uuid primary key,account_id uuid not null references public.concierge_accounts(id),
 property_id uuid not null,stay_member_id uuid not null references public.concierge_stay_members(id),
 guest_identity_id uuid not null references public.concierge_guest_identities(id),
 subject_hash text not null check(subject_hash ~ '^[0-9a-f]{64}$'),
 purpose text not null check(purpose in ('guest_session','guest_access','stay_change','phone_replacement','guest_notification')),
 policy_key text not null references concierge_private.runtime_policies_v1(policy_key),
 notice_sha256 text not null check(notice_sha256 ~ '^[0-9a-f]{64}$'),
 identity_assurance_code text not null,delivery_assurance_code text not null,
 source_reference text not null check(length(trim(source_reference))>0),
 delivered_at timestamptz not null,verified_at timestamptz not null,expires_at timestamptz not null,
 authorization_state text not null check(authorization_state in ('authorized','opposed','revoked')),revoked_at timestamptz,
 lock_version bigint not null default 0,
 unique(stay_member_id,purpose,subject_hash),
 foreign key(property_id,account_id) references public.concierge_properties(id,account_id),
 check(delivered_at<=verified_at and expires_at>verified_at),
 check((authorization_state='authorized' and revoked_at is null) or (authorization_state<>'authorized' and revoked_at is not null))
);
alter table concierge_private.runtime_policies_v1 enable row level security;
alter table concierge_private.runtime_authorizations_v1 enable row level security;
revoke all on concierge_private.runtime_policies_v1,concierge_private.runtime_authorizations_v1 from public,anon,authenticated,service_role;
grant select on concierge_private.runtime_policies_v1,concierge_private.runtime_authorizations_v1 to cheveni_runtime_executor;
grant update(lock_version) on concierge_private.runtime_policies_v1,concierge_private.runtime_authorizations_v1 to cheveni_runtime_executor;
create policy runtime_policy_read on concierge_private.runtime_policies_v1 for select to cheveni_runtime_executor using(true);
create policy runtime_policy_lock on concierge_private.runtime_policies_v1 for update to cheveni_runtime_executor using(true) with check(true);
create policy runtime_evidence_read on concierge_private.runtime_authorizations_v1 for select to cheveni_runtime_executor using(true);
create policy runtime_evidence_lock on concierge_private.runtime_authorizations_v1 for update to cheveni_runtime_executor using(true) with check(true);
-- Read only metadata needed by the audited functions; no Vault grants.
grant select on public.concierge_accounts to cheveni_runtime_executor;
alter table public.concierge_accounts enable row level security;
create policy runtime_read on public.concierge_accounts for select to cheveni_runtime_executor using(true);
grant select on public.concierge_account_members to cheveni_runtime_executor;
alter table public.concierge_account_members enable row level security;
create policy runtime_read on public.concierge_account_members for select to cheveni_runtime_executor using(true);
grant select on public.concierge_member_property_permissions to cheveni_runtime_executor;
alter table public.concierge_member_property_permissions enable row level security;
create policy runtime_read on public.concierge_member_property_permissions for select to cheveni_runtime_executor using(true);
grant select on public.concierge_properties to cheveni_runtime_executor;
alter table public.concierge_properties enable row level security;
create policy runtime_read on public.concierge_properties for select to cheveni_runtime_executor using(true);
grant select on public.concierge_stays to cheveni_runtime_executor;
alter table public.concierge_stays enable row level security;
create policy runtime_read on public.concierge_stays for select to cheveni_runtime_executor using(true);
grant select on public.concierge_stay_members to cheveni_runtime_executor;
alter table public.concierge_stay_members enable row level security;
create policy runtime_read on public.concierge_stay_members for select to cheveni_runtime_executor using(true);
grant select on public.concierge_guest_identities to cheveni_runtime_executor;
alter table public.concierge_guest_identities enable row level security;
create policy runtime_read on public.concierge_guest_identities for select to cheveni_runtime_executor using(true);
grant select on public.concierge_guest_invites to cheveni_runtime_executor;
alter table public.concierge_guest_invites enable row level security;
create policy runtime_read on public.concierge_guest_invites for select to cheveni_runtime_executor using(true);
grant select on public.concierge_guest_phone_changes to cheveni_runtime_executor;
alter table public.concierge_guest_phone_changes enable row level security;
create policy runtime_read on public.concierge_guest_phone_changes for select to cheveni_runtime_executor using(true);
grant select on public.concierge_sessions to cheveni_runtime_executor;
alter table public.concierge_sessions enable row level security;
create policy runtime_read on public.concierge_sessions for select to cheveni_runtime_executor using(true);
grant select on public.concierge_operational_people to cheveni_runtime_executor;
alter table public.concierge_operational_people enable row level security;
create policy runtime_read on public.concierge_operational_people for select to cheveni_runtime_executor using(true);
grant select on public.concierge_operational_tasks to cheveni_runtime_executor;
alter table public.concierge_operational_tasks enable row level security;
create policy runtime_read on public.concierge_operational_tasks for select to cheveni_runtime_executor using(true);
grant select on public.concierge_request_policies to cheveni_runtime_executor;
alter table public.concierge_request_policies enable row level security;
create policy runtime_read on public.concierge_request_policies for select to cheveni_runtime_executor using(true);
grant select on public.concierge_requests to cheveni_runtime_executor;
alter table public.concierge_requests enable row level security;
create policy runtime_read on public.concierge_requests for select to cheveni_runtime_executor using(true);
grant select on public.concierge_request_events to cheveni_runtime_executor;
alter table public.concierge_request_events enable row level security;
create policy runtime_read on public.concierge_request_events for select to cheveni_runtime_executor using(true);
grant select on public.concierge_audit_events to cheveni_runtime_executor;
alter table public.concierge_audit_events enable row level security;
create policy runtime_read on public.concierge_audit_events for select to cheveni_runtime_executor using(true);
grant select on public.concierge_incident_events to cheveni_runtime_executor;
alter table public.concierge_incident_events enable row level security;
create policy runtime_read on public.concierge_incident_events for select to cheveni_runtime_executor using(true);
grant select on public.concierge_incidents to cheveni_runtime_executor;
alter table public.concierge_incidents enable row level security;
create policy runtime_read on public.concierge_incidents for select to cheveni_runtime_executor using(true);
grant select on public.concierge_knowledge_items to cheveni_runtime_executor;
alter table public.concierge_knowledge_items enable row level security;
create policy runtime_read on public.concierge_knowledge_items for select to cheveni_runtime_executor using(true);
grant select on public.concierge_knowledge_versions to cheveni_runtime_executor;
alter table public.concierge_knowledge_versions enable row level security;
create policy runtime_read on public.concierge_knowledge_versions for select to cheveni_runtime_executor using(true);
grant select on public.concierge_access_points to cheveni_runtime_executor;
alter table public.concierge_access_points enable row level security;
create policy runtime_read on public.concierge_access_points for select to cheveni_runtime_executor using(true);
grant select on public.concierge_access_point_policies to cheveni_runtime_executor;
alter table public.concierge_access_point_policies enable row level security;
create policy runtime_read on public.concierge_access_point_policies for select to cheveni_runtime_executor using(true);
grant select on public.concierge_access_authorizations to cheveni_runtime_executor;
alter table public.concierge_access_authorizations enable row level security;
create policy runtime_read on public.concierge_access_authorizations for select to cheveni_runtime_executor using(true);
grant select on public.concierge_secret_versions to cheveni_runtime_executor;
alter table public.concierge_secret_versions enable row level security;
create policy runtime_read on public.concierge_secret_versions for select to cheveni_runtime_executor using(true);
grant update(id) on public.concierge_access_points to cheveni_runtime_executor;
create policy runtime_update on public.concierge_access_points for update to cheveni_runtime_executor using(true) with check(true);
grant update(id) on public.concierge_access_point_policies to cheveni_runtime_executor;
create policy runtime_update on public.concierge_access_point_policies for update to cheveni_runtime_executor using(true) with check(true);
grant update(id) on public.concierge_secret_versions to cheveni_runtime_executor;
create policy runtime_update on public.concierge_secret_versions for update to cheveni_runtime_executor using(true) with check(true);
grant update(authorized_from,authorized_until,updated_at) on public.concierge_access_authorizations to cheveni_runtime_executor;
create policy runtime_update on public.concierge_access_authorizations for update to cheveni_runtime_executor using(true) with check(true);
grant update(id) on public.concierge_guest_phone_changes to cheveni_runtime_executor;
create policy runtime_update on public.concierge_guest_phone_changes for update to cheveni_runtime_executor using(true) with check(true);
grant update(id) on public.concierge_accounts to cheveni_runtime_executor;
create policy runtime_update on public.concierge_accounts for update to cheveni_runtime_executor using(true) with check(true);
grant update(id) on public.concierge_account_members to cheveni_runtime_executor;
create policy runtime_update on public.concierge_account_members for update to cheveni_runtime_executor using(true) with check(true);
grant update(id) on public.concierge_properties to cheveni_runtime_executor;
create policy runtime_update on public.concierge_properties for update to cheveni_runtime_executor using(true) with check(true);
grant update(id) on public.concierge_guest_identities to cheveni_runtime_executor;
create policy runtime_update on public.concierge_guest_identities for update to cheveni_runtime_executor using(true) with check(true);
grant update(check_in_at,check_out_at,access_from,access_until,updated_at) on public.concierge_stays to cheveni_runtime_executor;
create policy runtime_update on public.concierge_stays for update to cheveni_runtime_executor using(true) with check(true);
grant update(status,activated_at) on public.concierge_stay_members to cheveni_runtime_executor;
create policy runtime_update on public.concierge_stay_members for update to cheveni_runtime_executor using(true) with check(true);
grant update(status,activated_at) on public.concierge_guest_invites to cheveni_runtime_executor;
create policy runtime_update on public.concierge_guest_invites for update to cheveni_runtime_executor using(true) with check(true);
grant update(status,ended_at,last_activity_at,language,current_intent) on public.concierge_sessions to cheveni_runtime_executor;
create policy runtime_update on public.concierge_sessions for update to cheveni_runtime_executor using(true) with check(true);
grant update(status,approved_value,approved_at_time,approved_until,decision_source,decided_by_member_id,decision_at,updated_at) on public.concierge_requests to cheveni_runtime_executor;
create policy runtime_update on public.concierge_requests for update to cheveni_runtime_executor using(true) with check(true);
grant update(status,resolved_at,updated_at,closed_at,guest_confirmed_resolved,resolution_summary,manager_intervention_required,mediated_without_direct_contact,used_knowledge_item_id) on public.concierge_incidents to cheveni_runtime_executor;
create policy runtime_update on public.concierge_incidents for update to cheveni_runtime_executor using(true) with check(true);
grant update(status,current_version_id,updated_at) on public.concierge_knowledge_items to cheveni_runtime_executor;
create policy runtime_update on public.concierge_knowledge_items for update to cheveni_runtime_executor using(true) with check(true);
grant update(status,approved_by_member_id,approved_at) on public.concierge_knowledge_versions to cheveni_runtime_executor;
create policy runtime_update on public.concierge_knowledge_versions for update to cheveni_runtime_executor using(true) with check(true);
grant insert on public.concierge_requests to cheveni_runtime_executor;
create policy runtime_insert on public.concierge_requests for insert to cheveni_runtime_executor with check(true);
grant insert on public.concierge_incidents to cheveni_runtime_executor;
create policy runtime_insert on public.concierge_incidents for insert to cheveni_runtime_executor with check(true);
grant insert on public.concierge_sessions to cheveni_runtime_executor;
create policy runtime_insert on public.concierge_sessions for insert to cheveni_runtime_executor with check(true);
grant insert on public.concierge_request_events to cheveni_runtime_executor;
create policy runtime_insert on public.concierge_request_events for insert to cheveni_runtime_executor with check(true);
grant insert on public.concierge_audit_events to cheveni_runtime_executor;
create policy runtime_insert on public.concierge_audit_events for insert to cheveni_runtime_executor with check(true);
grant insert on public.concierge_incident_events to cheveni_runtime_executor;
create policy runtime_insert on public.concierge_incident_events for insert to cheveni_runtime_executor with check(true);
grant insert on public.concierge_knowledge_items to cheveni_runtime_executor;
create policy runtime_insert on public.concierge_knowledge_items for insert to cheveni_runtime_executor with check(true);
grant insert on public.concierge_knowledge_versions to cheveni_runtime_executor;
create policy runtime_insert on public.concierge_knowledge_versions for insert to cheveni_runtime_executor with check(true);
grant select,insert on public.concierge_pending_actions to cheveni_runtime_executor;
grant update(status,payload_jsonb,rejected_at,confirmed_at,executed_at,target_entity_id) on public.concierge_pending_actions to cheveni_runtime_executor;
create policy runtime_learning_read on public.concierge_pending_actions for select to cheveni_runtime_executor using(true);
create policy runtime_learning_insert on public.concierge_pending_actions for insert to cheveni_runtime_executor
 with check(actor_type='account_member' and action_type='learn_incident' and target_entity_type='incident' and status='pending');
create policy runtime_learning_update on public.concierge_pending_actions for update to cheveni_runtime_executor
 using(actor_type='account_member' and action_type='learn_incident' and target_entity_type='incident')
 with check(actor_type='account_member' and action_type='learn_incident' and target_entity_type='incident');
-- Generic confirmation is no longer a public capability. Guarded intake owns
-- its own confirmation; learning has its own constrained implementation.
revoke all on function public.concierge_confirm_pending_action(uuid,text,uuid) from public,anon,authenticated,service_role;
do $$ declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='concierge_resolve_request_policy' loop execute format('grant execute on function %s to cheveni_runtime_executor',f);end loop;end $$;
do $$ declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='concierge_resolve_actor_context' loop execute format('grant execute on function %s to cheveni_runtime_executor',f);end loop;end $$;
do $$ declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='concierge_authorize_manager_member_action' loop execute format('grant execute on function %s to cheveni_runtime_executor',f);end loop;end $$;
do $$ declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='concierge_reject_knowledge_version' loop execute format('grant execute on function %s to cheveni_runtime_executor',f);end loop;end $$;
do $$ declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='concierge_manager_set_incident_state' loop execute format('grant execute on function %s to cheveni_runtime_executor',f);end loop;end $$;
do $$ declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='concierge_manager_learning_text_allowed' loop execute format('grant execute on function %s to cheveni_runtime_executor',f);end loop;end $$;
do $$ declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='concierge_propose_incident_learning' loop execute format('grant execute on function %s to cheveni_runtime_executor',f);end loop;end $$;
do $$ declare f regprocedure;begin for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='concierge_activate_knowledge_version' loop execute format('grant execute on function %s to cheveni_runtime_executor',f);end loop;end $$;

create function concierge_private.runtime_evidence_valid_v1(p_evidence_id uuid) returns boolean
language plpgsql security invoker set search_path='' as $$ declare e concierge_private.runtime_authorizations_v1%rowtype;p concierge_private.runtime_policies_v1%rowtype;
begin
 select * into e from concierge_private.runtime_authorizations_v1 x where x.evidence_id=p_evidence_id for update;
 if not found then return false;end if;
 select * into p from concierge_private.runtime_policies_v1 x where x.policy_key=e.policy_key for share;
 if not found then return false;end if;
 return e.authorization_state='authorized' and e.revoked_at is null and e.expires_at>clock_timestamp()
  and p.revoked_at is null and p.expires_at>clock_timestamp() and p.approved_at<=e.delivered_at
  and e.delivered_at<=e.verified_at and e.verified_at<=clock_timestamp() and p.purpose=e.purpose
  and p.notice_sha256=e.notice_sha256 and p.identity_assurance_code=e.identity_assurance_code
  and p.delivery_assurance_code=e.delivery_assurance_code;
end $$;
create function concierge_private.check_runtime_v1(p_stay_member_id uuid,p_purpose text,p_subject_hash text default null)
returns uuid language plpgsql security invoker set search_path='' as $$ declare c record;e concierge_private.runtime_authorizations_v1%rowtype;
begin
 select m.account_id,m.guest_identity_id,g.phone_hash,s.property_id into c
 from public.concierge_stay_members m join public.concierge_stays s on s.id=m.stay_id and s.account_id=m.account_id
 join public.concierge_properties p on p.id=s.property_id and p.account_id=s.account_id
 join public.concierge_accounts a on a.id=m.account_id join public.concierge_guest_identities g on g.id=m.guest_identity_id
 where m.id=p_stay_member_id and m.status in ('invited','active') and m.whatsapp_enabled
  and s.status in ('scheduled','active') and s.check_out_at>clock_timestamp()
  and p.status='active' and p.city='Buenos Aires' and a.status in ('testing','active') and g.status='active'
 for share of m,s,p,a,g;
 if not found then return null;end if;
 if p_purpose<>'phone_replacement' and p_subject_hash is not null and p_subject_hash<>c.phone_hash then return null;end if;
 select x.* into e from concierge_private.runtime_authorizations_v1 x
 where x.stay_member_id=p_stay_member_id and x.purpose=p_purpose and x.subject_hash=coalesce(p_subject_hash,c.phone_hash) for update;
 if not found or e.account_id<>c.account_id or e.property_id<>c.property_id or e.guest_identity_id<>c.guest_identity_id then return null;end if;
 if not concierge_private.runtime_evidence_valid_v1(e.evidence_id) then return null;end if;
 return e.evidence_id;
end $$;
revoke all on function concierge_private.runtime_evidence_valid_v1(uuid),concierge_private.check_runtime_v1(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.runtime_evidence_valid_v1(uuid),concierge_private.check_runtime_v1(uuid,text,text) to cheveni_runtime_executor;

alter function public.concierge_start_or_refresh_session(text,text,uuid,uuid,uuid,text,text,timestamp with time zone) set schema concierge_private;
alter function concierge_private.concierge_start_or_refresh_session(text,text,uuid,uuid,uuid,text,text,timestamp with time zone) rename to legacy_concierge_start_or_refresh_session_v1;
revoke all on function concierge_private.legacy_concierge_start_or_refresh_session_v1(text,text,uuid,uuid,uuid,text,text,timestamp with time zone) from public,anon,authenticated,service_role;
grant execute on function concierge_private.legacy_concierge_start_or_refresh_session_v1(text,text,uuid,uuid,uuid,text,text,timestamp with time zone) to cheveni_runtime_executor;
create function concierge_private.concierge_start_or_refresh_session_impl_v1(p_phone_hash text, p_selected_mode text DEFAULT NULL::text, p_selected_account_id uuid DEFAULT NULL::uuid, p_selected_stay_id uuid DEFAULT NULL::uuid, p_selected_task_id uuid DEFAULT NULL::uuid, p_language text DEFAULT 'es'::text, p_current_intent text DEFAULT NULL::text, p_at timestamp with time zone DEFAULT now()) returns TABLE(session_id uuid, resolved_mode text, reason_code text)
language plpgsql security definer set search_path='' as $guard$ declare c record;r record;e uuid;v_now timestamptz:=clock_timestamp();
begin
 -- Caller timestamps cannot resurrect an expired stay or backdate activation.
 select * into c from public.concierge_resolve_actor_context(p_phone_hash,p_selected_mode,p_selected_account_id,p_selected_stay_id,p_selected_task_id,v_now);
 if c.resolved_mode='concierge_guest' then
  e:=concierge_private.check_runtime_v1(c.stay_member_id,'guest_session',p_phone_hash);
  if e is null then return query select null::uuid,'unresolved'::text,'GUEST_RUNTIME_AUTHORITY_REQUIRED'::text;return;end if;
  p_selected_mode:='concierge_guest';p_selected_account_id:=c.account_id;p_selected_stay_id:=c.stay_id;
 end if;
 select * into r from concierge_private.legacy_concierge_start_or_refresh_session_v1(p_phone_hash,p_selected_mode,p_selected_account_id,p_selected_stay_id,p_selected_task_id,p_language,p_current_intent,v_now);
 if e is not null and not concierge_private.runtime_evidence_valid_v1(e) then raise exception 'RUNTIME_AUTHORITY_EXPIRED_DURING_WRITE';end if;
 return query select r.session_id::uuid,r.resolved_mode::text,r.reason_code::text;
end $guard$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.concierge_start_or_refresh_session_impl_v1(text,text,uuid,uuid,uuid,text,text,timestamp with time zone) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.concierge_start_or_refresh_session_impl_v1(text,text,uuid,uuid,uuid,text,text,timestamp with time zone) from public,anon,authenticated,service_role;
grant execute on function concierge_private.concierge_start_or_refresh_session_impl_v1(text,text,uuid,uuid,uuid,text,text,timestamp with time zone) to service_role;
create function public.concierge_start_or_refresh_session(p_phone_hash text, p_selected_mode text DEFAULT NULL::text, p_selected_account_id uuid DEFAULT NULL::uuid, p_selected_stay_id uuid DEFAULT NULL::uuid, p_selected_task_id uuid DEFAULT NULL::uuid, p_language text DEFAULT 'es'::text, p_current_intent text DEFAULT NULL::text, p_at timestamp with time zone DEFAULT now()) returns TABLE(session_id uuid, resolved_mode text, reason_code text)
language plpgsql security invoker set search_path='' as $guard$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.concierge_start_or_refresh_session_impl_v1(p_phone_hash,p_selected_mode,p_selected_account_id,p_selected_stay_id,p_selected_task_id,p_language,p_current_intent,p_at);
end $guard$;
revoke all on function public.concierge_start_or_refresh_session(text,text,uuid,uuid,uuid,text,text,timestamp with time zone) from public,anon,authenticated,service_role;
grant execute on function public.concierge_start_or_refresh_session(text,text,uuid,uuid,uuid,text,text,timestamp with time zone) to service_role;

alter function public.concierge_authorize_secret_access(uuid,uuid,uuid) set schema concierge_private;
alter function concierge_private.concierge_authorize_secret_access(uuid,uuid,uuid) rename to legacy_concierge_authorize_secret_access_v1;
revoke all on function concierge_private.legacy_concierge_authorize_secret_access_v1(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function concierge_private.legacy_concierge_authorize_secret_access_v1(uuid,uuid,uuid) to cheveni_runtime_executor;
create function concierge_private.concierge_authorize_secret_access_impl_v1(p_guest_identity_id uuid, p_stay_member_id uuid, p_access_point_id uuid) returns TABLE(result text, reason_code text, secret_version_id uuid, vault_secret_id uuid)
language plpgsql security definer set search_path='' as $guard$ declare e uuid;r record;begin
 e:=concierge_private.check_runtime_v1(p_stay_member_id,'guest_access');
 if e is null or not exists(select 1 from public.concierge_stay_members m where m.id=p_stay_member_id and m.guest_identity_id=p_guest_identity_id) then
  return query select 'deny'::text,'GUEST_RUNTIME_AUTHORITY_REQUIRED'::text,null::uuid,null::uuid;return;
 end if;
 -- Lock current revocable access state before delegating the established rules.
 perform 1 from public.concierge_access_points where id=p_access_point_id for share;
 perform 1 from public.concierge_access_point_policies where access_point_id=p_access_point_id for share;
 perform 1 from public.concierge_access_authorizations where stay_member_id=p_stay_member_id and access_point_id=p_access_point_id for share;
 perform 1 from public.concierge_secret_versions where access_point_id=p_access_point_id for share;
 select * into r from concierge_private.legacy_concierge_authorize_secret_access_v1(p_guest_identity_id,p_stay_member_id,p_access_point_id);
 if r.result='allow' and (not exists(select 1 from public.concierge_stay_members m join public.concierge_stays s on s.id=m.stay_id and s.account_id=m.account_id where m.id=p_stay_member_id and s.access_from<=clock_timestamp() and least(s.access_until,s.check_out_at)>clock_timestamp()) or not exists(select 1 from public.concierge_access_authorizations a where a.stay_member_id=p_stay_member_id and a.access_point_id=p_access_point_id and a.status='active' and a.authorized_from<=clock_timestamp() and a.authorized_until>clock_timestamp()) or not concierge_private.runtime_evidence_valid_v1(e)) then
  return query select 'deny'::text,'ACCESS_WINDOW_EXPIRED'::text,null::uuid,null::uuid;return;
 end if;
 return query select r.result::text,r.reason_code::text,r.secret_version_id::uuid,r.vault_secret_id::uuid;
end $guard$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.concierge_authorize_secret_access_impl_v1(uuid,uuid,uuid) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.concierge_authorize_secret_access_impl_v1(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function concierge_private.concierge_authorize_secret_access_impl_v1(uuid,uuid,uuid) to service_role;
create function public.concierge_authorize_secret_access(p_guest_identity_id uuid, p_stay_member_id uuid, p_access_point_id uuid) returns TABLE(result text, reason_code text, secret_version_id uuid, vault_secret_id uuid)
language plpgsql security invoker set search_path='' as $guard$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.concierge_authorize_secret_access_impl_v1(p_guest_identity_id,p_stay_member_id,p_access_point_id);
end $guard$;
revoke all on function public.concierge_authorize_secret_access(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.concierge_authorize_secret_access(uuid,uuid,uuid) to service_role;

-- The existing INVOKER reveal RPC calls the guarded authorizer before Vault.
-- Supabase can create functions without any API EXECUTE grant. Declare the
-- backend capability explicitly; do not expose the RPC to browser roles.
revoke all on function public.concierge_reveal_secret(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.concierge_reveal_secret(uuid,uuid,uuid) to service_role;

alter function public.concierge_manager_decide_request(uuid,uuid,text,text,timestamp with time zone,timestamp with time zone,text) set schema concierge_private;
alter function concierge_private.concierge_manager_decide_request(uuid,uuid,text,text,timestamp with time zone,timestamp with time zone,text) rename to legacy_concierge_manager_decide_request_v1;
revoke all on function concierge_private.legacy_concierge_manager_decide_request_v1(uuid,uuid,text,text,timestamp with time zone,timestamp with time zone,text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.legacy_concierge_manager_decide_request_v1(uuid,uuid,text,text,timestamp with time zone,timestamp with time zone,text) to cheveni_runtime_executor;
create function concierge_private.concierge_manager_decide_request_impl_v1(p_request_id uuid, p_account_member_id uuid, p_decision text, p_approved_value text DEFAULT NULL::text, p_approved_at_time timestamp with time zone DEFAULT NULL::timestamp with time zone, p_approved_until timestamp with time zone DEFAULT NULL::timestamp with time zone, p_decision_summary text DEFAULT NULL::text) returns TABLE(request_id uuid, resulting_status text, stay_updated boolean, effective_time timestamp with time zone)
language plpgsql security definer set search_path='' as $guard$ declare r public.concierge_requests%rowtype;e uuid;v record;old_window record;begin
 -- Scope and manager permission precede guest proof, status checks and locks.
 -- A foreign UUID must not disclose whether the request is already decided.
 select * into r from public.concierge_requests x where x.id=p_request_id and exists(
  select 1 from public.concierge_account_members m where m.id=p_account_member_id and m.account_id=x.account_id and m.status='active'
   and (m.role in ('owner','manager') or (m.role='co_manager' and exists(
    select 1 from public.concierge_member_property_permissions p where p.account_id=x.account_id and p.member_id=m.id and p.property_id=x.property_id and p.can_approve_requests
   )))
 ) for update;
 if not found then raise exception 'RESOURCE_OUT_OF_SCOPE';end if;
 e:=concierge_private.check_runtime_v1(r.requested_by_stay_member_id,'stay_change');
 if e is null or not exists(select 1 from public.concierge_stay_members m join public.concierge_stays s on s.id=m.stay_id and s.account_id=m.account_id where m.id=r.requested_by_stay_member_id and m.account_id=r.account_id and m.stay_id=r.stay_id and s.property_id=r.property_id) then raise exception 'GUEST_RUNTIME_AUTHORITY_REQUIRED';end if;
 select access_from,access_until into old_window from public.concierge_stays where id=r.stay_id and account_id=r.account_id for update;
 select * into v from concierge_private.legacy_concierge_manager_decide_request_v1(p_request_id,p_account_member_id,p_decision,p_approved_value,p_approved_at_time,p_approved_until,p_decision_summary);
 if not concierge_private.runtime_evidence_valid_v1(e) then raise exception 'RUNTIME_AUTHORITY_EXPIRED_DURING_WRITE';end if;
 if v.stay_updated then
  update public.concierge_access_authorizations a set authorized_from=s.access_from,authorized_until=s.access_until,updated_at=clock_timestamp() from public.concierge_stays s where s.id=r.stay_id and s.account_id=r.account_id and a.stay_member_id=r.requested_by_stay_member_id and a.account_id=r.account_id and a.status='active' and a.authorized_from=old_window.access_from and a.authorized_until=old_window.access_until and a.authorized_until>clock_timestamp();
 end if;
 return query select v.request_id::uuid,v.resulting_status::text,v.stay_updated::boolean,v.effective_time::timestamptz;
end $guard$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.concierge_manager_decide_request_impl_v1(uuid,uuid,text,text,timestamp with time zone,timestamp with time zone,text) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.concierge_manager_decide_request_impl_v1(uuid,uuid,text,text,timestamp with time zone,timestamp with time zone,text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.concierge_manager_decide_request_impl_v1(uuid,uuid,text,text,timestamp with time zone,timestamp with time zone,text) to service_role;
create function public.concierge_manager_decide_request(p_request_id uuid, p_account_member_id uuid, p_decision text, p_approved_value text DEFAULT NULL::text, p_approved_at_time timestamp with time zone DEFAULT NULL::timestamp with time zone, p_approved_until timestamp with time zone DEFAULT NULL::timestamp with time zone, p_decision_summary text DEFAULT NULL::text) returns TABLE(request_id uuid, resulting_status text, stay_updated boolean, effective_time timestamp with time zone)
language plpgsql security invoker set search_path='' as $guard$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.concierge_manager_decide_request_impl_v1(p_request_id,p_account_member_id,p_decision,p_approved_value,p_approved_at_time,p_approved_until,p_decision_summary);
end $guard$;
revoke all on function public.concierge_manager_decide_request(uuid,uuid,text,text,timestamp with time zone,timestamp with time zone,text) from public,anon,authenticated,service_role;
grant execute on function public.concierge_manager_decide_request(uuid,uuid,text,text,timestamp with time zone,timestamp with time zone,text) to service_role;

alter function public.concierge_request_guest_phone_replacement(uuid,uuid,text) set schema concierge_private;
alter function concierge_private.concierge_request_guest_phone_replacement(uuid,uuid,text) rename to legacy_concierge_request_guest_phone_replacement_v1;
revoke all on function concierge_private.legacy_concierge_request_guest_phone_replacement_v1(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.legacy_concierge_request_guest_phone_replacement_v1(uuid,uuid,text) to cheveni_runtime_executor;
create function concierge_private.concierge_request_guest_phone_replacement_impl_v1(p_manager_id uuid, p_stay_member_id uuid, p_new_phone_hash text) returns TABLE(result text, reason_code text, change_id uuid)
language plpgsql security definer set search_path='' as $guard$ declare e uuid;r record;begin
 -- Rare Beta V1 identity mutations share one transaction lock BEFORE any row
 -- lock. This avoids mutual SHARE-to-UPDATE upgrades across all three stages,
 -- including two members sharing an old identity. Ordinary guest reads do not
 -- acquire this advisory lock; evidence and policy revocation still win normally.
 perform pg_advisory_xact_lock(hashtextextended('cheveni-phone-replacement-v1',0));
 e:=concierge_private.check_runtime_v1(p_stay_member_id,'phone_replacement',p_new_phone_hash);
 if e is null then return query select 'deny'::text,'PHONE_REPLACEMENT_AUTHORITY_REQUIRED'::text,null::uuid;return;end if;
 select * into r from concierge_private.legacy_concierge_request_guest_phone_replacement_v1(p_manager_id,p_stay_member_id,p_new_phone_hash);
 if not concierge_private.runtime_evidence_valid_v1(e) then raise exception 'RUNTIME_AUTHORITY_EXPIRED_DURING_WRITE';end if;
 return query select r.result::text,r.reason_code::text,r.change_id::uuid;
end $guard$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.concierge_request_guest_phone_replacement_impl_v1(uuid,uuid,text) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.concierge_request_guest_phone_replacement_impl_v1(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.concierge_request_guest_phone_replacement_impl_v1(uuid,uuid,text) to service_role;
create function public.concierge_request_guest_phone_replacement(p_manager_id uuid, p_stay_member_id uuid, p_new_phone_hash text) returns TABLE(result text, reason_code text, change_id uuid)
language plpgsql security invoker set search_path='' as $guard$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.concierge_request_guest_phone_replacement_impl_v1(p_manager_id,p_stay_member_id,p_new_phone_hash);
end $guard$;
revoke all on function public.concierge_request_guest_phone_replacement(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.concierge_request_guest_phone_replacement(uuid,uuid,text) to service_role;

alter function public.concierge_approve_guest_phone_replacement(uuid,uuid) set schema concierge_private;
alter function concierge_private.concierge_approve_guest_phone_replacement(uuid,uuid) rename to legacy_concierge_approve_guest_phone_replacement_v1;
revoke all on function concierge_private.legacy_concierge_approve_guest_phone_replacement_v1(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function concierge_private.legacy_concierge_approve_guest_phone_replacement_v1(uuid,uuid) to cheveni_runtime_executor;
create function concierge_private.concierge_approve_guest_phone_replacement_impl_v1(p_manager_id uuid, p_change_id uuid) returns TABLE(result text, reason_code text, change_id uuid)
language plpgsql security definer set search_path='' as $guard$ declare c public.concierge_guest_phone_changes%rowtype;e uuid;r record;begin
 perform pg_advisory_xact_lock(hashtextextended('cheveni-phone-replacement-v1',0));
 select * into c from public.concierge_guest_phone_changes x where x.id=p_change_id for share;
 if not found then return query select 'deny'::text,'CHANGE_NOT_FOUND'::text,null::uuid;return;end if;
 e:=concierge_private.check_runtime_v1(c.stay_member_id,'phone_replacement',c.proposed_phone_hash);
 if e is null then return query select 'deny'::text,'PHONE_REPLACEMENT_AUTHORITY_REQUIRED'::text,null::uuid;return;end if;
 select * into r from concierge_private.legacy_concierge_approve_guest_phone_replacement_v1(p_manager_id,p_change_id);
 if not concierge_private.runtime_evidence_valid_v1(e) then raise exception 'RUNTIME_AUTHORITY_EXPIRED_DURING_WRITE';end if;
 return query select r.result::text,r.reason_code::text,r.change_id::uuid;
end $guard$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.concierge_approve_guest_phone_replacement_impl_v1(uuid,uuid) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.concierge_approve_guest_phone_replacement_impl_v1(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function concierge_private.concierge_approve_guest_phone_replacement_impl_v1(uuid,uuid) to service_role;
create function public.concierge_approve_guest_phone_replacement(p_manager_id uuid, p_change_id uuid) returns TABLE(result text, reason_code text, change_id uuid)
language plpgsql security invoker set search_path='' as $guard$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.concierge_approve_guest_phone_replacement_impl_v1(p_manager_id,p_change_id);
end $guard$;
revoke all on function public.concierge_approve_guest_phone_replacement(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.concierge_approve_guest_phone_replacement(uuid,uuid) to service_role;

alter function public.concierge_activate_guest_phone_replacement(text) set schema concierge_private;
alter function concierge_private.concierge_activate_guest_phone_replacement(text) rename to legacy_concierge_activate_guest_phone_replacement_v1;
revoke all on function concierge_private.legacy_concierge_activate_guest_phone_replacement_v1(text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.legacy_concierge_activate_guest_phone_replacement_v1(text) to cheveni_runtime_executor;
create function concierge_private.concierge_activate_guest_phone_replacement_impl_v1(p_verified_phone_hash text) returns TABLE(result text, reason_code text, change_id uuid, guest_identity_id uuid, stay_member_id uuid)
language plpgsql security definer set search_path='' as $guard$ declare c public.concierge_guest_phone_changes%rowtype;e uuid;r record;v_count integer;begin
 perform pg_advisory_xact_lock(hashtextextended('cheveni-phone-replacement-v1',0));
 select count(*) into v_count from public.concierge_guest_phone_changes x where x.proposed_phone_hash=p_verified_phone_hash and x.status='approved' and x.expires_at>clock_timestamp();
 if v_count<>1 then return query select 'deny'::text,'NO_UNIQUE_APPROVED_CHANGE'::text,null::uuid,null::uuid,null::uuid;return;end if;
 select * into c from public.concierge_guest_phone_changes x where x.proposed_phone_hash=p_verified_phone_hash and x.status='approved' and x.expires_at>clock_timestamp() for share;
 e:=concierge_private.check_runtime_v1(c.stay_member_id,'phone_replacement',p_verified_phone_hash);
 if e is null then return query select 'deny'::text,'PHONE_REPLACEMENT_AUTHORITY_REQUIRED'::text,c.id,null::uuid,null::uuid;return;end if;
 select * into r from concierge_private.legacy_concierge_activate_guest_phone_replacement_v1(p_verified_phone_hash);
 if not concierge_private.runtime_evidence_valid_v1(e) then raise exception 'RUNTIME_AUTHORITY_EXPIRED_DURING_WRITE';end if;
 return query select r.result::text,r.reason_code::text,r.change_id::uuid,r.guest_identity_id::uuid,r.stay_member_id::uuid;
end $guard$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.concierge_activate_guest_phone_replacement_impl_v1(text) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.concierge_activate_guest_phone_replacement_impl_v1(text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.concierge_activate_guest_phone_replacement_impl_v1(text) to service_role;
create function public.concierge_activate_guest_phone_replacement(p_verified_phone_hash text) returns TABLE(result text, reason_code text, change_id uuid, guest_identity_id uuid, stay_member_id uuid)
language plpgsql security invoker set search_path='' as $guard$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.concierge_activate_guest_phone_replacement_impl_v1(p_verified_phone_hash);
end $guard$;
revoke all on function public.concierge_activate_guest_phone_replacement(text) from public,anon,authenticated,service_role;
grant execute on function public.concierge_activate_guest_phone_replacement(text) to service_role;

alter function public.concierge_open_request(uuid,uuid,text,text,timestamp with time zone) set schema concierge_private;
alter function concierge_private.concierge_open_request(uuid,uuid,text,text,timestamp with time zone) rename to legacy_concierge_open_request_v1;
revoke all on function concierge_private.legacy_concierge_open_request_v1(uuid,uuid,text,text,timestamp with time zone) from public,anon,authenticated,service_role;
grant execute on function concierge_private.legacy_concierge_open_request_v1(uuid,uuid,text,text,timestamp with time zone) to cheveni_runtime_executor;
create function concierge_private.concierge_open_request_impl_v1(p_guest_identity_id uuid, p_stay_member_id uuid, p_request_type text, p_requested_value text DEFAULT NULL::text, p_requested_at_time timestamp with time zone DEFAULT NULL::timestamp with time zone) returns TABLE(result text, reason_code text, request_id uuid, resulting_status text, handling_mode text)
language plpgsql security definer set search_path='' as $guard$ declare e uuid;begin e:=concierge_private.check_runtime_v1(p_stay_member_id,'stay_change');if e is null or not exists(select 1 from public.concierge_stay_members m where m.id=p_stay_member_id and m.guest_identity_id=p_guest_identity_id) then raise exception 'GUEST_RUNTIME_AUTHORITY_REQUIRED';end if;return query select * from concierge_private.legacy_concierge_open_request_v1(p_guest_identity_id,p_stay_member_id,p_request_type,p_requested_value,p_requested_at_time);if not concierge_private.runtime_evidence_valid_v1(e) then raise exception 'RUNTIME_AUTHORITY_EXPIRED_DURING_WRITE';end if;end $guard$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.concierge_open_request_impl_v1(uuid,uuid,text,text,timestamp with time zone) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.concierge_open_request_impl_v1(uuid,uuid,text,text,timestamp with time zone) from public,anon,authenticated,service_role;
grant execute on function concierge_private.concierge_open_request_impl_v1(uuid,uuid,text,text,timestamp with time zone) to service_role;
create function public.concierge_open_request(p_guest_identity_id uuid, p_stay_member_id uuid, p_request_type text, p_requested_value text DEFAULT NULL::text, p_requested_at_time timestamp with time zone DEFAULT NULL::timestamp with time zone) returns TABLE(result text, reason_code text, request_id uuid, resulting_status text, handling_mode text)
language plpgsql security invoker set search_path='' as $guard$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.concierge_open_request_impl_v1(p_guest_identity_id,p_stay_member_id,p_request_type,p_requested_value,p_requested_at_time);
end $guard$;
revoke all on function public.concierge_open_request(uuid,uuid,text,text,timestamp with time zone) from public,anon,authenticated,service_role;
grant execute on function public.concierge_open_request(uuid,uuid,text,text,timestamp with time zone) to service_role;

alter function public.concierge_open_incident(uuid,uuid,text,text,text) set schema concierge_private;
alter function concierge_private.concierge_open_incident(uuid,uuid,text,text,text) rename to legacy_concierge_open_incident_v1;
revoke all on function concierge_private.legacy_concierge_open_incident_v1(uuid,uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.legacy_concierge_open_incident_v1(uuid,uuid,text,text,text) to cheveni_runtime_executor;
create function concierge_private.concierge_open_incident_impl_v1(p_guest_identity_id uuid, p_stay_member_id uuid, p_category text, p_severity text, p_summary text) returns TABLE(result text, reason_code text, incident_id uuid, resulting_status text, manager_intervention_required boolean)
language plpgsql security definer set search_path='' as $guard$ declare e uuid;begin e:=concierge_private.check_runtime_v1(p_stay_member_id,'guest_session');if e is null or not exists(select 1 from public.concierge_stay_members m where m.id=p_stay_member_id and m.guest_identity_id=p_guest_identity_id) then raise exception 'GUEST_RUNTIME_AUTHORITY_REQUIRED';end if;return query select * from concierge_private.legacy_concierge_open_incident_v1(p_guest_identity_id,p_stay_member_id,p_category,p_severity,p_summary);if not concierge_private.runtime_evidence_valid_v1(e) then raise exception 'RUNTIME_AUTHORITY_EXPIRED_DURING_WRITE';end if;end $guard$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.concierge_open_incident_impl_v1(uuid,uuid,text,text,text) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.concierge_open_incident_impl_v1(uuid,uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.concierge_open_incident_impl_v1(uuid,uuid,text,text,text) to service_role;
create function public.concierge_open_incident(p_guest_identity_id uuid, p_stay_member_id uuid, p_category text, p_severity text, p_summary text) returns TABLE(result text, reason_code text, incident_id uuid, resulting_status text, manager_intervention_required boolean)
language plpgsql security invoker set search_path='' as $guard$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.concierge_open_incident_impl_v1(p_guest_identity_id,p_stay_member_id,p_category,p_severity,p_summary);
end $guard$;
revoke all on function public.concierge_open_incident(uuid,uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.concierge_open_incident(uuid,uuid,text,text,text) to service_role;

alter function public.concierge_guest_apply_incident_protocol(uuid,uuid,uuid,uuid,uuid) set schema concierge_private;
alter function concierge_private.concierge_guest_apply_incident_protocol(uuid,uuid,uuid,uuid,uuid) rename to legacy_concierge_guest_apply_incident_protocol_v1;
revoke all on function concierge_private.legacy_concierge_guest_apply_incident_protocol_v1(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function concierge_private.legacy_concierge_guest_apply_incident_protocol_v1(uuid,uuid,uuid,uuid,uuid) to cheveni_runtime_executor;
create function concierge_private.concierge_guest_apply_incident_protocol_impl_v1(p_guest_identity_id uuid, p_stay_member_id uuid, p_incident_id uuid, p_knowledge_item_id uuid, p_knowledge_version_id uuid) returns TABLE(result text, reason_code text, incident_id uuid, resulting_status text)
language plpgsql security definer set search_path='' as $guard$ declare e uuid;begin e:=concierge_private.check_runtime_v1(p_stay_member_id,'guest_session');if e is null or not exists(select 1 from public.concierge_stay_members m where m.id=p_stay_member_id and m.guest_identity_id=p_guest_identity_id) then raise exception 'GUEST_RUNTIME_AUTHORITY_REQUIRED';end if;return query select * from concierge_private.legacy_concierge_guest_apply_incident_protocol_v1(p_guest_identity_id,p_stay_member_id,p_incident_id,p_knowledge_item_id,p_knowledge_version_id);if not concierge_private.runtime_evidence_valid_v1(e) then raise exception 'RUNTIME_AUTHORITY_EXPIRED_DURING_WRITE';end if;end $guard$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.concierge_guest_apply_incident_protocol_impl_v1(uuid,uuid,uuid,uuid,uuid) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.concierge_guest_apply_incident_protocol_impl_v1(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function concierge_private.concierge_guest_apply_incident_protocol_impl_v1(uuid,uuid,uuid,uuid,uuid) to service_role;
create function public.concierge_guest_apply_incident_protocol(p_guest_identity_id uuid, p_stay_member_id uuid, p_incident_id uuid, p_knowledge_item_id uuid, p_knowledge_version_id uuid) returns TABLE(result text, reason_code text, incident_id uuid, resulting_status text)
language plpgsql security invoker set search_path='' as $guard$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.concierge_guest_apply_incident_protocol_impl_v1(p_guest_identity_id,p_stay_member_id,p_incident_id,p_knowledge_item_id,p_knowledge_version_id);
end $guard$;
revoke all on function public.concierge_guest_apply_incident_protocol(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.concierge_guest_apply_incident_protocol(uuid,uuid,uuid,uuid,uuid) to service_role;

alter function public.concierge_guest_confirm_incident_resolved(uuid,uuid,uuid,text) set schema concierge_private;
alter function concierge_private.concierge_guest_confirm_incident_resolved(uuid,uuid,uuid,text) rename to legacy_concierge_guest_confirm_incident_resolved_v1;
revoke all on function concierge_private.legacy_concierge_guest_confirm_incident_resolved_v1(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.legacy_concierge_guest_confirm_incident_resolved_v1(uuid,uuid,uuid,text) to cheveni_runtime_executor;
create function concierge_private.concierge_guest_confirm_incident_resolved_impl_v1(p_guest_identity_id uuid, p_stay_member_id uuid, p_incident_id uuid, p_resolution_summary text DEFAULT NULL::text) returns TABLE(result text, reason_code text, incident_id uuid, resulting_status text)
language plpgsql security definer set search_path='' as $guard$ declare e uuid;begin e:=concierge_private.check_runtime_v1(p_stay_member_id,'guest_session');if e is null or not exists(select 1 from public.concierge_stay_members m where m.id=p_stay_member_id and m.guest_identity_id=p_guest_identity_id) then raise exception 'GUEST_RUNTIME_AUTHORITY_REQUIRED';end if;return query select * from concierge_private.legacy_concierge_guest_confirm_incident_resolved_v1(p_guest_identity_id,p_stay_member_id,p_incident_id,p_resolution_summary);if not concierge_private.runtime_evidence_valid_v1(e) then raise exception 'RUNTIME_AUTHORITY_EXPIRED_DURING_WRITE';end if;end $guard$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.concierge_guest_confirm_incident_resolved_impl_v1(uuid,uuid,uuid,text) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.concierge_guest_confirm_incident_resolved_impl_v1(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.concierge_guest_confirm_incident_resolved_impl_v1(uuid,uuid,uuid,text) to service_role;
create function public.concierge_guest_confirm_incident_resolved(p_guest_identity_id uuid, p_stay_member_id uuid, p_incident_id uuid, p_resolution_summary text DEFAULT NULL::text) returns TABLE(result text, reason_code text, incident_id uuid, resulting_status text)
language plpgsql security invoker set search_path='' as $guard$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.concierge_guest_confirm_incident_resolved_impl_v1(p_guest_identity_id,p_stay_member_id,p_incident_id,p_resolution_summary);
end $guard$;
revoke all on function public.concierge_guest_confirm_incident_resolved(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.concierge_guest_confirm_incident_resolved(uuid,uuid,uuid,text) to service_role;

alter function public.concierge_guest_report_incident_unresolved(uuid,uuid,uuid,text) set schema concierge_private;
alter function concierge_private.concierge_guest_report_incident_unresolved(uuid,uuid,uuid,text) rename to legacy_concierge_guest_report_incident_unresolved_v1;
revoke all on function concierge_private.legacy_concierge_guest_report_incident_unresolved_v1(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.legacy_concierge_guest_report_incident_unresolved_v1(uuid,uuid,uuid,text) to cheveni_runtime_executor;
create function concierge_private.concierge_guest_report_incident_unresolved_impl_v1(p_guest_identity_id uuid, p_stay_member_id uuid, p_incident_id uuid, p_guest_response text) returns TABLE(result text, reason_code text, incident_id uuid, resulting_status text)
language plpgsql security definer set search_path='' as $guard$ declare e uuid;begin e:=concierge_private.check_runtime_v1(p_stay_member_id,'guest_session');if e is null or not exists(select 1 from public.concierge_stay_members m where m.id=p_stay_member_id and m.guest_identity_id=p_guest_identity_id) then raise exception 'GUEST_RUNTIME_AUTHORITY_REQUIRED';end if;return query select * from concierge_private.legacy_concierge_guest_report_incident_unresolved_v1(p_guest_identity_id,p_stay_member_id,p_incident_id,p_guest_response);if not concierge_private.runtime_evidence_valid_v1(e) then raise exception 'RUNTIME_AUTHORITY_EXPIRED_DURING_WRITE';end if;end $guard$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.concierge_guest_report_incident_unresolved_impl_v1(uuid,uuid,uuid,text) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.concierge_guest_report_incident_unresolved_impl_v1(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.concierge_guest_report_incident_unresolved_impl_v1(uuid,uuid,uuid,text) to service_role;
create function public.concierge_guest_report_incident_unresolved(p_guest_identity_id uuid, p_stay_member_id uuid, p_incident_id uuid, p_guest_response text) returns TABLE(result text, reason_code text, incident_id uuid, resulting_status text)
language plpgsql security invoker set search_path='' as $guard$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.concierge_guest_report_incident_unresolved_impl_v1(p_guest_identity_id,p_stay_member_id,p_incident_id,p_guest_response);
end $guard$;
revoke all on function public.concierge_guest_report_incident_unresolved(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.concierge_guest_report_incident_unresolved(uuid,uuid,uuid,text) to service_role;

alter function public.concierge_manager_learning_offer(uuid) set schema concierge_private;
alter function concierge_private.concierge_manager_learning_offer(uuid) rename to legacy_concierge_manager_learning_offer_v1;
revoke all on function concierge_private.legacy_concierge_manager_learning_offer_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function concierge_private.legacy_concierge_manager_learning_offer_v1(uuid) to cheveni_runtime_executor;
create function concierge_private.concierge_manager_learning_offer_impl_v1(p_manager_id uuid) returns TABLE(handled boolean, reply_text text, stage text)
language plpgsql security definer set search_path='' as $guard$ begin return query select x.handled,replace(x.reply_text,'Chebot','Che Vení'),x.stage from concierge_private.legacy_concierge_manager_learning_offer_v1(p_manager_id) x;end $guard$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.concierge_manager_learning_offer_impl_v1(uuid) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.concierge_manager_learning_offer_impl_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function concierge_private.concierge_manager_learning_offer_impl_v1(uuid) to service_role;
create function public.concierge_manager_learning_offer(p_manager_id uuid) returns TABLE(handled boolean, reply_text text, stage text)
language plpgsql security invoker set search_path='' as $guard$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.concierge_manager_learning_offer_impl_v1(p_manager_id);
end $guard$;
revoke all on function public.concierge_manager_learning_offer(uuid) from public,anon,authenticated,service_role;
grant execute on function public.concierge_manager_learning_offer(uuid) to service_role;

alter function public.concierge_manager_learning_message(uuid,uuid,text) set schema concierge_private;
alter function concierge_private.concierge_manager_learning_message(uuid,uuid,text) rename to legacy_concierge_manager_learning_message_v1;
revoke all on function concierge_private.legacy_concierge_manager_learning_message_v1(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.legacy_concierge_manager_learning_message_v1(uuid,uuid,text) to cheveni_runtime_executor;
create function concierge_private.concierge_manager_learning_message_impl_v1(p_manager_id uuid, p_action_id uuid, p_message text) returns TABLE(handled boolean, reply_text text, stage text)
language plpgsql security definer set search_path='' as $guard$ begin return query select x.handled,replace(x.reply_text,'Chebot','Che Vení'),x.stage from concierge_private.legacy_concierge_manager_learning_message_v1(p_manager_id,p_action_id,p_message) x;end $guard$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.concierge_manager_learning_message_impl_v1(uuid,uuid,text) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.concierge_manager_learning_message_impl_v1(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.concierge_manager_learning_message_impl_v1(uuid,uuid,text) to service_role;
create function public.concierge_manager_learning_message(p_manager_id uuid, p_action_id uuid, p_message text) returns TABLE(handled boolean, reply_text text, stage text)
language plpgsql security invoker set search_path='' as $guard$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.concierge_manager_learning_message_impl_v1(p_manager_id,p_action_id,p_message);
end $guard$;
revoke all on function public.concierge_manager_learning_message(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.concierge_manager_learning_message(uuid,uuid,text) to service_role;
grant usage on schema concierge_private to service_role;
-- Guest-initiated activation breaks the first-contact circular dependency:
-- a new encrypted channel cannot exist before the guest has contacted us.
-- Accepting an invite is NOT recorded as a template being sent or delivered.
grant select,insert on public.concierge_guest_channels to cheveni_runtime_executor;
grant update(recipient_ciphertext,cipher_version,business_phone_number_id,status,last_seen_at,updated_at) on public.concierge_guest_channels to cheveni_runtime_executor;
create policy runtime_channel_read on public.concierge_guest_channels for select to cheveni_runtime_executor using(true);
create policy runtime_channel_insert on public.concierge_guest_channels for insert to cheveni_runtime_executor with check(channel='whatsapp' and status='active');
create policy runtime_channel_update on public.concierge_guest_channels for update to cheveni_runtime_executor using(channel='whatsapp') with check(channel='whatsapp');
create table concierge_private.guest_activation_events_v1(
 invite_id uuid primary key references public.concierge_guest_invites(id),account_id uuid not null references public.concierge_accounts(id),
 stay_member_id uuid not null references public.concierge_stay_members(id),evidence_id uuid not null references concierge_private.runtime_authorizations_v1(evidence_id),
 accepted_at timestamptz not null default clock_timestamp(),transport text not null check(transport='guest_initiated')
);
alter table concierge_private.guest_activation_events_v1 enable row level security;
revoke all on concierge_private.guest_activation_events_v1 from public,anon,authenticated,service_role;
grant select,insert on concierge_private.guest_activation_events_v1 to cheveni_runtime_executor;
create policy runtime_activation_read on concierge_private.guest_activation_events_v1 for select to cheveni_runtime_executor using(true);
create policy runtime_activation_insert on concierge_private.guest_activation_events_v1 for insert to cheveni_runtime_executor with check(transport='guest_initiated');
create function concierge_private.accept_guest_initiated_invitation_v1_impl(p_verified_phone_hash text,p_language text)
returns table(session_id uuid,resolved_mode text,reason_code text)
language plpgsql security definer set search_path='' as $$ declare c record;e uuid;r record;n integer;
begin
 if p_verified_phone_hash is null or p_verified_phone_hash !~ '^[0-9a-f]{64}$' or p_language not in ('es','en','it','pt') then
  return query select null::uuid,'unresolved'::text,'GUEST_INVITE_NOT_FOUND_OR_EXPIRED'::text;return;
 end if;
 -- Serialize repeated signed inbound events for this phone before selecting.
 perform pg_advisory_xact_lock(hashtextextended('cheveni-guest-activation:'||p_verified_phone_hash,0));
 select count(distinct m.id) into n from public.concierge_guest_identities g
 join public.concierge_stay_members m on m.guest_identity_id=g.id
 join public.concierge_stays s on s.id=m.stay_id and s.account_id=m.account_id
 join public.concierge_properties p on p.id=s.property_id and p.account_id=s.account_id
 join public.concierge_guest_invites i on i.stay_member_id=m.id and i.account_id=m.account_id
 where g.phone_hash=p_verified_phone_hash and g.status='active' and m.status in ('invited','active') and m.whatsapp_enabled
  and s.status in ('scheduled','active') and s.check_out_at>clock_timestamp() and p.status='active' and p.city='Buenos Aires'
  and i.status in ('created','sent','activated') and i.rejected_at is null and i.expires_at>clock_timestamp();
 if n<>1 then return query select null::uuid,'unresolved'::text,case when n>1 then 'GUEST_INVITE_AMBIGUOUS' else 'GUEST_INVITE_NOT_FOUND_OR_EXPIRED' end;return;end if;
 select i.id as invite_id,m.id as member_id,m.stay_id,m.account_id into c
 from public.concierge_guest_identities g join public.concierge_stay_members m on m.guest_identity_id=g.id
 join public.concierge_stays s on s.id=m.stay_id and s.account_id=m.account_id
 join public.concierge_properties p on p.id=s.property_id and p.account_id=s.account_id
 join public.concierge_guest_invites i on i.stay_member_id=m.id and i.account_id=m.account_id
 where g.phone_hash=p_verified_phone_hash and g.status='active' and m.status in ('invited','active') and m.whatsapp_enabled
  and s.status in ('scheduled','active') and s.check_out_at>clock_timestamp() and p.status='active' and p.city='Buenos Aires'
  and i.status in ('created','sent','activated') and i.rejected_at is null and i.expires_at>clock_timestamp()
 order by i.created_at desc limit 1 for update of i,m;
 if not found then return query select null::uuid,'unresolved'::text,'GUEST_INVITE_NOT_FOUND_OR_EXPIRED'::text;return;end if;
 e:=concierge_private.check_runtime_v1(c.member_id,'guest_session',p_verified_phone_hash);
 if e is null then return query select null::uuid,'unresolved'::text,'GUEST_RUNTIME_AUTHORITY_REQUIRED'::text;return;end if;
 update public.concierge_guest_invites set status='activated',activated_at=coalesce(activated_at,clock_timestamp()) where id=c.invite_id;
 update public.concierge_stay_members set status='active',activated_at=coalesce(activated_at,clock_timestamp()) where id=c.member_id;
 insert into concierge_private.guest_activation_events_v1(invite_id,account_id,stay_member_id,evidence_id,transport)
 values(c.invite_id,c.account_id,c.member_id,e,'guest_initiated') on conflict do nothing;
 select * into r from concierge_private.concierge_start_or_refresh_session_impl_v1(p_verified_phone_hash,'concierge_guest',c.account_id,c.stay_id,null,p_language,null,clock_timestamp());
 if r.resolved_mode is distinct from 'concierge_guest' or not concierge_private.runtime_evidence_valid_v1(e) then raise exception 'GUEST_ACTIVATION_OUTCOME_NOT_CONFIRMED';end if;
 return query select r.session_id::uuid,r.resolved_mode::text,r.reason_code::text;
end $$;
create function concierge_private.remember_guarded_guest_channel_v1_impl(p_stay_member_id uuid,p_guest_identity_id uuid,p_verified_phone_hash text,p_recipient_ciphertext text,p_business_phone_number_id text)
returns table(result text) language plpgsql security definer set search_path='' as $$ declare e uuid;
begin
 e:=concierge_private.check_runtime_v1(p_stay_member_id,'guest_session',p_verified_phone_hash);
 if e is null or p_recipient_ciphertext is null or p_recipient_ciphertext !~ '^v1\.' or length(p_recipient_ciphertext)>4096
  or p_business_phone_number_id is null or p_business_phone_number_id !~ '^[0-9]{5,30}$'
  or not exists(select 1 from public.concierge_stay_members m where m.id=p_stay_member_id and m.guest_identity_id=p_guest_identity_id and m.status='active') then
  return query select 'deny'::text;return;
 end if;
 insert into public.concierge_guest_channels(guest_identity_id,channel,recipient_ciphertext,cipher_version,business_phone_number_id,status,last_seen_at,updated_at)
 values(p_guest_identity_id,'whatsapp',p_recipient_ciphertext,1,p_business_phone_number_id,'active',clock_timestamp(),clock_timestamp())
 on conflict(guest_identity_id,channel) do update set recipient_ciphertext=excluded.recipient_ciphertext,cipher_version=excluded.cipher_version,business_phone_number_id=excluded.business_phone_number_id,status='active',last_seen_at=excluded.last_seen_at,updated_at=excluded.updated_at;
 if not concierge_private.runtime_evidence_valid_v1(e) then raise exception 'RUNTIME_AUTHORITY_EXPIRED_DURING_WRITE';end if;
 return query select 'stored'::text;
end $$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.accept_guest_initiated_invitation_v1_impl(text,text) owner to cheveni_runtime_executor;
alter function concierge_private.remember_guarded_guest_channel_v1_impl(uuid,uuid,text,text,text) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.accept_guest_initiated_invitation_v1_impl(text,text),concierge_private.remember_guarded_guest_channel_v1_impl(uuid,uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.accept_guest_initiated_invitation_v1_impl(text,text),concierge_private.remember_guarded_guest_channel_v1_impl(uuid,uuid,text,text,text) to service_role;
create function public.concierge_accept_guest_initiated_invitation_v1(p_verified_phone_hash text,p_language text)
returns table(session_id uuid,resolved_mode text,reason_code text) language plpgsql security invoker set search_path='' as $$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.accept_guest_initiated_invitation_v1_impl(p_verified_phone_hash,p_language);
end $$;
create function public.concierge_remember_guarded_guest_channel_v1(p_stay_member_id uuid,p_guest_identity_id uuid,p_verified_phone_hash text,p_recipient_ciphertext text,p_business_phone_number_id text)
returns table(result text) language plpgsql security invoker set search_path='' as $$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.remember_guarded_guest_channel_v1_impl(p_stay_member_id,p_guest_identity_id,p_verified_phone_hash,p_recipient_ciphertext,p_business_phone_number_id);
end $$;
revoke all on function public.concierge_accept_guest_initiated_invitation_v1(text,text),public.concierge_remember_guarded_guest_channel_v1(uuid,uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.concierge_accept_guest_initiated_invitation_v1(text,text),public.concierge_remember_guarded_guest_channel_v1(uuid,uuid,text,text,text) to service_role;
create function concierge_private.phone_change_readiness_v1_impl(p_manager_id uuid,p_account_id uuid)
returns table(result text) language plpgsql security definer set search_path='' as $$ begin
 if exists(select 1 from public.concierge_account_members m join public.concierge_accounts a on a.id=m.account_id where m.id=p_manager_id and m.account_id=p_account_id and m.status='active' and a.status in ('testing','active'))
  and exists(select 1 from concierge_private.runtime_policies_v1 p where p.purpose='phone_replacement' and p.revoked_at is null and p.approved_at<=clock_timestamp() and p.expires_at>clock_timestamp()) then
  return query select 'ready'::text;else return query select 'not_ready'::text;end if;
end $$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.phone_change_readiness_v1_impl(uuid,uuid) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.phone_change_readiness_v1_impl(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function concierge_private.phone_change_readiness_v1_impl(uuid,uuid) to service_role;
create function public.concierge_phone_change_readiness_v1(p_manager_id uuid,p_account_id uuid)
returns table(result text) language plpgsql security invoker set search_path='' as $$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.phone_change_readiness_v1_impl(p_manager_id,p_account_id);
end $$;
revoke all on function public.concierge_phone_change_readiness_v1(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.concierge_phone_change_readiness_v1(uuid,uuid) to service_role;
grant update(guide_context) on public.concierge_sessions to cheveni_runtime_executor;
create function concierge_private.save_guarded_guide_context_v1_impl(p_session_id uuid,p_verified_phone_hash text,p_context jsonb)
returns table(result text) language plpgsql security definer set search_path='' as $$ declare s public.concierge_sessions%rowtype;e uuid;k text;
begin
 if jsonb_typeof(p_context)<>'object' or length(p_context::text)>65536 then return query select 'deny'::text;return;end if;
 for k in select jsonb_object_keys(p_context) loop
  if k<>all(array['language','city','area','location','plan','cuisine','companions','range','rangeConfirmed','shownVenueIds','lastResults','lastChoiceToken','lastChoiceCards','lastChoiceCardsToken','lastShareResults','lastSponsoredVenueIds','lastApprovedGooglePlaceIds','selectedVenueId','selectedVenueName','feedbackStage','feedbackDraft','reportStage','reportDraft','privacyDeletePending','securityNoticeSent','openNowRequested','visitTiming','visitDate','visitDatePending','visitTime','visitDayPart','destinationMode','destinationFilters','destinationAreaId','destinationLastResults','destinationShownIds','updatedAt']) then return query select 'deny'::text;return;end if;
 end loop;
 select * into s from public.concierge_sessions x where x.id=p_session_id and x.phone_hash=p_verified_phone_hash and x.status='active' and x.mode='concierge_guest' for update;
 if not found then return query select 'deny'::text;return;end if;
 e:=concierge_private.check_runtime_v1(s.stay_member_id,'guest_session',p_verified_phone_hash);
 if e is null then return query select 'deny'::text;return;end if;
 update public.concierge_sessions set guide_context=p_context where id=p_session_id;
 if not concierge_private.runtime_evidence_valid_v1(e) then raise exception 'RUNTIME_AUTHORITY_EXPIRED_DURING_WRITE';end if;
 return query select 'stored'::text;
end $$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.save_guarded_guide_context_v1_impl(uuid,text,jsonb) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.save_guarded_guide_context_v1_impl(uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function concierge_private.save_guarded_guide_context_v1_impl(uuid,text,jsonb) to service_role;
create function public.concierge_save_guarded_guide_context_v1(p_session_id uuid,p_verified_phone_hash text,p_context jsonb)
returns table(result text) language plpgsql security invoker set search_path='' as $$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.save_guarded_guide_context_v1_impl(p_session_id,p_verified_phone_hash,p_context);
end $$;
revoke all on function public.concierge_save_guarded_guide_context_v1(uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.concierge_save_guarded_guide_context_v1(uuid,text,jsonb) to service_role;
-- Notification primitives only expose recipients with purpose-specific authority.
alter function public.concierge_claim_due_notifications(integer,timestamp with time zone) set schema concierge_private;
alter function concierge_private.concierge_claim_due_notifications(integer,timestamp with time zone) rename to legacy_concierge_claim_due_notifications_v1;
CREATE OR REPLACE FUNCTION concierge_private.legacy_concierge_claim_due_notifications_v1(p_limit integer DEFAULT 25, p_at timestamp with time zone DEFAULT now())
 RETURNS TABLE(notification_id uuid, notification_type text, language text, stay_id uuid, stay_member_id uuid, guest_identity_id uuid, recipient_ciphertext text, cipher_version integer, business_phone_number_id text, property_id uuid, property_name text, check_in_at timestamp with time zone, check_out_at timestamp with time zone, access_from timestamp with time zone, access_until timestamp with time zone, attempt_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin

  if p_limit < 1 or p_limit > 100 then
    raise exception using
      errcode = '22023',
      message = 'INVALID_CLAIM_LIMIT';
  end if;

  return query

  with candidates as (
    select
      o.id,
      o.notification_type,
      o.language,
      o.stay_id,
      o.stay_member_id,

      sm.guest_identity_id,

      ch.recipient_ciphertext,
      ch.cipher_version,
      ch.business_phone_number_id,

      s.property_id,
      p.internal_name as property_name,

      s.check_in_at,
      s.check_out_at,
      s.access_from,
      s.access_until

    from public.concierge_notification_outbox o

    join public.concierge_stays s
      on s.id = o.stay_id
     and s.account_id = o.account_id

    join public.concierge_properties p
      on p.id = s.property_id
     and p.account_id = s.account_id

    join public.concierge_stay_members sm
      on sm.id = o.stay_member_id
     and sm.stay_id = s.id
     and sm.account_id = s.account_id

    join public.concierge_guest_identities gi
      on gi.id = sm.guest_identity_id

    join public.concierge_guest_channels ch
      on ch.guest_identity_id = gi.id
     and ch.channel = 'whatsapp'
     and ch.status = 'active'

    where o.status = 'pending'
      and concierge_private.check_runtime_v1(sm.id,'guest_notification') is not null
      and o.due_at <= p_at
      -- Beta V1: no fourth attempt; use claimed_at (stable across failed->pending sync)
      -- for bounded 2-minute/5-minute retry spacing, never updated_at.
      and o.attempt_count < 3
      and (
        o.attempt_count = 0
        or (
          o.attempt_count in (1, 2)
          and o.claimed_at is not null
          and o.claimed_at +
            case when o.attempt_count = 1 then interval '2 minutes'
                 else interval '5 minutes' end <= p_at
        )
      )
      -- Recheck time windows in claim itself (even if sync was skipped).
      and (
        (o.notification_type = 'prearrival' and s.check_in_at > p_at)
        or (o.notification_type = 'checkout'
            and s.check_out_at > p_at
            and s.check_in_at < p_at
            and s.check_out_at > s.check_in_at + interval '4 hours'
            and o.due_at > s.check_in_at)
        or (o.notification_type = 'access_enabled'
            and s.check_out_at > p_at
            and s.access_until > p_at
            and s.access_from >= p_at - interval '15 minutes')
      )

      and s.status in ('scheduled', 'active')

      and sm.member_role = 'primary_guest'
      and sm.status in ('invited', 'active')
      and sm.whatsapp_enabled = true

      and gi.status = 'active'

    order by
      o.due_at asc,
      o.created_at asc

    limit p_limit

    for update of o skip locked
  ),

  claimed as (
    update public.concierge_notification_outbox o
       set status = 'processing',
           claimed_at = p_at,
           attempt_count = o.attempt_count + 1,
           updated_at = p_at
    from candidates c
    where o.id = c.id
    returning
      o.id,
      o.attempt_count
  )

  select
    c.id,
    c.notification_type,
    c.language,
    c.stay_id,
    c.stay_member_id,
    c.guest_identity_id,
    c.recipient_ciphertext,
    c.cipher_version,
    c.business_phone_number_id,
    c.property_id,
    c.property_name,
    c.check_in_at,
    c.check_out_at,
    c.access_from,
    c.access_until,
    cl.attempt_count

  from candidates c
  join claimed cl
    on cl.id = c.id

  order by c.id;

end;
$function$
;
revoke all on function concierge_private.legacy_concierge_claim_due_notifications_v1(integer,timestamp with time zone) from public,anon,authenticated,service_role;
grant execute on function concierge_private.legacy_concierge_claim_due_notifications_v1(integer,timestamp with time zone) to cheveni_runtime_executor;
create function concierge_private.concierge_claim_due_notifications_impl_v1(p_limit integer DEFAULT 25, p_at timestamp with time zone DEFAULT now()) returns TABLE(notification_id uuid, notification_type text, language text, stay_id uuid, stay_member_id uuid, guest_identity_id uuid, recipient_ciphertext text, cipher_version integer, business_phone_number_id text, property_id uuid, property_name text, check_in_at timestamp with time zone, check_out_at timestamp with time zone, access_from timestamp with time zone, access_until timestamp with time zone, attempt_count integer) language plpgsql security definer set search_path='' as $$ begin return query select * from concierge_private.legacy_concierge_claim_due_notifications_v1(p_limit,clock_timestamp()); end $$;
grant create on schema concierge_private to cheveni_runtime_executor;alter function concierge_private.concierge_claim_due_notifications_impl_v1(integer,timestamp with time zone) owner to cheveni_runtime_executor;revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.concierge_claim_due_notifications_impl_v1(integer,timestamp with time zone) from public,anon,authenticated,service_role;grant execute on function concierge_private.concierge_claim_due_notifications_impl_v1(integer,timestamp with time zone) to service_role;
create function public.concierge_claim_due_notifications(p_limit integer DEFAULT 25, p_at timestamp with time zone DEFAULT now()) returns TABLE(notification_id uuid, notification_type text, language text, stay_id uuid, stay_member_id uuid, guest_identity_id uuid, recipient_ciphertext text, cipher_version integer, business_phone_number_id text, property_id uuid, property_name text, check_in_at timestamp with time zone, check_out_at timestamp with time zone, access_from timestamp with time zone, access_until timestamp with time zone, attempt_count integer) language plpgsql security invoker set search_path='' as $$ begin if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;return query select * from concierge_private.concierge_claim_due_notifications_impl_v1(p_limit,p_at);end $$;
revoke all on function public.concierge_claim_due_notifications(integer,timestamp with time zone) from public,anon,authenticated,service_role;grant execute on function public.concierge_claim_due_notifications(integer,timestamp with time zone) to service_role;
alter function public.concierge_sync_notification_outbox(timestamp with time zone) set schema concierge_private;
alter function concierge_private.concierge_sync_notification_outbox(timestamp with time zone) rename to legacy_concierge_sync_notification_outbox_v1;
CREATE OR REPLACE FUNCTION concierge_private.legacy_concierge_sync_notification_outbox_v1(p_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_cancelled bigint := 0;
  v_upserted bigint := 0;
begin

  update public.concierge_notification_outbox o
     set status = 'cancelled',
         cancelled_at = p_at,
         updated_at = p_at
  where o.status in ('pending', 'failed')
    and (
      not exists (
        select 1
        from public.concierge_stays s
        join public.concierge_stay_members sm
          on sm.stay_id = s.id
        where s.id = o.stay_id
          and sm.id = o.stay_member_id
          and s.status in ('scheduled', 'active')
          and sm.member_role = 'primary_guest'
          and sm.whatsapp_enabled = true
          and sm.guest_identity_id is not null
          and sm.status in ('invited', 'active')
      )

      or (
        o.notification_type = 'prearrival'
        and exists (
          select 1
          from public.concierge_stays s
          where s.id = o.stay_id
            and s.check_in_at <= p_at
        )
      )

      or (
        o.notification_type = 'access_enabled'
        and exists (
          select 1
          from public.concierge_stays s
          where s.id = o.stay_id
            and (
              s.access_from < p_at - interval '15 minutes'
              or s.check_out_at <= p_at
              or s.access_until <= p_at
            )
        )
      )

      or (
        o.notification_type = 'checkout'
        and exists (
          select 1
          from public.concierge_stays s
          where s.id = o.stay_id
            and (s.check_out_at <= p_at or s.check_out_at <= s.check_in_at + interval '4 hours')
        )
      )
    );

  get diagnostics v_cancelled = row_count;

  with eligible as (
    select
      s.account_id,
      s.id as stay_id,
      sm.id as stay_member_id,

      case
        when p.default_language in ('es','en','it','pt')
          then p.default_language
        else 'es'
      end as language,

      s.check_in_at,
      s.check_out_at,
      s.access_from,
      s.access_until

    from public.concierge_stays s

    join public.concierge_properties p
      on p.id = s.property_id
     and p.account_id = s.account_id

    join public.concierge_stay_members sm
      on sm.stay_id = s.id
     and sm.account_id = s.account_id

    where s.status in ('scheduled', 'active')
      and concierge_private.check_runtime_v1(sm.id,'guest_notification') is not null
      and sm.member_role = 'primary_guest'
      and sm.whatsapp_enabled = true
      and sm.guest_identity_id is not null
      and sm.status in ('invited', 'active')
  ),

  candidate_notifications as (

    select
      account_id,
      stay_id,
      stay_member_id,
      'prearrival'::text as notification_type,
      language,
      check_in_at - interval '24 hours' as due_at
    from eligible
    where check_in_at > p_at

    union all

    select
      account_id,
      stay_id,
      stay_member_id,
      'access_enabled',
      language,
      access_from
    from eligible
    where check_out_at > p_at
      and access_until > p_at
      and (
        access_from >= p_at
        or (
          access_from >= p_at - interval '15 minutes'
          and exists (
            select 1
            from public.concierge_notification_outbox prior
            where prior.account_id = eligible.account_id
              and prior.stay_id = eligible.stay_id
              and prior.stay_member_id = eligible.stay_member_id
              and prior.notification_type = 'access_enabled'
              and prior.channel = 'whatsapp'
              and prior.status = 'failed'
              and prior.attempt_count < 3
              and prior.due_at = eligible.access_from
          )
        )
      )

    union all

    select
      account_id,
      stay_id,
      stay_member_id,
      'checkout',
      language,
      case
        when check_out_at >= check_in_at + interval '27 hours'
          then check_out_at - interval '24 hours'
        else check_out_at - interval '3 hours'
      end
    from eligible
    where check_out_at > p_at
      and check_out_at > check_in_at + interval '4 hours'
  ),

  written as (
    insert into public.concierge_notification_outbox (
      account_id,
      stay_id,
      stay_member_id,
      notification_type,
      channel,
      language,
      due_at,
      status,
      attempt_count,
      idempotency_key,
      created_at,
      updated_at
    )

    select
      n.account_id,
      n.stay_id,
      n.stay_member_id,
      n.notification_type,
      'whatsapp',
      n.language,
      n.due_at,
      'pending',
      0,
      concat(
        'stay:',
        n.stay_id::text,
        ':member:',
        n.stay_member_id::text,
        ':',
        n.notification_type
      ),
      p_at,
      p_at

    from candidate_notifications n

    on conflict (idempotency_key)
    do update
       set due_at =
             case
               when public.concierge_notification_outbox.status = 'pending'
                 then excluded.due_at

               when public.concierge_notification_outbox.status = 'failed'
                    and public.concierge_notification_outbox.attempt_count < 3
                 then excluded.due_at

               else public.concierge_notification_outbox.due_at
             end,

           language = excluded.language,

           status =
             case
               when public.concierge_notification_outbox.status = 'failed'
                    and public.concierge_notification_outbox.attempt_count < 3
                 then 'pending'
               else public.concierge_notification_outbox.status
             end,

           last_error =
             case
               when public.concierge_notification_outbox.status = 'failed'
                    and public.concierge_notification_outbox.attempt_count < 3
                 then null
               else public.concierge_notification_outbox.last_error
             end,

           updated_at = p_at

    returning id
  )

  select count(*)
    into v_upserted
  from written;

  return jsonb_build_object(
    'ok', true,
    'upserted', v_upserted,
    'cancelled', v_cancelled,
    'max_attempts', 3,
    'at', p_at
  );

end;
$function$
;
revoke all on function concierge_private.legacy_concierge_sync_notification_outbox_v1(timestamp with time zone) from public,anon,authenticated,service_role;
grant execute on function concierge_private.legacy_concierge_sync_notification_outbox_v1(timestamp with time zone) to cheveni_runtime_executor;
create function concierge_private.concierge_sync_notification_outbox_impl_v1(p_at timestamp with time zone DEFAULT now()) returns jsonb language plpgsql security definer set search_path='' as $$ begin return concierge_private.legacy_concierge_sync_notification_outbox_v1(clock_timestamp()); end $$;
grant create on schema concierge_private to cheveni_runtime_executor;alter function concierge_private.concierge_sync_notification_outbox_impl_v1(timestamp with time zone) owner to cheveni_runtime_executor;revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.concierge_sync_notification_outbox_impl_v1(timestamp with time zone) from public,anon,authenticated,service_role;grant execute on function concierge_private.concierge_sync_notification_outbox_impl_v1(timestamp with time zone) to service_role;
create function public.concierge_sync_notification_outbox(p_at timestamp with time zone DEFAULT now()) returns jsonb language plpgsql security invoker set search_path='' as $$ begin if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;return concierge_private.concierge_sync_notification_outbox_impl_v1(p_at);end $$;
revoke all on function public.concierge_sync_notification_outbox(timestamp with time zone) from public,anon,authenticated,service_role;grant execute on function public.concierge_sync_notification_outbox(timestamp with time zone) to service_role;
grant select on public.concierge_notification_outbox to cheveni_runtime_executor;
create policy runtime_notification_read on public.concierge_notification_outbox for select to cheveni_runtime_executor using(true);
create function concierge_private.notification_authority_v1_impl(p_notification_id uuid)
returns table(decision text,notification_id uuid) language plpgsql security definer set search_path='' as $$ declare n public.concierge_notification_outbox%rowtype;e uuid;
begin
 if p_notification_id is null then
  return query select case when exists(select 1 from concierge_private.runtime_policies_v1 p where p.purpose='guest_notification' and p.revoked_at is null and p.approved_at<=clock_timestamp() and p.expires_at>clock_timestamp()) then 'ready' else 'denied' end,null::uuid;return;
 end if;
 select * into n from public.concierge_notification_outbox x where x.id=p_notification_id and x.status='processing';
 if not found then return query select 'denied'::text,p_notification_id;return;end if;
 e:=concierge_private.check_runtime_v1(n.stay_member_id,'guest_notification');
 if e is null or not exists(select 1 from public.concierge_stay_members m join public.concierge_stays s on s.id=m.stay_id and s.account_id=m.account_id where m.id=n.stay_member_id and m.stay_id=n.stay_id and m.account_id=n.account_id) then
  return query select 'denied'::text,p_notification_id;return;
 end if;
 return query select 'authorized'::text,p_notification_id;
end $$;
grant create on schema concierge_private to cheveni_runtime_executor;alter function concierge_private.notification_authority_v1_impl(uuid) owner to cheveni_runtime_executor;revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.notification_authority_v1_impl(uuid) from public,anon,authenticated,service_role;grant execute on function concierge_private.notification_authority_v1_impl(uuid) to service_role;
create function public.concierge_notification_authority_v1(p_notification_id uuid default null)
returns table(decision text,notification_id uuid) language plpgsql security invoker set search_path='' as $$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.notification_authority_v1_impl(p_notification_id);
end $$;
revoke all on function public.concierge_notification_authority_v1(uuid) from public,anon,authenticated,service_role;grant execute on function public.concierge_notification_authority_v1(uuid) to service_role;
-- Keep the reviewed thirty-day calculation, but require the independent
-- guest-session proof and BA scope before its private writer can run.
alter function public.concierge_begin_beta_on_first_verified_stay(uuid,uuid) set schema concierge_private;
alter function concierge_private.concierge_begin_beta_on_first_verified_stay(uuid,uuid) rename to legacy_begin_beta_on_first_verified_stay_v1;
revoke all on function concierge_private.legacy_begin_beta_on_first_verified_stay_v1(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function concierge_private.legacy_begin_beta_on_first_verified_stay_v1(uuid,uuid) to cheveni_runtime_executor;
create function concierge_private.begin_verified_beta_v1_impl(p_account_id uuid,p_stay_id uuid)
returns text language plpgsql security definer set search_path='' as $$ declare m uuid;e uuid;account_status text;begin
 -- Serialize before the shared locks in check_runtime_v1 to avoid a lock
 -- upgrade deadlock between simultaneous first verified guest messages.
 select a.status into account_status from public.concierge_accounts a where a.id=p_account_id for update;
 if not found then return 'ACCOUNT_NOT_FOUND';end if;
 if account_status<>'active' then return 'ACCOUNT_NOT_APPROVED_FOR_BETA';end if;
 select sm.id into m from public.concierge_stay_members sm where sm.account_id=p_account_id and sm.stay_id=p_stay_id and sm.member_role='primary_guest' and sm.status='active';
 e:=concierge_private.check_runtime_v1(m,'guest_session');
 if e is null then return 'VERIFIED_ACTIVE_STAY_REQUIRED';end if;
 return concierge_private.legacy_begin_beta_on_first_verified_stay_v1(p_account_id,p_stay_id);
end $$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.begin_verified_beta_v1_impl(uuid,uuid) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.begin_verified_beta_v1_impl(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function concierge_private.begin_verified_beta_v1_impl(uuid,uuid) to service_role;
create function public.concierge_begin_beta_on_first_verified_stay(p_account_id uuid,p_stay_id uuid)
returns text language plpgsql security invoker set search_path='' as $$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return concierge_private.begin_verified_beta_v1_impl(p_account_id,p_stay_id);
end $$;
revoke all on function public.concierge_begin_beta_on_first_verified_stay(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.concierge_begin_beta_on_first_verified_stay(uuid,uuid) to service_role;

-- The panel's proactive request/incident replies need the SAME dedicated
-- notification purpose as the cron sender, bound to the exact tenant/guest.
create function concierge_private.guest_notification_authority_v1_impl(p_account_id uuid,p_stay_member_id uuid,p_guest_identity_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$ declare e uuid;begin
 e:=concierge_private.check_runtime_v1(p_stay_member_id,'guest_notification');
 return e is not null and exists(select 1 from public.concierge_stay_members m where m.id=p_stay_member_id and m.account_id=p_account_id and m.guest_identity_id=p_guest_identity_id) and concierge_private.runtime_evidence_valid_v1(e);
end $$;
grant create on schema concierge_private to cheveni_runtime_executor;
alter function concierge_private.guest_notification_authority_v1_impl(uuid,uuid,uuid) owner to cheveni_runtime_executor;
revoke create on schema concierge_private from cheveni_runtime_executor;
revoke all on function concierge_private.guest_notification_authority_v1_impl(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function concierge_private.guest_notification_authority_v1_impl(uuid,uuid,uuid) to service_role;
create function public.concierge_guest_notification_authority_v1(p_account_id uuid,p_stay_member_id uuid,p_guest_identity_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return concierge_private.guest_notification_authority_v1_impl(p_account_id,p_stay_member_id,p_guest_identity_id);
end $$;
revoke all on function public.concierge_guest_notification_authority_v1(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.concierge_guest_notification_authority_v1(uuid,uuid,uuid) to service_role;
grant cheveni_runtime_executor to current_user with inherit false;
grant cheveni_runtime_executor to current_user with set false;


-- COMPONENT GUEST-INTAKE-ROLE-BOUNDARY-V1-PRELEGAL-DO-NOT-APPLY.sql
-- PRELEGAL REVIEW PROPOSAL ONLY. DO NOT APPLY TO SHARED DATABASES.
-- Requires GUEST-INTAKE-ATOMIC-V1 and a complete writer/ACL audit before GO.
-- Deliberate internal capability boundary, NOT a blanket RLS permission fix.
-- Public functions remain INVOKER. Only private implementations elevate into a
-- NOLOGIN, NOBYPASSRLS role. The trusted backend can invoke, never enroll evidence.
-- This is a service-only API: browser/user JWTs must never receive EXECUTE.

-- Refuse to enable a guarded capability while direct guest writers still exist.
-- Closing them requires migrating all affected callers first, not blindly
-- revoking permissions in a shared deployment.
do $$
declare v_table text;
begin
 foreach v_table in array array['public.concierge_pending_actions','public.concierge_guest_identities','public.concierge_stays','public.concierge_stay_members','public.concierge_guest_invites'] loop
  if has_any_column_privilege('service_role',v_table,'INSERT')
    or has_any_column_privilege('service_role',v_table,'UPDATE')
    or has_table_privilege('service_role',v_table,'DELETE')
    or has_table_privilege('service_role',v_table,'TRUNCATE') then
   raise exception 'LEGACY_DIRECT_GUEST_WRITES_MUST_BE_CLOSED_BEFORE_ROLE_BOUNDARY';
  end if;
 end loop;
end $$;
create role cheveni_intake_executor nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
-- Installer-only ownership capabilities, closed before this transaction commits.
grant cheveni_intake_executor to current_user with set true;
grant cheveni_intake_executor to current_user with inherit true;
grant usage on schema public,concierge_private to cheveni_intake_executor;
-- Harmless lock-only columns: PostgreSQL row locks require UPDATE privilege on
-- at least one column. No authorization/content column is writable by executor.
alter table concierge_private.intake_policies_v1 add column lock_version bigint not null default 0;
alter table concierge_private.intake_authorizations_v1 add column lock_version bigint not null default 0;
grant select on concierge_private.intake_policies_v1,concierge_private.intake_authorizations_v1 to cheveni_intake_executor;
grant update(lock_version) on concierge_private.intake_policies_v1,concierge_private.intake_authorizations_v1 to cheveni_intake_executor;
create policy cheveni_intake_policy_read on concierge_private.intake_policies_v1 for select to cheveni_intake_executor using(true);
create policy cheveni_intake_policy_lock on concierge_private.intake_policies_v1 for update to cheveni_intake_executor using(true) with check(true);
create policy cheveni_intake_evidence_read on concierge_private.intake_authorizations_v1 for select to cheveni_intake_executor using(true);
create policy cheveni_intake_evidence_lock on concierge_private.intake_authorizations_v1 for update to cheveni_intake_executor using(true) with check(true);

grant select,insert on concierge_private.intake_operations_v1 to cheveni_intake_executor;
grant update(stay_id,invite_id) on concierge_private.intake_operations_v1 to cheveni_intake_executor;
create policy cheveni_intake_operation_read on concierge_private.intake_operations_v1 for select to cheveni_intake_executor using(true);
create policy cheveni_intake_operation_insert on concierge_private.intake_operations_v1 for insert to cheveni_intake_executor with check(true);
create policy cheveni_intake_operation_finish on concierge_private.intake_operations_v1 for update to cheveni_intake_executor using(true) with check(true);

-- DEV catalog inspection found RLS enabled and no policies on these tables.
-- These policies are ONLY for the non-login internal capability role.
grant select on public.concierge_accounts,public.concierge_account_members,public.concierge_properties,public.concierge_member_property_permissions to cheveni_intake_executor;
grant update(id) on public.concierge_accounts,public.concierge_account_members,public.concierge_properties to cheveni_intake_executor;
alter table public.concierge_accounts enable row level security;
alter table public.concierge_account_members enable row level security;
alter table public.concierge_properties enable row level security;
alter table public.concierge_member_property_permissions enable row level security;
create policy cheveni_intake_account_read on public.concierge_accounts for select to cheveni_intake_executor using(true);
create policy cheveni_intake_member_read on public.concierge_account_members for select to cheveni_intake_executor using(true);
create policy cheveni_intake_property_read on public.concierge_properties for select to cheveni_intake_executor using(true);
create policy cheveni_intake_permission_read on public.concierge_member_property_permissions for select to cheveni_intake_executor using(true);
create policy cheveni_intake_account_lock on public.concierge_accounts for update to cheveni_intake_executor using(true) with check(true);
create policy cheveni_intake_member_lock on public.concierge_account_members for update to cheveni_intake_executor using(true) with check(true);
create policy cheveni_intake_property_lock on public.concierge_properties for update to cheveni_intake_executor using(true) with check(true);

grant select,insert on public.concierge_pending_actions to cheveni_intake_executor;
grant update(status,confirmed_at,executed_at,rejected_at,stay_id,target_entity_id) on public.concierge_pending_actions to cheveni_intake_executor;
alter table public.concierge_pending_actions enable row level security;
create policy cheveni_intake_pending_read on public.concierge_pending_actions for select to cheveni_intake_executor using(true);
create policy cheveni_intake_pending_insert on public.concierge_pending_actions for insert to cheveni_intake_executor
  with check(actor_type='account_member' and action_type='create_stay' and status='pending');
create policy cheveni_intake_pending_update on public.concierge_pending_actions for update to cheveni_intake_executor
  using(actor_type='account_member') with check(actor_type='account_member');

grant execute on function concierge_private.check_intake_v1(uuid,uuid,uuid,text,timestamptz) to cheveni_intake_executor;
grant execute on function public.concierge_authorize_manager_member_action(uuid,uuid,text) to cheveni_intake_executor;
-- New internal implementation invokes the audited legacy creation function.
-- Remove its direct API capability; grant only to the non-login executor.
revoke execute on function public.concierge_manager_create_stay(uuid,uuid,text,text,timestamptz,timestamptz,timestamptz,timestamptz,text) from public,anon,authenticated,service_role;
grant execute on function public.concierge_manager_create_stay(uuid,uuid,text,text,timestamptz,timestamptz,timestamptz,timestamptz,text) to cheveni_intake_executor;

-- Ownership transfer needs CREATE temporarily; it is revoked before commit.
grant create on schema concierge_private to cheveni_intake_executor;
alter function public.concierge_create_guarded_pending_stay_v1(uuid,uuid,uuid,uuid,timestamptz,text,text,timestamptz,timestamptz,text) set schema concierge_private;
alter function concierge_private.concierge_create_guarded_pending_stay_v1(uuid,uuid,uuid,uuid,timestamptz,text,text,timestamptz,timestamptz,text) rename to create_guarded_pending_stay_v1_impl;
alter function concierge_private.create_guarded_pending_stay_v1_impl(uuid,uuid,uuid,uuid,timestamptz,text,text,timestamptz,timestamptz,text) security definer;
alter function concierge_private.create_guarded_pending_stay_v1_impl(uuid,uuid,uuid,uuid,timestamptz,text,text,timestamptz,timestamptz,text) owner to cheveni_intake_executor;
alter function public.concierge_execute_guarded_pending_stay_v1(uuid,uuid,uuid) set schema concierge_private;
alter function concierge_private.concierge_execute_guarded_pending_stay_v1(uuid,uuid,uuid) rename to execute_guarded_pending_stay_v1_impl;
alter function concierge_private.execute_guarded_pending_stay_v1_impl(uuid,uuid,uuid) security definer;
alter function concierge_private.execute_guarded_pending_stay_v1_impl(uuid,uuid,uuid) owner to cheveni_intake_executor;
alter function public.concierge_guest_intake_readiness_v1(uuid,uuid,uuid) set schema concierge_private;
alter function concierge_private.concierge_guest_intake_readiness_v1(uuid,uuid,uuid) rename to guest_intake_readiness_v1_impl;
alter function concierge_private.guest_intake_readiness_v1_impl(uuid,uuid,uuid) security definer;
alter function concierge_private.guest_intake_readiness_v1_impl(uuid,uuid,uuid) owner to cheveni_intake_executor;
alter function public.concierge_expire_manager_pending_v1(uuid,uuid) set schema concierge_private;
alter function concierge_private.concierge_expire_manager_pending_v1(uuid,uuid) rename to expire_manager_pending_v1_impl;
alter function concierge_private.expire_manager_pending_v1_impl(uuid,uuid) security definer;
alter function concierge_private.expire_manager_pending_v1_impl(uuid,uuid) owner to cheveni_intake_executor;
alter function public.concierge_reject_manager_pending_v1(uuid,uuid,uuid) set schema concierge_private;
alter function concierge_private.concierge_reject_manager_pending_v1(uuid,uuid,uuid) rename to reject_manager_pending_v1_impl;
alter function concierge_private.reject_manager_pending_v1_impl(uuid,uuid,uuid) security definer;
alter function concierge_private.reject_manager_pending_v1_impl(uuid,uuid,uuid) owner to cheveni_intake_executor;
revoke create on schema concierge_private from cheveni_intake_executor;

create function public.concierge_create_guarded_pending_stay_v1(
 p_operation_id uuid,p_manager_id uuid,p_account_id uuid,p_property_id uuid,p_received_at timestamptz,
 p_guest_phone_hash text,p_guest_display_name text,p_check_in_at timestamptz,p_check_out_at timestamptz,p_language text
) returns table(result text,reason_code text,operation_id uuid,pending_id uuid)
language plpgsql security invoker set search_path=''
as $$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED'; end if;
 return query select * from concierge_private.create_guarded_pending_stay_v1_impl(p_operation_id,p_manager_id,p_account_id,p_property_id,p_received_at,p_guest_phone_hash,p_guest_display_name,p_check_in_at,p_check_out_at,p_language);
end $$;
create function public.concierge_execute_guarded_pending_stay_v1(p_pending_id uuid,p_manager_id uuid,p_account_id uuid)
returns table(result text,reason_code text,pending_id uuid,stay_id uuid,invite_id uuid)
language plpgsql security invoker set search_path=''
as $$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED'; end if;
 return query select * from concierge_private.execute_guarded_pending_stay_v1_impl(p_pending_id,p_manager_id,p_account_id);
end $$;
create function public.concierge_guest_intake_readiness_v1(p_manager_id uuid,p_account_id uuid,p_property_id uuid)
returns table(result text,reason_code text)
language plpgsql security invoker set search_path=''
as $$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED'; end if;
 return query select * from concierge_private.guest_intake_readiness_v1_impl(p_manager_id,p_account_id,p_property_id);
end $$;

create function public.concierge_expire_manager_pending_v1(p_manager_id uuid,p_account_id uuid) returns table(result text,affected_count integer)
language plpgsql security invoker set search_path=''
as $$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.expire_manager_pending_v1_impl(p_manager_id,p_account_id);
end $$;
revoke all on function public.concierge_expire_manager_pending_v1(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.concierge_expire_manager_pending_v1(uuid,uuid) to service_role;
revoke all on function concierge_private.expire_manager_pending_v1_impl(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function concierge_private.expire_manager_pending_v1_impl(uuid,uuid) to service_role;
create function public.concierge_reject_manager_pending_v1(p_pending_id uuid,p_manager_id uuid,p_account_id uuid) returns table(result text)
language plpgsql security invoker set search_path=''
as $$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.reject_manager_pending_v1_impl(p_pending_id,p_manager_id,p_account_id);
end $$;
revoke all on function public.concierge_reject_manager_pending_v1(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.concierge_reject_manager_pending_v1(uuid,uuid,uuid) to service_role;
revoke all on function concierge_private.reject_manager_pending_v1_impl(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function concierge_private.reject_manager_pending_v1_impl(uuid,uuid,uuid) to service_role;
-- Only these checked entry points are callable by the trusted backend.
grant usage on schema concierge_private to service_role;
revoke all on function public.concierge_create_guarded_pending_stay_v1(uuid,uuid,uuid,uuid,timestamptz,text,text,timestamptz,timestamptz,text) from public,anon,authenticated,service_role;
revoke all on function public.concierge_execute_guarded_pending_stay_v1(uuid,uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.concierge_guest_intake_readiness_v1(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.concierge_create_guarded_pending_stay_v1(uuid,uuid,uuid,uuid,timestamptz,text,text,timestamptz,timestamptz,text) to service_role;
grant execute on function public.concierge_execute_guarded_pending_stay_v1(uuid,uuid,uuid) to service_role;
grant execute on function public.concierge_guest_intake_readiness_v1(uuid,uuid,uuid) to service_role;
revoke all on function concierge_private.create_guarded_pending_stay_v1_impl(uuid,uuid,uuid,uuid,timestamptz,text,text,timestamptz,timestamptz,text) from public,anon,authenticated,service_role;
revoke all on function concierge_private.execute_guarded_pending_stay_v1_impl(uuid,uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function concierge_private.guest_intake_readiness_v1_impl(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function concierge_private.create_guarded_pending_stay_v1_impl(uuid,uuid,uuid,uuid,timestamptz,text,text,timestamptz,timestamptz,text) to service_role;
grant execute on function concierge_private.execute_guarded_pending_stay_v1_impl(uuid,uuid,uuid) to service_role;
grant execute on function concierge_private.guest_intake_readiness_v1_impl(uuid,uuid,uuid) to service_role;
-- Do not grant service_role evidence/policy/operation table access or membership
-- in cheveni_intake_executor. Existing direct public-table writers remain a
-- separate blocker: do not deploy this proposal before auditing/replacing them.
grant cheveni_intake_executor to current_user with inherit false;
grant cheveni_intake_executor to current_user with set false;


-- COMPONENT INVITE-DURABLE-DISPATCH-V1-PRELEGAL-DO-NOT-APPLY.sql
-- REVIEW PROPOSAL ONLY. DO NOT APPLY. Supersedes transport-only claim drafts.
-- No guest legal authorization is established by this reservation.
-- Requires approved privacy enforcement, caller/grant audit and PostgreSQL tests.
-- Deliberately grants nothing to any API role, including service_role.

create table public.concierge_invite_dispatch_attempts_v1 (
  invite_id uuid primary key references public.concierge_guest_invites(id) on delete restrict,
  account_id uuid not null references public.concierge_accounts(id) on delete restrict,
  attempt_id uuid not null unique,
  state text not null check (state in ('reserved', 'accepted', 'unknown')),
  reserved_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz,
  provider_message_id text,
  check ((state='accepted' and length(trim(provider_message_id)) > 0 and provider_message_id is not null)
      or (state in ('reserved','unknown') and provider_message_id is null)),
  check ((state = 'reserved' and finished_at is null)
      or (state in ('accepted', 'unknown') and finished_at is not null))
);
alter table public.concierge_invite_dispatch_attempts_v1 enable row level security;
revoke all on public.concierge_invite_dispatch_attempts_v1 from public, anon, authenticated, service_role;

create function public.concierge_reserve_invite_dispatch_v1(
  p_invite_id uuid, p_account_id uuid, p_attempt_id uuid
) returns table(decision text, invite_id uuid, account_id uuid, attempt_id uuid, state text)
language plpgsql security invoker set search_path = ''
as $$
declare
  v_invite record;
  v_inserted integer;
begin
  if p_invite_id is null or p_account_id is null or p_attempt_id is null then
    return query select 'denied'::text, p_invite_id, p_account_id, p_attempt_id, null::text;
    return;
  end if;
  -- Account and BA scope come from persisted relations, not guest/client flags.
  -- This is an internal transport primitive, not a substitute for manager auth
  -- and transactional guest notice/authorization checks at the write boundary.
  select i.id into v_invite
    from public.concierge_guest_invites i
    join public.concierge_stay_members m on m.id=i.stay_member_id and m.account_id=i.account_id
    join public.concierge_stays s on s.id=m.stay_id and s.account_id=m.account_id
    join public.concierge_properties p on p.id=s.property_id and p.account_id=s.account_id
    join public.concierge_guest_identities g on g.id=m.guest_identity_id
   where i.id=p_invite_id and i.account_id=p_account_id
     and i.status='created' and i.expires_at > clock_timestamp()
     and i.activated_at is null and i.rejected_at is null
     and m.status in ('invited','active') and m.whatsapp_enabled is true
     and g.status='active' and s.status in ('scheduled','active')
     and s.check_out_at > clock_timestamp() and p.status='active' and p.city='Buenos Aires'
   for update of i, m, s, p, g;
  if not found then
    return query select 'denied'::text, p_invite_id, p_account_id, p_attempt_id, null::text;
    return;
  end if;

  insert into public.concierge_invite_dispatch_attempts_v1 as attempts
    (invite_id, account_id, attempt_id, state)
  values (p_invite_id, p_account_id, p_attempt_id, 'reserved')
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    return query select 'claimed'::text, p_invite_id, p_account_id, p_attempt_id, 'reserved'::text;
    return;
  end if;
  -- An existing reservation never authorizes dispatch again, even with the same
  -- attempt ID or after a worker crash. No TTL reclaims or automatic retries.
  return query
    select 'existing'::text, a.invite_id, a.account_id, a.attempt_id, a.state
    from public.concierge_invite_dispatch_attempts_v1 a
    where a.invite_id=p_invite_id and a.account_id=p_account_id;
end;
$$;

create function public.concierge_finish_invite_dispatch_v1(
  p_invite_id uuid, p_account_id uuid, p_attempt_id uuid, p_state text, p_provider_message_id text
) returns table(decision text, invite_id uuid, account_id uuid, attempt_id uuid,
                state text, invite_status text, sent_at timestamptz)
language plpgsql security invoker set search_path = ''
as $$
declare
  v_invite public.concierge_guest_invites%rowtype;
  v_attempt public.concierge_invite_dispatch_attempts_v1%rowtype;
begin
  if p_state is null or p_state not in ('accepted','unknown') then return; end if;
  if p_state='accepted' and (p_provider_message_id is null or length(trim(p_provider_message_id))=0) then return; end if;
  if p_state='unknown' and p_provider_message_id is not null then return; end if;
  -- Same lock order as reservation: invite first, attempt second.
  select i.* into v_invite from public.concierge_guest_invites i
    where i.id=p_invite_id and i.account_id=p_account_id for update;
  if not found then return; end if;
  select a.* into v_attempt from public.concierge_invite_dispatch_attempts_v1 a
    where a.invite_id=p_invite_id and a.account_id=p_account_id
      and a.attempt_id=p_attempt_id for update;
  if not found then return; end if;
  if v_attempt.state <> 'reserved' and v_attempt.state <> p_state then return; end if;
  if v_attempt.state='accepted' and v_attempt.provider_message_id is distinct from p_provider_message_id then return; end if;
  if v_attempt.state='reserved' then
    update public.concierge_invite_dispatch_attempts_v1 a
      set state=p_state, finished_at=clock_timestamp(), provider_message_id=p_provider_message_id
      where a.invite_id=p_invite_id and a.attempt_id=p_attempt_id and a.state='reserved';
    -- Record provider acceptance and invitation status in ONE transaction.
    -- Never claim delivery: a provider acceptance is not a delivery receipt.
    -- Do not overwrite cancellation/rejection that occurred during transport.
    if p_state='accepted' and v_invite.status='created'
        and v_invite.rejected_at is null then
      update public.concierge_guest_invites i set status='sent', sent_at=clock_timestamp()
        where i.id=p_invite_id and i.account_id=p_account_id and i.status='created'
        returning i.* into v_invite;
    end if;
  end if;
  return query select 'finalized'::text, p_invite_id, p_account_id, p_attempt_id,
                      p_state, v_invite.status::text, v_invite.sent_at;
end;
$$;

revoke all on function public.concierge_reserve_invite_dispatch_v1(uuid,uuid,uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.concierge_finish_invite_dispatch_v1(uuid,uuid,uuid,text,text)
  from public, anon, authenticated, service_role;
-- NO GRANTS here. Do not enable without privacy integration and explicit GO.


-- COMPONENT INVITE-PRIVACY-ROLE-BOUNDARY-V1-PRELEGAL-DO-NOT-APPLY.sql
-- PRELEGAL REVIEW CANDIDATE ONLY. DO NOT APPLY TO SHARED DATABASES.
-- Requires durable dispatch V1. No approved policy or evidence is seeded.
-- Dedicated invite-dispatch authority: intake authority is NOT reused.
-- Trusted enrollment/identity, legal approval and full writer audit remain GO blockers.

create schema if not exists concierge_private;
revoke all on schema concierge_private from public,anon,authenticated;
do $$ declare v_table text; v_signature text; v_function regprocedure; v_role text; begin
 foreach v_table in array array['public.concierge_pending_actions','public.concierge_guest_identities','public.concierge_stays','public.concierge_stay_members','public.concierge_guest_invites'] loop
  if has_any_column_privilege('service_role',v_table,'INSERT') or has_any_column_privilege('service_role',v_table,'UPDATE')
    or has_table_privilege('service_role',v_table,'DELETE') or has_table_privilege('service_role',v_table,'TRUNCATE') then
   raise exception 'LEGACY_DIRECT_GUEST_WRITES_MUST_BE_CLOSED_BEFORE_INVITE_BOUNDARY';
  end if;
 end loop;
 -- Revoking table DML cannot close a legacy SECURITY DEFINER capability.
 -- These signatures were confirmed by read-only DEV catalog inspection.
 foreach v_signature in array array[
  'public.concierge_manager_create_stay(uuid,uuid,text,text,timestamptz,timestamptz,timestamptz,timestamptz,text)',
  'public.concierge_activate_guest_phone_replacement(text)'
 ] loop
  v_function:=to_regprocedure(v_signature);
  if v_function is not null then
   foreach v_role in array array['anon','authenticated','service_role'] loop
    if has_function_privilege(v_role,v_function,'EXECUTE')
      and (select p.prosecdef from pg_proc p where p.oid=v_function) then
     raise exception 'LEGACY_PRIVILEGED_GUEST_WRITERS_MUST_BE_CLOSED_BEFORE_INVITE_BOUNDARY';
    end if;
   end loop;
  end if;
 end loop;
end $$;
create table concierge_private.invite_policies_v1 (
 policy_key text primary key,
 purpose text not null check(purpose='invite_dispatch'),
 template_name text not null check(template_name='chebot_concierge_invite_v1'),
 template_language text not null check(template_language='es_AR'),
 notice_version text not null check(length(trim(notice_version))>0),
 notice_sha256 text not null check(notice_sha256 ~ '^[0-9a-f]{64}$'),
 legal_basis_code text not null check(length(trim(legal_basis_code))>0),
 delivery_assurance_code text not null check(length(trim(delivery_assurance_code))>0),
 review_reference text not null check(length(trim(review_reference))>0),
 approved_at timestamptz not null,
 expires_at timestamptz not null check(expires_at>approved_at),
 revoked_at timestamptz,
 lock_version bigint not null default 0
);
create table concierge_private.invite_authorizations_v1 (
 evidence_id uuid primary key,
 invite_id uuid not null unique references public.concierge_guest_invites(id),
 account_id uuid not null references public.concierge_accounts(id),
 property_id uuid not null,
 stay_member_id uuid not null references public.concierge_stay_members(id),
 guest_identity_id uuid not null references public.concierge_guest_identities(id),
 subject_hash text not null check(subject_hash ~ '^[0-9a-f]{64}$'),
 policy_key text not null references concierge_private.invite_policies_v1(policy_key),
 notice_sha256 text not null check(notice_sha256 ~ '^[0-9a-f]{64}$'),
 delivery_assurance_code text not null check(length(trim(delivery_assurance_code))>0),
 source_reference text not null check(length(trim(source_reference))>0),
 delivered_at timestamptz not null,
 verified_at timestamptz not null,
 expires_at timestamptz not null,
 authorization_state text not null check(authorization_state in ('authorized','revoked','opposed')),
 revoked_at timestamptz,
 lock_version bigint not null default 0,
 foreign key(property_id,account_id) references public.concierge_properties(id,account_id),
 check(delivered_at<=verified_at and expires_at>verified_at),
 check((authorization_state='authorized' and revoked_at is null) or (authorization_state<>'authorized' and revoked_at is not null))
);
alter table concierge_private.invite_policies_v1 enable row level security;
alter table concierge_private.invite_authorizations_v1 enable row level security;
revoke all on concierge_private.invite_policies_v1,concierge_private.invite_authorizations_v1 from public,anon,authenticated,service_role;
create role cheveni_invite_executor nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
-- Installer-only ownership capabilities, closed before this transaction commits.
grant cheveni_invite_executor to current_user with set true;
grant cheveni_invite_executor to current_user with inherit true;
grant usage on schema public,concierge_private to cheveni_invite_executor;
grant select on concierge_private.invite_policies_v1,concierge_private.invite_authorizations_v1 to cheveni_invite_executor;
grant update(lock_version) on concierge_private.invite_policies_v1,concierge_private.invite_authorizations_v1 to cheveni_invite_executor;
create policy invite_policy_read on concierge_private.invite_policies_v1 for select to cheveni_invite_executor using(true);
create policy invite_policy_lock on concierge_private.invite_policies_v1 for update to cheveni_invite_executor using(true) with check(true);
create policy invite_evidence_read on concierge_private.invite_authorizations_v1 for select to cheveni_invite_executor using(true);
create policy invite_evidence_lock on concierge_private.invite_authorizations_v1 for update to cheveni_invite_executor using(true) with check(true);
-- SELECT plus a harmless column's UPDATE permits row locks, not content mutation.
grant select on public.concierge_accounts,public.concierge_properties,public.concierge_stays,public.concierge_stay_members,public.concierge_guest_identities,public.concierge_guest_invites to cheveni_invite_executor;
grant update(id) on public.concierge_accounts,public.concierge_properties,public.concierge_stays,public.concierge_stay_members,public.concierge_guest_identities to cheveni_invite_executor;
grant update(status,sent_at) on public.concierge_guest_invites to cheveni_invite_executor;
grant select,insert on public.concierge_invite_dispatch_attempts_v1 to cheveni_invite_executor;
grant update(state,finished_at,provider_message_id) on public.concierge_invite_dispatch_attempts_v1 to cheveni_invite_executor;
do $$ declare t text; begin
 foreach t in array array['concierge_accounts','concierge_properties','concierge_stays','concierge_stay_members','concierge_guest_identities','concierge_guest_invites','concierge_invite_dispatch_attempts_v1'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy invite_executor_read on public.%I for select to cheveni_invite_executor using(true)',t);
  execute format('create policy invite_executor_lock on public.%I for update to cheveni_invite_executor using(true) with check(true)',t);
 end loop;
end $$;
create policy invite_attempt_insert on public.concierge_invite_dispatch_attempts_v1 for insert to cheveni_invite_executor with check(state='reserved');
-- Underlying transport functions remain INVOKER and are not API entry points.
alter function public.concierge_reserve_invite_dispatch_v1(uuid,uuid,uuid) set schema concierge_private;
alter function concierge_private.concierge_reserve_invite_dispatch_v1(uuid,uuid,uuid) rename to reserve_invite_transport_v1;
alter function public.concierge_finish_invite_dispatch_v1(uuid,uuid,uuid,text,text) set schema concierge_private;
alter function concierge_private.concierge_finish_invite_dispatch_v1(uuid,uuid,uuid,text,text) rename to finish_invite_transport_v1;
revoke all on function concierge_private.reserve_invite_transport_v1(uuid,uuid,uuid),concierge_private.finish_invite_transport_v1(uuid,uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function concierge_private.reserve_invite_transport_v1(uuid,uuid,uuid),concierge_private.finish_invite_transport_v1(uuid,uuid,uuid,text,text) to cheveni_invite_executor;

create function concierge_private.check_invite_authority_v1(p_invite_id uuid,p_account_id uuid)
returns boolean language plpgsql security invoker set search_path=''
as $$ declare v_context record; v_e concierge_private.invite_authorizations_v1%rowtype; v_p concierge_private.invite_policies_v1%rowtype;
begin
 -- Invite first, then attempt in the transport primitive. No read of guest name,
 -- channel ciphertext or access credentials is needed to authorize processing.
 select i.id,i.stay_member_id,m.guest_identity_id,m.created_at as member_created_at,s.property_id,g.phone_hash
 into v_context from public.concierge_guest_invites i
 join public.concierge_stay_members m on m.id=i.stay_member_id and m.account_id=i.account_id
 join public.concierge_stays s on s.id=m.stay_id and s.account_id=m.account_id
 join public.concierge_properties p on p.id=s.property_id and p.account_id=s.account_id
 join public.concierge_accounts a on a.id=s.account_id
 join public.concierge_guest_identities g on g.id=m.guest_identity_id
 where i.id=p_invite_id and i.account_id=p_account_id
   and i.status in ('created','sent','activated') and i.rejected_at is null
   and i.expires_at>clock_timestamp() and m.status in ('invited','active') and m.whatsapp_enabled
   and s.status in ('scheduled','active') and s.check_out_at>clock_timestamp()
   and p.status='active' and p.city='Buenos Aires' and a.status in ('testing','active') and g.status='active'
 for update of i,m,s,p,a,g;
 if not found then return false; end if;
 select e.* into v_e from concierge_private.invite_authorizations_v1 e where e.invite_id=p_invite_id for update;
 if not found then return false; end if;
 select p.* into v_p from concierge_private.invite_policies_v1 p where p.policy_key=v_e.policy_key for share;
 if not found then return false; end if;
 return v_e.account_id=p_account_id and v_e.property_id=v_context.property_id
   and v_e.stay_member_id=v_context.stay_member_id and v_e.guest_identity_id=v_context.guest_identity_id
   and v_e.subject_hash=v_context.phone_hash and v_e.authorization_state='authorized' and v_e.revoked_at is null
   and v_e.expires_at>clock_timestamp() and v_e.delivered_at<v_context.member_created_at and v_e.verified_at<=v_context.member_created_at
   and v_p.revoked_at is null and v_p.expires_at>clock_timestamp() and v_p.approved_at<=v_e.delivered_at
   and v_e.notice_sha256=v_p.notice_sha256 and v_e.delivery_assurance_code=v_p.delivery_assurance_code;
end $$;
revoke all on function concierge_private.check_invite_authority_v1(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function concierge_private.check_invite_authority_v1(uuid,uuid) to cheveni_invite_executor;

create function concierge_private.authorize_invite_processing_v1_impl(p_invite_id uuid,p_account_id uuid)
returns table(decision text,invite_id uuid,account_id uuid) language plpgsql security definer set search_path=''
as $$ begin
 return query select case when concierge_private.check_invite_authority_v1(p_invite_id,p_account_id) then 'authorized' else 'denied' end,p_invite_id,p_account_id;
end $$;
create function concierge_private.reserve_authorized_invite_v1_impl(p_invite_id uuid,p_account_id uuid,p_attempt_id uuid)
returns table(decision text,invite_id uuid,account_id uuid,attempt_id uuid,state text) language plpgsql security definer set search_path=''
as $$ declare v_result record;
begin
 if not concierge_private.check_invite_authority_v1(p_invite_id,p_account_id) then
  return query select 'denied'::text,p_invite_id,p_account_id,p_attempt_id,null::text;return;
 end if;
 begin
  select * into v_result from concierge_private.reserve_invite_transport_v1(p_invite_id,p_account_id,p_attempt_id);
  if not concierge_private.check_invite_authority_v1(p_invite_id,p_account_id) then raise exception using errcode='PZ003',message='INVITE_AUTHORITY_EXPIRED_DURING_RESERVATION';end if;
 exception when sqlstate 'PZ003' then
  return query select 'denied'::text,p_invite_id,p_account_id,p_attempt_id,null::text;return;
 end;
 if v_result.decision is not null then
  return query select v_result.decision::text,v_result.invite_id::uuid,v_result.account_id::uuid,v_result.attempt_id::uuid,v_result.state::text;
 end if;
end $$;
-- Finalization records what already happened. Revocation must NOT erase a
-- provider acceptance, reopen a reservation, or grant another send.
create function concierge_private.finish_authorized_invite_v1_impl(p_invite_id uuid,p_account_id uuid,p_attempt_id uuid,p_state text,p_provider_message_id text)
returns table(decision text,invite_id uuid,account_id uuid,attempt_id uuid,state text,invite_status text,sent_at timestamptz)
language sql security definer set search_path=''
as $$ select * from concierge_private.finish_invite_transport_v1(p_invite_id,p_account_id,p_attempt_id,p_state,p_provider_message_id) $$;

grant create on schema concierge_private to cheveni_invite_executor;
alter function concierge_private.authorize_invite_processing_v1_impl(uuid,uuid) owner to cheveni_invite_executor;
alter function concierge_private.reserve_authorized_invite_v1_impl(uuid,uuid,uuid) owner to cheveni_invite_executor;
alter function concierge_private.finish_authorized_invite_v1_impl(uuid,uuid,uuid,text,text) owner to cheveni_invite_executor;
revoke create on schema concierge_private from cheveni_invite_executor;
revoke all on function concierge_private.authorize_invite_processing_v1_impl(uuid,uuid),concierge_private.reserve_authorized_invite_v1_impl(uuid,uuid,uuid),concierge_private.finish_authorized_invite_v1_impl(uuid,uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant usage on schema concierge_private to service_role;
grant execute on function concierge_private.authorize_invite_processing_v1_impl(uuid,uuid),concierge_private.reserve_authorized_invite_v1_impl(uuid,uuid,uuid),concierge_private.finish_authorized_invite_v1_impl(uuid,uuid,uuid,text,text) to service_role;
create function public.concierge_authorize_invite_processing_v1(p_invite_id uuid,p_account_id uuid)
returns table(decision text,invite_id uuid,account_id uuid) language plpgsql security invoker set search_path=''
as $$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.authorize_invite_processing_v1_impl(p_invite_id,p_account_id);
end $$;
create function public.concierge_reserve_invite_dispatch_v1(p_invite_id uuid,p_account_id uuid,p_attempt_id uuid)
returns table(decision text,invite_id uuid,account_id uuid,attempt_id uuid,state text) language plpgsql security invoker set search_path=''
as $$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.reserve_authorized_invite_v1_impl(p_invite_id,p_account_id,p_attempt_id);
end $$;
create function public.concierge_finish_invite_dispatch_v1(p_invite_id uuid,p_account_id uuid,p_attempt_id uuid,p_state text,p_provider_message_id text)
returns table(decision text,invite_id uuid,account_id uuid,attempt_id uuid,state text,invite_status text,sent_at timestamptz)
language plpgsql security invoker set search_path=''
as $$ begin
 if current_user<>'service_role' then raise insufficient_privilege using message='TRUSTED_BACKEND_ROLE_REQUIRED';end if;
 return query select * from concierge_private.finish_authorized_invite_v1_impl(p_invite_id,p_account_id,p_attempt_id,p_state,p_provider_message_id);
end $$;
revoke all on function public.concierge_authorize_invite_processing_v1(uuid,uuid),public.concierge_reserve_invite_dispatch_v1(uuid,uuid,uuid),public.concierge_finish_invite_dispatch_v1(uuid,uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.concierge_authorize_invite_processing_v1(uuid,uuid),public.concierge_reserve_invite_dispatch_v1(uuid,uuid,uuid),public.concierge_finish_invite_dispatch_v1(uuid,uuid,uuid,text,text) to service_role;
grant cheveni_invite_executor to current_user with inherit false;
grant cheveni_invite_executor to current_user with set false;


-- COMPONENT VERIFIED-EVIDENCE-ENROLLMENT-V1-PRELEGAL-DO-NOT-APPLY.sql
-- PRELEGAL CANDIDATE ONLY. DO NOT APPLY. Requires all purpose-ledger candidates.
-- No signer, legal policy, credentials, API role membership or real proof is seeded.
-- The verifier must be independently authenticated and verify signed external
-- evidence BEFORE this RPC. The WhatsApp backend is expressly denied enrollment.

create role cheveni_evidence_verifier nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
create role cheveni_evidence_executor nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
-- Installer-only ownership capabilities; no verifier/backend membership granted.
grant cheveni_evidence_executor to current_user with set true;
grant cheveni_evidence_executor to current_user with inherit true;
grant usage on schema public,concierge_private to cheveni_evidence_executor;
grant usage on schema public,concierge_private to cheveni_evidence_verifier;
create table concierge_private.verified_evidence_events_v1(
 event_id uuid primary key,evidence_id uuid not null,kind text not null,revision bigint not null,
 action text not null,verifier_key_id text not null,event_digest text not null,
 received_at timestamptz not null default clock_timestamp(),unique(kind,evidence_id,revision)
);
create table concierge_private.verified_evidence_heads_v1(
 kind text not null,evidence_id uuid not null,revision bigint not null,last_event_id uuid not null references concierge_private.verified_evidence_events_v1(event_id),
 primary key(kind,evidence_id)
);
alter table concierge_private.verified_evidence_events_v1 enable row level security;
alter table concierge_private.verified_evidence_heads_v1 enable row level security;
revoke all on concierge_private.verified_evidence_events_v1,concierge_private.verified_evidence_heads_v1 from public,anon,authenticated,service_role,cheveni_evidence_verifier;
grant select,insert on concierge_private.verified_evidence_events_v1,concierge_private.verified_evidence_heads_v1 to cheveni_evidence_executor;
grant update(revision,last_event_id) on concierge_private.verified_evidence_heads_v1 to cheveni_evidence_executor;
create policy evidence_event_read on concierge_private.verified_evidence_events_v1 for select to cheveni_evidence_executor using(true);
create policy evidence_event_append on concierge_private.verified_evidence_events_v1 for insert to cheveni_evidence_executor with check(true);
create policy evidence_head_read on concierge_private.verified_evidence_heads_v1 for select to cheveni_evidence_executor using(true);
create policy evidence_head_insert on concierge_private.verified_evidence_heads_v1 for insert to cheveni_evidence_executor with check(true);
create policy evidence_head_update on concierge_private.verified_evidence_heads_v1 for update to cheveni_evidence_executor using(true) with check(true);
do $$ declare t text;begin
 foreach t in array array['intake_policies_v1','invite_policies_v1','runtime_policies_v1'] loop
  execute format('grant select on concierge_private.%I to cheveni_evidence_executor',t);
  execute format('grant update(lock_version) on concierge_private.%I to cheveni_evidence_executor',t);
  execute format('create policy evidence_policy_read on concierge_private.%I for select to cheveni_evidence_executor using(true)',t);
  execute format('create policy evidence_policy_lock on concierge_private.%I for update to cheveni_evidence_executor using(true) with check(true)',t);
 end loop;
 foreach t in array array['intake_authorizations_v1','invite_authorizations_v1','runtime_authorizations_v1'] loop
  execute format('grant select,insert on concierge_private.%I to cheveni_evidence_executor',t);
  execute format('grant update(authorization_state,revoked_at) on concierge_private.%I to cheveni_evidence_executor',t);
  execute format('create policy evidence_authorization_read on concierge_private.%I for select to cheveni_evidence_executor using(true)',t);
  execute format('create policy evidence_authorization_insert on concierge_private.%I for insert to cheveni_evidence_executor with check(true)',t);
  execute format('create policy evidence_authorization_revoke on concierge_private.%I for update to cheveni_evidence_executor using(true) with check(true)',t);
 end loop;
 foreach t in array array['concierge_accounts','concierge_properties','concierge_stay_members','concierge_stays','concierge_guest_identities','concierge_guest_invites'] loop
  execute format('grant select on public.%I to cheveni_evidence_executor',t);
  execute format('grant update(id) on public.%I to cheveni_evidence_executor',t);
  execute format('create policy evidence_scope_read on public.%I for select to cheveni_evidence_executor using(true)',t);
  execute format('create policy evidence_scope_lock on public.%I for update to cheveni_evidence_executor using(true) with check(true)',t);
 end loop;
end $$;
create function concierge_private.register_verified_evidence_v1_impl(p_event jsonb)
returns table(result text,event_id uuid) language plpgsql security definer set search_path='' as $$
declare e jsonb:=p_event;v_event uuid;v_evidence uuid;v_kind text;v_action text;v_revision bigint;v_digest text;v_existing record;v_head record;p jsonb;old jsonb;
 table_name text;policy_table text;v_state text;k text;v_source text;
begin
 if jsonb_typeof(e)<>'object' or length(e::text)>8192 then raise exception 'EVIDENCE_EVENT_INVALID';end if;
 for k in select jsonb_object_keys(e) loop
  if k<>all(array['version','event_id','evidence_id','kind','purpose','action','revision','previous_event_id','verifier_key_id','policy_key','account_id','property_id','subject_hash','stay_member_id','guest_identity_id','invite_id','notice_sha256','delivery_assurance_code','identity_assurance_code','source_reference','delivered_at','verified_at','expires_at','issued_at']) then raise exception 'EVIDENCE_EVENT_INVALID';end if;
 end loop;
 if (select count(*) from jsonb_object_keys(e))<>24 or (e->>'version')::integer<>1 then raise exception 'EVIDENCE_EVENT_INVALID';end if;
 v_event:=(e->>'event_id')::uuid;v_evidence:=(e->>'evidence_id')::uuid;v_kind:=e->>'kind';v_action:=e->>'action';v_revision:=(e->>'revision')::bigint;
 if v_event is null or v_evidence is null or v_kind not in ('intake','invite','runtime') or v_action not in ('authorize','revoke','oppose') or v_revision is null or v_revision<1 then raise exception 'EVIDENCE_EVENT_INVALID';end if;
 if abs(extract(epoch from clock_timestamp()-(e->>'issued_at')::timestamptz))>300 or (e->>'verified_at')::timestamptz>clock_timestamp() or (e->>'verified_at')::timestamptz>(e->>'issued_at')::timestamptz or (e->>'delivered_at')::timestamptz>(e->>'verified_at')::timestamptz then raise exception 'EVIDENCE_CLOCK_INVALID';end if;
 if e->>'subject_hash' !~ '^[a-f0-9]{64}$' or e->>'notice_sha256' !~ '^[a-f0-9]{64}$' or e->>'source_reference' !~ '^sha256:[a-f0-9]{64}$' then raise exception 'EVIDENCE_PROVENANCE_INVALID';end if;
 v_digest:=encode(sha256(convert_to(e::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended('cheveni-evidence:'||v_kind||':'||v_evidence::text,0));
 select * into v_existing from concierge_private.verified_evidence_events_v1 x where x.event_id=v_event;
 if found then
  if v_existing.event_digest<>v_digest then raise exception 'EVIDENCE_EVENT_ID_REUSED';end if;
  return query select 'existing'::text,v_event;return;
 end if;
 table_name:=case v_kind when 'intake' then 'intake_authorizations_v1' when 'invite' then 'invite_authorizations_v1' else 'runtime_authorizations_v1' end;
 policy_table:=case v_kind when 'intake' then 'intake_policies_v1' when 'invite' then 'invite_policies_v1' else 'runtime_policies_v1' end;
 select * into v_head from concierge_private.verified_evidence_heads_v1 x where x.kind=v_kind and x.evidence_id=v_evidence for update;
 v_source:='verified-event:'||v_event::text;
 if v_action='authorize' then
  if found or v_revision<>1 or e->>'previous_event_id' is not null then raise exception 'EVIDENCE_REENROLLMENT_REQUIRES_REVIEW';end if;
  execute format('select to_jsonb(x) from concierge_private.%I x where x.policy_key=$1 for share',policy_table) into p using e->>'policy_key';
  if p is null or p->>'revoked_at' is not null or (p->>'expires_at')::timestamptz<=clock_timestamp() or (p->>'approved_at')::timestamptz>(e->>'delivered_at')::timestamptz
   or p->>'notice_sha256' is distinct from e->>'notice_sha256' or p->>'delivery_assurance_code' is distinct from e->>'delivery_assurance_code'
   or (e->>'expires_at')::timestamptz<=clock_timestamp() then raise exception 'APPROVED_POLICY_REQUIRED';end if;
  if (v_kind='intake' and e->>'purpose'<>'guest_intake') or (v_kind='invite' and e->>'purpose'<>'invite_dispatch') or (v_kind='runtime' and (p->>'purpose' is distinct from e->>'purpose' or p->>'identity_assurance_code' is distinct from e->>'identity_assurance_code')) then raise exception 'EVIDENCE_PURPOSE_INVALID';end if;
  perform 1 from public.concierge_properties x join public.concierge_accounts a on a.id=x.account_id
   where x.id=(e->>'property_id')::uuid and x.account_id=(e->>'account_id')::uuid and x.status='active' and x.city='Buenos Aires' and a.status in ('testing','active') for share of x,a;
  if not found then raise exception 'EVIDENCE_SCOPE_INVALID' using detail='PROPERTY_ACCOUNT_SCOPE';end if;
  if v_kind<>'intake' then
   perform 1 from public.concierge_stay_members m join public.concierge_stays s on s.id=m.stay_id and s.account_id=m.account_id join public.concierge_guest_identities g on g.id=m.guest_identity_id
   where m.id=(e->>'stay_member_id')::uuid and m.account_id=(e->>'account_id')::uuid and s.property_id=(e->>'property_id')::uuid and g.id=(e->>'guest_identity_id')::uuid
    and (e->>'purpose'='phone_replacement' or g.phone_hash=e->>'subject_hash') for share of m,s,g;
   if not found then raise exception 'EVIDENCE_SCOPE_INVALID' using detail='GUEST_STAY_SCOPE';end if;
  end if;
  if v_kind='intake' then
   insert into concierge_private.intake_authorizations_v1(evidence_id,account_id,property_id,subject_hash,policy_key,notice_sha256,delivery_assurance_code,source_reference,delivered_at,verified_at,expires_at,authorization_state)
   values(v_evidence,(e->>'account_id')::uuid,(e->>'property_id')::uuid,e->>'subject_hash',e->>'policy_key',e->>'notice_sha256',e->>'delivery_assurance_code',v_source,(e->>'delivered_at')::timestamptz,(e->>'verified_at')::timestamptz,(e->>'expires_at')::timestamptz,'authorized');
  elsif v_kind='invite' then
   perform 1 from public.concierge_guest_invites i where i.id=(e->>'invite_id')::uuid and i.account_id=(e->>'account_id')::uuid and i.stay_member_id=(e->>'stay_member_id')::uuid for share;
   if not found then raise exception 'EVIDENCE_SCOPE_INVALID';end if;
   insert into concierge_private.invite_authorizations_v1(evidence_id,invite_id,account_id,property_id,stay_member_id,guest_identity_id,subject_hash,policy_key,notice_sha256,delivery_assurance_code,source_reference,delivered_at,verified_at,expires_at,authorization_state)
   values(v_evidence,(e->>'invite_id')::uuid,(e->>'account_id')::uuid,(e->>'property_id')::uuid,(e->>'stay_member_id')::uuid,(e->>'guest_identity_id')::uuid,e->>'subject_hash',e->>'policy_key',e->>'notice_sha256',e->>'delivery_assurance_code',v_source,(e->>'delivered_at')::timestamptz,(e->>'verified_at')::timestamptz,(e->>'expires_at')::timestamptz,'authorized');
  else
   insert into concierge_private.runtime_authorizations_v1(evidence_id,account_id,property_id,stay_member_id,guest_identity_id,subject_hash,purpose,policy_key,notice_sha256,identity_assurance_code,delivery_assurance_code,source_reference,delivered_at,verified_at,expires_at,authorization_state)
   values(v_evidence,(e->>'account_id')::uuid,(e->>'property_id')::uuid,(e->>'stay_member_id')::uuid,(e->>'guest_identity_id')::uuid,e->>'subject_hash',e->>'purpose',e->>'policy_key',e->>'notice_sha256',e->>'identity_assurance_code',e->>'delivery_assurance_code',v_source,(e->>'delivered_at')::timestamptz,(e->>'verified_at')::timestamptz,(e->>'expires_at')::timestamptz,'authorized');
  end if;
 else
  if not found or v_revision<>v_head.revision+1 or (e->>'previous_event_id')::uuid is distinct from v_head.last_event_id then raise exception 'EVIDENCE_REVISION_INVALID';end if;
  execute format('select to_jsonb(x) from concierge_private.%I x where x.evidence_id=$1 for update',table_name) into old using v_evidence;
  if old is null or old->>'account_id' is distinct from e->>'account_id' or old->>'property_id' is distinct from e->>'property_id' or old->>'subject_hash' is distinct from e->>'subject_hash' or old->>'policy_key' is distinct from e->>'policy_key' then raise exception 'EVIDENCE_SCOPE_INVALID';end if;
  if (case v_kind when 'intake' then 'guest_intake' when 'invite' then 'invite_dispatch' else old->>'purpose' end) is distinct from e->>'purpose'
   or old->>'stay_member_id' is distinct from e->>'stay_member_id' or old->>'guest_identity_id' is distinct from e->>'guest_identity_id'
   or old->>'invite_id' is distinct from e->>'invite_id' then raise exception 'EVIDENCE_SCOPE_INVALID';end if;
  v_state:=case v_action when 'revoke' then 'revoked' else 'opposed' end;
  execute format('update concierge_private.%I set authorization_state=$1,revoked_at=clock_timestamp() where evidence_id=$2',table_name) using v_state,v_evidence;
 end if;
 insert into concierge_private.verified_evidence_events_v1(event_id,evidence_id,kind,revision,action,verifier_key_id,event_digest) values(v_event,v_evidence,v_kind,v_revision,v_action,e->>'verifier_key_id',v_digest);
 insert into concierge_private.verified_evidence_heads_v1(kind,evidence_id,revision,last_event_id) values(v_kind,v_evidence,v_revision,v_event) on conflict(kind,evidence_id) do update set revision=excluded.revision,last_event_id=excluded.last_event_id;
 if v_action='authorize' and ((p->>'expires_at')::timestamptz<=clock_timestamp() or (e->>'expires_at')::timestamptz<=clock_timestamp()) then raise exception 'EVIDENCE_EXPIRED_DURING_ENROLLMENT';end if;
 return query select 'recorded'::text,v_event;
end $$;
grant create on schema concierge_private to cheveni_evidence_executor;
alter function concierge_private.register_verified_evidence_v1_impl(jsonb) owner to cheveni_evidence_executor;
revoke create on schema concierge_private from cheveni_evidence_executor;
revoke all on function concierge_private.register_verified_evidence_v1_impl(jsonb) from public,anon,authenticated,service_role,cheveni_evidence_verifier;
grant execute on function concierge_private.register_verified_evidence_v1_impl(jsonb) to cheveni_evidence_verifier;
create function public.concierge_register_verified_evidence_v1(p_event jsonb)
returns table(result text,event_id uuid) language plpgsql security invoker set search_path='' as $$ begin
 if current_user<>'cheveni_evidence_verifier' then raise insufficient_privilege using message='INDEPENDENT_VERIFIER_ROLE_REQUIRED';end if;
 return query select * from concierge_private.register_verified_evidence_v1_impl(p_event);
end $$;
revoke all on function public.concierge_register_verified_evidence_v1(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.concierge_register_verified_evidence_v1(jsonb) to cheveni_evidence_verifier;
-- Read-only receipt lookup: does not refresh validity or re-enroll evidence.
create function concierge_private.reconcile_verified_evidence_v1_impl(p_event jsonb)
returns table(result text,event_id uuid) language plpgsql security definer set search_path='' as $$ declare v_id uuid;v_digest text;begin
 if jsonb_typeof(p_event)<>'object' or length(p_event::text)>8192 then raise exception 'EVIDENCE_EVENT_INVALID';end if;
 v_id:=(p_event->>'event_id')::uuid;v_digest:=encode(sha256(convert_to(p_event::text,'UTF8')),'hex');
 return query select case when exists(select 1 from concierge_private.verified_evidence_events_v1 e where e.event_id=v_id and e.event_digest=v_digest) then 'recorded' else 'unconfirmed' end,v_id;
end $$;
grant create on schema concierge_private to cheveni_evidence_executor;
alter function concierge_private.reconcile_verified_evidence_v1_impl(jsonb) owner to cheveni_evidence_executor;
revoke create on schema concierge_private from cheveni_evidence_executor;
revoke all on function concierge_private.reconcile_verified_evidence_v1_impl(jsonb) from public,anon,authenticated,service_role,cheveni_evidence_verifier;
grant execute on function concierge_private.reconcile_verified_evidence_v1_impl(jsonb) to cheveni_evidence_verifier;
create function public.concierge_reconcile_verified_evidence_v1(p_event jsonb)
returns table(result text,event_id uuid) language plpgsql security invoker set search_path='' as $$ begin
 if current_user<>'cheveni_evidence_verifier' then raise insufficient_privilege using message='INDEPENDENT_VERIFIER_ROLE_REQUIRED';end if;
 return query select * from concierge_private.reconcile_verified_evidence_v1_impl(p_event);
end $$;
revoke all on function public.concierge_reconcile_verified_evidence_v1(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.concierge_reconcile_verified_evidence_v1(jsonb) to cheveni_evidence_verifier;
grant cheveni_evidence_executor to current_user with inherit false;
grant cheveni_evidence_executor to current_user with set false;


-- COMPONENT BACKEND-RPC-ACL-V1-PRELEGAL-DO-NOT-APPLY.sql
-- REVIEW ONLY. Do not apply to a shared database without separate approval.
-- Fresh Supabase has no implicit API EXECUTE grants. Enumerate only the
-- existing backend helpers used by the reviewed panel, guide and reminders.
-- This does not grant table writes, Vault rights, verifier powers or role SET.

-- Existing privileged enrollment/signup helpers remain backend-only. Their
-- endpoints stay closed by their existing approval flags; no user is created.
alter function public.concierge_record_manager_signup_screening(uuid,uuid,text) set search_path='';
alter function public.concierge_resolve_manager_signup_followup(uuid,uuid,text) set search_path='';
alter function public.concierge_submit_manager_signup_request(text,text,text,text,boolean,boolean) set search_path='';
revoke all on function
 public.concierge_resolve_manager_web_context(uuid),
 public.concierge_list_manager_web_properties(uuid),
 public.concierge_authorize_manager_member_action(uuid,uuid,text),
 public.concierge_authorize_manager_web_action(uuid,uuid,text),
 public.concierge_resolve_knowledge(uuid,uuid,text),
 public.concierge_activate_knowledge_version(uuid,uuid,uuid),
 public.concierge_reject_knowledge_version(uuid,uuid,uuid),
 public.concierge_manager_set_incident_state(uuid,uuid,text,text),
 public.concierge_propose_incident_learning(uuid,uuid,text,text,text,text),
 public.concierge_complete_notification(uuid,boolean,text,timestamptz),
 public.concierge_record_notification_meta_acceptance(uuid,text,text,timestamptz),
 public.concierge_record_notification_meta_delivery(text,text,timestamptz),
 public.concierge_consume_manager_phone_enrollment(text,text,timestamptz),
 public.concierge_record_manager_signup_screening(uuid,uuid,text),
 public.concierge_resolve_manager_signup_followup(uuid,uuid,text),
 public.concierge_submit_manager_signup_request(text,text,text,text,boolean,boolean)
from public,anon,authenticated;
grant execute on function
 public.concierge_resolve_manager_web_context(uuid),
 public.concierge_list_manager_web_properties(uuid),
 public.concierge_authorize_manager_member_action(uuid,uuid,text),
 public.concierge_authorize_manager_web_action(uuid,uuid,text),
 public.concierge_resolve_knowledge(uuid,uuid,text),
 public.concierge_activate_knowledge_version(uuid,uuid,uuid),
 public.concierge_reject_knowledge_version(uuid,uuid,uuid),
 public.concierge_manager_set_incident_state(uuid,uuid,text,text),
 public.concierge_propose_incident_learning(uuid,uuid,text,text,text,text),
 public.concierge_complete_notification(uuid,boolean,text,timestamptz),
 public.concierge_record_notification_meta_acceptance(uuid,text,text,timestamptz),
 public.concierge_record_notification_meta_delivery(text,text,timestamptz),
 public.concierge_consume_manager_phone_enrollment(text,text,timestamptz),
 public.concierge_record_manager_signup_screening(uuid,uuid,text),
 public.concierge_resolve_manager_signup_followup(uuid,uuid,text),
 public.concierge_submit_manager_signup_request(text,text,text,text,boolean,boolean)
to service_role;

commit;
