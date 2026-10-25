-- QA only. No migration, cron, external deletion or operational authorization.
do $$begin if current_setting('cheveni.qa_mode',true) is distinct from 'FICTIONAL_ONLY' then raise exception 'FICTIONAL_FIXTURE_REQUIRED';end if;end$$;
create role qa_ret_owner nologin noinherit nosuperuser nobypassrls;
create role qa_ret_ingest nologin noinherit;
create role qa_ret_worker nologin noinherit;
create schema qa_ret authorization qa_ret_owner;
revoke all on schema qa_ret from public;
set local role qa_ret_owner;
alter default privileges in schema qa_ret revoke execute on functions from public;
create table qa_ret.gate(id int primary key check(id=1),clock_floor timestamptz not null);insert into qa_ret.gate values(1,'2000-01-01Z');
create table qa_ret.subjects(scope uuid,subject uuid,stay uuid unique not null,checkout_at timestamptz not null,revoked_at timestamptz,rights_hold boolean not null default false,erase_requested boolean not null default false,epoch bigint not null default 0,primary key(scope,subject));
-- All identities/permissions here are issued only by the fictional bootstrap.
create table qa_ret.issuances(digest text primary key check(digest~'^[a-f0-9]{64}$'),scope uuid not null,subject uuid,kind text not null check(kind in('SESSION','CUSTODIAN')),epoch bigint,until_at timestamptz not null,revoked boolean not null default false);
create table qa_ret.policies(version uuid primary key,category text not null check(category in('CHAT','SUMMARY','OPERATIONAL','LEGAL','REVOCATION','SECURITY','RIGHTS','CASE','TOMBSTONE')),purpose text not null check(purpose like 'FICTIONAL_%'),basis text not null check(basis like 'FICTIONAL_%'),rule text not null check(rule in('AT_CHECKOUT','AFTER_CREATION')),ttl interval,terminal text not null check(terminal in('PURGE','REVIEW')),valid_from timestamptz not null,valid_until timestamptz not null check(valid_until>valid_from and isfinite(valid_until) and isfinite(valid_from)),check(category not in('CHAT','SUMMARY') or(rule='AT_CHECKOUT' and terminal='PURGE')),check((rule='AT_CHECKOUT' and ttl is null and category in('CHAT','SUMMARY')) or(rule='AFTER_CREATION' and ttl is not null and isfinite(ttl) and ttl>interval '0 seconds')));
create table qa_ret.material(id uuid primary key,scope uuid not null,subject uuid not null,category text not null,policy uuid references qa_ret.policies,payload jsonb,state text not null check(state in('LIVE','REVIEW','PURGED')),created_at timestamptz not null,expires_at timestamptz,foreign key(scope,subject) references qa_ret.subjects,check((state='PURGED')=(payload is null)));
create table qa_ret.cases(id uuid primary key,scope uuid not null,subject uuid not null,purpose text not null check(purpose like 'FICTIONAL_%'),basis text not null check(basis like 'FICTIONAL_%'),allowed_fields text[] not null check(cardinality(allowed_fields) between 1 and 2 and allowed_fields<@array['fact','resolution']),review_until timestamptz not null check(isfinite(review_until)),closed_at timestamptz,foreign key(scope,subject) references qa_ret.subjects);
create table qa_ret.case_evidence(id uuid primary key,case_id uuid not null references qa_ret.cases,source_id uuid not null references qa_ret.material,excerpt jsonb,expires_at timestamptz not null,state text not null check(state in('LIVE','REVIEW','PURGED')),unique(case_id,source_id),check((state='PURGED')=(excerpt is null)));
create table qa_ret.suppression(id uuid primary key,scope uuid not null,subject uuid not null,kind text not null check(kind in('REVOKE','ERASURE','OPTOUT')),at timestamptz not null,review_at timestamptz not null);
create table qa_ret.tombstones(record_id uuid primary key,scope uuid not null,subject uuid not null,category text not null,at timestamptz not null,review_at timestamptz not null);
create table qa_ret.rights_requests(id uuid primary key,scope uuid not null,subject uuid not null,kind text not null check(kind in('ACCESS','ERASE','RECTIFY')),received_at timestamptz not null,status text not null check(status='REVIEW_REQUIRED'),foreign key(scope,subject) references qa_ret.subjects);
create table qa_ret.destinations(record_id uuid references qa_ret.material,provider text not null check(provider in('META','OPENAI','HOST_LOGS','BACKUP')),primary key(record_id,provider));
create table qa_ret.provider_tasks(record_id uuid,provider text not null check(provider in('META','OPENAI','HOST_LOGS','BACKUP','PROVENANCE_REVIEW')),state text not null check(state='PENDING_EXTERNAL_VERIFICATION'),primary key(record_id,provider));
create table qa_ret.receipts(id uuid primary key,scope uuid not null,at timestamptz not null,purged int not null,review int not null);
do $$declare t text;begin foreach t in array array['gate','subjects','issuances','policies','material','cases','case_evidence','suppression','tombstones','rights_requests','destinations','provider_tasks','receipts'] loop execute format('alter table qa_ret.%I enable row level security',t);execute format('alter table qa_ret.%I force row level security',t);execute format('create policy owner_only on qa_ret.%I to qa_ret_owner using(true) with check(true)',t);end loop;end$$;
create function qa_ret.deny() returns jsonb language sql immutable set search_path=pg_catalog as $$select '{"ok":false,"code":"RETENTION_DENIED","erasureComplete":false,"operationalApproval":false}'::jsonb$$;
create function qa_ret.context(p_digest text,p_kind text,p_now timestamptz) returns qa_ret.issuances language sql stable set search_path=pg_catalog,qa_ret as $$select i.* from qa_ret.issuances i where i.digest=p_digest and i.kind=p_kind and not i.revoked and p_now<i.until_at$$;
create function qa_ret.put(p_digest text,p_id uuid,p_category text,p_payload jsonb,p_policy uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_ret as $$
declare i qa_ret.issuances;s qa_ret.subjects;p qa_ret.policies;m qa_ret.material;t timestamptz;floor_at timestamptz;expiry timestamptz;allowed text[];
begin
 select clock_floor into floor_at from qa_ret.gate where id=1 for update;t:=clock_timestamp();if t<floor_at then return qa_ret.deny();end if;
 i:=qa_ret.context(p_digest,'SESSION',t);if i.digest is null or p_id is null then return qa_ret.deny();end if;
 select * into s from qa_ret.subjects where scope=i.scope and subject=i.subject;
 if s.subject is null or s.revoked_at is not null or s.rights_hold or s.epoch<>i.epoch or t>=s.checkout_at then return qa_ret.deny();end if;
 select * into p from qa_ret.policies where version=p_policy and category=p_category and valid_from<=t and t<valid_until;
 if p.version is null or p.category in('CASE','TOMBSTONE','LEGAL','REVOCATION','RIGHTS') or p.rule='AT_CHECKOUT' and p.category not in('CHAT','SUMMARY') or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>4096 then return qa_ret.deny();end if;
 allowed:=case p.category when 'CHAT' then array['text','fact'] when 'SUMMARY' then array['summary','fact'] when 'OPERATIONAL' then array['status','fact'] when 'LEGAL' then array['documentVersion','documentHash','event'] when 'REVOCATION' then array['action','epoch'] when 'SECURITY' then array['code'] when 'RIGHTS' then array['type','state'] end;
 if exists(select from jsonb_object_keys(p_payload) k where not(k=any(allowed))) or exists(select from qa_ret.tombstones where record_id=p_id) then return qa_ret.deny();end if;
 select * into m from qa_ret.material where id=p_id;
 if m.id is not null then if m.scope=i.scope and m.subject=i.subject and m.category=p_category and m.state='LIVE' and m.payload=p_payload and t<m.expires_at then return jsonb_build_object('ok',true,'idempotent',true,'operationalApproval',false);else return qa_ret.deny();end if;end if;
 expiry:=case when p.rule='AT_CHECKOUT' then s.checkout_at else t+p.ttl end;
 insert into qa_ret.material values(p_id,i.scope,i.subject,p_category,p.version,p_payload,'LIVE',t,expiry);
 update qa_ret.gate set clock_floor=t where id=1;return jsonb_build_object('ok',true,'idempotent',false,'operationalApproval',false);
end$$;
create function qa_ret.read_content(p_digest text,p_id uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_ret as $$
declare i qa_ret.issuances;s qa_ret.subjects;m qa_ret.material;t timestamptz;f timestamptz;
begin
 select clock_floor into f from qa_ret.gate where id=1 for update;t:=clock_timestamp();i:=qa_ret.context(p_digest,'SESSION',t);
 if i.digest is null or t<f then return qa_ret.deny();end if;
 select * into s from qa_ret.subjects where scope=i.scope and subject=i.subject;select * into m from qa_ret.material where id=p_id;
 if s.subject is null or s.revoked_at is not null or s.rights_hold or s.epoch<>i.epoch or t>=s.checkout_at or m.id is null or m.scope<>s.scope or m.subject<>s.subject or m.category not in('CHAT','SUMMARY') or m.state<>'LIVE' or t>=m.expires_at or m.expires_at is null or exists(select from qa_ret.tombstones where record_id=m.id) then return qa_ret.deny();end if;
 return jsonb_build_object('ok',true,'payload',m.payload,'operationalApproval',false);
end$$;
create function qa_ret.excerpt(p_digest text,p_case uuid,p_record uuid,p_fields text[]) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_ret as $$
declare i qa_ret.issuances;c qa_ret.cases;m qa_ret.material;t timestamptz;floor_at timestamptz;piece jsonb;existing qa_ret.case_evidence;
begin
 select clock_floor into floor_at from qa_ret.gate where id=1 for update;t:=clock_timestamp();i:=qa_ret.context(p_digest,'CUSTODIAN',t);
 if t<floor_at or i.digest is null or p_fields is null or cardinality(p_fields)=0 then return qa_ret.deny();end if;
 select * into c from qa_ret.cases where id=p_case and scope=i.scope;
 select * into m from qa_ret.material where id=p_record and scope=i.scope;
 if c.id is null or m.id is null or m.subject<>c.subject or c.closed_at is not null or c.review_until<=t or m.state<>'LIVE' or t>=m.expires_at or not(p_fields<@c.allowed_fields) then return qa_ret.deny();end if;
 select jsonb_object_agg(key,value) into piece from jsonb_each(m.payload) where key=any(p_fields);
 if piece is null or octet_length(piece::text)>1024 then return qa_ret.deny();end if;
 select * into existing from qa_ret.case_evidence where case_id=c.id and source_id=m.id;
 if existing.id is not null then if existing.state='LIVE' and existing.excerpt=piece then return jsonb_build_object('ok',true,'idempotent',true,'operationalApproval',false);else return qa_ret.deny();end if;end if;
 insert into qa_ret.case_evidence values(gen_random_uuid(),c.id,m.id,piece,c.review_until,'LIVE');update qa_ret.gate set clock_floor=t where id=1;
 return jsonb_build_object('ok',true,'idempotent',false,'operationalApproval',false);
end$$;
create function qa_ret.restrict_subject(p_digest text,p_subject uuid,p_request uuid,p_action text) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_ret as $$
declare i qa_ret.issuances;s qa_ret.subjects;t timestamptz;floor_at timestamptz;due timestamptz;r qa_ret.rights_requests;x qa_ret.suppression;
begin
 select clock_floor into floor_at from qa_ret.gate where id=1 for update;t:=clock_timestamp();i:=qa_ret.context(p_digest,'CUSTODIAN',t);
 if t<floor_at or i.digest is null or p_request is null or p_action is null or p_action not in('ACCESS','ERASE','RECTIFY','REVOKE','OPTOUT') then return qa_ret.deny();end if;
 select * into s from qa_ret.subjects where scope=i.scope and subject=p_subject;if s.subject is null then return qa_ret.deny();end if;
 select * into r from qa_ret.rights_requests where id=p_request;select * into x from qa_ret.suppression where id=p_request;
 if r.id is not null or x.id is not null then
  if (r.id is not null and(r.scope<>i.scope or r.subject<>p_subject or r.kind<>p_action)) or(x.id is not null and(x.scope<>i.scope or x.subject<>p_subject or x.kind<>case p_action when 'ERASE' then 'ERASURE' else p_action end)) then return qa_ret.deny();end if;
  return jsonb_build_object('ok',true,'idempotent',true,'erasureComplete',false,'operationalApproval',false);
 end if;
 if p_action in('REVOKE','ERASE','OPTOUT') then
  select t+p.ttl into due from qa_ret.policies p where p.category='TOMBSTONE' and p.rule='AFTER_CREATION' and p.valid_from<=t and t<p.valid_until order by valid_from desc limit 1;
  if due is null then return qa_ret.deny();end if;
  insert into qa_ret.suppression values(p_request,i.scope,p_subject,case p_action when 'ERASE' then 'ERASURE' else p_action end,t,due);
 end if;
 if p_action in('ERASE','RECTIFY','ACCESS') then insert into qa_ret.rights_requests values(p_request,i.scope,p_subject,p_action,t,'REVIEW_REQUIRED');end if;
 if p_action in('REVOKE','ERASE','RECTIFY') then update qa_ret.subjects set revoked_at=case when p_action='REVOKE' then coalesce(revoked_at,t) else revoked_at end,rights_hold=rights_hold or p_action in('ERASE','RECTIFY'),erase_requested=erase_requested or p_action='ERASE',epoch=epoch+1 where scope=i.scope and subject=p_subject;end if;
 update qa_ret.gate set clock_floor=t where id=1;return jsonb_build_object('ok',true,'idempotent',false,'erasureComplete',false,'operationalApproval',false);
end$$;
create function qa_ret.purge(p_digest text,p_batch uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_ret as $$
declare i qa_ret.issuances;s qa_ret.subjects;m qa_ret.material;p qa_ret.policies;receipt qa_ret.receipts;t timestamptz;floor_at timestamptz;review_due timestamptz;np int:=0;nr int:=0;ev record;invalid boolean;
begin
 select clock_floor into floor_at from qa_ret.gate where id=1 for update;t:=clock_timestamp();i:=qa_ret.context(p_digest,'CUSTODIAN',t);
 if t<floor_at or i.digest is null or p_batch is null then return qa_ret.deny();end if;
 select * into receipt from qa_ret.receipts where id=p_batch;
 if receipt.id is not null then if receipt.scope<>i.scope then return qa_ret.deny();end if;return jsonb_build_object('ok',true,'idempotent',true,'purged',receipt.purged,'review',receipt.review,'erasureComplete',false,'providersVerified',false,'operationalApproval',false);end if;
 select t+x.ttl into review_due from qa_ret.policies x where category='TOMBSTONE' and rule='AFTER_CREATION' and valid_from<=t and t<valid_until order by valid_from desc limit 1;
 if review_due is null then return qa_ret.deny();end if;
 for m in select * from qa_ret.material where scope=i.scope and state<>'PURGED' order by id for update loop
  select * into s from qa_ret.subjects where scope=m.scope and subject=m.subject;select * into p from qa_ret.policies where version=m.policy;
  invalid:=p.version is null or p.category<>m.category or m.expires_at is null;
  if invalid then update qa_ret.material set state='REVIEW' where id=m.id;nr:=nr+1;continue;end if;
  if m.expires_at<=t or(m.category in('CHAT','SUMMARY') and(t>=s.checkout_at or s.revoked_at is not null or s.erase_requested)) then
   if p.terminal='REVIEW' or m.category in('LEGAL','REVOCATION','RIGHTS') then update qa_ret.material set state='REVIEW' where id=m.id;nr:=nr+1;
   else
    update qa_ret.material set payload=null,state='PURGED' where id=m.id;
    insert into qa_ret.tombstones values(m.id,m.scope,m.subject,m.category,t,review_due);
    insert into qa_ret.provider_tasks select m.id,d.provider,'PENDING_EXTERNAL_VERIFICATION' from qa_ret.destinations d where d.record_id=m.id;
    if not exists(select from qa_ret.destinations where record_id=m.id) then insert into qa_ret.provider_tasks values(m.id,'PROVENANCE_REVIEW','PENDING_EXTERNAL_VERIFICATION');end if;
    np:=np+1;
   end if;
  end if;
 end loop;
 for ev in select e.*,c.closed_at from qa_ret.case_evidence e join qa_ret.cases c on c.id=e.case_id where c.scope=i.scope and e.state<>'PURGED' and e.expires_at<=t for update of e loop
  if ev.closed_at is null then update qa_ret.case_evidence set state='REVIEW' where id=ev.id;nr:=nr+1;
  else update qa_ret.case_evidence set excerpt=null,state='PURGED' where id=ev.id;insert into qa_ret.tombstones select ev.id,c.scope,c.subject,'CASE',t,review_due from qa_ret.cases c where c.id=ev.case_id;insert into qa_ret.provider_tasks values(ev.id,'PROVENANCE_REVIEW','PENDING_EXTERNAL_VERIFICATION');np:=np+1;end if;
 end loop;
 insert into qa_ret.receipts values(p_batch,i.scope,t,np,nr);update qa_ret.gate set clock_floor=t where id=1;
 return jsonb_build_object('ok',true,'idempotent',false,'purged',np,'review',nr,'erasureComplete',false,'providersVerified',false,'operationalApproval',false);
end$$;
revoke all on all tables in schema qa_ret from public,qa_ret_ingest,qa_ret_worker;
revoke all on all functions in schema qa_ret from public;
grant usage on schema qa_ret to qa_ret_ingest,qa_ret_worker;
grant execute on function qa_ret.put(text,uuid,text,jsonb,uuid),qa_ret.read_content(text,uuid) to qa_ret_ingest;
grant execute on function qa_ret.purge(text,uuid),qa_ret.excerpt(text,uuid,uuid,text[]),qa_ret.restrict_subject(text,uuid,uuid,text) to qa_ret_worker;
reset role;
