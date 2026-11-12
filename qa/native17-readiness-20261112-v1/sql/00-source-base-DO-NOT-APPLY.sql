-- QA REVIEW ONLY. DO NOT APPLY. No SQL execution authorized.
begin;
do $abort$ begin raise exception 'CHEVENI_INCIDENT_REVIEW_DO_NOT_APPLY'; end $abort$;
-- The following is unreachable review text, not an installable migration.
-- Proposed roles already listed in ROLE-PROFILE.json; none are created here.
create schema concierge_incident_private_v1 authorization cheveni_incident_data_owner_v1;
revoke all on schema concierge_incident_private_v1 from public,anon,authenticated,service_role;

-- Metadata only. No summary, phone, name, argument digest or original frame.
create table concierge_incident_private_v1.intent_binding(
 user_id uuid not null,intent_id uuid not null,original_ref uuid not null,provider_binding_ref uuid not null,
 account_id uuid not null,member_id uuid not null,property_id uuid not null,
 stay_id uuid not null,incident_id uuid not null,
 primary key(user_id,intent_id),unique(user_id,original_ref),unique(user_id,intent_id,original_ref),unique(user_id,intent_id,original_ref,provider_binding_ref)
);
create table concierge_incident_private_v1.attempt_binding(
 user_id uuid not null,intent_id uuid not null,attempt_id uuid not null,
 session_id uuid not null,token_expires_at bigint not null,
 authority_revision bigint not null check(authority_revision>0),
 restriction_revision bigint not null check(restriction_revision>0),
 dispatch_id uuid not null unique,original_ref uuid not null,provider_binding_ref uuid not null,
 recovery_epoch bigint not null check(recovery_epoch>0),
 state text not null check(state in('DISPATCH_CLAIMED','EFFECT_RECORDED')),
 resulting_status text,
 primary key(user_id,intent_id),unique(user_id,attempt_id),
 foreign key(user_id,intent_id,original_ref) references concierge_incident_private_v1.intent_binding(user_id,intent_id,original_ref),
 foreign key(user_id,intent_id,original_ref,provider_binding_ref) references concierge_incident_private_v1.intent_binding(user_id,intent_id,original_ref,provider_binding_ref)
);
alter table concierge_incident_private_v1.intent_binding owner to cheveni_incident_data_owner_v1;
alter table concierge_incident_private_v1.attempt_binding owner to cheveni_incident_data_owner_v1;
alter table concierge_incident_private_v1.intent_binding enable row level security;
alter table concierge_incident_private_v1.intent_binding force row level security;
alter table concierge_incident_private_v1.attempt_binding enable row level security;
alter table concierge_incident_private_v1.attempt_binding force row level security;
revoke all on concierge_incident_private_v1.intent_binding,concierge_incident_private_v1.attempt_binding from public,anon,authenticated,service_role,cheveni_incident_writer_backend_v1,cheveni_incident_readback_backend_v1,cheveni_incident_scope_backend_v1;

-- A wrapper cannot call old manager_action/fence/manager_scope using new logins:
-- their session_user guards deliberately reject them. No SET ROLE workaround.
create function concierge_incident_private_v1.native_gate_v1(p_kind text) returns void
language plpgsql security invoker set search_path='' as $gate$
begin
 if not ((p_kind='WRITE' and session_user='cheveni_incident_writer_backend_v1' and current_user='cheveni_incident_writer_owner_v1')
 or (p_kind='READ' and session_user='cheveni_incident_readback_backend_v1' and current_user='cheveni_incident_readback_owner_v1')
 or (p_kind='SCOPE' and session_user in('cheveni_incident_writer_backend_v1','cheveni_incident_readback_backend_v1','cheveni_incident_scope_backend_v1') and current_user='cheveni_incident_scope_owner_v1'))
 then raise insufficient_privilege using message='INCIDENT_CALLER_PAIR_HELD';end if;
 if current_setting('transaction_isolation')<>'read committed' or current_setting('session_replication_role')<>'origin'
 or (p_kind='READ' and current_setting('transaction_read_only')<>'on') then raise insufficient_privilege using message='INCIDENT_TRANSACTION_HELD';end if;
 -- Must attest exact catalog/owners/ACL/RLS/fence hooks, live Auth source,
 -- independent floors, launch/privacy guards and original custody FIRST.
 -- Existing hooks do not cover these two new metadata tables automatically.
 raise insufficient_privilege using message='INCIDENT_NATIVE_FENCE_AUTH_FLOORS_CUSTODY_NOT_ACCREDITED';
end $gate$;

create function concierge_incident_private_v1.current_revisions_v1(p_user uuid,p_session uuid,p_incident uuid)
returns table(authority_revision bigint,restriction_revision bigint,dataset_id text,recovery_epoch bigint,inventory_digest text,restriction_journal_id text,restriction_digest text)
language sql security invoker set search_path='' as $missing$
 select null::bigint,null::bigint,null::text,null::bigint,null::text,null::text,null::text where false
$missing$;

create function concierge_incident_private_v1.original_intent_v1(p_user uuid,p_intent uuid,p_original uuid)
returns jsonb language plpgsql security invoker set search_path='' as $original$
begin
 -- Protected immutable reference + approved custody/D02-A, never client JSON.
 raise insufficient_privilege using message='INCIDENT_ORIGINAL_CUSTODY_NOT_ACCREDITED';
end $original$;

create function concierge_incident_private_v1.dispatch_claim_v1(p_user uuid,p_intent uuid,p_attempt uuid,p_dispatch uuid,p_session uuid,p_exp bigint,p_original uuid,p_authority bigint,p_floor jsonb)
returns boolean language sql security invoker set search_path='' as $claim$
 -- No locally fabricated claim. Must validate the independently durable claim,
 -- exact provider identity binding, current attempt/session/authority and floor.
 select false
$claim$;

create function concierge_incident_private_v1.current_resolution_v1(p_user uuid,p_session uuid,p_exp bigint,p_incident uuid,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $scope$
declare rows_ jsonb;n integer;rev record;
begin
 perform concierge_incident_private_v1.native_gate_v1('SCOPE');
 perform pg_advisory_xact_lock(1129728581,1);
 if p_user is null or p_session is null or p_incident is null or p_request is null or p_exp is null or p_exp<=extract(epoch from clock_timestamp()) then raise insufficient_privilege using message='INCIDENT_SCOPE_HELD';end if;
 with candidates as materialized(
  select jsonb_build_object(
   'userId',u.id,'sessionId',s.id,'sessionUserId',s.user_id,'sessionLive',true,'emailConfirmed',true,
   'accountId',a.id,'accountStatus',a.status,'identityMemberId',wi.member_id,'identityAccountId',wi.account_id,
   'identityStatus',wi.status,'identityRevokedAt',wi.revoked_at,'memberId',m.id,'memberAccountId',m.account_id,
   'memberRole',m.role,'memberStatus',m.status,'propertyId',p.id,'propertyAccountId',p.account_id,
   'propertyStatus',p.status,'city',p.city,'stayId',st.id,'stayAccountId',st.account_id,'stayPropertyId',st.property_id,
   'incidentId',i.id,'incidentAccountId',i.account_id,'incidentPropertyId',i.property_id,'incidentStayId',i.stay_id,
   'incidentStatus',i.status,'canManageIncidents',true) as row_
  from auth.users u join auth.sessions s on s.user_id=u.id
  join public.concierge_manager_web_identities wi on wi.auth_user_id=u.id
  join public.concierge_account_members m on m.id=wi.member_id and m.account_id=wi.account_id
  join public.concierge_accounts a on a.id=m.account_id
  join public.concierge_incidents i on i.account_id=a.id and i.id=p_incident
  join public.concierge_properties p on p.id=i.property_id and p.account_id=a.id
  join public.concierge_stays st on st.id=i.stay_id and st.account_id=a.id and st.property_id=p.id
  -- The legacy authorizer uses LIMIT 1 internally. Surface duplicate property
  -- permission rows here so cardinality cannot be manufactured by that limit.
  left join public.concierge_member_property_permissions pp on pp.account_id=a.id and pp.member_id=m.id and pp.property_id=p.id
  join lateral concierge_runtime_qa_v2.concierge_authorize_manager_member_action(m.id,p.id,'manage_incidents') authz
    on authz.result='allow' and authz.account_id=a.id and authz.member_id=m.id and authz.property_id=p.id
  where u.id=p_user and s.id=p_session and u.email_confirmed_at is not null and u.email_confirmed_at<=clock_timestamp()
   and (u.banned_until is null or u.banned_until<=clock_timestamp()) and (s.not_after is null or s.not_after>clock_timestamp())
   and wi.status='active' and wi.revoked_at is null and m.status='active' and m.role in('owner','manager','co_manager')
   and a.status in('active','testing') and p.status='active' and p.city in('CABA','Buenos Aires')
  limit 2
 ) select count(*),jsonb_agg(row_) into n,rows_ from candidates;
 if n<>1 then raise insufficient_privilege using message='INCIDENT_UNIQUE_SCOPE_REQUIRED';end if;
 select count(*) into n from concierge_incident_private_v1.current_revisions_v1(p_user,p_session,p_incident);
 if n<>1 then raise insufficient_privilege using message='INCIDENT_CURRENT_REVISIONS_MISSING';end if;
 -- Revisions/floors require a separate protected producer, not a guessed 1.
 if p_exp<=extract(epoch from clock_timestamp()) then raise insufficient_privilege using message='INCIDENT_SCOPE_EXPIRED';end if;
 return jsonb_build_object('requestId',p_request,'rows',rows_,'observedAtMs',floor(extract(epoch from clock_timestamp())*1000),'expiresAtMs',least(p_exp*1000,floor(extract(epoch from clock_timestamp())*1000)+1000));
end $scope$;

create function concierge_incident_private_v1.change_state_v1(p_user uuid,p_session uuid,p_exp bigint,p_intent uuid,p_attempt uuid,p_dispatch uuid,p_original uuid,p_account uuid,p_member uuid,p_property uuid,p_stay uuid,p_incident uuid,p_status text,p_summary text,p_authority bigint,p_floor jsonb)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $writer$
begin raise insufficient_privilege using message='LEGACY_UNBOUND_ENTRY_HELD';end $writer$;

create function concierge_incident_private_v1.read_effect_v1(p_user uuid,p_session uuid,p_exp bigint,p_intent uuid,p_attempt uuid,p_dispatch uuid,p_original uuid,p_authority bigint,p_floor jsonb)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $reader$
begin raise insufficient_privilege using message='LEGACY_UNBOUND_ENTRY_HELD';end $reader$;

-- No helper is exposed to LOGIN/PUBLIC. Owners/column ACL/RLS remain proposals.
alter function concierge_incident_private_v1.native_gate_v1(text) owner to cheveni_incident_scope_owner_v1;
alter function concierge_incident_private_v1.current_revisions_v1(uuid,uuid,uuid) owner to cheveni_incident_scope_owner_v1;
alter function concierge_incident_private_v1.original_intent_v1(uuid,uuid,uuid) owner to cheveni_incident_writer_owner_v1;
alter function concierge_incident_private_v1.dispatch_claim_v1(uuid,uuid,uuid,uuid,uuid,bigint,uuid,bigint,jsonb) owner to cheveni_incident_writer_owner_v1;
alter function concierge_incident_private_v1.current_resolution_v1(uuid,uuid,bigint,uuid,uuid) owner to cheveni_incident_scope_owner_v1;
alter function concierge_incident_private_v1.change_state_v1(uuid,uuid,bigint,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint,jsonb) owner to cheveni_incident_writer_owner_v1;
alter function concierge_incident_private_v1.read_effect_v1(uuid,uuid,bigint,uuid,uuid,uuid,uuid,bigint,jsonb) owner to cheveni_incident_readback_owner_v1;
revoke all on all functions in schema concierge_incident_private_v1 from public,anon,authenticated,service_role,cheveni_incident_writer_backend_v1,cheveni_incident_readback_backend_v1,cheveni_incident_scope_backend_v1;
grant usage on schema concierge_incident_private_v1 to cheveni_incident_writer_backend_v1,cheveni_incident_readback_backend_v1,cheveni_incident_scope_backend_v1;
grant execute on function concierge_incident_private_v1.current_resolution_v1(uuid,uuid,bigint,uuid,uuid) to cheveni_incident_scope_backend_v1;
-- Required owner-only helper EXECUTE, SELECT columns, exact INSERT/UPDATE and
-- per-command RLS are NOT granted while their provenance is unaccredited.
-- Even if the initial abort were removed, gate/revision/custody stay closed.
revoke all on all functions in schema concierge_incident_private_v1 from public;
rollback;
