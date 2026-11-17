-- REVIEW_ONLY_NOT_EXECUTED. DO NOT APPLY. Existing read/2, NOT a read/3.
begin;
do $$begin raise exception 'PROPERTY_READ2_REVIEW_ONLY';end$$;

create function concierge_invite_private.read_property_capture_v2(
 p_read_request uuid,p_user uuid,p_session uuid,p_expiry bigint,p_session_revision bigint,
 p_issuer text,p_issued_at bigint,p_member uuid,p_role text,p_authority_revision bigint,
 p_restrictions_revision bigint,p_inventory_revision bigint,p_founder_revision bigint,
 p_quota_revision bigint,p_jurisdiction_revision bigint,p_dataset bytea,p_recovery_epoch bigint,
 p_inventory_digest bytea,p_restriction_digest bytea,p_restriction_journal text,
 p_bootstrap uuid,p_authority_commit uuid,p_original_ref uuid,p_intent uuid,p_attempt uuid,p_key bytea
) returns jsonb language plpgsql security definer set search_path='' set lock_timeout='500ms' as $$
declare c concierge_invite_private.property_current_cut_v1;
 after_cut concierge_invite_private.property_current_cut_v1;
 m concierge_invite_private.property_original_metadata_v1;
 a record;
 result_property uuid;n bigint;
 unknown_result jsonb:=jsonb_build_object('abi','property-capture-independent-read/2',
 'state','UNKNOWN','privateResult',null,'externalCommitVerified',false,
 'journalVerified',false,'witnessVerified',false,'automaticRetryAllowed',false);
begin
 raise exception 'PROPERTY_READ2_DEPENDENCIES_NOT_ACCREDITED';
 if session_user::text<>'cheveni_property_capture_reader_backend_v2'
 or current_user::text<>'cheveni_property_capture_read_owner_v2'
 or pg_catalog.current_setting('transaction_isolation')<>'read committed'
 or p_read_request is null or p_original_ref is null or p_intent is null or p_attempt is null
 or p_key is null or octet_length(p_key)<>32
 then return unknown_result;end if;
 perform pg_catalog.pg_advisory_xact_lock(1129728581,1);
 perform concierge_invite_private.bootstrap_require_complete_catalog_v1();
 -- Metadata-only resolver has NO address/floor output or payload EXECUTE grant.
 c:=concierge_invite_private.bootstrap_current_cut_v1(p_read_request,'property_capture_read',p_original_ref);
 perform concierge_invite_private.validate_property_cut_review_v1(c,p_read_request,'property_capture_read');
 -- Reject an uncorroborated floor BEFORE invoking the metadata custodian.
 perform concierge_invite_private.bootstrap_require_independent_floor_v1(c);
 m:=concierge_invite_private.property_original_metadata_v1(p_original_ref,c);
 if m.original_ref is distinct from p_original_ref or m.intent_id is distinct from p_intent
 or m.attempt_id is distinct from p_attempt or m.key is distinct from p_key
 or m.operation is distinct from 'property_create' or m.provenance_ref is null
 then return unknown_result;end if;
 -- Derive account from protected original; no 27th client account parameter.
 if c.permission is distinct from 'property_capture_read' or c.revoked is distinct from false
 or c.account_id is distinct from m.account_id
 or (c.user_id,c.member_id) is distinct from (m.user_id,m.member_id)
 or c.expiry is null or c.expiry<=extract(epoch from clock_timestamp())
 or (c.request_id,c.user_id,c.session_id,c.expiry,c.session_revision,c.issuer,c.issued_at,
 c.member_id,p_role,c.authority_revision,c.restrictions_revision,c.inventory_revision,
 c.founder_revision,c.quota_revision,c.jurisdiction_revision,c.dataset,c.recovery_epoch,
 c.inventory_digest,c.restriction_digest,c.restriction_journal,c.bootstrap_ref,c.authority_commit)
 is distinct from
 (p_read_request,p_user,p_session,p_expiry,p_session_revision,p_issuer,p_issued_at,
 p_member,'owner'::text,p_authority_revision,p_restrictions_revision,p_inventory_revision,
 p_founder_revision,p_quota_revision,p_jurisdiction_revision,p_dataset,p_recovery_epoch,
 p_inventory_digest,p_restriction_digest,p_restriction_journal,p_bootstrap,p_authority_commit)
 then return unknown_result;end if;
 perform concierge_invite_private.bootstrap_require_independent_floor_v1(c);
 select count(*) into n from public.concierge_manager_web_identities i
 join public.concierge_account_members am on (am.id,am.account_id)=(i.member_id,i.account_id)
 join public.concierge_accounts ac on ac.id=am.account_id
 where i.auth_user_id=c.user_id and i.member_id=c.member_id and i.account_id=c.account_id
 and i.status='active' and i.revoked_at is null and am.role='owner'
 and am.status='active' and am.revoked_at is null and ac.status='active';
 if n<>1 then return unknown_result;end if;
 -- No FOR UPDATE or data modification. Global advisory fence is not a claim
 -- of physical READ ONLY; actual role/ACL/RLS/catalog still require PostgreSQL.
 select request_id,first_attempt_id,original_ref,key,historical_session,historical_session_revision,account_id,member_id,operation into a from concierge_invite_private.property_admission_v1
 where principal_id=m.user_id and intent_id=p_intent;
 if not found or
 (a.request_id,a.first_attempt_id,a.original_ref,a.key,a.historical_session,
 a.historical_session_revision,a.account_id,a.member_id,a.operation)
 is distinct from
 (m.request_id,m.attempt_id,m.original_ref,m.key,m.session_id,
 m.session_revision,m.account_id,m.member_id,m.operation)
 then return unknown_result;end if;
 -- Historical session/revision remain historical; NEVER treated as current
 -- read authority. A refreshed session must obtain its own verified read cut.
 select r.result_property_id into result_property
 from concierge_invite_private.manager_result_v1 r
 join concierge_invite_private.beta_property_slot_v1 s on s.account_id=r.account_id and s.property_id=r.result_property_id
 join public.concierge_properties p on p.id=s.property_id and p.account_id=s.account_id
 where r.principal_id=m.user_id and r.intent_id=p_intent and r.account_id=m.account_id
 and r.member_id=m.member_id and r.original_role='owner' and r.operation='property_create'
 and r.command_digest=p_key and r.state='committed' and s.city='CABA'
 and p.city='Buenos Aires' and p.status in ('draft','active');
 if not found or result_property is null
 or (select count(*) from public.concierge_properties where account_id=m.account_id)<>1
 or (select count(*) from concierge_invite_private.beta_property_slot_v1 where account_id=m.account_id)<>1
 then return unknown_result;end if;
 -- Exact original vs historical capture comparison stays inside custodian;
 -- reader owner receives no SELECT(address/floor) and no raw-original EXECUTE.
 perform concierge_invite_private.property_require_capture_matches_original_v1(p_original_ref,m.user_id,p_intent);
 after_cut:=concierge_invite_private.bootstrap_current_cut_v1(p_read_request,'property_capture_read',p_original_ref);
 perform concierge_invite_private.validate_property_cut_review_v1(after_cut,p_read_request,'property_capture_read');
 perform concierge_invite_private.bootstrap_require_independent_floor_v1(after_cut);
 if after_cut is distinct from c or after_cut.revoked is distinct from false
 or after_cut.expiry is null or after_cut.expiry<=extract(epoch from clock_timestamp())
 then return unknown_result;end if;
 -- SQL observation is provisional. A separate existing journal/witness/COMMIT
 -- composition is still absent: no durable SUCCESS or property ID is exposed.
 return unknown_result||jsonb_build_object('effectObservedInTransaction',true);
end$$;
revoke all on function concierge_invite_private.read_property_capture_v2(
 uuid,uuid,uuid,bigint,bigint,text,bigint,uuid,text,bigint,bigint,bigint,bigint,bigint,bigint,
 bytea,bigint,bytea,bytea,text,uuid,uuid,uuid,uuid,uuid,bytea
) from public,anon,authenticated,service_role;
rollback;
