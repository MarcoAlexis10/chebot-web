-- REVIEW_ONLY_NOT_EXECUTED. DO NOT APPLY. No installed source or authority.
begin;
do $$begin raise exception 'PROPERTY_ENGINEERING_REVIEW_ONLY';end$$;

-- Proposed protected sources, NEVER seeded by this package. IDs are
-- potentially identifying metadata, not anonymous data. Custody/retention approval still required.
create table concierge_invite_private.bootstrap_founder_assignment_v1 (
 pilot_slot smallint primary key check(pilot_slot=1),
 account_id uuid not null references public.concierge_accounts(id),
 member_id uuid not null,
 assignment_revision bigint not null check(assignment_revision>0),
 decision_ref uuid not null,
 dataset bytea not null check(octet_length(dataset)=32),
 recovery_epoch bigint not null check(recovery_epoch>0),
 revoked_at timestamptz,
 foreign key(member_id,account_id)
  references public.concierge_account_members(id,account_id)
);
-- A boolean per account cannot enforce this singleton across two accounts.
-- No INSERT, default founder, assignment function or automatic reallocation.
create table concierge_invite_private.bootstrap_jurisdiction_v1 (
 original_ref uuid primary key,
 pilot_slot smallint not null references concierge_invite_private.bootstrap_founder_assignment_v1(pilot_slot),
 account_id uuid not null references public.concierge_accounts(id),
 jurisdiction text not null check(jurisdiction='CABA'),
 jurisdiction_revision bigint not null check(jurisdiction_revision>0),
 evidence_ref uuid not null,
 revoked_at timestamptz
);
-- Jurisdiction binds the immutable ORIGINAL, not timezone/city text supplied
-- by a caller. Changed address => changed/contradictory original, never reuse.
alter table concierge_invite_private.bootstrap_founder_assignment_v1 enable row level security;
alter table concierge_invite_private.bootstrap_founder_assignment_v1 force row level security;
alter table concierge_invite_private.bootstrap_jurisdiction_v1 enable row level security;
alter table concierge_invite_private.bootstrap_jurisdiction_v1 force row level security;
revoke all on concierge_invite_private.bootstrap_founder_assignment_v1,
 concierge_invite_private.bootstrap_jurisdiction_v1 from public,anon,authenticated,service_role;

create type concierge_invite_private.property_current_cut_v1 as (
 request_id uuid,user_id uuid,session_id uuid,session_revision bigint,
 issuer text,issued_at bigint,expiry bigint,account_id uuid,member_id uuid,
 permission text,authority_revision bigint,restrictions_revision bigint,
 inventory_revision bigint,founder_revision bigint,quota_revision bigint,
 jurisdiction_revision bigint,dataset bytea,recovery_epoch bigint,
 inventory_digest bytea,restriction_digest bytea,restriction_journal text,
 bootstrap_ref uuid,authority_commit uuid,revoked boolean
);

-- Shape checks alone NEVER establish provider identity or current authority.
create function concierge_invite_private.validate_property_cut_review_v1(
 c concierge_invite_private.property_current_cut_v1,p_request uuid,p_permission text
) returns void language plpgsql security invoker set search_path='' as $$
begin
 raise exception 'PROPERTY_CUT_SHAPE_REVIEW_ONLY';
 if p_request is null or p_permission is null
 or p_permission not in ('identity_only','property_create','property_capture_read')
 or c.request_id is distinct from p_request or c.permission is distinct from p_permission
 or c.user_id is null or c.session_id is null or c.account_id is null or c.member_id is null
 or c.bootstrap_ref is null or c.authority_commit is null
 or c.issuer is distinct from 'https://tjdgrzzeuuihhqnzvaox.supabase.co/auth/v1'
 or c.revoked is distinct from false
 or c.issued_at is null or c.expiry is null or c.issued_at<1 or c.expiry>253402300799
 or c.issued_at>=c.expiry or c.issued_at>extract(epoch from clock_timestamp())
 or c.expiry<=extract(epoch from clock_timestamp())
 or exists(select from unnest(array[c.session_revision,c.authority_revision,c.restrictions_revision,
 c.inventory_revision,c.founder_revision,c.quota_revision,c.jurisdiction_revision,c.recovery_epoch]) x where x is null or x<1)
 or c.dataset is null or octet_length(c.dataset)<>32
 or c.inventory_digest is null or octet_length(c.inventory_digest)<>32
 or c.restriction_digest is null or octet_length(c.restriction_digest)<>32
 or c.restriction_journal is null or c.restriction_journal !~ '^qa_[a-z0-9_-]{1,61}$'
 then raise exception 'PROPERTY_CUT_SHAPE_HELD';end if;
end$$;
revoke all on function concierge_invite_private.validate_property_cut_review_v1(
 concierge_invite_private.property_current_cut_v1,uuid,text) from public,anon,authenticated,service_role;

create function concierge_invite_private.resolve_first_property_review_v1(
 p_request uuid,p_original_ref uuid,p_target uuid
) returns concierge_invite_private.property_current_cut_v1
language plpgsql security definer set search_path='' set lock_timeout='500ms' as $$
declare c concierge_invite_private.property_current_cut_v1;
 a record; n bigint; owner_count bigint;
 f concierge_invite_private.bootstrap_founder_assignment_v1;
 j concierge_invite_private.bootstrap_jurisdiction_v1;
begin
 raise exception 'PROPERTY_BOOTSTRAP_SOURCE_NOT_ACCREDITED';
 if p_request is null or p_original_ref is null or p_target is not null
 or current_user::text<>'cheveni_property_bootstrap_owner_v1'
 or session_user::text not in ('cheveni_property_bootstrap_scope_backend_v1','cheveni_private_mutation_backend_v1')
 or pg_catalog.current_setting('transaction_isolation')<>'read committed'
 then raise exception 'BOOTSTRAP_SCOPE_HELD';end if;
 -- Same global pre-DML fence as write_property_capture_v1, BEFORE row locks.
 perform pg_catalog.pg_advisory_xact_lock(1129728581,1);
 -- REQUIRED MISSING SOURCE: verified provider + current revision intersection.
 -- This is not auth_live(requestId) echo, UI metadata or a JWT-claim resolver.
 c:=concierge_invite_private.bootstrap_current_cut_v1(p_request,'property_create',p_original_ref);
 perform concierge_invite_private.validate_property_cut_review_v1(c,p_request,'property_create');
 if c.request_id is distinct from p_request or c.permission is distinct from 'property_create'
 or c.user_id is null or c.session_id is null or c.account_id is null or c.member_id is null
 or c.revoked is distinct from false or c.expiry is null
 or c.expiry<=extract(epoch from pg_catalog.clock_timestamp())
 then raise exception 'BOOTSTRAP_PROVIDER_HELD';end if;
 perform concierge_invite_private.bootstrap_require_independent_floor_v1(c);
 -- Completeness is a protected catalog/RLS assertion, NEVER count(visible)=0.
 -- Reject unknown/restrictive policies, column/EXECUTE drift or partial source.
 perform concierge_invite_private.bootstrap_require_complete_catalog_v1();
 select count(*) into n from public.concierge_manager_web_identities i
 join public.concierge_account_members m on (m.id,m.account_id)=(i.member_id,i.account_id)
 join public.concierge_accounts ac on ac.id=m.account_id
 where i.auth_user_id=c.user_id and i.status='active' and i.revoked_at is null
 and m.id=c.member_id and m.account_id=c.account_id and m.role='owner'
 and m.status='active' and m.revoked_at is null and ac.status='active';
 if n<>1 or (select count(*) from public.concierge_manager_web_identities
  where auth_user_id=c.user_id and status='active' and revoked_at is null)<>1
 then raise exception 'BOOTSTRAP_RELATION_HELD';end if;
 select id,status,founding_manager,beta_started_at,beta_ends_at into strict a from public.concierge_accounts where id=c.account_id;
 select count(*) into owner_count from public.concierge_account_members
 where account_id=c.account_id and role='owner' and status<>'revoked';
 if owner_count<>1 or a.founding_manager is distinct from true
 or a.beta_started_at is not null or a.beta_ends_at is not null
 then raise exception 'BOOTSTRAP_PRETRIAL_HELD';end if;
 select * into strict f from concierge_invite_private.bootstrap_founder_assignment_v1
 where pilot_slot=1;
 select * into strict j from concierge_invite_private.bootstrap_jurisdiction_v1
 where original_ref=p_original_ref;
 if (f.account_id,f.member_id,f.assignment_revision,f.dataset,f.recovery_epoch)
 is distinct from (c.account_id,c.member_id,c.founder_revision,c.dataset,c.recovery_epoch)
 or f.revoked_at is not null or j.account_id is distinct from c.account_id
 or j.pilot_slot<>1 or j.jurisdiction is distinct from 'CABA'
 or j.jurisdiction_revision is distinct from c.jurisdiction_revision
 or j.revoked_at is not null
 then raise exception 'BOOTSTRAP_ASSIGNMENT_HELD';end if;
 -- Count ALL lifecycle states, including draft, paused and archived.
 if exists(select from public.concierge_properties where account_id=c.account_id)
 or exists(select from concierge_invite_private.beta_property_slot_v1 where account_id=c.account_id)
 then raise exception 'BETA_PROPERTY_SLOT_OCCUPIED';end if;
 perform concierge_invite_private.bootstrap_require_independent_floor_v1(c);
 return c;
end$$;
revoke all on function concierge_invite_private.resolve_first_property_review_v1(uuid,uuid,uuid) from public,anon,authenticated,service_role;

-- Proposed revoker hook: BEFORE STATEMENT, not AFTER ROW. A catalog plan must
-- cover every participant; installing a subset is NOT an authorized source.
create function concierge_invite_private.bootstrap_before_change_review_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 raise exception 'BOOTSTRAP_REVOKER_COVERAGE_NOT_ACCREDITED';
 perform pg_catalog.pg_advisory_xact_lock(1129728581,1);
 perform concierge_invite_private.bootstrap_begin_revision_change_v1(tg_table_schema,tg_table_name,tg_op);
 return null;
end$$;
revoke all on function concierge_invite_private.bootstrap_before_change_review_v1() from public,anon,authenticated,service_role;
-- No triggers installed: see PORTS-AND-ROLES.json for the complete participant set.
-- No trial UPDATE. No property insert. No source fixture. No live grant.
rollback;
