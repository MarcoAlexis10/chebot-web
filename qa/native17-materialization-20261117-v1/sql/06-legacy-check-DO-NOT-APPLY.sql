-- REVIEW ONLY / DO NOT APPLY. Historical nine-argument checker successor.
-- Writer eleven-argument ABI is preserved; no new mutation primitive.
begin;
do $$begin raise exception 'PROPERTY_LEGACY_CHECK_REVIEW_ONLY';end$$;

create or replace function concierge_invite_private.check_private_mutation_authority_v1(
 p_user uuid,p_session uuid,p_expiry bigint,p_member uuid,p_role text,p_revision bigint,
 p_account uuid,p_property uuid,p_operation text
) returns boolean language plpgsql volatile security invoker set search_path='' as $$
declare c record;
begin
 raise exception 'PROPERTY_LEGACY_CHECK_NOT_ACCREDITED';
 if p_user is null or p_session is null or p_member is null or p_account is null
 or p_expiry is null or p_expiry<=extract(epoch from pg_catalog.clock_timestamp())
 or p_revision is null or p_revision<1 or p_role is distinct from 'owner'
 or p_operation is distinct from 'property_create' or p_property is not null
 then return false;end if;
 -- One source observation, including cardinality, rather than count + reload.
 -- VOLATILE is required for current source/context visibility and clock expiry;
 -- it is not evidence of external provider serialization or durable COMMIT.
 select x.*,count(*) over () as receipt_count into c
 from concierge_invite_private.private_mutation_authority_v1(
  p_user,p_session,p_expiry,p_property,p_operation) x;
 if not found then return false;end if;
 if c.receipt_count<>1 then return false;end if;
 if p_expiry<=extract(epoch from pg_catalog.clock_timestamp()) then return false;end if;
 return (c.account_id,c.member_id,c.member_role,c.authority_revision)
  is not distinct from (p_account,p_member,p_role,p_revision);
end$$;
revoke all on function concierge_invite_private.check_private_mutation_authority_v1(
 uuid,uuid,bigint,uuid,text,bigint,uuid,uuid,text) from public,anon,authenticated,service_role;
-- SECURITY INVOKER and the historical owner must be confirmed in the catalog.
-- Non-property callers now fail closed; companion domain is outside this plan.
rollback;
