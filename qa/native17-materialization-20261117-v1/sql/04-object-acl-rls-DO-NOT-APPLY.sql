-- REVIEW ONLY / DO NOT APPLY. Phase fragment; never an installer.
begin;
do $$begin raise exception 'PROPERTY_PHASE_REVIEW_ONLY';end$$;

alter table concierge_invite_private.bootstrap_founder_assignment_v1 owner to cheveni_property_governance_owner_v1;
alter table concierge_invite_private.bootstrap_jurisdiction_v1 owner to cheveni_property_governance_owner_v1;
alter table concierge_invite_private.property_admission_v1 owner to cheveni_property_admission_owner_v1;
alter table concierge_invite_private.property_dispatch_context_v1 owner to cheveni_property_admission_owner_v1;

create policy property_founder_read on concierge_invite_private.bootstrap_founder_assignment_v1
 for select to cheveni_property_bootstrap_owner_v1 using(true);
create policy property_jurisdiction_read on concierge_invite_private.bootstrap_jurisdiction_v1
 for select to cheveni_property_bootstrap_owner_v1 using(true);
create policy property_admission_internal on concierge_invite_private.property_admission_v1
 for all to cheveni_property_admission_owner_v1 using(true) with check(true);
create policy property_context_internal on concierge_invite_private.property_dispatch_context_v1
 for all to cheveni_property_admission_owner_v1 using(true) with check(true);
create policy property_admission_legacy_read on concierge_invite_private.property_admission_v1
 for select to cheveni_private_mutation_owner_v1 using(true);
create policy property_context_legacy_read on concierge_invite_private.property_dispatch_context_v1
 for select to cheveni_private_mutation_owner_v1 using(true);
create policy property_admission_reader_read on concierge_invite_private.property_admission_v1
 for select to cheveni_property_capture_read_owner_v2 using(true);

-- Full source inventory under RLS, only for NOLOGIN function owners. No general
-- SELECT to application logins. Catalog must reject restrictive/unknown policy
-- intersections rather than interpreting filtered zero rows as completeness.
create policy property_bootstrap_account_read on public.concierge_accounts
 for select to cheveni_property_bootstrap_owner_v1,cheveni_property_capture_read_owner_v2 using(true);
create policy property_bootstrap_member_read on public.concierge_account_members
 for select to cheveni_property_bootstrap_owner_v1,cheveni_property_capture_read_owner_v2 using(true);
create policy property_bootstrap_identity_read on public.concierge_manager_web_identities
 for select to cheveni_property_bootstrap_owner_v1,cheveni_property_capture_read_owner_v2 using(true);
create policy property_bootstrap_inventory_read on public.concierge_properties
 for select to cheveni_property_bootstrap_owner_v1,cheveni_property_capture_read_owner_v2 using(true);
create policy property_bootstrap_slot_read on concierge_invite_private.beta_property_slot_v1
 for select to cheveni_property_bootstrap_owner_v1,cheveni_property_capture_read_owner_v2 using(true);
create policy property_result_reader_read on concierge_invite_private.manager_result_v1
 for select to cheveni_property_capture_read_owner_v2,cheveni_property_admission_owner_v1 using(true);
create policy property_capture_comparison_read on concierge_invite_private.property_capture_v1
 for select to cheveni_property_admission_owner_v1 using(true);

grant select(id,status,founding_manager,beta_started_at,beta_ends_at) on public.concierge_accounts to cheveni_property_bootstrap_owner_v1;
grant select(id,status) on public.concierge_accounts to cheveni_property_capture_read_owner_v2;
grant select(id,account_id,role,status,revoked_at) on public.concierge_account_members
 to cheveni_property_bootstrap_owner_v1,cheveni_property_capture_read_owner_v2;
grant select(auth_user_id,member_id,account_id,status,revoked_at) on public.concierge_manager_web_identities
 to cheveni_property_bootstrap_owner_v1,cheveni_property_capture_read_owner_v2;
grant select(account_id) on public.concierge_properties to cheveni_property_bootstrap_owner_v1;
grant select(id,account_id,city,status) on public.concierge_properties to cheveni_property_capture_read_owner_v2;
grant select(account_id) on concierge_invite_private.beta_property_slot_v1 to cheveni_property_bootstrap_owner_v1;
grant select(account_id,property_id,city) on concierge_invite_private.beta_property_slot_v1 to cheveni_property_capture_read_owner_v2;
grant select on concierge_invite_private.bootstrap_founder_assignment_v1,concierge_invite_private.bootstrap_jurisdiction_v1 to cheveni_property_bootstrap_owner_v1;
grant select(principal_id,intent_id) on concierge_invite_private.manager_result_v1 to cheveni_property_admission_owner_v1;
grant select(principal_id,intent_id,address,floor_or_unit) on concierge_invite_private.property_capture_v1 to cheveni_property_admission_owner_v1;
grant select on concierge_invite_private.property_admission_v1,concierge_invite_private.property_dispatch_context_v1 to cheveni_private_mutation_owner_v1;
grant select(principal_id,intent_id,request_id,first_attempt_id,original_ref,key,historical_session,
 historical_session_revision,account_id,member_id,operation) on concierge_invite_private.property_admission_v1
 to cheveni_property_capture_read_owner_v2;
grant select(principal_id,intent_id,account_id,member_id,original_role,operation,command_digest,state,result_property_id)
 on concierge_invite_private.manager_result_v1 to cheveni_property_capture_read_owner_v2;

-- Proposed entry ownership, exact reader signature stays /2 with 26 arguments.
alter function concierge_invite_private.resolve_first_property_review_v1(uuid,uuid,uuid) owner to cheveni_property_bootstrap_owner_v1;
alter function concierge_invite_private.capture_first_property_review_v1(uuid,uuid,uuid,uuid,bytea) owner to cheveni_property_admission_owner_v1;
alter function concierge_invite_private.read_property_capture_v2(
 uuid,uuid,uuid,bigint,bigint,text,bigint,uuid,text,bigint,bigint,bigint,bigint,bigint,bigint,
 bytea,bigint,bytea,bytea,text,uuid,uuid,uuid,uuid,uuid,bytea) owner to cheveni_property_capture_read_owner_v2;

-- NOT an activation script. Missing ports/types/USAGE/EXECUTE closures must be
-- supplied and captured in the future approved materialization. No grant to
-- any application login is emitted here. Defaults are NOT assumed to be safe.
-- Reader never receives payload resolver, write/admission/context EXECUTE,
-- table DML, writer membership or owner-table capability.
-- All dependency EXECUTEs are individually specified in PORTS-AND-ROLES.json.
rollback;
