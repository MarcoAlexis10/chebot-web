-- Contract 13 implementation candidate, NOT a migration. NO shared database.
-- Bootstrap must be inside an owned network=none PostgreSQL fixture.
do $$begin if current_setting('cheveni.qa_mode',true) is distinct from 'FICTIONAL_ONLY' then raise exception 'FICTIONAL_FIXTURE_REQUIRED';end if;end$$;
create role qa_legal_owner nologin noinherit;
create role qa_legal_bridge nologin noinherit;
create role qa_legal_custodian nologin noinherit;
create role qa_legal_publisher nologin noinherit;
create schema qa_legal authorization qa_legal_owner;
revoke all on schema qa_legal from public;
set local role qa_legal_owner;
alter default privileges in schema qa_legal revoke execute on functions from public;
create table qa_legal.documents(
 kind text check(kind in ('notice','terms')),version text check(version ~ '^fictional-v[0-9]+$'),
 body text not null check(octet_length(body) between 1 and 65536),
 sha256 text not null check(sha256=encode(sha256(convert_to(body,'UTF8')),'hex')),
 url text not null check(url ~ '^https://legal[.]invalid/[a-z0-9/-]+$'),
 effective_at timestamptz not null,until_at timestamptz not null check(until_at>effective_at),
 review_ref uuid not null, -- FICTITIOUS provenance only; not legal approval.
 primary key(kind,version)
);
create table qa_legal.releases(id uuid primary key,notice_kind text not null default 'notice' check(notice_kind='notice'),notice_version text not null,terms_kind text not null default 'terms' check(terms_kind='terms'),terms_version text not null,foreign key(notice_kind,notice_version) references qa_legal.documents,foreign key(terms_kind,terms_version) references qa_legal.documents);
create table qa_legal.gate(singleton int primary key check(singleton=1),release_id uuid references qa_legal.releases,generation bigint not null default 0,clock_floor timestamptz not null);
insert into qa_legal.gate values(1,null,0,'2000-01-01T00:00:00Z');
create table qa_legal.subjects(actor uuid,scope uuid,epoch bigint not null default 0,state text not null check(state in('ACTIVE','REVOKED','ERASURE_HOLD')),primary key(actor,scope));
-- Only bootstrap/verified issuer can create these records. NO browser write grant.
create table qa_legal.issuances(id uuid primary key,actor uuid not null,scope uuid not null,kind text not null check(kind in('SESSION','TICKET')),issued_at timestamptz not null,until_at timestamptz not null check(until_at>issued_at),revoked boolean not null default false,foreign key(actor,scope) references qa_legal.subjects);
create table qa_legal.credentials(id uuid primary key,digest text unique not null check(digest ~ '^[a-f0-9]{64}$'),issuance_id uuid not null references qa_legal.issuances,epoch bigint not null,issued_at timestamptz not null,until_at timestamptz not null check(until_at>issued_at),bound_delivery uuid,consumed_delivery uuid);
create table qa_legal.deliveries(id uuid primary key default gen_random_uuid(),credential_id uuid not null references qa_legal.credentials,actor uuid not null,scope uuid not null,epoch bigint not null,release_id uuid not null references qa_legal.releases,generation bigint not null,delivered_at timestamptz not null,until_at timestamptz not null check(until_at>delivered_at));
create table qa_legal.delivery_documents(delivery_id uuid references qa_legal.deliveries,kind text,version text not null,sha256 text not null,body text not null,url text not null,primary key(delivery_id,kind),foreign key(kind,version) references qa_legal.documents,check(sha256=encode(sha256(convert_to(body,'UTF8')),'hex')));
create table qa_legal.acceptances(event_id uuid primary key references qa_legal.deliveries,accepted_at timestamptz not null);
create table qa_legal.candidates(id uuid primary key default gen_random_uuid(),actor uuid not null,scope uuid not null,event_id uuid unique not null references qa_legal.acceptances,state text not null check(state in('PENDING','STALE','REVOKED')),unique(actor,scope));
create table qa_legal.audit(id uuid primary key default gen_random_uuid(),action text not null check(action in('DELIVERY','ACCEPTANCE','REVOKE','ERASURE_HOLD','RELEASE')),subject_ref uuid,event_id uuid,at timestamptz not null);
-- Private tables; FORCE RLS even for the restricted non-login function owner.
do $$declare t text;begin foreach t in array array['documents','releases','gate','subjects','issuances','credentials','deliveries','delivery_documents','acceptances','candidates','audit'] loop
 execute format('alter table qa_legal.%I enable row level security',t);execute format('alter table qa_legal.%I force row level security',t);
 execute format('create policy owner_only on qa_legal.%I to qa_legal_owner using(true) with check(true)',t);
end loop;end$$;
create function qa_legal.deny() returns jsonb language sql immutable set search_path=pg_catalog as $$select '{"ok":false,"code":"LEGAL_EVIDENCE_DENIED","managerActivated":false,"guestAccess":false,"trialStarted":false,"operationalApproval":false}'::jsonb$$;
-- Caller first holds gate FOR UPDATE. No client actor/scope/clock input.
create function qa_legal.context(p_digest text,p_now timestamptz) returns qa_legal.credentials language sql stable set search_path=pg_catalog,qa_legal as $$
 select c.* from qa_legal.credentials c join qa_legal.issuances i on i.id=c.issuance_id join qa_legal.subjects s on(s.actor=i.actor and s.scope=i.scope)
 where c.digest=p_digest and s.state='ACTIVE' and s.epoch=c.epoch and not i.revoked
 and i.issued_at<=c.issued_at and c.issued_at<=p_now and p_now<c.until_at and c.until_at<=i.until_at
$$;
create function qa_legal.current_documents(p_release uuid,p_now timestamptz) returns setof qa_legal.documents language sql stable set search_path=pg_catalog,qa_legal as $$
 select d.* from qa_legal.releases r join qa_legal.documents d on((d.kind='notice' and d.version=r.notice_version) or(d.kind='terms' and d.version=r.terms_version))
 where r.id=p_release and d.effective_at<=p_now and p_now<d.until_at and d.sha256=encode(sha256(convert_to(d.body,'UTF8')),'hex')
$$;
create function qa_legal.deliver(p_digest text) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_legal as $$
declare g qa_legal.gate;c qa_legal.credentials;i qa_legal.issuances;d qa_legal.deliveries;t timestamptz;docs jsonb;
begin
 select * into g from qa_legal.gate where singleton=1 for update;t:=clock_timestamp();
 if t<g.clock_floor or (select count(*) from qa_legal.current_documents(g.release_id,t))<>2 then return qa_legal.deny();end if;
 c:=qa_legal.context(p_digest,t);if c.id is null then return qa_legal.deny();end if;
 select * into i from qa_legal.issuances where id=c.issuance_id;
 if i.kind='TICKET' and c.bound_delivery is not null then return qa_legal.deny();end if;
 insert into qa_legal.deliveries(credential_id,actor,scope,epoch,release_id,generation,delivered_at,until_at) values(c.id,i.actor,i.scope,c.epoch,g.release_id,g.generation,t,least(c.until_at,t+interval '5 minutes')) returning * into d;
 insert into qa_legal.delivery_documents select d.id,x.kind,x.version,x.sha256,x.body,x.url from qa_legal.current_documents(g.release_id,t) x;
 if i.kind='TICKET' then update qa_legal.credentials set bound_delivery=d.id where id=c.id;end if;
 insert into qa_legal.audit(action,subject_ref,event_id,at) values('DELIVERY',i.actor,d.id,t);
 update qa_legal.gate set clock_floor=t where singleton=1;
 select jsonb_agg(jsonb_build_object('kind',kind,'version',version,'sha256',sha256,'url',url,'body',body) order by kind) into docs from qa_legal.delivery_documents where delivery_id=d.id;
 return jsonb_build_object('ok',true,'code','QA_DOCUMENTS_DELIVERED','deliveryId',d.id,'documents',docs,'managerActivated',false,'operationalApproval',false);
end$$;
create function qa_legal.confirm(p_digest text,p_delivery uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_legal as $$
declare g qa_legal.gate;c qa_legal.credentials;i qa_legal.issuances;d qa_legal.deliveries;t timestamptz;candidate qa_legal.candidates;is_replay boolean;
begin
 select * into g from qa_legal.gate where singleton=1 for update;t:=clock_timestamp();
 if t<g.clock_floor or (select count(*) from qa_legal.current_documents(g.release_id,t))<>2 then return qa_legal.deny();end if;
 c:=qa_legal.context(p_digest,t);if c.id is null then return qa_legal.deny();end if;
 select * into i from qa_legal.issuances where id=c.issuance_id;
 select * into d from qa_legal.deliveries where id=p_delivery;
 if d.id is null or d.credential_id<>c.id or d.actor<>i.actor or d.scope<>i.scope or d.epoch<>c.epoch or d.generation<>g.generation or d.release_id<>g.release_id or d.delivered_at>t or d.delivered_at<c.issued_at or t>=d.until_at then return qa_legal.deny();end if;
 if i.kind='TICKET' and (c.bound_delivery is distinct from d.id or(c.consumed_delivery is not null and c.consumed_delivery<>d.id)) then return qa_legal.deny();end if;
 if (select count(*) from qa_legal.delivery_documents x join qa_legal.current_documents(g.release_id,t) y on(x.kind=y.kind and x.version=y.version and x.sha256=y.sha256 and x.body=y.body and x.url=y.url) where x.delivery_id=d.id)<>2 then return qa_legal.deny();end if;
 select exists(select 1 from qa_legal.acceptances where event_id=d.id) into is_replay;
 if is_replay then
  select * into candidate from qa_legal.candidates where actor=i.actor and scope=i.scope;
  if candidate.state is distinct from 'PENDING' or candidate.event_id<>d.id then return qa_legal.deny();end if;
 else
  -- A second delivery cannot silently replace a current pending acceptance.
  if exists(select 1 from qa_legal.candidates where actor=i.actor and scope=i.scope and state='PENDING') then return qa_legal.deny();end if;
  insert into qa_legal.acceptances values(d.id,t);
  insert into qa_legal.candidates(actor,scope,event_id,state) values(i.actor,i.scope,d.id,'PENDING') on conflict(actor,scope) do update set event_id=excluded.event_id,state='PENDING' where qa_legal.candidates.state='STALE' returning * into candidate;
  if candidate.id is null then raise exception 'LEGAL_ATOMIC_WRITE_DENIED';end if;
  if i.kind='TICKET' then update qa_legal.credentials set consumed_delivery=d.id where id=c.id;end if;
  insert into qa_legal.audit(action,subject_ref,event_id,at) values('ACCEPTANCE',i.actor,d.id,t);
 end if;
 update qa_legal.gate set clock_floor=t where singleton=1;
 return jsonb_build_object('ok',true,'code','QA_CANDIDATE_PENDING_ONLY','candidateId',candidate.id,'idempotent',is_replay,'managerActivated',false,'guestAccess',false,'trialStarted',false,'operationalApproval',false);
end$$;
create function qa_legal.revoke(p_actor uuid,p_scope uuid,p_action text) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_legal as $$
declare g qa_legal.gate;s qa_legal.subjects;t timestamptz;
begin
 select * into g from qa_legal.gate where singleton=1 for update;t:=clock_timestamp();
 if t<g.clock_floor or p_action is null or p_action not in('REVOKE','ERASURE_HOLD') then return qa_legal.deny();end if;
 select * into s from qa_legal.subjects where actor=p_actor and scope=p_scope;
 if s.actor is null then return qa_legal.deny();end if;
 if s.state='ERASURE_HOLD' or (s.state='REVOKED' and p_action='REVOKE') then return jsonb_build_object('ok',true,'idempotent',true);end if;
 update qa_legal.subjects set state=case when p_action='REVOKE' then 'REVOKED' else 'ERASURE_HOLD' end,epoch=epoch+1 where actor=p_actor and scope=p_scope;
 update qa_legal.candidates set state='REVOKED' where actor=p_actor and scope=p_scope;
 insert into qa_legal.audit(action,subject_ref,at) values(p_action,p_actor,t);
 update qa_legal.gate set clock_floor=t where singleton=1;
 return jsonb_build_object('ok',true,'idempotent',false,'operationalApproval',false);
end$$;
create function qa_legal.publish(p_release uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_legal as $$
declare g qa_legal.gate;t timestamptz;
begin
 select * into g from qa_legal.gate where singleton=1 for update;t:=clock_timestamp();
 if t<g.clock_floor or (select count(*) from qa_legal.current_documents(p_release,t))<>2 then return qa_legal.deny();end if;
 if g.release_id=p_release then return jsonb_build_object('ok',true,'idempotent',true);end if;
 update qa_legal.gate set release_id=p_release,generation=generation+1,clock_floor=t where singleton=1;
 update qa_legal.candidates set state='STALE' where state='PENDING';
 insert into qa_legal.audit(action,at) values('RELEASE',t);
 return jsonb_build_object('ok',true,'operationalApproval',false);
end$$;
revoke all on all tables in schema qa_legal from public,qa_legal_bridge,qa_legal_custodian,qa_legal_publisher;
revoke all on all functions in schema qa_legal from public;
grant usage on schema qa_legal to qa_legal_bridge,qa_legal_custodian,qa_legal_publisher;
grant execute on function qa_legal.deliver(text),qa_legal.confirm(text,uuid) to qa_legal_bridge;
grant execute on function qa_legal.revoke(uuid,uuid,text) to qa_legal_custodian;
grant execute on function qa_legal.publish(uuid) to qa_legal_publisher;
reset role;
