-- REVIEW ONLY / DO NOT APPLY. No migration, role creation or execution authorized.
-- Unconditional abort precedes ALL DDL; even an execute-through-error client
-- remains in an aborted transaction until the final ROLLBACK.
begin;
do $held$ begin raise exception 'CHEVENI_REVIEW_ONLY_DO_NOT_APPLY'; end $held$;

-- Roles below are proposals, NOT created. Owner is NOLOGIN, not table owner,
-- no BYPASSRLS, no memberships/SET ROLE reachability; backend is separate LOGIN.
create schema concierge_readback_v3 authorization cheveni_writer_readback_owner_v4;
revoke all on schema concierge_readback_v3 from public,anon,authenticated,service_role;
grant usage on schema concierge_readback_v3 to cheveni_writer_readback_backend_v4;

-- ABI gate deliberately unimplemented: existing scope_v2/auth_live/check_fences
-- require writer session_user or change current_user to a different owner.
-- Do NOT grant their EXECUTE privileges to bypass those identity constraints.
-- A successor must validate full fence catalog + shared lock, current Auth,
-- account/member/property, independent restrictions and post-backup floors.
create function concierge_readback_v3.scope_v3(u uuid,s uuid,e bigint,p uuid,r uuid)
returns jsonb language plpgsql security invoker set search_path='' as $scope$
begin
 if session_user <> 'cheveni_writer_readback_backend_v4'
    or current_user <> 'cheveni_writer_readback_owner_v4'
    or current_setting('transaction_isolation') <> 'read committed'
    or current_setting('transaction_read_only') <> 'on' then
  raise insufficient_privilege using message='READBACK_CALLER_PAIR_REQUIRED';
 end if;
 raise insufficient_privilege using message='READBACK_SCOPE_FENCE_AUTH_RESTRICTIONS_NOT_ACCREDITED';
end $scope$;
alter function concierge_readback_v3.scope_v3(uuid,uuid,bigint,uuid,uuid) owner to cheveni_writer_readback_owner_v4;
revoke all on function concierge_readback_v3.scope_v3(uuid,uuid,bigint,uuid,uuid) from public,anon,authenticated,service_role,cheveni_writer_readback_backend_v4;

-- CBF1 wire ABI remains (intent bytea, attempt bytea). Only READBACK mode.
-- This is a binding-evidence reader, NOT a substitute for journal confirmation.
-- The scope gate above always raises; no result is currently obtainable.
create function concierge_readback_v3.readback_v3(opb bytea,ab bytea)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s'
as $reader$
declare op jsonb;a jsonb;sc jsonb;d text;ad text;kd text;b record;l record;
begin
 if session_user <> 'cheveni_writer_readback_backend_v4'
    or current_user <> 'cheveni_writer_readback_owner_v4'
    or current_setting('transaction_isolation') <> 'read committed'
    or current_setting('transaction_read_only') <> 'on' then
  raise insufficient_privilege using message='READBACK_CALLER_PAIR_REQUIRED';
 end if;
 op:=concierge_contract_v1.parse_v1('intent',opb);
 a:=concierge_contract_v1.parse_v1('attempt',ab);
 d:=encode(sha256(opb),'hex');ad:=encode(sha256(ab),'hex');
 kd:=concierge_contract_v1.digest_v1('intent_key',array['tjdgrzzeuuihhqnzvaox',op->>'userId',op->>'intentId']);
 if a->>'mode' is distinct from 'READBACK' or a->>'intentDigest' is distinct from d then
  raise exception 'READBACK_ATTEMPT_REQUIRED';
 end if;
 sc:=concierge_readback_v3.scope_v3((op->>'userId')::uuid,(a->>'sessionId')::uuid,(a->>'tokenExpiresAt')::bigint,(op->>'propertyId')::uuid,(a->>'requestId')::uuid);
 -- Proposed scope receipt must retain CBF1 scope frame semantics.
 sc:=concierge_contract_v1.parse_v1('scope',decode(sc->>'frame','hex'));
 if sc->>'accountId' is distinct from op->>'accountId'
 or sc->>'memberId' is distinct from op->>'memberId'
 or sc->>'memberRole' is distinct from op->>'memberRole' then raise exception 'READBACK_AUTHORITY_CHANGED';end if;
 select intent_digest,intent_key_digest,dispatch_attempt_digest,effect_frame,effect_digest,
 legacy_intent_digest,legacy_authority_digest,legacy_receipt_digest into b
 from concierge_writer_contract_v2.bindings
 where user_id=(op->>'userId')::uuid and intent_id=(op->>'intentId')::uuid;
 if not found then return jsonb_build_object('status','UNRESOLVED','intentDigest',d,'intentKeyDigest',kd,'checkedAttemptDigest',ad);end if;
 if b.intent_digest is distinct from d or b.intent_key_digest is distinct from kd then
  return jsonb_build_object('status','CONFLICT','intentDigest',d,'intentKeyDigest',kd,'checkedAttemptDigest',ad);
 end if;
 select intent_digest,authority_digest,receipt_digest into strict l
 from concierge_writer_cap_v1.intents where auth_user_id=(op->>'userId')::uuid and intent_id=(op->>'intentId')::uuid;
 if b.legacy_intent_digest is distinct from l.intent_digest
 or b.legacy_authority_digest is distinct from l.authority_digest
 or b.legacy_receipt_digest is distinct from l.receipt_digest
 or b.effect_digest is distinct from encode(sha256(b.effect_frame),'hex') then raise exception 'READBACK_BINDING_CHANGED';end if;
 -- Current-scope check again before any private evidence may leave SQL.
 perform concierge_readback_v3.scope_v3((op->>'userId')::uuid,(a->>'sessionId')::uuid,(a->>'tokenExpiresAt')::bigint,(op->>'propertyId')::uuid,(a->>'requestId')::uuid);
 return jsonb_build_object('status','BINDING_OBSERVED','intentDigest',d,'intentKeyDigest',kd,
 'checkedAttemptDigest',ad,'dispatchAttemptDigest',b.dispatch_attempt_digest,
 'effectFrame',encode(b.effect_frame,'hex'),'effectDigest',b.effect_digest);
end $reader$;
alter function concierge_readback_v3.readback_v3(bytea,bytea) owner to cheveni_writer_readback_owner_v4;
revoke all on function concierge_readback_v3.readback_v3(bytea,bytea) from public,anon,authenticated,service_role;
grant execute on function concierge_readback_v3.readback_v3(bytea,bytea) to cheveni_writer_readback_backend_v4;

-- No helper or table access for LOGIN. SELECT-only dependencies for NOLOGIN
-- owner require separate reviewed column ACLs and SELECT RLS policies on:
-- bindings (columns above + user_id,intent_id), intents (columns above + IDs),
-- and the future live scope sources. No broad/table grants are emitted here.
-- Codecs require exact successor owner/ACL/body pins; not granted here.
-- Missing ACL/RLS means DENIED, never an excuse to widen a grant.
rollback;
