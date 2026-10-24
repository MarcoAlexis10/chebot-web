-- FICTIONAL MODEL ONLY. No Concierge schema, users, guests or production services.
do $$begin if current_setting('cheveni.qa_mode',true) is distinct from 'FICTIONAL_ONLY' then raise exception 'QA_MODEL_ONLY';end if;end$$;
create schema qa_launch;
create role qa_admission_executor nologin noinherit;
create role qa_revocation_executor nologin noinherit;
create role qa_policy_verifier nologin noinherit;
create role qa_journal_publisher nologin noinherit;
create role anon nologin noinherit;
create table qa_launch.pilot(id int primary key check(id=1));insert into qa_launch.pilot values(1);
create table qa_launch.notice(id int primary key check(id=1),version text not null,digest text not null,fictional_reviewed boolean not null default false);
create table qa_launch.members(id uuid primary key,account_id uuid not null,subject_ref text unique not null check(subject_ref ~ '^subject-[a-f0-9]{16}$'),state text not null check(state in('ACTIVE','REVOKED','ERASURE_HOLD')),auth_verified boolean not null,consent_version text,consent_digest text,consent_until timestamptz,role text not null default 'OWNER' check(role in('OWNER','MEMBER')));
create table qa_launch.properties(id uuid primary key,account_id uuid not null,city text not null);
create table qa_launch.operator_tickets(manager_id uuid,property_id uuid,notice_digest text not null,fictional_approved boolean not null default false,primary key(manager_id,property_id));
create table qa_launch.reservations(request_id uuid primary key,manager_id uuid not null,account_id uuid not null,property_id uuid not null,state text not null check(state in('STAGED','REVOKED')));
create unique index single_staged_pilot on qa_launch.reservations((1)) where state='STAGED';
create table qa_launch.stream(id int primary key check(id=1),journal_id text not null,last_sequence bigint not null);
insert into qa_launch.stream values(1,'FICTIONAL_INDEPENDENT_STREAM',0);
create table qa_launch.outbox(sequence bigint primary key,subject text not null,action text not null check(action in('REVOKE','ERASURE_HOLD')),at timestamptz not null);

create function qa_launch.stage_candidate(actor uuid,account_ref uuid,property_ref uuid,request_ref uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_launch as $$
declare m qa_launch.members%rowtype;p qa_launch.properties%rowtype;n qa_launch.notice%rowtype;r qa_launch.reservations%rowtype;reason text;
begin
 perform 1 from qa_launch.pilot where id=1 for update;
 if not found then reason:='PILOT_CONFIGURATION_MISSING';else
  select * into m from qa_launch.members where id=actor for update;
  select * into p from qa_launch.properties where id=property_ref;
  select * into n from qa_launch.notice where id=1;
  if m.id is null or m.account_id is distinct from account_ref or p.id is null or p.account_id is distinct from account_ref then reason:='SCOPE_MISMATCH';
  elsif m.state<>'ACTIVE' or not m.auth_verified or m.role<>'OWNER' then reason:='ACTOR_NOT_CURRENT';
  elsif (select count(*) from qa_launch.members where account_id=account_ref and state='ACTIVE')<>1 then reason:='ONE_MANAGER_SCOPE_REQUIRED';
  elsif p.city<>'AR-CABA' then reason:='CITY_OUTSIDE_PILOT';
  elsif n.id is null or not n.fictional_reviewed then reason:='PRIVACY_REVIEW_MISSING';
  elsif m.consent_version is distinct from n.version or m.consent_digest is distinct from n.digest or m.consent_until is null or m.consent_until<=clock_timestamp() then reason:='CURRENT_CONSENT_REQUIRED';
  elsif not exists(select from qa_launch.operator_tickets t where t.manager_id=actor and t.property_id=property_ref and t.notice_digest=n.digest and t.fictional_approved) then reason:='SUPERVISED_SELECTION_REQUIRED';
  else
   select * into r from qa_launch.reservations where request_id=request_ref;
   if r.request_id is not null then
    if r.manager_id<>actor or r.account_id<>account_ref or r.property_id<>property_ref then reason:='IDEMPOTENCY_SCOPE_MISMATCH';
    elsif r.state<>'STAGED' then reason:='REQUEST_REVOKED';
    else return jsonb_build_object('decision','STAGED_FICTIONAL_ONLY','idempotent',true,'managerActivated',false,'guestAccess',false,'trialStarted',false,'operationalApproval',false);end if;
   elsif exists(select from qa_launch.reservations where state='STAGED') then reason:='PILOT_SLOT_OCCUPIED';
   else
    insert into qa_launch.reservations values(request_ref,actor,account_ref,property_ref,'STAGED');
    return jsonb_build_object('decision','STAGED_FICTIONAL_ONLY','idempotent',false,'managerActivated',false,'guestAccess',false,'trialStarted',false,'operationalApproval',false);
   end if;
  end if;
 end if;
 return jsonb_build_object('decision','DENY','reason',reason,'managerActivated',false,'guestAccess',false,'trialStarted',false,'operationalApproval',false);
end$$;

create function qa_launch.revoke_subject(actor uuid,action_ref text) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_launch as $$
declare m qa_launch.members%rowtype;next_sequence bigint;target text;
begin
 if action_ref not in('REVOKE','ERASURE_HOLD') then raise exception 'REVOCATION_ACTION_REJECTED';end if;
 perform 1 from qa_launch.pilot where id=1 for update;
 select * into m from qa_launch.members where id=actor for update;
 if m.id is null then raise exception 'SUBJECT_NOT_REGISTERED';end if;
 target:=case when action_ref='ERASURE_HOLD' then 'ERASURE_HOLD' else 'REVOKED' end;
 if m.state=target or m.state='ERASURE_HOLD' then return jsonb_build_object('eventAdded',false,'externalJournalAcknowledged',false);end if;
 update qa_launch.members set state=target where id=actor;
 update qa_launch.reservations set state='REVOKED' where manager_id=actor and state='STAGED';
 update qa_launch.stream set last_sequence=last_sequence+1 where id=1 returning last_sequence into next_sequence;
 if next_sequence is null then raise exception 'STREAM_CONFIGURATION_MISSING';end if;
 insert into qa_launch.outbox values(next_sequence,m.subject_ref,action_ref,date_trunc('milliseconds',clock_timestamp()));
 return jsonb_build_object('eventAdded',true,'externalJournalAcknowledged',false,'sequence',next_sequence);
end$$;

create function qa_launch.replace_notice(new_version text,new_digest text) returns void language plpgsql security definer set search_path=pg_catalog,qa_launch as $$
begin
 if new_version !~ '^qa-notice-v[0-9]+$' or new_digest !~ '^[a-f0-9]{64}$' then raise exception 'FICTIONAL_NOTICE_ONLY';end if;
 perform 1 from qa_launch.pilot where id=1 for update;
 update qa_launch.notice set version=new_version,digest=new_digest,fictional_reviewed=true where id=1;
 update qa_launch.reservations set state='REVOKED' where state='STAGED';
end$$;

revoke all on schema qa_launch from public;
revoke all on all tables in schema qa_launch from public;
revoke all on all functions in schema qa_launch from public;
grant usage on schema qa_launch to qa_admission_executor,qa_revocation_executor,qa_policy_verifier,qa_journal_publisher;
grant execute on function qa_launch.stage_candidate(uuid,uuid,uuid,uuid) to qa_admission_executor;
grant execute on function qa_launch.revoke_subject(uuid,text) to qa_revocation_executor;
grant execute on function qa_launch.replace_notice(text,text) to qa_policy_verifier;
do $$declare t record;begin for t in select tablename from pg_tables where schemaname='qa_launch' loop execute format('alter table qa_launch.%I enable row level security',t.tablename);execute format('alter table qa_launch.%I force row level security',t.tablename);end loop;end$$;
grant select on qa_launch.outbox to qa_journal_publisher;
create policy publisher_read_only on qa_launch.outbox for select to qa_journal_publisher using(true);
