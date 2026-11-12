-- QA REVIEW ONLY / DO NOT APPLY / NOT AUTHORIZED FOR EXECUTION.
begin;
do $abort$ begin raise exception 'CHEVENI_REVIEW_DO_NOT_APPLY';end $abort$;

create function concierge_incident_private_v1.bound_claim_matches_v2(p_user uuid,p_session uuid,p_exp bigint,p_intent uuid,p_attempt uuid,p_dispatch uuid,p_original uuid,p_authority bigint,p_restriction bigint,p_binding uuid,p_floor jsonb)
returns boolean language plpgsql security invoker set search_path='' as $matches$
declare a concierge_incident_private_v1.admission_v2%rowtype;
begin
 perform concierge_incident_private_v1.assert_provider_v2(p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,p_original,p_authority,p_restriction,p_binding,p_floor);
 select * into strict a from concierge_incident_private_v1.admission_v2 where user_id=p_user and intent_id=p_intent;
 return (a.session_id,a.token_expires_at,a.attempt_id,a.dispatch_id,a.original_ref,a.provider_binding_ref,a.authority_revision,a.restriction_revision,a.state)
 is not distinct from (p_session,p_exp,p_attempt,p_dispatch,p_original,p_binding,p_authority,p_restriction,'DISPATCH_CLAIMED'::text);
end $matches$;
create function concierge_incident_private_v1.assert_claimed_admission_v2(p_user uuid,p_session uuid,p_exp bigint,p_intent uuid,p_attempt uuid,p_dispatch uuid,p_original uuid,p_authority bigint,p_restriction bigint,p_binding uuid,p_floor jsonb)
returns void language plpgsql security invoker set search_path='' as $assert$
begin
 if concierge_incident_private_v1.bound_claim_matches_v2(p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,p_original,p_authority,p_restriction,p_binding,p_floor) is distinct from true then raise insufficient_privilege using message='BOUND_ADMISSION_REQUIRED';end if;
end $assert$;
create function concierge_incident_private_v1.change_state_bound_v2(p_user uuid,p_session uuid,p_exp bigint,p_intent uuid,p_attempt uuid,p_dispatch uuid,p_original uuid,p_account uuid,p_member uuid,p_property uuid,p_stay uuid,p_incident uuid,p_status text,p_summary text,p_authority bigint,p_floor jsonb,p_provider_binding uuid)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $writer$
declare sc jsonb;final_sc jsonb;o jsonb;r jsonb;saved record;n integer;rev record;
begin
 perform concierge_incident_private_v1.native_gate_v1('WRITE');
 perform pg_advisory_xact_lock(1129728581,1);
 perform concierge_incident_private_v1.assert_claimed_admission_v2(p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,p_original,p_authority,(p_floor->>'restrictionVersion')::bigint,p_provider_binding,p_floor);

 sc:=concierge_incident_private_v1.current_resolution_v1(p_user,p_session,p_exp,p_incident,p_attempt)->'rows'->0;
 if sc->>'accountId' is distinct from p_account::text or sc->>'memberId' is distinct from p_member::text or sc->>'propertyId' is distinct from p_property::text or sc->>'stayId' is distinct from p_stay::text then raise insufficient_privilege using message='INCIDENT_RELATION_CHANGED';end if;
 select * into strict rev from concierge_incident_private_v1.current_revisions_v1(p_user,p_session,p_incident);
 if p_authority is distinct from rev.authority_revision or p_floor is distinct from jsonb_build_object(
 'userId',p_user,'sessionId',p_session,'accountId',p_account,'memberId',p_member,'propertyId',p_property,'stayId',p_stay,'incidentId',p_incident,
 'authorityVersion',rev.authority_revision,'restrictionVersion',rev.restriction_revision,'datasetId',rev.dataset_id,'recoveryEpoch',rev.recovery_epoch,
 'inventoryDigest',rev.inventory_digest,'restrictionJournalId',rev.restriction_journal_id,'restrictionDigest',rev.restriction_digest)
 then raise insufficient_privilege using message='INCIDENT_FLOOR_CHANGED';end if;
 o:=concierge_incident_private_v1.original_intent_v1(p_user,p_intent,p_original);
 if o is null or jsonb_typeof(o) is distinct from 'object' or o->>'originalRef' is distinct from p_original::text
 or (select count(*) from jsonb_object_keys(o))<>9
 or not(o ?& array['originalRef','userId','intentId','operation','accountId','memberId','propertyId','stayId','arguments'])
 or jsonb_typeof(o->'arguments') is distinct from 'object'
 then raise insufficient_privilege using message='INCIDENT_ORIGINAL_UNAVAILABLE_UNKNOWN';end if;
 if o->>'userId' is distinct from p_user::text or o->>'intentId' is distinct from p_intent::text or o->>'operation' is distinct from 'concierge_manager_set_incident_state'
 or o->>'accountId' is distinct from p_account::text or o->>'memberId' is distinct from p_member::text or o->>'propertyId' is distinct from p_property::text or o->>'stayId' is distinct from p_stay::text
 then raise insufficient_privilege using message='INCIDENT_ORIGINAL_SCOPE_CONTRADICTORY_UNKNOWN';end if;
 if o->'arguments' is distinct from jsonb_build_object('p_incident_id',p_incident,'p_account_member_id',p_member,'p_new_status',p_status,'p_event_summary',p_summary) then return jsonb_build_object('state','CONFLICT');end if;
 if concierge_incident_private_v1.bound_claim_matches_v2(p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,p_original,p_authority,(p_floor->>'restrictionVersion')::bigint,p_provider_binding,p_floor) is distinct from true then raise insufficient_privilege using message='INCIDENT_DURABLE_DISPATCH_CLAIM_MISSING';end if;
 -- Lock order: shared fence -> intent binding -> attempt binding -> business row.
 select * into saved from concierge_incident_private_v1.intent_binding where user_id=p_user and intent_id=p_intent;
 if found then
  if saved.original_ref is distinct from p_original then return jsonb_build_object('state','CONFLICT');end if;
  return jsonb_build_object('state','RECONCILIATION_REQUIRED'); -- NEVER replay a mutation
 end if;
 insert into concierge_incident_private_v1.intent_binding values(p_user,p_intent,p_original,p_provider_binding,p_account,p_member,p_property,p_stay,p_incident);
 insert into concierge_incident_private_v1.attempt_binding values(p_user,p_intent,p_attempt,p_session,p_exp,p_authority,rev.restriction_revision,p_dispatch,p_original,p_provider_binding,rev.recovery_epoch,'DISPATCH_CLAIMED',null);
 select count(*),min(to_jsonb(x)::text)::jsonb into n,r from concierge_runtime_qa_v2.concierge_manager_set_incident_state(p_incident,p_member,p_status,p_summary) x;
 if n<>1 or r->>'incident_id' is distinct from p_incident::text or r->>'resulting_status' is distinct from p_status then raise exception 'INCIDENT_EFFECT_UNCERTAIN';end if;
 update concierge_incident_private_v1.attempt_binding set state='EFFECT_RECORDED',resulting_status=p_status where user_id=p_user and intent_id=p_intent;
 final_sc:=concierge_incident_private_v1.current_resolution_v1(p_user,p_session,p_exp,p_incident,p_attempt)->'rows'->0;
 if final_sc->>'memberRole' is distinct from sc->>'memberRole' or final_sc->>'accountId' is distinct from p_account::text or final_sc->>'memberId' is distinct from p_member::text or final_sc->>'propertyId' is distinct from p_property::text or final_sc->>'stayId' is distinct from p_stay::text then raise insufficient_privilege using message='INCIDENT_FINAL_SCOPE_CHANGED';end if;
 select * into strict rev from concierge_incident_private_v1.current_revisions_v1(p_user,p_session,p_incident);
 if p_authority is distinct from rev.authority_revision or p_floor is distinct from jsonb_build_object(
 'userId',p_user,'sessionId',p_session,'accountId',p_account,'memberId',p_member,'propertyId',p_property,'stayId',p_stay,'incidentId',p_incident,
 'authorityVersion',rev.authority_revision,'restrictionVersion',rev.restriction_revision,'datasetId',rev.dataset_id,'recoveryEpoch',rev.recovery_epoch,
 'inventoryDigest',rev.inventory_digest,'restrictionJournalId',rev.restriction_journal_id,'restrictionDigest',rev.restriction_digest)
 then raise insufficient_privilege using message='INCIDENT_FINAL_FLOOR_CHANGED';end if;
 perform concierge_incident_private_v1.assert_provider_v2(p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,p_original,p_authority,rev.restriction_revision,p_provider_binding,p_floor);
 -- This row/result is not a receipt proving the outer transaction committed.
 return jsonb_build_object('state','OUTCOME_REQUIRES_COMMIT_OBSERVATION','dispatchId',p_dispatch,'providerBindingRef',p_provider_binding);
end $writer$;
create function concierge_incident_private_v1.read_effect_bound_v2(p_user uuid,p_session uuid,p_exp bigint,p_intent uuid,p_attempt uuid,p_dispatch uuid,p_original uuid,p_authority bigint,p_floor jsonb,p_provider_binding uuid)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $reader$
declare b record;a record;sc jsonb;final_sc jsonb;rev record;
begin
 perform concierge_incident_private_v1.native_gate_v1('READ');
 perform pg_advisory_xact_lock(1129728581,1);
 perform concierge_incident_private_v1.assert_claimed_admission_v2(p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,p_original,p_authority,(p_floor->>'restrictionVersion')::bigint,p_provider_binding,p_floor);

 select * into strict b from concierge_incident_private_v1.intent_binding where user_id=p_user and intent_id=p_intent;
 sc:=concierge_incident_private_v1.current_resolution_v1(p_user,p_session,p_exp,b.incident_id,p_attempt)->'rows'->0;
 if sc->>'accountId' is distinct from b.account_id::text or sc->>'memberId' is distinct from b.member_id::text or sc->>'propertyId' is distinct from b.property_id::text or sc->>'stayId' is distinct from b.stay_id::text then raise insufficient_privilege using message='INCIDENT_READ_SCOPE_CHANGED';end if;
 select * into strict rev from concierge_incident_private_v1.current_revisions_v1(p_user,p_session,b.incident_id);
 if p_authority is distinct from rev.authority_revision or p_floor is distinct from jsonb_build_object(
 'userId',p_user,'sessionId',p_session,'accountId',b.account_id,'memberId',b.member_id,'propertyId',b.property_id,'stayId',b.stay_id,'incidentId',b.incident_id,
 'authorityVersion',rev.authority_revision,'restrictionVersion',rev.restriction_revision,'datasetId',rev.dataset_id,'recoveryEpoch',rev.recovery_epoch,
 'inventoryDigest',rev.inventory_digest,'restrictionJournalId',rev.restriction_journal_id,'restrictionDigest',rev.restriction_digest)
 then raise insufficient_privilege using message='INCIDENT_READ_FLOOR_CHANGED';end if;
 select * into strict a from concierge_incident_private_v1.attempt_binding where user_id=p_user and intent_id=p_intent;
 if a.provider_binding_ref is distinct from p_provider_binding or b.provider_binding_ref is distinct from p_provider_binding or a.attempt_id is distinct from p_attempt or a.session_id is distinct from p_session or a.token_expires_at is distinct from p_exp or a.dispatch_id is distinct from p_dispatch or a.original_ref is distinct from p_original or b.original_ref is distinct from p_original or a.authority_revision is distinct from p_authority or a.restriction_revision is distinct from rev.restriction_revision or a.recovery_epoch is distinct from rev.recovery_epoch or a.state<>'EFFECT_RECORDED' then raise insufficient_privilege using message='INCIDENT_READ_BINDING_CHANGED';end if;
 final_sc:=concierge_incident_private_v1.current_resolution_v1(p_user,p_session,p_exp,b.incident_id,p_attempt)->'rows'->0;
 if final_sc->>'memberRole' is distinct from sc->>'memberRole' or final_sc->>'accountId' is distinct from b.account_id::text or final_sc->>'memberId' is distinct from b.member_id::text or final_sc->>'propertyId' is distinct from b.property_id::text or final_sc->>'stayId' is distinct from b.stay_id::text then raise insufficient_privilege using message='INCIDENT_READ_FINAL_SCOPE_CHANGED';end if;
 select * into strict rev from concierge_incident_private_v1.current_revisions_v1(p_user,p_session,b.incident_id);
 if p_authority is distinct from rev.authority_revision or p_floor is distinct from jsonb_build_object(
 'userId',p_user,'sessionId',p_session,'accountId',b.account_id,'memberId',b.member_id,'propertyId',b.property_id,'stayId',b.stay_id,'incidentId',b.incident_id,
 'authorityVersion',rev.authority_revision,'restrictionVersion',rev.restriction_revision,'datasetId',rev.dataset_id,'recoveryEpoch',rev.recovery_epoch,
 'inventoryDigest',rev.inventory_digest,'restrictionJournalId',rev.restriction_journal_id,'restrictionDigest',rev.restriction_digest)
 then raise insufficient_privilege using message='INCIDENT_READ_FINAL_FLOOR_CHANGED';end if;
 perform concierge_incident_private_v1.assert_provider_v2(p_user,p_session,p_exp,p_intent,p_attempt,p_dispatch,p_original,p_authority,rev.restriction_revision,p_provider_binding,p_floor);
 return jsonb_build_object('state','EFFECT_OBSERVED','providerBindingRef',p_provider_binding,'originalRef',p_original,'userId',p_user,'intentId',p_intent,'attemptId',p_attempt,'sessionId',p_session,'tokenExpiresAt',p_exp,'authorityVersion',p_authority,'restrictionVersion',rev.restriction_revision,'dispatchId',p_dispatch,'incidentId',b.incident_id,'resultingStatus',a.resulting_status,'recoveryEpoch',rev.recovery_epoch,'observedAtMs',floor(extract(epoch from clock_timestamp())*1000),'expiresAtMs',least(p_exp*1000,floor(extract(epoch from clock_timestamp())*1000)+1000));
end $reader$;
revoke all on all functions in schema concierge_incident_private_v1 from public;
rollback;
