-- Additional QA contract only; requires approved qa_legal and qa_lifecycle models.
do $$begin if current_setting('cheveni.qa_mode',true) is distinct from 'FICTIONAL_ONLY' then raise exception 'FICTIONAL_FIXTURE_REQUIRED';end if;end$$;
create role qa_d01_bridge nologin noinherit;
create schema qa_d01 authorization qa_legal_owner;
revoke all on schema qa_d01 from public;
set local role qa_legal_owner;
alter default privileges in schema qa_d01 revoke execute on functions from public;
-- Bootstrap/verified issuer only. No browser write or client-supplied time.
create table qa_d01.checkouts(stay uuid primary key references qa_lifecycle.stays,check_out_at timestamptz not null check(isfinite(check_out_at)));
alter table qa_d01.checkouts enable row level security;
alter table qa_d01.checkouts force row level security;
create policy owner_only on qa_d01.checkouts to qa_legal_owner using(true) with check(true);
create function qa_d01.guest_read(p_digest text,p_stay uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_legal,qa_lifecycle,qa_d01 as $$
declare cut timestamptz;t timestamptz;r jsonb;
begin
 perform 1 from qa_legal.gate where singleton=1 for update;
 select check_out_at into cut from qa_d01.checkouts where stay=p_stay;
 t:=clock_timestamp();if cut is null or t>=cut then return qa_lifecycle.denied();end if;
 r:=qa_lifecycle.guest_read(p_digest,p_stay);
 if clock_timestamp()>=cut then return qa_lifecycle.denied();end if;
 return r;
end$$;
create function qa_d01.start_clock(p_digest text,p_stay uuid) returns jsonb language plpgsql security definer set search_path=pg_catalog,qa_legal,qa_lifecycle,qa_d01 as $$
declare cut timestamptz;r jsonb;
begin
 perform 1 from qa_legal.gate where singleton=1 for update;
 select check_out_at into cut from qa_d01.checkouts where stay=p_stay;
 if cut is null or clock_timestamp()>=cut then return qa_lifecycle.denied();end if;
 r:=qa_lifecycle.start_clock(p_digest,p_stay);
 -- A nested write cannot survive if the cutoff was crossed while it executed.
 if clock_timestamp()>=cut then raise exception 'QA_D01_CUTOFF_CROSSED_ATOMIC_ABORT';end if;
 return r;
end$$;
revoke all on qa_d01.checkouts from public,qa_d01_bridge,qa_lifecycle_bridge;
revoke all on all functions in schema qa_d01 from public;
-- Mandatory composition: the old bridge cannot bypass checkout evidence.
revoke execute on function qa_lifecycle.guest_read(text,uuid),qa_lifecycle.start_clock(text,uuid) from qa_lifecycle_bridge;
grant usage on schema qa_d01 to qa_d01_bridge;
grant execute on function qa_d01.guest_read(text,uuid),qa_d01.start_clock(text,uuid) to qa_d01_bridge;
reset role;
