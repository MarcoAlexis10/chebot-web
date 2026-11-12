-- DO NOT APPLY. Source-compatible fact projection, NOT an authority producer.
-- No SQL has been executed. No replacement of private_mutation_authority_v1.
begin;
do $$begin raise exception 'PROPERTY_BOOTSTRAP_REVIEW_ONLY';end$$;

create function concierge_invite_private.bootstrap_relation_facts_review_v1(p_user uuid)
returns table(account_id uuid,member_id uuid,member_role text,account_status text,
 founding_manager boolean,beta_started_at timestamptz,beta_ends_at timestamptz,
 property_count bigint,slot_count bigint,nonrevoked_owner_count bigint)
language plpgsql security invoker set search_path='' as $$
begin
 -- A separate authorization/materialization must retain protected Auth, RLS,
 -- revisions/floors, founder/jurisdiction and pre-DML fence coverage. This guard
 -- intentionally blocks execution even if someone bypasses the outer abort.
 raise exception 'BOOTSTRAP_FACT_SOURCE_NOT_ACCREDITED';
 return query
 with identity_rows as materialized (
  select i.account_id,i.member_id
  from public.concierge_manager_web_identities i
  where i.auth_user_id=p_user and i.status='active' and i.revoked_at is null
 ), relation_rows as materialized (
  select a.id as aid,m.id as mid,m.role,a.status,a.founding_manager,
         a.beta_started_at,a.beta_ends_at
  from identity_rows i
  join public.concierge_account_members m on m.id=i.member_id and m.account_id=i.account_id
  join public.concierge_accounts a on a.id=m.account_id
  where m.status='active' and m.revoked_at is null and m.role='owner'
    and a.status in ('active','testing')
    and (select count(*) from identity_rows)=1
 )
 select r.aid,r.mid,r.role,r.status,r.founding_manager,r.beta_started_at,r.beta_ends_at,
   (select count(*) from public.concierge_properties p where p.account_id=r.aid),
   (select count(*) from concierge_invite_private.beta_property_slot_v1 s where s.account_id=r.aid),
   (select count(*) from public.concierge_account_members o
     where o.account_id=r.aid and o.role='owner' and o.status<>'revoked')
 from relation_rows r where (select count(*) from relation_rows)=1;
 -- No trial date update, property insert, client-selected account, jurisdiction
 -- guess from timezone/city, revision from updated_at or fabricated grant.
end$$;
revoke all on function concierge_invite_private.bootstrap_relation_facts_review_v1(uuid)
 from public;
rollback;
