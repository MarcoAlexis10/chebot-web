-- QA REVIEW ONLY / DO NOT APPLY / NOT AUTHORIZED FOR EXECUTION.
begin;
do $abort$ begin raise exception 'CHEVENI_REVIEW_DO_NOT_APPLY';end $abort$;

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

create function concierge_incident_private_v1.revision_update_auth_users_v2() returns trigger language plpgsql security definer set search_path='' as $update$ begin if true then perform concierge_incident_private_v1.revision_step_v2();end if;return null;end $update$;
create trigger incident_revision_before_v2 before insert or update or delete or truncate on auth.users for each statement execute function concierge_incident_private_v1.revision_before_v2();
create trigger incident_revision_changed_v2 after insert or delete or truncate on auth.users for each statement execute function concierge_incident_private_v1.revision_changed_v2();
create trigger incident_revision_update_v2 after update on auth.users referencing old table as old_rows new table as new_rows for each statement execute function concierge_incident_private_v1.revision_update_auth_users_v2();

create function concierge_incident_private_v1.revision_update_auth_sessions_v2() returns trigger language plpgsql security definer set search_path='' as $update$ begin if true then perform concierge_incident_private_v1.revision_step_v2();end if;return null;end $update$;
create trigger incident_revision_before_v2 before insert or update or delete or truncate on auth.sessions for each statement execute function concierge_incident_private_v1.revision_before_v2();
create trigger incident_revision_changed_v2 after insert or delete or truncate on auth.sessions for each statement execute function concierge_incident_private_v1.revision_changed_v2();
create trigger incident_revision_update_v2 after update on auth.sessions referencing old table as old_rows new table as new_rows for each statement execute function concierge_incident_private_v1.revision_update_auth_sessions_v2();

create function concierge_incident_private_v1.revision_update_public_concierge_accounts_v2() returns trigger language plpgsql security definer set search_path='' as $update$ begin if true then perform concierge_incident_private_v1.revision_step_v2();end if;return null;end $update$;
create trigger incident_revision_before_v2 before insert or update or delete or truncate on public.concierge_accounts for each statement execute function concierge_incident_private_v1.revision_before_v2();
create trigger incident_revision_changed_v2 after insert or delete or truncate on public.concierge_accounts for each statement execute function concierge_incident_private_v1.revision_changed_v2();
create trigger incident_revision_update_v2 after update on public.concierge_accounts referencing old table as old_rows new table as new_rows for each statement execute function concierge_incident_private_v1.revision_update_public_concierge_accounts_v2();

create function concierge_incident_private_v1.revision_update_public_concierge_account_members_v2() returns trigger language plpgsql security definer set search_path='' as $update$ begin if true then perform concierge_incident_private_v1.revision_step_v2();end if;return null;end $update$;
create trigger incident_revision_before_v2 before insert or update or delete or truncate on public.concierge_account_members for each statement execute function concierge_incident_private_v1.revision_before_v2();
create trigger incident_revision_changed_v2 after insert or delete or truncate on public.concierge_account_members for each statement execute function concierge_incident_private_v1.revision_changed_v2();
create trigger incident_revision_update_v2 after update on public.concierge_account_members referencing old table as old_rows new table as new_rows for each statement execute function concierge_incident_private_v1.revision_update_public_concierge_account_members_v2();

create function concierge_incident_private_v1.revision_update_public_concierge_manager_web_identities_v2() returns trigger language plpgsql security definer set search_path='' as $update$ begin if true then perform concierge_incident_private_v1.revision_step_v2();end if;return null;end $update$;
create trigger incident_revision_before_v2 before insert or update or delete or truncate on public.concierge_manager_web_identities for each statement execute function concierge_incident_private_v1.revision_before_v2();
create trigger incident_revision_changed_v2 after insert or delete or truncate on public.concierge_manager_web_identities for each statement execute function concierge_incident_private_v1.revision_changed_v2();
create trigger incident_revision_update_v2 after update on public.concierge_manager_web_identities referencing old table as old_rows new table as new_rows for each statement execute function concierge_incident_private_v1.revision_update_public_concierge_manager_web_identities_v2();

create function concierge_incident_private_v1.revision_update_public_concierge_member_property_permissions_v2() returns trigger language plpgsql security definer set search_path='' as $update$ begin if true then perform concierge_incident_private_v1.revision_step_v2();end if;return null;end $update$;
create trigger incident_revision_before_v2 before insert or update or delete or truncate on public.concierge_member_property_permissions for each statement execute function concierge_incident_private_v1.revision_before_v2();
create trigger incident_revision_changed_v2 after insert or delete or truncate on public.concierge_member_property_permissions for each statement execute function concierge_incident_private_v1.revision_changed_v2();
create trigger incident_revision_update_v2 after update on public.concierge_member_property_permissions referencing old table as old_rows new table as new_rows for each statement execute function concierge_incident_private_v1.revision_update_public_concierge_member_property_permissions_v2();

create function concierge_incident_private_v1.revision_update_public_concierge_properties_v2() returns trigger language plpgsql security definer set search_path='' as $update$ begin if true then perform concierge_incident_private_v1.revision_step_v2();end if;return null;end $update$;
create trigger incident_revision_before_v2 before insert or update or delete or truncate on public.concierge_properties for each statement execute function concierge_incident_private_v1.revision_before_v2();
create trigger incident_revision_changed_v2 after insert or delete or truncate on public.concierge_properties for each statement execute function concierge_incident_private_v1.revision_changed_v2();
create trigger incident_revision_update_v2 after update on public.concierge_properties referencing old table as old_rows new table as new_rows for each statement execute function concierge_incident_private_v1.revision_update_public_concierge_properties_v2();

create function concierge_incident_private_v1.revision_update_public_concierge_stays_v2() returns trigger language plpgsql security definer set search_path='' as $update$ begin if exists((select id,account_id,property_id,status from old_rows except select id,account_id,property_id,status from new_rows) union all (select id,account_id,property_id,status from new_rows except select id,account_id,property_id,status from old_rows)) then perform concierge_incident_private_v1.revision_step_v2();end if;return null;end $update$;
create trigger incident_revision_before_v2 before insert or update or delete or truncate on public.concierge_stays for each statement execute function concierge_incident_private_v1.revision_before_v2();
create trigger incident_revision_changed_v2 after insert or delete or truncate on public.concierge_stays for each statement execute function concierge_incident_private_v1.revision_changed_v2();
create trigger incident_revision_update_v2 after update on public.concierge_stays referencing old table as old_rows new table as new_rows for each statement execute function concierge_incident_private_v1.revision_update_public_concierge_stays_v2();

create function concierge_incident_private_v1.revision_update_public_concierge_incidents_v2() returns trigger language plpgsql security definer set search_path='' as $update$ begin if exists((select id,account_id,property_id,stay_id from old_rows except select id,account_id,property_id,stay_id from new_rows) union all (select id,account_id,property_id,stay_id from new_rows except select id,account_id,property_id,stay_id from old_rows)) then perform concierge_incident_private_v1.revision_step_v2();end if;return null;end $update$;
create trigger incident_revision_before_v2 before insert or update or delete or truncate on public.concierge_incidents for each statement execute function concierge_incident_private_v1.revision_before_v2();
create trigger incident_revision_changed_v2 after insert or delete or truncate on public.concierge_incidents for each statement execute function concierge_incident_private_v1.revision_changed_v2();
create trigger incident_revision_update_v2 after update on public.concierge_incidents referencing old table as old_rows new table as new_rows for each statement execute function concierge_incident_private_v1.revision_update_public_concierge_incidents_v2();

revoke all on all functions in schema concierge_incident_private_v1 from public;
rollback;
