-- NEW integration contract, NOT a migration or production authorization.
-- Load only after approved qa_legal dependency, inside owned network=none fixture.
do $$begin if current_setting('cheveni.qa_mode',true) is distinct from 'FICTIONAL_ONLY' then raise exception 'FICTIONAL_FIXTURE_REQUIRED';end if;end$$;
create role qa_lifecycle_bridge nologin noinherit;
create schema qa_lifecycle authorization qa_legal_owner;
revoke all on schema qa_lifecycle from public;
set local role qa_legal_owner;
alter default privileges in schema qa_lifecycle revoke execute on functions from public;
-- ONLY the fixture's trusted bootstrap can insert a supervised enrollment.
-- Acceptance alone cannot create this row. No approval RPC or boolean input.
create table qa_lifecycle.enrollments(scope uuid primary key,actor uuid not null,event_id uuid not null references qa_legal.acceptances,epoch bigint not null,property uuid unique not null,state text not null check(state in('SUPERVISED_FIXTURE','WITHDRAWN')),beta_start timestamptz,beta_end timestamptz,check((beta_start is null and beta_end is null) or(beta_start is not null and beta_end=beta_start+interval '720 hours')));
create table qa_lifecycle.stays(id uuid primary key,scope uuid not null references qa_lifecycle.enrollments,property uuid not null,guest uuid not null,state text not null check(state in('VERIFIED_FIXTURE','ENDED')),access_from timestamptz not null,access_until timestamptz not null check(access_until>access_from),end_event uuid unique,ended_at timestamptz,check((state='ENDED')=(ended_at is not null and end_event is not null)));
-- No free-form requests, contacts, documents, chat contents or raw credential.
create table qa_lifecycle.events(id uuid primary key,kind text not null check(kind in('WITHDRAW','ERASURE_HOLD','END_STAY','START_CLOCK')),scope uuid not null,actor uuid not null,stay uuid,at timestamptz not null);
create unique index one_withdrawal on qa_lifecycle.events(scope) where kind in('WITHDRAW','ERASURE_HOLD');
create unique index one_clock on qa_lifecycle.events(scope) where kind='START_CLOCK';
-- Same-DB outbox: deliberately NOT the independent durable revocation journal.
create table qa_lifecycle.outbox(event_id uuid primary key references qa_lifecycle.events,state text not null default 'PENDING' check(state in('PENDING','ACKNOWLEDGED')),external_receipt uuid);
create table qa_lifecycle.erasure_requests(scope uuid primary key,requested_at timestamptz not null,state text not null check(state='REVIEW_REQUIRED'));
do $$declare t text;begin foreach t in array array['enrollments','stays','events','outbox','erasure_requests'] loop
 execute format('alter table qa_lifecycle.%I enable row level security',t);execute format('alter table qa_lifecycle.%I force row level security',t);
 execute format('create policy owner_only on qa_lifecycle.%I to qa_legal_owner using(true) with check(true)',t);
end loop;end$$;
create function qa_lifecycle.denied() returns jsonb language sql immutable set search_path=pg_catalog as $$select '{"ok":false,"code":"QA_LIFECYCLE_DENIED","privateAccess":false,"safeHelp":true,"operationalApproval":false}'::jsonb$$;
-- Recheck current legal bytes/release, acceptance, revocation epoch and scope.
-- All public entry functions must hold qa_legal.gate FOR UPDATE first.
create function qa_lifecycle.admitted(p_scope uuid,p_now timestamptz) returns boolean language sql stable set search_path=pg_catalog,qa_legal,qa_lifecycle as $$
 select exists(select 1 from qa_lifecycle.enrollments e
 join qa_legal.subjects s on(s.actor=e.actor and s.scope=e.scope)
 join qa_legal.candidates c on(c.actor=e.actor and c.scope=e.scope and c.event_id=e.event_id)
 join qa_legal.deliveries d on(d.id=e.event_id)
 join qa_legal.acceptances a on(a.event_id=d.id)
 join qa_legal.gate g on(g.singleton=1)
 where e.scope=p_scope and e.state='SUPERVISED_FIXTURE' and s.state='ACTIVE' and s.epoch=e.epoch and d.epoch=e.epoch
 and c.state='PENDING' and d.release_id=g.release_id and d.generation=g.generation
 and a.accepted_at>=d.delivered_at and a.accepted_at<=p_now
 and (select count(*) from qa_legal.current_documents(g.release_id,p_now))=2
 and (select count(*) from qa_legal.delivery_documents x join qa_legal.current_documents(g.release_id,p_now) y on(x.kind=y.kind and x.version=y.version and x.sha256=y.sha256 and x.body=y.body and x.url=y.url) where x.delivery_id=d.id)=2)
$$;
create function qa_lifecycle.manager_scope(p_digest text,p_now timestamptz) returns uuid language sql stable set search_path=pg_catalog,qa_legal,qa_lifecycle as $$
 select e.scope from qa_legal.context(p_digest,p_now) c join qa_legal.issuances i on i.id=c.issuance_id
 join qa_lifecycle.enrollments e on(e.actor=i.actor and e.scope=i.scope and e.epoch=c.epoch)
 where c.id is not null and qa_lifecycle.admitted(e.scope,p_now)
$$;
create function qa_lifecycle.guest_read(p_digest text,p_stay uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_legal,qa_lifecycle as $$
declare g qa_legal.gate;c qa_legal.credentials;i qa_legal.issuances;s qa_lifecycle.stays;t timestamptz;
begin
 select * into g from qa_legal.gate where singleton=1 for update;t:=clock_timestamp();
 if t<g.clock_floor then return qa_lifecycle.denied();end if;
 c:=qa_legal.context(p_digest,t);if c.id is null then return qa_lifecycle.denied();end if;
 select * into i from qa_legal.issuances where id=c.issuance_id;
 select * into s from qa_lifecycle.stays where id=p_stay;
 if s.id is null or s.guest<>i.actor or s.scope<>i.scope or s.state<>'VERIFIED_FIXTURE' or t<s.access_from or t>=s.access_until or not qa_lifecycle.admitted(s.scope,t)
 or not exists(select 1 from qa_lifecycle.enrollments e where e.scope=s.scope and e.property=s.property) then return qa_lifecycle.denied();end if;
 -- Existing verified stay continues only to its own boundary, even if beta expires.
 -- Proposed policy; no new stays or automatic extension after expiry.
 update qa_legal.gate set clock_floor=t where singleton=1;
 return jsonb_build_object('ok',true,'code','QA_PRIVATE_SCOPE_ONLY','stay',s.id,'property',s.property,'privateAccess',true,'safeHelp',true,'operationalApproval',false);
end$$;
create function qa_lifecycle.start_clock(p_digest text,p_stay uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_legal,qa_lifecycle as $$
declare g qa_legal.gate;e qa_lifecycle.enrollments;s qa_lifecycle.stays;scope_id uuid;t timestamptz;ev uuid;
begin
 select * into g from qa_legal.gate where singleton=1 for update;t:=clock_timestamp();
 if t<g.clock_floor then return qa_lifecycle.denied();end if;
 scope_id:=qa_lifecycle.manager_scope(p_digest,t);if scope_id is null then return qa_lifecycle.denied();end if;
 select * into e from qa_lifecycle.enrollments where scope=scope_id for update;
 select * into s from qa_lifecycle.stays where id=p_stay;
 -- Captured AFTER locks; never authorize using a timestamp from before waiting.
 t:=clock_timestamp();
 if t<g.clock_floor or qa_lifecycle.manager_scope(p_digest,t) is distinct from e.scope or s.id is null or s.scope<>e.scope or s.property<>e.property or s.state<>'VERIFIED_FIXTURE' or t<s.access_from or t>=s.access_until then return qa_lifecycle.denied();end if;
 if e.beta_start is not null then return jsonb_build_object('ok',true,'code','QA_CLOCK_ALREADY_STARTED','idempotent',true,'operationalApproval',false);end if;
 ev:=gen_random_uuid();update qa_lifecycle.enrollments set beta_start=t,beta_end=t+interval '720 hours' where scope=e.scope;
 insert into qa_lifecycle.events values(ev,'START_CLOCK',e.scope,e.actor,s.id,t);
 update qa_legal.gate set clock_floor=t where singleton=1;
 return jsonb_build_object('ok',true,'code','QA_CLOCK_30_DAYS_NO_AUTOBILL','idempotent',false,'operationalApproval',false);
end$$;
-- Used before any NEW stay/enrollment operation, not for safety/help or exit.
create function qa_lifecycle.new_work_allowed(p_digest text) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_legal,qa_lifecycle as $$
declare g qa_legal.gate;scope_id uuid;t timestamptz;e qa_lifecycle.enrollments;
begin
 select * into g from qa_legal.gate where singleton=1 for update;t:=clock_timestamp();
 if t<g.clock_floor then return qa_lifecycle.denied();end if;
 scope_id:=qa_lifecycle.manager_scope(p_digest,t);if scope_id is null then return qa_lifecycle.denied();end if;
 select * into e from qa_lifecycle.enrollments where scope=scope_id;
 if e.beta_start is not null and (t<e.beta_start or t>=e.beta_end) then return qa_lifecycle.denied();end if;
 return jsonb_build_object('ok',true,'code','QA_CURRENT_MANAGER_ONLY','operationalApproval',false);
end$$;
-- Identity comes from current issuance, NOT client actor/scope. Exit is independent
-- of legal-version currency and beta expiry. No automatic external sends/deletes.
create function qa_lifecycle.exit(p_digest text,p_event uuid,p_kind text,p_stay uuid default null) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_legal,qa_lifecycle as $$
declare g qa_legal.gate;c qa_legal.credentials;i qa_legal.issuances;e qa_lifecycle.enrollments;s qa_lifecycle.stays;ev qa_lifecycle.events;t timestamptz;r jsonb;
begin
 select * into g from qa_legal.gate where singleton=1 for update;t:=clock_timestamp();
 if t<g.clock_floor or p_event is null or p_kind is null or p_kind not in('WITHDRAW','ERASURE_HOLD','END_STAY') or(p_kind<>'END_STAY' and p_stay is not null) or(p_kind='END_STAY' and p_stay is null) then return qa_lifecycle.denied();end if;
 -- For an exact exit replay, require the still-valid ORIGINAL issuance + digest,
 -- even though this exit itself revoked the legal epoch. No reuse for access.
 select * into c from qa_legal.credentials where digest=p_digest;
 select * into i from qa_legal.issuances where id=c.issuance_id;
 if c.id is null or i.id is null or i.kind<>'SESSION' or i.revoked or i.issued_at>c.issued_at or c.issued_at>t or t>=c.until_at or c.until_at>i.until_at then return qa_lifecycle.denied();end if;
 select * into e from qa_lifecycle.enrollments where scope=i.scope and actor=i.actor for update;
 if e.scope is null then return qa_lifecycle.denied();end if;
 select * into ev from qa_lifecycle.events where id=p_event;
 if ev.id is not null then
  if ev.actor<>i.actor or ev.scope<>i.scope or ev.kind<>p_kind or ev.stay is distinct from p_stay then return qa_lifecycle.denied();end if;
  return jsonb_build_object('ok',true,'code','QA_EXIT_RECORDED','idempotent',true,'externalPropagationVerified',false,'erasureComplete',false,'operationalApproval',false);
 end if;
 c:=qa_legal.context(p_digest,t);
 if c.id is null or c.epoch<>e.epoch or e.state<>'SUPERVISED_FIXTURE' then return qa_lifecycle.denied();end if;
 if p_kind='END_STAY' then
  select * into s from qa_lifecycle.stays where id=p_stay and scope=e.scope and property=e.property for update;
  if s.id is null or s.state<>'VERIFIED_FIXTURE' then return qa_lifecycle.denied();end if;
  update qa_lifecycle.stays set state='ENDED',end_event=p_event,ended_at=t where id=s.id;
 else
  r:=qa_legal.revoke(e.actor,e.scope,case when p_kind='WITHDRAW' then 'REVOKE' else 'ERASURE_HOLD' end);
  if r->>'ok' is distinct from 'true' then raise exception 'QA_EXIT_ATOMIC_DENIED';end if;
  update qa_lifecycle.enrollments set state='WITHDRAWN' where scope=e.scope;
  update qa_lifecycle.stays set state='ENDED',end_event=gen_random_uuid(),ended_at=t where scope=e.scope and state='VERIFIED_FIXTURE';
  if p_kind='ERASURE_HOLD' then insert into qa_lifecycle.erasure_requests values(e.scope,t,'REVIEW_REQUIRED');end if;
 end if;
 insert into qa_lifecycle.events values(p_event,p_kind,e.scope,e.actor,p_stay,t);
 insert into qa_lifecycle.outbox(event_id) values(p_event);
 update qa_legal.gate set clock_floor=t where singleton=1;
 return jsonb_build_object('ok',true,'code','QA_EXIT_RECORDED','idempotent',false,'externalPropagationVerified',false,'erasureComplete',false,'operationalApproval',false);
end$$;
revoke all on all tables in schema qa_lifecycle from public,qa_lifecycle_bridge;
revoke all on all functions in schema qa_lifecycle from public;
grant usage on schema qa_lifecycle to qa_lifecycle_bridge;
grant execute on function qa_lifecycle.guest_read(text,uuid),qa_lifecycle.start_clock(text,uuid),qa_lifecycle.new_work_allowed(text),qa_lifecycle.exit(text,uuid,text,uuid) to qa_lifecycle_bridge;
reset role;
