-- DEV definitions only. Optional external dependencies not cloned.
set check_function_bodies=off;
CREATE OR REPLACE FUNCTION public.concierge_activate_guest_phone_replacement(p_verified_phone_hash text)
 RETURNS TABLE(result text, reason_code text, change_id uuid, guest_identity_id uuid, stay_member_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_change public.concierge_guest_phone_changes%rowtype;
 v_sm public.concierge_stay_members%rowtype;
 v_stay public.concierge_stays%rowtype;
 v_id public.concierge_guest_identities%rowtype;
 v_old_hash text;
 v_auth record;
 v_count int;
BEGIN
 IF p_verified_phone_hash IS NULL OR p_verified_phone_hash !~ '^[0-9a-f]{64}$' THEN
  RETURN QUERY SELECT 'deny'::text,'INVALID_VERIFIED_PHONE'::text,NULL::uuid,NULL::uuid,NULL::uuid; RETURN;
 END IF;
 SELECT count(*) INTO v_count FROM public.concierge_guest_phone_changes ch
 WHERE ch.proposed_phone_hash=p_verified_phone_hash AND ch.status='approved' AND ch.expires_at>now();
 IF v_count<>1 THEN
  RETURN QUERY SELECT 'deny'::text,
    (CASE WHEN v_count>1 THEN 'PHONE_CHANGE_AMBIGUOUS' ELSE 'NO_APPROVED_CHANGE' END)::text,
    NULL::uuid,NULL::uuid,NULL::uuid; RETURN;
 END IF;
 SELECT ch.* INTO v_change FROM public.concierge_guest_phone_changes ch
 WHERE ch.proposed_phone_hash=p_verified_phone_hash AND ch.status='approved'
 AND ch.expires_at>now() FOR UPDATE;
 IF NOT FOUND OR v_change.expires_at<=now() THEN
  RETURN QUERY SELECT 'deny'::text,'NO_APPROVED_CHANGE'::text,NULL::uuid,NULL::uuid,NULL::uuid; RETURN;
 END IF;
 SELECT sm.* INTO v_sm FROM public.concierge_stay_members sm
 WHERE sm.id=v_change.stay_member_id FOR UPDATE;
 SELECT s.* INTO v_stay FROM public.concierge_stays s
 WHERE s.id=v_change.stay_id AND s.account_id=v_change.account_id;
 IF v_sm.id IS NULL OR v_stay.id IS NULL OR v_sm.status<>'active'
  OR v_sm.whatsapp_enabled IS DISTINCT FROM true
  OR v_sm.account_id<>v_change.account_id OR v_sm.stay_id<>v_stay.id
  OR v_sm.guest_identity_id<>v_change.original_guest_identity_id
  OR v_stay.property_id<>v_change.property_id
  OR v_stay.status NOT IN ('scheduled','active') OR v_stay.check_out_at<=now()
  OR NOT EXISTS (SELECT 1 FROM public.concierge_properties p
    WHERE p.id=v_change.property_id AND p.account_id=v_change.account_id AND p.status='active')
 THEN
  RETURN QUERY SELECT 'deny'::text,'CHANGE_SCOPE_INVALID'::text,v_change.id,NULL::uuid,NULL::uuid; RETURN;
 END IF;
 SELECT * INTO v_auth FROM public.concierge_authorize_manager_member_action(
  v_change.approved_by_member_id,v_change.property_id,'manage_stays');
 IF NOT FOUND OR v_auth.result<>'allow' OR v_auth.account_id<>v_change.account_id THEN
  RETURN QUERY SELECT 'deny'::text,'MANAGER_PERMISSION_REVOKED'::text,v_change.id,NULL::uuid,NULL::uuid; RETURN;
 END IF;
 SELECT gi.phone_hash INTO v_old_hash FROM public.concierge_guest_identities gi
 WHERE gi.id=v_sm.guest_identity_id AND gi.status='active' FOR UPDATE;
 IF NOT FOUND OR v_old_hash=p_verified_phone_hash THEN
  RETURN QUERY SELECT 'deny'::text,'ORIGINAL_IDENTITY_INVALID'::text,v_change.id,NULL::uuid,NULL::uuid; RETURN;
 END IF;
 IF EXISTS(SELECT 1 FROM public.concierge_account_members am
   WHERE am.phone_hash=p_verified_phone_hash AND am.status='active')
  OR EXISTS(SELECT 1 FROM public.concierge_operational_people op
   WHERE op.phone_hash=p_verified_phone_hash AND op.status='active')
 THEN
  RETURN QUERY SELECT 'deny'::text,'NEW_PHONE_ALREADY_ASSIGNED'::text,v_change.id,NULL::uuid,NULL::uuid; RETURN;
 END IF;
 SELECT gi.* INTO v_id FROM public.concierge_guest_identities gi
 WHERE gi.phone_hash=p_verified_phone_hash FOR UPDATE;
 IF FOUND AND v_id.status<>'active' THEN
  RETURN QUERY SELECT 'deny'::text,'NEW_IDENTITY_BLOCKED'::text,v_change.id,NULL::uuid,NULL::uuid; RETURN;
 END IF;
 IF FOUND AND EXISTS(
  SELECT 1 FROM public.concierge_stay_members sm
  JOIN public.concierge_stays s ON s.id=sm.stay_id AND s.account_id=sm.account_id
  WHERE sm.guest_identity_id=v_id.id AND sm.status IN ('invited','active')
  AND sm.whatsapp_enabled=true AND s.status IN ('scheduled','active') AND s.check_out_at>now()
 ) THEN
  RETURN QUERY SELECT 'deny'::text,'NEW_PHONE_ALREADY_ASSIGNED'::text,v_change.id,NULL::uuid,NULL::uuid; RETURN;
 END IF;
 IF v_id.id IS NULL THEN
  INSERT INTO public.concierge_guest_identities(phone_hash,preferred_language,status)
  SELECT p_verified_phone_hash,gi.preferred_language,'active' FROM public.concierge_guest_identities gi
  WHERE gi.id=v_change.original_guest_identity_id
  RETURNING * INTO v_id;
 END IF;
 UPDATE public.concierge_stay_members sm SET guest_identity_id=v_id.id,updated_at=now()
 WHERE sm.id=v_change.stay_member_id AND sm.guest_identity_id=v_change.original_guest_identity_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONCURRENT_MEMBER_REASSIGNMENT'; END IF;
 -- Retire the old encrypted notification recipient only when it has no other
 -- eligible stay in any account. The old guest identity row is locked above.
 -- A guest may legitimately share the same WhatsApp across multiple stays;
 -- those other stays must keep their active channel.
 UPDATE public.concierge_guest_channels gc
 SET status='revoked',updated_at=now()
 WHERE gc.guest_identity_id=v_change.original_guest_identity_id
   AND gc.channel='whatsapp' AND gc.status='active'
   AND NOT EXISTS (
     SELECT 1 FROM public.concierge_stay_members other_sm
     JOIN public.concierge_stays other_stay
       ON other_stay.id=other_sm.stay_id
       AND other_stay.account_id=other_sm.account_id
     WHERE other_sm.guest_identity_id=v_change.original_guest_identity_id
       AND other_sm.status IN ('invited','active')
       AND other_sm.whatsapp_enabled=true
       AND other_stay.status IN ('scheduled','active')
       AND other_stay.check_out_at>now()
   );

 UPDATE public.concierge_guest_invites inv SET status='revoked'
 WHERE inv.stay_member_id=v_sm.id AND inv.status IN ('created','sent');
 UPDATE public.concierge_sessions ss SET status='closed',ended_at=now(),last_activity_at=now()
 WHERE ss.phone_hash=v_old_hash AND ss.status='active'
 AND ss.mode='concierge_guest' AND ss.stay_member_id=v_sm.id;
 -- Do not re-target previously queued notifications to a new number without approval.
 UPDATE public.concierge_notification_outbox o
 SET status='cancelled',cancelled_at=now(),updated_at=now()
 WHERE o.stay_member_id=v_sm.id AND o.status='pending';
 UPDATE public.concierge_guest_phone_changes ch
 SET status='activated',activated_at=now(),updated_at=now() WHERE ch.id=v_change.id;
 RETURN QUERY SELECT 'activated'::text,NULL::text,v_change.id,v_id.id,v_sm.id;
END
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_activate_knowledge_version(p_knowledge_item_id uuid, p_version_id uuid, p_approved_by_member_id uuid)
 RETURNS TABLE(knowledge_item_id uuid, version_id uuid, version_number integer, resulting_status text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_item public.concierge_knowledge_items%rowtype;
  v_version public.concierge_knowledge_versions%rowtype;

  v_approver_role text;
  v_approver_status text;
  v_can_manage_knowledge boolean := false;

  v_old_version_id uuid;
begin
  select ki.*
    into v_item
  from public.concierge_knowledge_items ki
  where ki.id=p_knowledge_item_id
  for update;

  if not found then
    raise exception using
      errcode='42501',
      message='RESOURCE_OUT_OF_SCOPE';
  end if;

  select kv.*
    into v_version
  from public.concierge_knowledge_versions kv
  where kv.id=p_version_id
    and kv.knowledge_item_id=v_item.id
    and kv.account_id=v_item.account_id
  for update;

  if not found then
    raise exception using
      errcode='42501',
      message='RESOURCE_OUT_OF_SCOPE';
  end if;

  if v_version.status not in ('draft','superseded') then
    raise exception using
      errcode='23514',
      message='KNOWLEDGE_VERSION_NOT_ACTIVATABLE';
  end if;

  select m.role, m.status
    into v_approver_role, v_approver_status
  from public.concierge_account_members m
  where m.id=p_approved_by_member_id
    and m.account_id=v_item.account_id;

  if not found or v_approver_status <> 'active' then
    raise exception using
      errcode='42501',
      message='MANAGER_PERMISSION_DENIED';
  end if;

  if v_approver_role in ('owner','manager') then
    v_can_manage_knowledge := true;
  elsif v_approver_role='co_manager'
        and v_item.scope_type='property' then
    select coalesce(p.can_manage_knowledge, false)
      into v_can_manage_knowledge
    from public.concierge_member_property_permissions p
    where p.account_id=v_item.account_id
      and p.member_id=p_approved_by_member_id
      and p.property_id=v_item.property_id;
  end if;

  if not coalesce(v_can_manage_knowledge,false) then
    raise exception using
      errcode='42501',
      message='MANAGER_PERMISSION_DENIED';
  end if;

  if v_item.risk_level='safety_review'
     and v_version.created_by_member_id=p_approved_by_member_id then
    raise exception using
      errcode='23514',
      message='SAFETY_REVIEW_REQUIRES_SECOND_APPROVER';
  end if;

  v_old_version_id := v_item.current_version_id;

  if v_old_version_id is not null
     and v_old_version_id <> v_version.id then
    update public.concierge_knowledge_versions kv_old
       set status='superseded'
     where kv_old.id=v_old_version_id
       and kv_old.status='approved';
  end if;

  update public.concierge_knowledge_versions kv_target
     set
       status='approved',
       approved_by_member_id=p_approved_by_member_id,
       approved_at=coalesce(kv_target.approved_at, now())
   where kv_target.id=v_version.id;

  update public.concierge_knowledge_items ki_target
     set
       current_version_id=v_version.id,
       status='active',
       updated_at=now()
   where ki_target.id=v_item.id;

  insert into public.concierge_audit_events (
    account_id,
    actor_type,
    actor_ref,
    property_id,
    action_type,
    entity_type,
    entity_id,
    result,
    reason_code
  )
  values (
    v_item.account_id,
    'account_member',
    p_approved_by_member_id,
    case when v_item.scope_type='property' then v_item.property_id else null end,
    'knowledge_version_activated',
    'knowledge_item',
    v_item.id,
    'changed',
    null
  );

  return query
  select
    v_item.id,
    v_version.id,
    v_version.version_number,
    'active'::text;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_approve_guest_phone_replacement(p_manager_id uuid, p_change_id uuid)
 RETURNS TABLE(result text, reason_code text, change_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_change public.concierge_guest_phone_changes%rowtype;
 v_sm public.concierge_stay_members%rowtype;
 v_stay public.concierge_stays%rowtype;
 v_auth record;
BEGIN
 SELECT ch.* INTO v_change FROM public.concierge_guest_phone_changes ch
 WHERE ch.id=p_change_id FOR UPDATE;
 IF NOT FOUND THEN
  RETURN QUERY SELECT 'deny'::text,'CHANGE_NOT_FOUND'::text,NULL::uuid; RETURN;
 END IF;
 IF v_change.status <> 'pending' THEN
  RETURN QUERY SELECT 'deny'::text,'CHANGE_NOT_PENDING'::text,v_change.id; RETURN;
 END IF;
 IF v_change.expires_at<=now() THEN
  UPDATE public.concierge_guest_phone_changes ch SET status='expired',updated_at=now()
  WHERE ch.id=v_change.id;
  RETURN QUERY SELECT 'deny'::text,'CHANGE_EXPIRED'::text,v_change.id; RETURN;
 END IF;
 SELECT sm.* INTO v_sm FROM public.concierge_stay_members sm
 WHERE sm.id=v_change.stay_member_id FOR UPDATE;
 SELECT s.* INTO v_stay FROM public.concierge_stays s
 WHERE s.id=v_change.stay_id AND s.account_id=v_change.account_id;
 IF v_sm.id IS NULL OR v_stay.id IS NULL OR v_sm.stay_id<>v_stay.id
  OR v_sm.account_id<>v_change.account_id OR v_sm.guest_identity_id<>v_change.original_guest_identity_id
  OR v_sm.status<>'active' OR v_sm.whatsapp_enabled IS DISTINCT FROM true
  OR v_stay.property_id<>v_change.property_id OR v_stay.status NOT IN ('scheduled','active')
  OR v_stay.check_out_at<=now() THEN
  RETURN QUERY SELECT 'deny'::text,'CHANGE_SCOPE_INVALID'::text,v_change.id; RETURN;
 END IF;
 SELECT * INTO v_auth FROM public.concierge_authorize_manager_member_action(
  p_manager_id,v_change.property_id,'manage_stays');
 IF NOT FOUND OR v_auth.result<>'allow' OR v_auth.account_id<>v_change.account_id THEN
  RETURN QUERY SELECT 'deny'::text,'MANAGER_PERMISSION_DENIED'::text,v_change.id; RETURN;
 END IF;
 UPDATE public.concierge_guest_phone_changes ch
 SET status='approved',approved_by_member_id=p_manager_id,
  approved_at=now(),expires_at=least(now()+interval '30 minutes',v_stay.check_out_at),updated_at=now()
 WHERE ch.id=v_change.id;
 RETURN QUERY SELECT 'approved'::text,NULL::text,v_change.id;
END
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_authorize_manager_member_action(p_member_id uuid, p_property_id uuid, p_action text)
 RETURNS TABLE(result text, reason_code text, account_id uuid, member_id uuid, member_role text, property_id uuid, can_manage_stays boolean, can_manage_incidents boolean, can_approve_requests boolean, can_manage_knowledge boolean, can_manage_secrets boolean, can_manage_team boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_member public.concierge_account_members%rowtype;
  v_property public.concierge_properties%rowtype;
  v_perm public.concierge_member_property_permissions%rowtype;

  v_stays boolean := false;
  v_incidents boolean := false;
  v_requests boolean := false;
  v_knowledge boolean := false;
  v_secrets boolean := false;
  v_team boolean := false;
  v_allowed boolean := false;
begin
  if p_action not in (
    'view_property',
    'manage_stays',
    'manage_incidents',
    'approve_requests',
    'manage_knowledge',
    'manage_secrets',
    'manage_team'
  ) then
    return query
    select
      'deny'::text,
      'INVALID_MANAGER_ACTION'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::uuid,
      false,false,false,false,false,false;
    return;
  end if;

  select m.*
    into v_member
  from public.concierge_account_members m
  where m.id=p_member_id
  limit 1;

  if not found
     or v_member.status <> 'active' then
    return query
    select
      'deny'::text,
      'MANAGER_MEMBER_NOT_ACTIVE'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::uuid,
      false,false,false,false,false,false;
    return;
  end if;

  select p.*
    into v_property
  from public.concierge_properties p
  where p.id=p_property_id
  limit 1;

  if not found
     or v_property.account_id <> v_member.account_id then
    return query
    select
      'deny'::text,
      'PROPERTY_OUT_OF_SCOPE'::text,
      v_member.account_id,
      v_member.id,
      v_member.role,
      null::uuid,
      false,false,false,false,false,false;
    return;
  end if;

  if v_member.role in ('owner','manager') then
    v_stays := true;
    v_incidents := true;
    v_requests := true;
    v_knowledge := true;
    v_secrets := true;
    v_team := true;
  elsif v_member.role='co_manager' then
    select pp.*
      into v_perm
    from public.concierge_member_property_permissions pp
    where pp.account_id=v_member.account_id
      and pp.member_id=v_member.id
      and pp.property_id=v_property.id
    limit 1;

    if not found then
      return query
      select
        'deny'::text,
        'PROPERTY_OUT_OF_SCOPE'::text,
        v_member.account_id,
        v_member.id,
        v_member.role,
        null::uuid,
        false,false,false,false,false,false;
      return;
    end if;

    v_stays := v_perm.can_manage_stays;
    v_incidents := v_perm.can_manage_incidents;
    v_requests := v_perm.can_approve_requests;
    v_knowledge := v_perm.can_manage_knowledge;
    v_secrets := v_perm.can_manage_secrets;
    v_team := v_perm.can_manage_team;
  else
    return query
    select
      'deny'::text,
      'MANAGER_PERMISSION_DENIED'::text,
      v_member.account_id,
      v_member.id,
      v_member.role,
      null::uuid,
      false,false,false,false,false,false;
    return;
  end if;

  v_allowed :=
    case p_action
      when 'view_property' then true
      when 'manage_stays' then v_stays
      when 'manage_incidents' then v_incidents
      when 'approve_requests' then v_requests
      when 'manage_knowledge' then v_knowledge
      when 'manage_secrets' then v_secrets
      when 'manage_team' then v_team
      else false
    end;

  return query
  select
    case when v_allowed then 'allow' else 'deny' end,
    case when v_allowed then null::text else 'MANAGER_PERMISSION_DENIED'::text end,
    v_member.account_id,
    v_member.id,
    v_member.role,
    v_property.id,
    v_stays,
    v_incidents,
    v_requests,
    v_knowledge,
    v_secrets,
    v_team;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_authorize_manager_web_action(p_auth_user_id uuid, p_property_id uuid, p_action text)
 RETURNS TABLE(result text, reason_code text, account_id uuid, member_id uuid, member_role text, property_id uuid, can_manage_stays boolean, can_manage_incidents boolean, can_approve_requests boolean, can_manage_knowledge boolean, can_manage_secrets boolean, can_manage_team boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_ctx record;
begin
  select *
    into v_ctx
  from public.concierge_resolve_manager_web_context(p_auth_user_id);

  if v_ctx.result <> 'allow' then
    return query
    select
      'deny'::text,
      v_ctx.reason_code,
      null::uuid,
      null::uuid,
      null::text,
      null::uuid,
      false,false,false,false,false,false;
    return;
  end if;

  return query
  select *
  from public.concierge_authorize_manager_member_action(
    v_ctx.member_id,
    p_property_id,
    p_action
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_authorize_operational_secret_access(p_operational_person_id uuid, p_operational_task_id uuid, p_access_point_id uuid)
 RETURNS TABLE(result text, reason_code text, secret_version_id uuid, vault_secret_id uuid)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_person public.concierge_operational_people%rowtype;
  v_task public.concierge_operational_tasks%rowtype;

  v_property_building_id uuid;
  v_property_status text;

  v_ap_account_id uuid;
  v_ap_scope text;
  v_ap_property_id uuid;
  v_ap_building_id uuid;
  v_ap_status text;

  v_policy_ok boolean := false;

  v_auth public.concierge_access_authorizations%rowtype;

  v_secret_version_id uuid;
  v_vault_secret_id uuid;
begin
  select op.*
    into v_person
  from public.concierge_operational_people op
  where op.id=p_operational_person_id;

  if not found or v_person.status <> 'active' then
    return query
    select
      'deny'::text,
      'OPERATIONAL_TASK_OUT_OF_SCOPE'::text,
      null::uuid,
      null::uuid;
    return;
  end if;

  select t.*
    into v_task
  from public.concierge_operational_tasks t
  where t.id=p_operational_task_id
    and t.account_id=v_person.account_id
    and t.operational_person_id=v_person.id;

  if not found or v_task.status not in ('scheduled','active') then
    return query
    select
      'deny'::text,
      'OPERATIONAL_TASK_OUT_OF_SCOPE'::text,
      null::uuid,
      null::uuid;
    return;
  end if;

  select p.building_id, p.status
    into v_property_building_id, v_property_status
  from public.concierge_properties p
  where p.id=v_task.property_id
    and p.account_id=v_task.account_id;

  if not found or v_property_status <> 'active' then
    return query
    select
      'deny'::text,
      'RESOURCE_OUT_OF_SCOPE'::text,
      null::uuid,
      null::uuid;
    return;
  end if;

  select
    ap.account_id,
    ap.scope_type,
    ap.property_id,
    ap.building_id,
    ap.status
  into
    v_ap_account_id,
    v_ap_scope,
    v_ap_property_id,
    v_ap_building_id,
    v_ap_status
  from public.concierge_access_points ap
  where ap.id=p_access_point_id;

  if not found
     or v_ap_account_id <> v_task.account_id
     or v_ap_status <> 'active' then
    return query
    select
      'deny'::text,
      'RESOURCE_OUT_OF_SCOPE'::text,
      null::uuid,
      null::uuid;
    return;
  end if;

  if not (
    (
      v_ap_scope='property'
      and v_ap_property_id=v_task.property_id
    )
    or
    (
      v_ap_scope='building'
      and v_property_building_id is not null
      and v_ap_building_id=v_property_building_id
    )
  ) then
    return query
    select
      'deny'::text,
      'PROPERTY_MISMATCH'::text,
      null::uuid,
      null::uuid;
    return;
  end if;

  if now() < v_task.access_from then
    return query
    select
      'deny'::text,
      'ACCESS_WINDOW_NOT_STARTED'::text,
      null::uuid,
      null::uuid;
    return;
  end if;

  if now() >= v_task.access_until then
    return query
    select
      'deny'::text,
      'ACCESS_WINDOW_EXPIRED'::text,
      null::uuid,
      null::uuid;
    return;
  end if;

  select exists (
    select 1
    from public.concierge_access_point_policies pol
    where pol.access_point_id=p_access_point_id
      and pol.account_id=v_task.account_id
      and pol.subject_type='operational_person'
      and pol.requires_explicit_authorization=true
      and pol.window_source='authorization_window'
      and pol.status='active'
  )
  into v_policy_ok;

  if not v_policy_ok then
    return query
    select
      'deny'::text,
      'ACCESS_POINT_NOT_AUTHORIZED'::text,
      null::uuid,
      null::uuid;
    return;
  end if;

  select a.*
    into v_auth
  from public.concierge_access_authorizations a
  where a.account_id=v_task.account_id
    and a.stay_member_id is null
    and a.operational_person_id=v_person.id
    and a.operational_task_id=v_task.id
    and a.access_point_id=p_access_point_id
    and a.status='active'
  order by a.created_at desc
  limit 1;

  if not found then
    return query
    select
      'deny'::text,
      'ACCESS_POINT_NOT_AUTHORIZED'::text,
      null::uuid,
      null::uuid;
    return;
  end if;

  if now() < v_auth.authorized_from then
    return query
    select
      'deny'::text,
      'ACCESS_WINDOW_NOT_STARTED'::text,
      null::uuid,
      null::uuid;
    return;
  end if;

  if now() >= v_auth.authorized_until then
    return query
    select
      'deny'::text,
      'ACCESS_WINDOW_EXPIRED'::text,
      null::uuid,
      null::uuid;
    return;
  end if;

  select
    sv.id,
    sv.vault_secret_id
  into
    v_secret_version_id,
    v_vault_secret_id
  from public.concierge_secret_versions sv
  where sv.account_id=v_task.account_id
    and sv.access_point_id=p_access_point_id
    and sv.status='active'
  order by sv.version_number desc
  limit 1;

  if not found then
    return query
    select
      'deny'::text,
      'SECRET_NOT_ACTIVE'::text,
      null::uuid,
      null::uuid;
    return;
  end if;

  return query
  select
    'allow'::text,
    null::text,
    v_secret_version_id,
    v_vault_secret_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_authorize_secret_access(p_guest_identity_id uuid, p_stay_member_id uuid, p_access_point_id uuid)
 RETURNS TABLE(result text, reason_code text, secret_version_id uuid, vault_secret_id uuid)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_identity_status text;

  v_account_id uuid;
  v_stay_id uuid;
  v_property_id uuid;
  v_building_id uuid;

  v_member_identity_id uuid;
  v_member_status text;
  v_whatsapp_enabled boolean;
  v_property_access boolean;

  v_stay_status text;
  v_access_from timestamptz;
  v_access_until timestamptz;
  v_check_out_at timestamptz;

  v_ap_account_id uuid;
  v_ap_scope text;
  v_ap_property_id uuid;
  v_ap_building_id uuid;
  v_ap_status text;

  v_policy_ok boolean := false;

  v_auth public.concierge_access_authorizations%rowtype;

  v_secret_version_id uuid;
  v_vault_secret_id uuid;
begin
  select gi.status
    into v_identity_status
  from public.concierge_guest_identities gi
  where gi.id=p_guest_identity_id;

  if not found or v_identity_status <> 'active' then
    return query
    select 'deny'::text, 'IDENTITY_UNKNOWN'::text, null::uuid, null::uuid;
    return;
  end if;

  select
    sm.account_id,
    sm.stay_id,
    sm.guest_identity_id,
    sm.status,
    sm.whatsapp_enabled,
    sm.property_access,
    s.property_id,
    p.building_id,
    s.status,
    s.access_from,
    s.access_until,
    s.check_out_at
  into
    v_account_id,
    v_stay_id,
    v_member_identity_id,
    v_member_status,
    v_whatsapp_enabled,
    v_property_access,
    v_property_id,
    v_building_id,
    v_stay_status,
    v_access_from,
    v_access_until,
    v_check_out_at
  from public.concierge_stay_members sm
  join public.concierge_stays s
    on s.id=sm.stay_id
   and s.account_id=sm.account_id
  join public.concierge_properties p
    on p.id=s.property_id
   and p.account_id=s.account_id
  where sm.id=p_stay_member_id;

  if not found then
    return query
    select 'deny'::text, 'MEMBER_NOT_ACTIVE'::text, null::uuid, null::uuid;
    return;
  end if;

  if v_member_identity_id is null
     or v_member_identity_id <> p_guest_identity_id then
    return query
    select 'deny'::text, 'IDENTITY_UNKNOWN'::text, null::uuid, null::uuid;
    return;
  end if;

  if v_member_status <> 'active' then
    return query
    select 'deny'::text, 'MEMBER_NOT_ACTIVE'::text, null::uuid, null::uuid;
    return;
  end if;

  if not v_whatsapp_enabled then
    return query
    select 'deny'::text, 'WHATSAPP_NOT_ENABLED'::text, null::uuid, null::uuid;
    return;
  end if;

  if not v_property_access then
    return query
    select 'deny'::text, 'RESOURCE_OUT_OF_SCOPE'::text, null::uuid, null::uuid;
    return;
  end if;

  if v_stay_status not in ('scheduled','active') then
    return query
    select 'deny'::text, 'MEMBER_NOT_ACTIVE'::text, null::uuid, null::uuid;
    return;
  end if;

  -- Checkout is the hard upper bound even if technical access_until is later.
  if now() >= v_check_out_at then
    return query
    select 'deny'::text, 'ACCESS_WINDOW_EXPIRED'::text, null::uuid, null::uuid;
    return;
  end if;

  select
    ap.account_id,
    ap.scope_type,
    ap.property_id,
    ap.building_id,
    ap.status
  into
    v_ap_account_id,
    v_ap_scope,
    v_ap_property_id,
    v_ap_building_id,
    v_ap_status
  from public.concierge_access_points ap
  where ap.id=p_access_point_id;

  if not found
     or v_ap_status <> 'active'
     or v_ap_account_id <> v_account_id then
    return query
    select 'deny'::text, 'RESOURCE_OUT_OF_SCOPE'::text, null::uuid, null::uuid;
    return;
  end if;

  if not (
    (v_ap_scope='property' and v_ap_property_id=v_property_id)
    or
    (
      v_ap_scope='building'
      and v_building_id is not null
      and v_ap_building_id=v_building_id
    )
  ) then
    return query
    select 'deny'::text, 'PROPERTY_MISMATCH'::text, null::uuid, null::uuid;
    return;
  end if;

  if now() < v_access_from then
    return query
    select 'deny'::text, 'ACCESS_WINDOW_NOT_STARTED'::text, null::uuid, null::uuid;
    return;
  end if;

  if now() >= v_access_until then
    return query
    select 'deny'::text, 'ACCESS_WINDOW_EXPIRED'::text, null::uuid, null::uuid;
    return;
  end if;

  select exists (
    select 1
    from public.concierge_access_point_policies pol
    where pol.access_point_id=p_access_point_id
      and pol.account_id=v_account_id
      and pol.subject_type='stay_member'
      and pol.requires_explicit_authorization=true
      and pol.window_source='stay_access_window'
      and pol.status='active'
  )
  into v_policy_ok;

  if not v_policy_ok then
    return query
    select 'deny'::text, 'RESOURCE_OUT_OF_SCOPE'::text, null::uuid, null::uuid;
    return;
  end if;

  select a.*
    into v_auth
  from public.concierge_access_authorizations a
  where a.account_id=v_account_id
    and a.stay_member_id=p_stay_member_id
    and a.access_point_id=p_access_point_id
    and a.status='active'
  order by a.created_at desc
  limit 1;

  if not found then
    return query
    select 'deny'::text, 'RESOURCE_OUT_OF_SCOPE'::text, null::uuid, null::uuid;
    return;
  end if;

  if now() < v_auth.authorized_from then
    return query
    select 'deny'::text, 'ACCESS_WINDOW_NOT_STARTED'::text, null::uuid, null::uuid;
    return;
  end if;

  if now() >= v_auth.authorized_until then
    return query
    select 'deny'::text, 'ACCESS_WINDOW_EXPIRED'::text, null::uuid, null::uuid;
    return;
  end if;

  select
    sv.id,
    sv.vault_secret_id
  into
    v_secret_version_id,
    v_vault_secret_id
  from public.concierge_secret_versions sv
  where sv.account_id=v_account_id
    and sv.access_point_id=p_access_point_id
    and sv.status='active'
  order by sv.version_number desc
  limit 1;

  if not found then
    return query
    select 'deny'::text, 'SECRET_NOT_ACTIVE'::text, null::uuid, null::uuid;
    return;
  end if;

  return query
  select
    'allow'::text,
    null::text,
    v_secret_version_id,
    v_vault_secret_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_begin_beta_on_first_verified_stay(p_account_id uuid, p_stay_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_status text;
  v_started timestamptz;
  v_ends timestamptz;
BEGIN
  IF p_account_id IS NULL OR p_stay_id IS NULL THEN
    RETURN 'MISSING_CONTEXT';
  END IF;

  -- Serialize simultaneous activations of a manager's first verified stay.
  SELECT a.status, a.beta_started_at, a.beta_ends_at
    INTO v_status, v_started, v_ends
  FROM public.concierge_accounts AS a
  WHERE a.id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'ACCOUNT_NOT_FOUND';
  END IF;
  IF v_started IS NOT NULL OR v_ends IS NOT NULL THEN
    IF v_started IS NOT NULL AND v_ends IS NOT NULL THEN
      RETURN 'ALREADY_STARTED';
    END IF;
    RETURN 'PARTIAL_BETA_WINDOW_NEEDS_REVIEW';
  END IF;
  -- This is an administrative authorization, NOT implied by signup.
  IF v_status <> 'active' THEN
    RETURN 'ACCOUNT_NOT_APPROVED_FOR_BETA';
  END IF;

  -- A property created, an invitation sent, or a simulated QA stay
  -- must never start the clock. The primary guest must have activated
  -- their own invitation and must be inside an actual stay window.
  IF NOT EXISTS (
    SELECT 1
    FROM public.concierge_stays AS s
    JOIN public.concierge_properties AS p
      ON p.id=s.property_id AND p.account_id=s.account_id
    JOIN public.concierge_stay_members AS sm
      ON sm.stay_id=s.id AND sm.account_id=s.account_id
    JOIN public.concierge_guest_invites AS gi
      ON gi.stay_member_id=sm.id AND gi.account_id=s.account_id
    WHERE s.id=p_stay_id
      AND s.account_id=p_account_id
      -- A verified stay can retain 'scheduled' during its valid time window.
      -- Real activation is proven by the primary WhatsApp guest/invite below.
      AND s.status IN ('scheduled','active')
      AND p.status='active'
      AND v_now >= s.check_in_at
      AND v_now < s.check_out_at
      AND v_now >= s.access_from
      AND v_now < s.access_until
      AND sm.member_role='primary_guest'
      AND sm.status='active'
      AND sm.whatsapp_enabled IS TRUE
      AND sm.guest_identity_id IS NOT NULL
      AND sm.activated_at IS NOT NULL
      AND sm.activated_at <= v_now
      AND gi.status='activated'
      AND gi.activated_at IS NOT NULL
      AND gi.activated_at <= v_now
  ) THEN
    RETURN 'VERIFIED_ACTIVE_STAY_REQUIRED';
  END IF;

  UPDATE public.concierge_accounts
     SET beta_started_at=v_now,
         beta_ends_at=v_now + interval '30 days',
         updated_at=v_now
   WHERE id=p_account_id
     AND beta_started_at IS NULL
     AND beta_ends_at IS NULL;

  IF NOT FOUND THEN
    -- The account lock should make this unreachable; stay fail-closed.
    RETURN 'CONCURRENT_OR_MANUAL_UPDATE_NEEDS_REVIEW';
  END IF;
  RETURN 'BETA_STARTED_30_DAYS_NO_AUTOBILL';
END
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_block_analytics_event_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  raise exception using
    errcode='55000',
    message='ANALYTICS_EVENT_APPEND_ONLY';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_claim_due_notifications(p_limit integer DEFAULT 25, p_at timestamp with time zone DEFAULT now())
 RETURNS TABLE(notification_id uuid, notification_type text, language text, stay_id uuid, stay_member_id uuid, guest_identity_id uuid, recipient_ciphertext text, cipher_version integer, business_phone_number_id text, property_id uuid, property_name text, check_in_at timestamp with time zone, check_out_at timestamp with time zone, access_from timestamp with time zone, access_until timestamp with time zone, attempt_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin

  if p_limit < 1 or p_limit > 100 then
    raise exception using
      errcode = '22023',
      message = 'INVALID_CLAIM_LIMIT';
  end if;

  return query

  with candidates as (
    select
      o.id,
      o.notification_type,
      o.language,
      o.stay_id,
      o.stay_member_id,

      sm.guest_identity_id,

      ch.recipient_ciphertext,
      ch.cipher_version,
      ch.business_phone_number_id,

      s.property_id,
      p.internal_name as property_name,

      s.check_in_at,
      s.check_out_at,
      s.access_from,
      s.access_until

    from public.concierge_notification_outbox o

    join public.concierge_stays s
      on s.id = o.stay_id
     and s.account_id = o.account_id

    join public.concierge_properties p
      on p.id = s.property_id
     and p.account_id = s.account_id

    join public.concierge_stay_members sm
      on sm.id = o.stay_member_id
     and sm.stay_id = s.id
     and sm.account_id = s.account_id

    join public.concierge_guest_identities gi
      on gi.id = sm.guest_identity_id

    join public.concierge_guest_channels ch
      on ch.guest_identity_id = gi.id
     and ch.channel = 'whatsapp'
     and ch.status = 'active'

    where o.status = 'pending'
      and o.due_at <= p_at
      -- Beta V1: no fourth attempt; use claimed_at (stable across failed->pending sync)
      -- for bounded 2-minute/5-minute retry spacing, never updated_at.
      and o.attempt_count < 3
      and (
        o.attempt_count = 0
        or (
          o.attempt_count in (1, 2)
          and o.claimed_at is not null
          and o.claimed_at +
            case when o.attempt_count = 1 then interval '2 minutes'
                 else interval '5 minutes' end <= p_at
        )
      )
      -- Recheck time windows in claim itself (even if sync was skipped).
      and (
        (o.notification_type = 'prearrival' and s.check_in_at > p_at)
        or (o.notification_type = 'checkout'
            and s.check_out_at > p_at
            and s.check_in_at < p_at
            and s.check_out_at > s.check_in_at + interval '4 hours'
            and o.due_at > s.check_in_at)
        or (o.notification_type = 'access_enabled'
            and s.check_out_at > p_at
            and s.access_until > p_at
            and s.access_from >= p_at - interval '15 minutes')
      )

      and s.status in ('scheduled', 'active')

      and sm.member_role = 'primary_guest'
      and sm.status in ('invited', 'active')
      and sm.whatsapp_enabled = true

      and gi.status = 'active'

    order by
      o.due_at asc,
      o.created_at asc

    limit p_limit

    for update of o skip locked
  ),

  claimed as (
    update public.concierge_notification_outbox o
       set status = 'processing',
           claimed_at = p_at,
           attempt_count = o.attempt_count + 1,
           updated_at = p_at
    from candidates c
    where o.id = c.id
    returning
      o.id,
      o.attempt_count
  )

  select
    c.id,
    c.notification_type,
    c.language,
    c.stay_id,
    c.stay_member_id,
    c.guest_identity_id,
    c.recipient_ciphertext,
    c.cipher_version,
    c.business_phone_number_id,
    c.property_id,
    c.property_name,
    c.check_in_at,
    c.check_out_at,
    c.access_from,
    c.access_until,
    cl.attempt_count

  from candidates c
  join claimed cl
    on cl.id = c.id

  order by c.id;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_close_session(p_phone_hash text, p_at timestamp with time zone DEFAULT now())
 RETURNS TABLE(closed_sessions integer)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_count integer := 0;
begin
  update public.concierge_sessions s
     set status='closed',
         ended_at=p_at,
         last_activity_at=p_at
   where s.phone_hash=p_phone_hash
     and s.status='active';

  get diagnostics v_count = row_count;

  return query
  select v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_complete_notification(p_notification_id uuid, p_success boolean, p_error text DEFAULT NULL::text, p_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_row public.concierge_notification_outbox%rowtype;
begin

  select *
    into v_row
  from public.concierge_notification_outbox
  where id = p_notification_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'NOTIFICATION_NOT_FOUND';
  end if;

  /*
   * Idempotencia:
   * si ya fue enviada, una repetición del callback no la modifica.
   */
  if v_row.status = 'sent' then
    return jsonb_build_object(
      'ok', true,
      'notification_id', v_row.id,
      'status', 'sent',
      'already_completed', true
    );
  end if;

  if v_row.status <> 'processing' then
    raise exception using
      errcode = '22023',
      message = 'NOTIFICATION_NOT_PROCESSING';
  end if;

  if p_success then

    update public.concierge_notification_outbox
       set status = 'sent',
           sent_at = p_at,
           last_error = null,
           updated_at = p_at
     where id = p_notification_id;

    return jsonb_build_object(
      'ok', true,
      'notification_id', p_notification_id,
      'status', 'sent',
      'already_completed', false
    );

  else

    update public.concierge_notification_outbox
       set status = 'failed',
           last_error = left(
             coalesce(nullif(trim(p_error), ''), 'UNKNOWN_DELIVERY_ERROR'),
             1000
           ),
           updated_at = p_at
     where id = p_notification_id;

    return jsonb_build_object(
      'ok', true,
      'notification_id', p_notification_id,
      'status', 'failed',
      'already_completed', false
    );

  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_confirm_pending_action(p_action_id uuid, p_actor_type text, p_actor_id uuid)
 RETURNS TABLE(result text, reason_code text, action_id uuid, resulting_status text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_action public.concierge_pending_actions%rowtype;
  v_actor_matches boolean := false;
begin
  select *
    into v_action
  from public.concierge_pending_actions
  where id = p_action_id
  for update;

  if not found then
    return query
    select
      'deny'::text,
      'ACTION_NOT_FOUND'::text,
      p_action_id,
      null::text;
    return;
  end if;

  if v_action.status <> 'pending' then
    return query
    select
      'deny'::text,
      case
        when v_action.status = 'expired' then 'CONFIRMATION_EXPIRED'
        else 'CONFIRMATION_NOT_PENDING'
      end::text,
      v_action.id,
      v_action.status;
    return;
  end if;

  if v_action.expires_at <= now() then
    update public.concierge_pending_actions
      set status = 'expired'
    where id = v_action.id
      and status = 'pending';

    return query
    select
      'deny'::text,
      'CONFIRMATION_EXPIRED'::text,
      v_action.id,
      'expired'::text;
    return;
  end if;

  v_actor_matches :=
    (
      p_actor_type = 'account_member'
      and v_action.actor_type = 'account_member'
      and v_action.actor_account_member_id = p_actor_id
    )
    or
    (
      p_actor_type = 'stay_member'
      and v_action.actor_type = 'stay_member'
      and v_action.actor_stay_member_id = p_actor_id
    );

  if not v_actor_matches then
    return query
    select
      'deny'::text,
      'CONFIRMATION_ACTOR_MISMATCH'::text,
      v_action.id,
      v_action.status;
    return;
  end if;

  -- The pending-action actor may have been revoked AFTER action creation.
  -- Reauthorize at confirmation time, not only at enrollment/creation.
  if p_actor_type = 'account_member' then
    if not exists (
      select 1 from public.concierge_account_members m
      where m.id = p_actor_id
        and m.account_id = v_action.account_id
        and m.status = 'active'
    ) then
      return query
      select 'deny'::text, 'CONFIRMATION_ACTOR_INACTIVE'::text,
             v_action.id, v_action.status;
      return;
    end if;
  elsif p_actor_type = 'stay_member' then
    if not exists (
      select 1
        from public.concierge_stay_members sm
        join public.concierge_guest_identities gi on gi.id = sm.guest_identity_id
      where sm.id = p_actor_id
        and sm.account_id = v_action.account_id
        and sm.status = 'active'
        and sm.whatsapp_enabled = true
        and gi.status = 'active'
    ) then
      return query
      select 'deny'::text, 'CONFIRMATION_ACTOR_INACTIVE'::text,
             v_action.id, v_action.status;
      return;
    end if;
  end if;

  -- Gate 4 / 10 Oct 2026: property permission must still exist at confirmation.
  -- Real Beta account-member pending flow: create_stay requires manage_stays.
  -- Other property-scoped actions retain a fresh view_property check.
  if p_actor_type = 'account_member' then
    if v_action.action_type = 'create_stay' and v_action.property_id is null then
      return query
      select 'deny'::text, 'CONFIRMATION_MANAGER_SCOPE_DENIED'::text,
             v_action.id, v_action.status;
      return;
    end if;

    if v_action.property_id is not null then
      if not exists (
        select 1
        from public.concierge_authorize_manager_member_action(
          p_actor_id,
          v_action.property_id,
          case when v_action.action_type = 'create_stay' then 'manage_stays'
               else 'view_property' end
        ) AS authz
        where authz.result = 'allow'
          and authz.account_id = v_action.account_id
          and authz.member_id = p_actor_id
      ) then
        return query
        select 'deny'::text, 'CONFIRMATION_MANAGER_SCOPE_DENIED'::text,
               v_action.id, v_action.status;
        return;
      end if;
    end if;
  end if;

  -- Gate 4: an actor who was valid at invitation time loses authority when
  -- their stay has ended, was cancelled, completed or revoked.
  -- A pre-arrival SCHEDULED guest remains eligible for non-secret confirmations.
  if p_actor_type = 'stay_member' then
    if not exists (
      select 1
      from public.concierge_stay_members sm
      join public.concierge_stays st on st.id=sm.stay_id
      where sm.id=p_actor_id
        and sm.account_id=v_action.account_id
        and st.account_id=v_action.account_id
        and st.status in ('scheduled','active')
        and st.check_out_at > now()
        and (v_action.stay_id is null or v_action.stay_id=st.id)
        and (v_action.property_id is null or v_action.property_id=st.property_id)
    ) then
      return query
      select 'deny'::text, 'CONFIRMATION_STAY_NOT_ACTIVE'::text,
             v_action.id, v_action.status;
      return;
    end if;
  end if;

  update public.concierge_pending_actions
    set
      status = 'confirmed',
      confirmed_at = now()
  where id = v_action.id
    and status = 'pending';

  return query
  select
    'allow'::text,
    null::text,
    v_action.id,
    'confirmed'::text;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_consume_manager_phone_enrollment(p_code_hash text, p_phone_hash text, p_at timestamp with time zone DEFAULT now())
 RETURNS TABLE(result text, reason_code text, account_id uuid, member_id uuid, member_role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_enrollment public.concierge_manager_phone_enrollments%rowtype;
  v_member public.concierge_account_members%rowtype;
begin
  if coalesce(p_code_hash,'') !~ '^[0-9a-f]{64}$'
     or coalesce(p_phone_hash,'') !~ '^[0-9a-f]{64}$' then
    return query
    select 'deny'::text, 'ENROLLMENT_INPUT_INVALID'::text,
           null::uuid, null::uuid, null::text;
    return;
  end if;

  update public.concierge_manager_phone_enrollments
     set status = 'expired'
   where status = 'pending'
     and expires_at <= p_at;

  select e.*
    into v_enrollment
  from public.concierge_manager_phone_enrollments e
  where e.code_hash = p_code_hash
    and e.status = 'pending'
    and e.expires_at > p_at
  for update;

  if not found then
    return query
    select 'deny'::text, 'ENROLLMENT_NOT_FOUND_OR_EXPIRED'::text,
           null::uuid, null::uuid, null::text;
    return;
  end if;

  select m.*
    into v_member
  from public.concierge_account_members m
  where m.id = v_enrollment.member_id
    and m.account_id = v_enrollment.account_id
  for update;

  if not found or v_member.status <> 'active'
     or v_member.role not in ('owner','manager','co_manager') then
    return query
    select 'deny'::text, 'MANAGER_MEMBER_NOT_ACTIVE'::text,
           null::uuid, null::uuid, null::text;
    return;
  end if;

  if exists (
    select 1
    from public.concierge_account_members m
    where m.phone_hash = p_phone_hash
      and m.status = 'active'
      and m.id <> v_member.id
  ) then
    return query
    select 'deny'::text, 'PHONE_ALREADY_MANAGER'::text,
           null::uuid, null::uuid, null::text;
    return;
  end if;

  if exists (
    select 1
    from public.concierge_guest_identities gi
    join public.concierge_stay_members sm
      on sm.guest_identity_id = gi.id
    join public.concierge_stays s
      on s.id = sm.stay_id
     and s.account_id = sm.account_id
    where gi.phone_hash = p_phone_hash
      and gi.status = 'active'
      and sm.status = 'active'
      and sm.whatsapp_enabled = true
      and s.status in ('scheduled','active')
      and p_at < greatest(s.check_out_at, coalesce(s.access_until, s.check_out_at))
  ) then
    return query
    select 'deny'::text, 'PHONE_HAS_ACTIVE_GUEST_CONTEXT'::text,
           null::uuid, null::uuid, null::text;
    return;
  end if;

  if exists (
    select 1
    from public.concierge_operational_people op
    join public.concierge_operational_tasks t
      on t.operational_person_id = op.id
     and t.account_id = op.account_id
    where op.phone_hash = p_phone_hash
      and op.status = 'active'
      and t.status in ('scheduled','active')
      and p_at >= t.access_from
      and p_at < t.access_until
  ) then
    return query
    select 'deny'::text, 'PHONE_HAS_ACTIVE_OPERATIONAL_CONTEXT'::text,
           null::uuid, null::uuid, null::text;
    return;
  end if;

  update public.concierge_sessions
     set status = 'closed',
         ended_at = p_at,
         last_activity_at = p_at
   where status = 'active'
     and (
       account_member_id = v_member.id
       or phone_hash = p_phone_hash
     );

  update public.concierge_account_members as target_member
     set phone_hash = p_phone_hash
   where target_member.id = v_member.id
     and target_member.account_id = v_member.account_id;

  update public.concierge_manager_phone_enrollments
     set status = 'used',
         used_at = p_at
   where id = v_enrollment.id
     and status = 'pending';

  return query
  select
    'allow'::text,
    null::text,
    v_member.account_id,
    v_member.id,
    v_member.role;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_create_operational_task(p_operational_person_id uuid, p_property_id uuid, p_task_type text, p_task_summary text, p_access_from timestamp with time zone, p_access_until timestamp with time zone, p_created_by_member_id uuid)
 RETURNS TABLE(operational_task_id uuid, resulting_status text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_account_id uuid;
  v_person_status text;

  v_property_status text;

  v_member_role text;
  v_member_status text;
  v_member_account_id uuid;
  v_can_manage_team boolean := false;

  v_task_id uuid;
begin
  if p_task_type not in (
    'cleaning',
    'maintenance',
    'repair',
    'inspection',
    'delivery',
    'building_support',
    'other'
  ) then
    raise exception using
      errcode='22023',
      message='INVALID_OPERATIONAL_TASK_TYPE';
  end if;

  if p_task_summary is null
     or length(trim(p_task_summary)) < 1
     or length(trim(p_task_summary)) > 2000 then
    raise exception using
      errcode='22023',
      message='INVALID_OPERATIONAL_TASK_SUMMARY';
  end if;

  if p_access_from is null
     or p_access_until is null
     or p_access_until <= p_access_from then
    raise exception using
      errcode='22023',
      message='INVALID_ACCESS_WINDOW';
  end if;

  select op.account_id, op.status
    into v_account_id, v_person_status
  from public.concierge_operational_people op
  where op.id=p_operational_person_id;

  if not found or v_person_status <> 'active' then
    raise exception using
      errcode='42501',
      message='OPERATIONAL_TASK_OUT_OF_SCOPE';
  end if;

  select p.status
    into v_property_status
  from public.concierge_properties p
  where p.id=p_property_id
    and p.account_id=v_account_id;

  if not found or v_property_status <> 'active' then
    raise exception using
      errcode='42501',
      message='RESOURCE_OUT_OF_SCOPE';
  end if;

  select m.account_id, m.role, m.status
    into v_member_account_id, v_member_role, v_member_status
  from public.concierge_account_members m
  where m.id=p_created_by_member_id;

  if not found
     or v_member_account_id <> v_account_id
     or v_member_status <> 'active' then
    raise exception using
      errcode='42501',
      message='MANAGER_PERMISSION_DENIED';
  end if;

  if v_member_role in ('owner','manager') then
    v_can_manage_team := true;
  elsif v_member_role='co_manager' then
    select coalesce(mp.can_manage_team,false)
      into v_can_manage_team
    from public.concierge_member_property_permissions mp
    where mp.account_id=v_account_id
      and mp.member_id=p_created_by_member_id
      and mp.property_id=p_property_id;
  end if;

  if not coalesce(v_can_manage_team,false) then
    raise exception using
      errcode='42501',
      message='MANAGER_PERMISSION_DENIED';
  end if;

  insert into public.concierge_operational_tasks (
    account_id,
    operational_person_id,
    property_id,
    task_type,
    task_summary,
    access_from,
    access_until,
    status,
    created_by_member_id
  )
  values (
    v_account_id,
    p_operational_person_id,
    p_property_id,
    p_task_type,
    trim(p_task_summary),
    p_access_from,
    p_access_until,
    'scheduled',
    p_created_by_member_id
  )
  returning id into v_task_id;

  insert into public.concierge_audit_events (
    account_id,
    actor_type,
    actor_ref,
    property_id,
    stay_id,
    action_type,
    entity_type,
    entity_id,
    result,
    reason_code
  )
  values (
    v_account_id,
    'account_member',
    p_created_by_member_id,
    p_property_id,
    null,
    'operational_task_created',
    'operational_task',
    v_task_id,
    'created',
    null
  );

  return query
  select v_task_id, 'scheduled'::text;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_grant_operational_access(p_operational_task_id uuid, p_access_point_id uuid, p_authorized_from timestamp with time zone, p_authorized_until timestamp with time zone, p_granted_by_member_id uuid, p_grant_reason text)
 RETURNS TABLE(access_authorization_id uuid, resulting_status text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_task public.concierge_operational_tasks%rowtype;

  v_member_role text;
  v_member_status text;
  v_can_manage_team boolean := false;
  v_can_manage_secrets boolean := false;

  v_auth_id uuid;
begin
  select t.*
    into v_task
  from public.concierge_operational_tasks t
  where t.id=p_operational_task_id
  for update;

  if not found
     or v_task.status not in ('scheduled','active') then
    raise exception using
      errcode='42501',
      message='OPERATIONAL_TASK_OUT_OF_SCOPE';
  end if;

  if p_authorized_from is null
     or p_authorized_until is null
     or p_authorized_until <= p_authorized_from
     or p_authorized_from < v_task.access_from
     or p_authorized_until > v_task.access_until then
    raise exception using
      errcode='23514',
      message='OPERATIONAL_TASK_OUT_OF_SCOPE';
  end if;

  if p_grant_reason is not null
     and (
       length(trim(p_grant_reason)) < 1
       or length(trim(p_grant_reason)) > 500
     ) then
    raise exception using
      errcode='22023',
      message='INVALID_GRANT_REASON';
  end if;

  select m.role, m.status
    into v_member_role, v_member_status
  from public.concierge_account_members m
  where m.id=p_granted_by_member_id
    and m.account_id=v_task.account_id;

  if not found or v_member_status <> 'active' then
    raise exception using
      errcode='42501',
      message='MANAGER_PERMISSION_DENIED';
  end if;

  if v_member_role in ('owner','manager') then
    v_can_manage_team := true;
    v_can_manage_secrets := true;
  elsif v_member_role='co_manager' then
    select
      coalesce(mp.can_manage_team,false),
      coalesce(mp.can_manage_secrets,false)
    into
      v_can_manage_team,
      v_can_manage_secrets
    from public.concierge_member_property_permissions mp
    where mp.account_id=v_task.account_id
      and mp.member_id=p_granted_by_member_id
      and mp.property_id=v_task.property_id;
  end if;

  if not coalesce(v_can_manage_team,false)
     or not coalesce(v_can_manage_secrets,false) then
    raise exception using
      errcode='42501',
      message='MANAGER_PERMISSION_DENIED';
  end if;

  insert into public.concierge_access_authorizations (
    account_id,
    stay_member_id,
    operational_person_id,
    operational_task_id,
    access_point_id,
    authorized_from,
    authorized_until,
    status,
    granted_by_account_member_id,
    grant_reason
  )
  values (
    v_task.account_id,
    null,
    v_task.operational_person_id,
    v_task.id,
    p_access_point_id,
    p_authorized_from,
    p_authorized_until,
    'active',
    p_granted_by_member_id,
    nullif(trim(p_grant_reason),'')
  )
  returning id into v_auth_id;

  insert into public.concierge_audit_events (
    account_id,
    actor_type,
    actor_ref,
    property_id,
    stay_id,
    action_type,
    entity_type,
    entity_id,
    result,
    reason_code
  )
  values (
    v_task.account_id,
    'account_member',
    p_granted_by_member_id,
    v_task.property_id,
    null,
    'operational_access_granted',
    'access_authorization',
    v_auth_id,
    'allowed',
    null
  );

  return query
  select v_auth_id, 'active'::text;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_guard_system_intervention_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op='DELETE' then
    raise exception using
      errcode='55000',
      message='SYSTEM_INTERVENTION_DELETE_DENIED';
  end if;

  if old.resolved_at is not null then
    raise exception using
      errcode='55000',
      message='SYSTEM_INTERVENTION_ALREADY_RESOLVED';
  end if;

  if new.id is distinct from old.id
     or new.account_id is distinct from old.account_id
     or new.property_id is distinct from old.property_id
     or new.reason_type is distinct from old.reason_type
     or new.minutes_estimated is distinct from old.minutes_estimated
     or new.occurred_at is distinct from old.occurred_at then
    raise exception using
      errcode='55000',
      message='SYSTEM_INTERVENTION_IMMUTABLE_FIELDS';
  end if;

  if new.resolved_at is null
     or new.resolved_at < old.occurred_at then
    raise exception using
      errcode='23514',
      message='SYSTEM_INTERVENTION_INVALID_RESOLUTION';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_guest_apply_incident_protocol(p_guest_identity_id uuid, p_stay_member_id uuid, p_incident_id uuid, p_knowledge_item_id uuid, p_knowledge_version_id uuid)
 RETURNS TABLE(result text, reason_code text, incident_id uuid, resulting_status text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_identity_status text;

  v_account_id uuid;
  v_stay_id uuid;
  v_property_id uuid;
  v_building_id uuid;
  v_member_identity_id uuid;
  v_member_status text;
  v_whatsapp_enabled boolean;
  v_stay_status text;
  v_property_status text;

  v_incident_status text;
  v_incident_severity text;
begin
  select gi.status
    into v_identity_status
  from public.concierge_guest_identities gi
  where gi.id = p_guest_identity_id;

  if not found or v_identity_status <> 'active' then
    return query
    select 'deny'::text, 'IDENTITY_UNKNOWN'::text, null::uuid, null::text;
    return;
  end if;

  select
    sm.account_id,
    sm.stay_id,
    s.property_id,
    p.building_id,
    sm.guest_identity_id,
    sm.status,
    sm.whatsapp_enabled,
    s.status,
    p.status
  into
    v_account_id,
    v_stay_id,
    v_property_id,
    v_building_id,
    v_member_identity_id,
    v_member_status,
    v_whatsapp_enabled,
    v_stay_status,
    v_property_status
  from public.concierge_stay_members sm
  join public.concierge_stays s
    on s.id = sm.stay_id
   and s.account_id = sm.account_id
  join public.concierge_properties p
    on p.id = s.property_id
   and p.account_id = s.account_id
  where sm.id = p_stay_member_id;

  if not found
     or v_member_status <> 'active'
     or v_stay_status not in ('scheduled', 'active')
     or v_property_status <> 'active' then
    return query
    select 'deny'::text, 'RESOURCE_OUT_OF_SCOPE'::text, null::uuid, null::text;
    return;
  end if;

  if v_member_identity_id is null
     or v_member_identity_id <> p_guest_identity_id then
    return query
    select 'deny'::text, 'IDENTITY_UNKNOWN'::text, null::uuid, null::text;
    return;
  end if;

  if not v_whatsapp_enabled then
    return query
    select 'deny'::text, 'WHATSAPP_NOT_ENABLED'::text, null::uuid, null::text;
    return;
  end if;

  select
    i.status,
    i.severity
  into
    v_incident_status,
    v_incident_severity
  from public.concierge_incidents i
  where i.id = p_incident_id
    and i.account_id = v_account_id
    and i.property_id = v_property_id
    and i.stay_id = v_stay_id
    and i.reported_by_stay_member_id = p_stay_member_id
  for update;

  if not found then
    return query
    select 'deny'::text, 'RESOURCE_OUT_OF_SCOPE'::text, null::uuid, null::text;
    return;
  end if;

  /*
    Solo incidentes nuevos, bajos/medios.
    High/critical nunca pasan por protocolo automático.
  */
  if v_incident_status <> 'new'
     or v_incident_severity not in ('low', 'medium') then
    return query
    select
      'deny'::text,
      'INCIDENT_PROTOCOL_NOT_APPLICABLE'::text,
      p_incident_id,
      v_incident_status;
    return;
  end if;

  /*
    El protocolo tiene que ser:
    - vigente;
    - aprobado;
    - de incidentes;
    - riesgo normal;
    - aplicable al scope real de la propiedad.
  */
  perform 1
  from public.concierge_knowledge_items ki
  join public.concierge_knowledge_versions kv
    on kv.id = p_knowledge_version_id
   and kv.knowledge_item_id = ki.id
   and kv.account_id = ki.account_id
  where ki.id = p_knowledge_item_id
    and ki.account_id = v_account_id
    and ki.category = 'incident_protocol'
    and ki.risk_level = 'normal'
    and ki.status = 'active'
    and ki.current_version_id = p_knowledge_version_id
    and kv.status = 'approved'
    and (
      (
        ki.scope_type = 'property'
        and ki.property_id = v_property_id
      )
      or
      (
        ki.scope_type = 'building'
        and v_building_id is not null
        and ki.building_id = v_building_id
      )
      or
      ki.scope_type = 'account'
    );

  if not found then
    return query
    select
      'deny'::text,
      'KNOWLEDGE_NOT_ACTIVE'::text,
      p_incident_id,
      v_incident_status;
    return;
  end if;

  update public.concierge_incidents
     set
       used_knowledge_item_id = p_knowledge_item_id,
       status = 'waiting_guest',
       manager_intervention_required = false,
       updated_at = now()
   where id = p_incident_id;

  insert into public.concierge_incident_events (
    account_id,
    incident_id,
    actor_type,
    actor_ref,
    event_type,
    event_summary
  )
  values (
    v_account_id,
    p_incident_id,
    'system',
    null,
    'note',
    'Approved incident protocol selected before manager intervention.'
  );

  insert into public.concierge_audit_events (
    account_id,
    actor_type,
    actor_ref,
    property_id,
    stay_id,
    action_type,
    entity_type,
    entity_id,
    result,
    reason_code
  )
  values (
    v_account_id,
    'system',
    null,
    v_property_id,
    v_stay_id,
    'incident_protocol_applied',
    'incident',
    p_incident_id,
    'changed',
    null
  );

  return query
  select
    'allow'::text,
    null::text,
    p_incident_id,
    'waiting_guest'::text;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_guest_confirm_incident_resolved(p_guest_identity_id uuid, p_stay_member_id uuid, p_incident_id uuid, p_resolution_summary text DEFAULT NULL::text)
 RETURNS TABLE(result text, reason_code text, incident_id uuid, resulting_status text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_incident public.concierge_incidents%rowtype;
  v_member_identity_id uuid;
  v_member_status text;
  v_whatsapp_enabled boolean;
  v_member_stay_id uuid;
begin
  select i.*
    into v_incident
  from public.concierge_incidents i
  where i.id=p_incident_id
  for update;

  if not found then
    return query
    select 'deny'::text, 'RESOURCE_OUT_OF_SCOPE'::text, null::uuid, null::text;
    return;
  end if;

  select
    sm.guest_identity_id,
    sm.status,
    sm.whatsapp_enabled,
    sm.stay_id
  into
    v_member_identity_id,
    v_member_status,
    v_whatsapp_enabled,
    v_member_stay_id
  from public.concierge_stay_members sm
  where sm.id=p_stay_member_id
    and sm.account_id=v_incident.account_id;

  if not found or v_member_status <> 'active' then
    return query
    select 'deny'::text, 'MEMBER_NOT_ACTIVE'::text, null::uuid, null::text;
    return;
  end if;

  if v_member_identity_id is null
     or v_member_identity_id <> p_guest_identity_id then
    return query
    select 'deny'::text, 'IDENTITY_UNKNOWN'::text, null::uuid, null::text;
    return;
  end if;

  if not v_whatsapp_enabled then
    return query
    select 'deny'::text, 'WHATSAPP_NOT_ENABLED'::text, null::uuid, null::text;
    return;
  end if;

  if v_member_stay_id <> v_incident.stay_id then
    return query
    select 'deny'::text, 'RESOURCE_OUT_OF_SCOPE'::text, null::uuid, null::text;
    return;
  end if;

  if v_incident.status='closed' then
    return query
    select 'deny'::text, 'RESOURCE_OUT_OF_SCOPE'::text, null::uuid, null::text;
    return;
  end if;

  if p_resolution_summary is not null
     and (
       length(trim(p_resolution_summary)) < 1
       or length(trim(p_resolution_summary)) > 4000
     ) then
    raise exception using
      errcode='22023',
      message='INVALID_RESOLUTION_SUMMARY';
  end if;

  -- IDEMPOTENT_RESOLUTION: Meta may replay a confirmed WhatsApp message.
  -- Authentication checks above still apply. A repeated confirmation must
  -- never create a second event or change previously saved resolution data.
  if v_incident.status='resolved' and v_incident.guest_confirmed_resolved is true then
    return query
    select 'allow'::text, null::text, v_incident.id, 'resolved'::text;
    return;
  end if;

  update public.concierge_incidents i
     set
       status='resolved',
       guest_confirmed_resolved=true,
       manager_intervention_required=false,
       resolution_summary=coalesce(nullif(trim(p_resolution_summary),''), i.resolution_summary),
       resolved_at=coalesce(i.resolved_at, now()),
       updated_at=now()
   where i.id=v_incident.id;

  insert into public.concierge_incident_events (
    account_id,
    incident_id,
    actor_type,
    actor_ref,
    event_type,
    event_summary
  )
  values (
    v_incident.account_id,
    v_incident.id,
    'stay_member',
    p_stay_member_id,
    'guest_confirmed_resolved',
    'Guest confirmed incident resolved'
  );

  insert into public.concierge_audit_events (
    account_id,
    actor_type,
    actor_ref,
    property_id,
    stay_id,
    action_type,
    entity_type,
    entity_id,
    result,
    reason_code
  )
  values (
    v_incident.account_id,
    'guest',
    p_guest_identity_id,
    v_incident.property_id,
    v_incident.stay_id,
    'incident_guest_confirmed_resolved',
    'incident',
    v_incident.id,
    'changed',
    null
  );

  return query
  select
    'allow'::text,
    null::text,
    v_incident.id,
    'resolved'::text;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_guest_report_incident_unresolved(p_guest_identity_id uuid, p_stay_member_id uuid, p_incident_id uuid, p_guest_response text)
 RETURNS TABLE(result text, reason_code text, incident_id uuid, resulting_status text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_incident public.concierge_incidents%rowtype;
  v_member_identity_id uuid;
  v_member_status text;
  v_whatsapp_enabled boolean;
  v_member_stay_id uuid;
begin
  select i.*
    into v_incident
  from public.concierge_incidents i
  where i.id = p_incident_id
  for update;

  if not found then
    return query
    select
      'deny'::text,
      'RESOURCE_OUT_OF_SCOPE'::text,
      null::uuid,
      null::text;
    return;
  end if;

  select
    sm.guest_identity_id,
    sm.status,
    sm.whatsapp_enabled,
    sm.stay_id
  into
    v_member_identity_id,
    v_member_status,
    v_whatsapp_enabled,
    v_member_stay_id
  from public.concierge_stay_members sm
  where sm.id = p_stay_member_id
    and sm.account_id = v_incident.account_id;

  if not found or v_member_status <> 'active' then
    return query
    select
      'deny'::text,
      'MEMBER_NOT_ACTIVE'::text,
      null::uuid,
      null::text;
    return;
  end if;

  if v_member_identity_id is null
     or v_member_identity_id <> p_guest_identity_id then
    return query
    select
      'deny'::text,
      'IDENTITY_UNKNOWN'::text,
      null::uuid,
      null::text;
    return;
  end if;

  if not v_whatsapp_enabled then
    return query
    select
      'deny'::text,
      'WHATSAPP_NOT_ENABLED'::text,
      null::uuid,
      null::text;
    return;
  end if;

  if v_member_stay_id <> v_incident.stay_id then
    return query
    select
      'deny'::text,
      'RESOURCE_OUT_OF_SCOPE'::text,
      null::uuid,
      null::text;
    return;
  end if;

  if v_incident.status <> 'waiting_guest' then
    return query
    select
      'deny'::text,
      'INCIDENT_NOT_WAITING_GUEST'::text,
      v_incident.id,
      v_incident.status;
    return;
  end if;

  if p_guest_response is null
     or length(trim(p_guest_response)) < 1
     or length(trim(p_guest_response)) > 4000 then
    raise exception using
      errcode = '22023',
      message = 'INVALID_GUEST_RESPONSE';
  end if;

  update public.concierge_incidents i
     set
       status = 'waiting_manager',
       guest_confirmed_resolved = false,
       manager_intervention_required = true,
       updated_at = now()
   where i.id = v_incident.id;

  insert into public.concierge_incident_events (
    account_id,
    incident_id,
    actor_type,
    actor_ref,
    event_type,
    event_summary
  )
  values (
    v_incident.account_id,
    v_incident.id,
    'stay_member',
    p_stay_member_id,
    'guest_response',
    trim(p_guest_response)
  );

  insert into public.concierge_audit_events (
    account_id,
    actor_type,
    actor_ref,
    property_id,
    stay_id,
    action_type,
    entity_type,
    entity_id,
    result,
    reason_code
  )
  values (
    v_incident.account_id,
    'guest',
    p_guest_identity_id,
    v_incident.property_id,
    v_incident.stay_id,
    'incident_guest_reported_unresolved',
    'incident',
    v_incident.id,
    'changed',
    null
  );

  return query
  select
    'allow'::text,
    null::text,
    v_incident.id,
    'waiting_manager'::text;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_list_manager_web_properties(p_auth_user_id uuid)
 RETURNS TABLE(property_id uuid, internal_name text, property_status text, member_role text, can_manage_stays boolean, can_manage_incidents boolean, can_approve_requests boolean, can_manage_knowledge boolean, can_manage_secrets boolean, can_manage_team boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_ctx record;
begin
  select *
    into v_ctx
  from public.concierge_resolve_manager_web_context(p_auth_user_id);

  if v_ctx.result <> 'allow' then
    return;
  end if;

  if v_ctx.member_role in ('owner','manager') then
    return query
    select
      p.id,
      p.internal_name,
      p.status,
      v_ctx.member_role,
      true,true,true,true,true,true
    from public.concierge_properties p
    where p.account_id=v_ctx.account_id
    order by p.internal_name;
    return;
  end if;

  if v_ctx.member_role='co_manager' then
    return query
    select
      p.id,
      p.internal_name,
      p.status,
      v_ctx.member_role,
      pp.can_manage_stays,
      pp.can_manage_incidents,
      pp.can_approve_requests,
      pp.can_manage_knowledge,
      pp.can_manage_secrets,
      pp.can_manage_team
    from public.concierge_member_property_permissions pp
    join public.concierge_properties p
      on p.id=pp.property_id
     and p.account_id=pp.account_id
    where pp.account_id=v_ctx.account_id
      and pp.member_id=v_ctx.member_id
    order by p.internal_name;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_manager_create_stay(p_member_id uuid, p_property_id uuid, p_guest_phone_hash text, p_guest_display_name text, p_check_in_at timestamp with time zone, p_check_out_at timestamp with time zone, p_access_from timestamp with time zone, p_access_until timestamp with time zone, p_language text DEFAULT 'es'::text)
 RETURNS TABLE(result text, reason_code text, stay_id uuid, stay_member_id uuid, guest_identity_id uuid, invite_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_auth record;
  v_property public.concierge_properties%rowtype;
  v_identity public.concierge_guest_identities%rowtype;
  v_stay_id uuid;
  v_stay_member_id uuid;
  v_invite_id uuid;
  v_name text := trim(coalesce(p_guest_display_name, ''));
  v_language text := lower(trim(coalesce(p_language, 'es')));
begin
  if p_member_id is null or p_property_id is null then
    return query select 'deny'::text, 'MANAGER_OR_PROPERTY_REQUIRED'::text, null::uuid, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  if coalesce(p_guest_phone_hash, '') !~ '^[0-9a-f]{64}$' then
    return query select 'deny'::text, 'GUEST_PHONE_HASH_INVALID'::text, null::uuid, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  if length(v_name) < 1 or length(v_name) > 160 then
    return query select 'deny'::text, 'GUEST_DISPLAY_NAME_INVALID'::text, null::uuid, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  if v_language not in ('es','en','it','pt') then
    return query select 'deny'::text, 'LANGUAGE_INVALID'::text, null::uuid, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  if p_check_in_at is null
     or p_check_out_at is null
     or p_access_from is null
     or p_access_until is null
     or p_check_out_at <= p_check_in_at
     or p_access_until <= p_access_from
     or p_access_from >= p_check_out_at
     or p_access_until <= p_check_in_at then
    return query select 'deny'::text, 'STAY_WINDOW_INVALID'::text, null::uuid, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select *
    into v_auth
  from public.concierge_authorize_manager_member_action(
    p_member_id,
    p_property_id,
    'manage_stays'
  );

  if not found or v_auth.result <> 'allow' then
    return query
    select
      'deny'::text,
      coalesce(v_auth.reason_code, 'MANAGER_PERMISSION_DENIED')::text,
      null::uuid, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select p.*
    into v_property
  from public.concierge_properties p
  where p.id = p_property_id
    and p.account_id = v_auth.account_id
  limit 1;

  if not found or v_property.status <> 'active' then
    return query select 'deny'::text, 'PROPERTY_NOT_ACTIVE'::text, null::uuid, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select gi.*
    into v_identity
  from public.concierge_guest_identities gi
  where gi.phone_hash = p_guest_phone_hash
  limit 1;

  if found and v_identity.status <> 'active' then
    return query select 'deny'::text, 'GUEST_IDENTITY_BLOCKED'::text, null::uuid, null::uuid, v_identity.id, null::uuid;
    return;
  end if;

  if not found then
    insert into public.concierge_guest_identities(
      phone_hash,
      preferred_language,
      status,
      created_at,
      updated_at
    )
    values(
      p_guest_phone_hash,
      v_language,
      'active',
      now(),
      now()
    )
    returning * into v_identity;
  elsif v_identity.preferred_language is null then
    update public.concierge_guest_identities
       set preferred_language = v_language,
           updated_at = now()
     where id = v_identity.id
    returning * into v_identity;
  end if;

  if exists (
    select 1
    from public.concierge_stay_members sm
    join public.concierge_stays s
      on s.id = sm.stay_id
     and s.account_id = sm.account_id
    where sm.guest_identity_id = v_identity.id
      and sm.whatsapp_enabled = true
      and sm.status in ('registered','invited','active')
      and s.status in ('scheduled','active')
      and tstzrange(s.access_from, s.access_until, '[)') &&
          tstzrange(p_access_from, p_access_until, '[)')
  ) then
    return query select 'deny'::text, 'GUEST_STAY_OVERLAP'::text, null::uuid, null::uuid, v_identity.id, null::uuid;
    return;
  end if;

  if exists (
    select 1
    from public.concierge_stays s
    where s.property_id = p_property_id
      and s.status in ('scheduled','active')
      and tstzrange(s.access_from, s.access_until, '[)') &&
          tstzrange(p_access_from, p_access_until, '[)')
  ) then
    return query select 'deny'::text, 'PROPERTY_STAY_OVERLAP'::text, null::uuid, null::uuid, v_identity.id, null::uuid;
    return;
  end if;

  insert into public.concierge_stays(
    account_id,
    property_id,
    check_in_at,
    check_out_at,
    access_from,
    access_until,
    status,
    created_by_member_id,
    created_at,
    updated_at
  )
  values(
    v_auth.account_id,
    p_property_id,
    p_check_in_at,
    p_check_out_at,
    p_access_from,
    p_access_until,
    'scheduled',
    p_member_id,
    now(),
    now()
  )
  returning id into v_stay_id;

  insert into public.concierge_stay_members(
    account_id,
    stay_id,
    guest_identity_id,
    display_name,
    member_role,
    whatsapp_enabled,
    property_access,
    stay_manage,
    status,
    created_at,
    updated_at
  )
  values(
    v_auth.account_id,
    v_stay_id,
    v_identity.id,
    v_name,
    'primary_guest',
    true,
    true,
    true,
    'invited',
    now(),
    now()
  )
  returning id into v_stay_member_id;

  insert into public.concierge_guest_invites(
    account_id,
    stay_member_id,
    invite_token_hash,
    status,
    expires_at,
    created_at
  )
  values(
    v_auth.account_id,
    v_stay_member_id,
    null,
    'created',
    p_access_until,
    now()
  )
  returning id into v_invite_id;

  return query
  select
    'created'::text,
    null::text,
    v_stay_id,
    v_stay_member_id,
    v_identity.id,
    v_invite_id;

exception
  when exclusion_violation then
    return query select 'deny'::text, 'PROPERTY_STAY_OVERLAP'::text, null::uuid, null::uuid, null::uuid, null::uuid;
  when unique_violation then
    return query select 'deny'::text, 'STAY_CREATE_CONFLICT'::text, null::uuid, null::uuid, null::uuid, null::uuid;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_manager_decide_request(p_request_id uuid, p_account_member_id uuid, p_decision text, p_approved_value text DEFAULT NULL::text, p_approved_at_time timestamp with time zone DEFAULT NULL::timestamp with time zone, p_approved_until timestamp with time zone DEFAULT NULL::timestamp with time zone, p_decision_summary text DEFAULT NULL::text)
 RETURNS TABLE(request_id uuid, resulting_status text, stay_updated boolean, effective_time timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_request public.concierge_requests%rowtype;
  v_member_role text;
  v_member_status text;
  v_can_approve boolean := false;

  v_stay public.concierge_stays%rowtype;
  v_effective_time timestamptz;
  v_stay_updated boolean := false;
  v_result_status text;
begin
  if p_decision not in ('approved','rejected') then
    raise exception using
      errcode='22023',
      message='INVALID_REQUEST_DECISION';
  end if;

  if p_approved_value is not null
     and (
       length(trim(p_approved_value)) < 1
       or length(trim(p_approved_value)) > 2000
     ) then
    raise exception using
      errcode='22023',
      message='INVALID_APPROVED_VALUE';
  end if;

  if p_decision_summary is not null
     and (
       length(trim(p_decision_summary)) < 1
       or length(trim(p_decision_summary)) > 4000
     ) then
    raise exception using
      errcode='22023',
      message='INVALID_REQUEST_DECISION_SUMMARY';
  end if;

  select r.*
    into v_request
  from public.concierge_requests r
  where r.id=p_request_id
  for update;

  if not found then
    raise exception using
      errcode='42501',
      message='RESOURCE_OUT_OF_SCOPE';
  end if;

  if v_request.status not in ('new','waiting_manager') then
    raise exception using
      errcode='23514',
      message='REQUEST_NOT_PENDING';
  end if;

  select m.role, m.status
    into v_member_role, v_member_status
  from public.concierge_account_members m
  where m.id=p_account_member_id
    and m.account_id=v_request.account_id;

  if not found or v_member_status <> 'active' then
    raise exception using
      errcode='42501',
      message='MANAGER_PERMISSION_DENIED';
  end if;

  if v_member_role in ('owner','manager') then
    v_can_approve := true;
  elsif v_member_role='co_manager' then
    select coalesce(mp.can_approve_requests,false)
      into v_can_approve
    from public.concierge_member_property_permissions mp
    where mp.account_id=v_request.account_id
      and mp.member_id=p_account_member_id
      and mp.property_id=v_request.property_id;
  end if;

  if not coalesce(v_can_approve,false) then
    raise exception using
      errcode='42501',
      message='MANAGER_PERMISSION_DENIED';
  end if;

  if p_decision='approved'
     and v_request.request_type in ('early_checkin','late_checkout') then

    select s.*
      into v_stay
    from public.concierge_stays s
    where s.id=v_request.stay_id
      and s.account_id=v_request.account_id
    for update;

    if not found then
      raise exception using
        errcode='42501',
        message='RESOURCE_OUT_OF_SCOPE';
    end if;

    v_effective_time := coalesce(
      p_approved_at_time,
      p_approved_until,
      v_request.requested_at_time
    );

    if v_effective_time is null then
      raise exception using
        errcode='22023',
        message='REQUEST_TIME_REQUIRED';
    end if;

    if v_request.request_type='early_checkin' then
      if v_effective_time >= v_stay.check_in_at then
        raise exception using
          errcode='23514',
          message='INVALID_EARLY_CHECKIN_TIME';
      end if;

      if v_effective_time >= v_stay.check_out_at then
        raise exception using
          errcode='23514',
          message='INVALID_EARLY_CHECKIN_TIME';
      end if;

      begin
        update public.concierge_stays s
           set
             check_in_at=v_effective_time,
             access_from=least(s.access_from, v_effective_time),
             updated_at=now()
         where s.id=v_stay.id;
      exception
        when exclusion_violation then
          raise exception using
            errcode='23514',
            message='STAY_ACCESS_OVERLAP';
      end;

    else
      if v_effective_time <= v_stay.check_out_at then
        raise exception using
          errcode='23514',
          message='INVALID_LATE_CHECKOUT_TIME';
      end if;

      begin
        update public.concierge_stays s
           set
             check_out_at=v_effective_time,
             access_until=greatest(s.access_until, v_effective_time),
             updated_at=now()
         where s.id=v_stay.id;
      exception
        when exclusion_violation then
          raise exception using
            errcode='23514',
            message='STAY_ACCESS_OVERLAP';
      end;
    end if;

    v_stay_updated := true;
  end if;

  v_result_status := p_decision;

  update public.concierge_requests r
     set
       status=v_result_status,
       approved_value=
         case
           when p_decision='approved' then nullif(trim(p_approved_value),'')
           else null
         end,
       approved_at_time=
         case
           when p_decision='approved' then coalesce(v_effective_time, p_approved_at_time)
           else null
         end,
       approved_until=
         case
           when p_decision='approved' then p_approved_until
           else null
         end,
       decision_source='manager',
       decided_by_member_id=p_account_member_id,
       decision_at=now(),
       updated_at=now()
   where r.id=v_request.id;

  insert into public.concierge_request_events (
    account_id,
    request_id,
    actor_type,
    actor_ref,
    event_type,
    event_summary
  )
  values (
    v_request.account_id,
    v_request.id,
    'account_member',
    p_account_member_id,
    'manager_decision',
    coalesce(
      nullif(trim(p_decision_summary),''),
      'Manager decision: ' || p_decision
    )
  );

  if v_stay_updated then
    insert into public.concierge_request_events (
      account_id,
      request_id,
      actor_type,
      actor_ref,
      event_type,
      event_summary
    )
    values (
      v_request.account_id,
      v_request.id,
      'system',
      null,
      'stay_updated',
      'Approved structural request updated stay access window'
    );
  end if;

  insert into public.concierge_audit_events (
    account_id,
    actor_type,
    actor_ref,
    property_id,
    stay_id,
    action_type,
    entity_type,
    entity_id,
    result,
    reason_code
  )
  values (
    v_request.account_id,
    'account_member',
    p_account_member_id,
    v_request.property_id,
    v_request.stay_id,
    'request_decided',
    'request',
    v_request.id,
    'changed',
    null
  );

  return query
  select
    v_request.id,
    v_result_status,
    v_stay_updated,
    v_effective_time;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_manager_learning_message(p_manager_id uuid, p_action_id uuid, p_message text)
 RETURNS TABLE(handled boolean, reply_text text, stage text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 v_action public.concierge_pending_actions%rowtype;
 v_incident public.concierge_incidents%rowtype;
 v_authorized record;
 v_step text;
 v_input text:=trim(coalesce(p_message,''));
 v_normal text:=lower(trim(coalesce(p_message,'')));
 v_content text;
 v_key text;
 v_item uuid;v_version uuid;
 v_proposed record;v_activated record;v_rejected record;
BEGIN
 SELECT a.* INTO v_action FROM public.concierge_pending_actions a
 WHERE a.id=p_action_id AND a.actor_account_member_id=p_manager_id
 AND a.actor_type='account_member' AND a.action_type='learn_incident' AND a.status='pending'
 FOR UPDATE;
 IF NOT FOUND THEN
   RETURN QUERY SELECT false,NULL::text,NULL::text; RETURN;
 END IF;
 v_step:=coalesce(v_action.payload_jsonb->>'stage','');
 IF now()>=v_action.expires_at THEN
  UPDATE public.concierge_pending_actions SET status='expired' WHERE id=v_action.id;
  RETURN QUERY SELECT true,'La confirmación de aprendizaje venció. No publiqué nada.'::text,'expired'::text; RETURN;
 END IF;
 SELECT i.* INTO v_incident FROM public.concierge_incidents i
 WHERE i.id=v_action.target_entity_id AND i.account_id=v_action.account_id
 AND i.property_id=v_action.property_id AND i.stay_id=v_action.stay_id
 AND i.guest_confirmed_resolved=true AND i.status IN ('resolved','learning_pending')
 AND ((i.category='climate' AND i.summary ~* '(no enfr[ií]a|no tira fr[ií]o|sin aire fr[ií]o|does not cool|not cooling)')
     OR (i.category='wifi' AND i.summary ~* '(sin internet|sin conexi[oó]n|no tengo internet|no hay wifi|no anda el wifi|no funciona el wifi|wifi no (anda|funciona|conecta)|wifi not working|no internet|no connection|wifi non funziona|wifi n[aã]o funciona)'))
 AND i.severity IN('low','medium');
 IF NOT FOUND THEN
   RETURN QUERY SELECT true,'La incidencia ya no es apta para aprender. No cambié el conocimiento.'::text,'blocked'::text; RETURN;
 END IF;
 SELECT * INTO v_authorized FROM public.concierge_authorize_manager_member_action(
   p_manager_id,v_action.property_id,'manage_knowledge');
 IF v_authorized.result IS DISTINCT FROM 'allow' OR
    v_authorized.account_id IS DISTINCT FROM v_action.account_id THEN
   RETURN QUERY SELECT true,'Ya no tenés permiso para aprobar aprendizaje en esa propiedad. No publiqué nada.'::text,'blocked'::text; RETURN;
 END IF;
 IF NOT EXISTS(
   SELECT 1 FROM public.concierge_authorize_manager_member_action(
     p_manager_id,v_action.property_id,'manage_incidents') ag
   WHERE ag.result='allow' AND ag.account_id=v_action.account_id
 ) THEN
   RETURN QUERY SELECT true,
     'No tenés ambos permisos necesarios (incidencias y conocimiento) para continuar. No publiqué nada.'::text,
     'blocked'::text; RETURN;
 END IF;
 IF v_normal IN('no','cancelar','descartar') THEN
   IF v_step='publish' AND v_action.payload_jsonb ? 'version_id' THEN
     SELECT * INTO v_rejected FROM public.concierge_reject_knowledge_version(
       (v_action.payload_jsonb->>'item_id')::uuid,
       (v_action.payload_jsonb->>'version_id')::uuid,p_manager_id);
   END IF;
   -- A resolved incident must not remain indefinitely "learning_pending"
   -- when the manager explicitly discards its learning draft.
   IF v_incident.status='learning_pending' THEN
     PERFORM 1 FROM public.concierge_manager_set_incident_state(
       v_incident.id,p_manager_id,'closed',
       'Incidencia resuelta: aprendizaje descartado por el manager');
   END IF;
   UPDATE public.concierge_pending_actions SET status='rejected',rejected_at=now()
    WHERE id=v_action.id;
   RETURN QUERY SELECT true,'Entendido. No guardaré esta solución para otros huéspedes.'::text,'rejected'::text; RETURN;
 END IF;
 IF v_step='offer' THEN
   IF v_normal IN('si','sí') THEN
      UPDATE public.concierge_pending_actions
       SET payload_jsonb=jsonb_set(payload_jsonb,'{stage}','"content"')
       WHERE id=v_action.id;
      RETURN QUERY SELECT true,
       'Dale. Contame en una frase qué solución funcionó y puede repetirse. No incluyas nombres, teléfonos, contraseñas, códigos, Wi-Fi privado ni enlaces.'::text,
       'content'::text; RETURN;
   END IF;
   RETURN QUERY SELECT true,'Respondé *SÍ* para proponer una solución o *NO* para omitirla.'::text,'offer'::text; RETURN;
 END IF;
 IF v_step='content' THEN
   IF NOT public.concierge_manager_learning_text_allowed(v_input) THEN
      RETURN QUERY SELECT true,
       'Esa explicación es demasiado corta, extensa o podría incluir información privada. Escribí solo pasos generales (20 a 450 caracteres), sin claves ni datos personales.'::text,
       'content'::text; RETURN;
   END IF;
   UPDATE public.concierge_pending_actions SET
    payload_jsonb=jsonb_set(
      jsonb_set(payload_jsonb,'{stage}','"review"'),
      '{content}',to_jsonb(v_input))
   WHERE id=v_action.id;
   RETURN QUERY SELECT true,
    ('Esto quedaría como solución de *esa propiedad*:'||E'\n\n'||v_input||
      E'\n\n¿Está bien? Respondé *CONFIRMAR* para crear un borrador, *CORREGIR* para cambiarlo o *CANCELAR*.')::text,
    'review'::text; RETURN;
 END IF;
 IF v_step='review' THEN
   IF v_normal='corregir' THEN
    UPDATE public.concierge_pending_actions SET payload_jsonb=(payload_jsonb-'content')||
       '{"stage":"content"}'::jsonb WHERE id=v_action.id;
    RETURN QUERY SELECT true,'Escribí la versión corregida, sin información privada.'::text,'content'::text; RETURN;
   END IF;
   IF v_normal<>'confirmar' THEN
    RETURN QUERY SELECT true,'Respondé *CONFIRMAR*, *CORREGIR* o *CANCELAR*. Todavía no se publicó nada.'::text,'review'::text; RETURN;
   END IF;
   v_content:=v_action.payload_jsonb->>'content';
   IF NOT public.concierge_manager_learning_text_allowed(v_content) THEN
    RETURN QUERY SELECT true,'No encontré un texto válido para guardar. Respondé *CORREGIR*.'::text,'review'::text; RETURN;
   END IF;
   v_key:=CASE
     WHEN v_incident.category='climate' AND
       v_incident.summary ~* '(no enfr[ií]a|no tira fr[ií]o|sin aire fr[ií]o|does not cool|not cooling)'
       THEN 'incident.climatizacion.ac_no_enfria'
     WHEN v_incident.category='wifi' AND
       v_incident.summary ~* '(sin internet|sin conexi[oó]n|no tengo internet|no hay wifi|no anda el wifi|no funciona el wifi|wifi no (anda|funciona|conecta)|wifi not working|no internet|no connection|wifi non funziona|wifi n[aã]o funciona)'
       THEN 'incident.wifi.sin_conexion'
     ELSE NULL END;
   IF v_key IS NULL THEN
     RETURN QUERY SELECT true,
       'Todavía no puedo convertir esta incidencia en una instrucción automática segura. No creé ni publiqué conocimiento.'::text,
       'blocked'::text; RETURN;
   END IF;
   IF v_incident.status='resolved' THEN
     PERFORM 1 FROM public.concierge_manager_set_incident_state(
       v_incident.id,p_manager_id,'learning_pending','Manager confirmó la creación de un borrador de aprendizaje por WhatsApp');
   END IF;
   -- A rejected first draft archives its item. Preserve the knowledge item's
   -- identity and version history only when the manager explicitly corrected
   -- that very incident. Do this INSIDE the confirming transaction, so a later
   -- CANCEL does not resurrect empty review items.
   IF v_action.payload_jsonb ? 'revision_item_id' THEN
     v_item:=(v_action.payload_jsonb->>'revision_item_id')::uuid;
     PERFORM 1 FROM public.concierge_knowledge_items ki
       WHERE ki.id=v_item
         AND ki.account_id=v_action.account_id
         AND ki.property_id=v_action.property_id
         AND ki.scope_type='property'
         AND ki.category='incident_protocol'
         AND ki.knowledge_key=v_key
         AND ki.risk_level='normal'
         AND ki.status IN ('active','review','archived')
       FOR UPDATE;
     IF NOT FOUND THEN
       RAISE EXCEPTION 'LEARNING_REVISION_ITEM_OUT_OF_SCOPE';
     END IF;
     UPDATE public.concierge_knowledge_items ki
        SET status='review',updated_at=now()
      WHERE ki.id=v_item AND ki.status='archived'
        AND ki.current_version_id IS NULL
        AND EXISTS(
          SELECT 1 FROM public.concierge_knowledge_versions kv
           WHERE kv.knowledge_item_id=ki.id AND kv.status='rejected'
             AND kv.change_summary LIKE ('incident:'||v_incident.id::text||' |%')
        );
   END IF;
   SELECT * INTO v_proposed FROM public.concierge_propose_incident_learning(
      v_incident.id,p_manager_id,v_key,v_content,'normal','Borrador confirmado por WhatsApp');
   IF v_proposed.version_id IS NULL THEN
      RAISE EXCEPTION 'LEARNING_DRAFT_FAILED';
   END IF;
   UPDATE public.concierge_pending_actions
    SET payload_jsonb=(payload_jsonb-'revision_item_id')||jsonb_build_object(
       'stage','publish','item_id',v_proposed.knowledge_item_id,'version_id',v_proposed.version_id)
    WHERE id=v_action.id;
   RETURN QUERY SELECT true,
      'Preparé el borrador, pero aún no lo comparto con huéspedes. Respondé *PUBLICAR* para aprobarlo, *CORREGIR* o *CANCELAR*.'::text,
      'publish'::text; RETURN;
 END IF;
 IF v_step='publish' THEN
   v_item:=(v_action.payload_jsonb->>'item_id')::uuid;
   v_version:=(v_action.payload_jsonb->>'version_id')::uuid;
   IF v_item IS NULL OR v_version IS NULL THEN
      RETURN QUERY SELECT true,'Falta el borrador. No publiqué nada; necesitás revisión.'::text,'blocked'::text; RETURN;
   END IF;
   IF v_normal='corregir' THEN
      SELECT * INTO v_rejected FROM public.concierge_reject_knowledge_version(v_item,v_version,p_manager_id);
      UPDATE public.concierge_pending_actions SET
        payload_jsonb=(payload_jsonb-'item_id'-'version_id'-'content')||
         jsonb_build_object('stage','content','revision_item_id',v_item)
        WHERE id=v_action.id;
      RETURN QUERY SELECT true,'Descarté el borrador anterior. Escribí la solución corregida.'::text,'content'::text; RETURN;
   END IF;
   IF v_normal<>'publicar' THEN
     RETURN QUERY SELECT true,'El borrador sigue sin publicar. Respondé *PUBLICAR*, *CORREGIR* o *CANCELAR*.'::text,'publish'::text; RETURN;
   END IF;
   -- Never publish a draft without revalidating its exact tenant/scope,
   -- normal-risk status and content. The source can change between messages.
   SELECT kv.content INTO v_content
     FROM public.concierge_knowledge_items ki
     JOIN public.concierge_knowledge_versions kv ON kv.knowledge_item_id=ki.id
    WHERE ki.id=v_item AND kv.id=v_version
      AND ki.account_id=v_action.account_id AND ki.property_id=v_action.property_id
      AND ki.scope_type='property' AND ki.category='incident_protocol'
      AND ki.risk_level='normal' AND kv.status='draft'
      AND kv.source_type='learned_from_incident';
   IF NOT FOUND OR NOT public.concierge_manager_learning_text_allowed(v_content) THEN
     RETURN QUERY SELECT true,'El borrador no supera la revisión de privacidad. No publiqué nada; necesitás corregirlo.'::text,'blocked'::text; RETURN;
   END IF;
   SELECT * INTO v_activated FROM public.concierge_activate_knowledge_version(
     v_item,v_version,p_manager_id);
   IF v_activated.resulting_status IS DISTINCT FROM 'active' THEN
     RAISE EXCEPTION 'LEARNING_ACTIVATION_UNCONFIRMED';
   END IF;
   -- Knowledge is versioned and active; finish the already guest-confirmed
   -- incident in the same transaction rather than leave a stale pending state.
   IF v_incident.status='learning_pending' THEN
     PERFORM 1 FROM public.concierge_manager_set_incident_state(
       v_incident.id,p_manager_id,'closed',
       'Incidencia resuelta: aprendizaje aprobado y versionado');
   END IF;
   UPDATE public.concierge_pending_actions SET status='executed',
     confirmed_at=now(),executed_at=now() WHERE id=v_action.id;
   RETURN QUERY SELECT true,
     '✅ Listo. Chebot guardó la solución aprobada para esa propiedad, con versión e historial. Podés corregirla o revertirla más adelante.'::text,
     'published'::text; RETURN;
 END IF;
 RETURN QUERY SELECT true,'No pude determinar este paso de aprendizaje. No publiqué nada.'::text,'blocked'::text;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_manager_learning_offer(p_manager_id uuid)
 RETURNS TABLE(handled boolean, reply_text text, stage text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 v_member public.concierge_account_members%rowtype;
 v_incident public.concierge_incidents%rowtype;
 v_name text;
 v_action uuid;
BEGIN
 SELECT m.* INTO v_member FROM public.concierge_account_members m
 WHERE m.id=p_manager_id AND m.status='active';
 IF NOT FOUND OR v_member.role NOT IN('owner','manager','co_manager') THEN
   RETURN QUERY SELECT false,NULL::text,NULL::text; RETURN;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtext('chebot.learning'),hashtext(p_manager_id::text));
 IF EXISTS(SELECT 1 FROM public.concierge_pending_actions pa
           WHERE pa.actor_account_member_id=p_manager_id AND pa.status='pending') THEN
   RETURN QUERY SELECT false,NULL::text,NULL::text; RETURN;
 END IF;
 SELECT i.* INTO v_incident
 FROM public.concierge_incidents i
 JOIN public.concierge_properties p ON p.id=i.property_id AND p.account_id=i.account_id
 CROSS JOIN LATERAL public.concierge_authorize_manager_member_action(
   p_manager_id,i.property_id,'manage_knowledge') grant_check
 CROSS JOIN LATERAL public.concierge_authorize_manager_member_action(
   p_manager_id,i.property_id,'manage_incidents') incident_grant
 WHERE i.account_id=v_member.account_id AND p.status='active'
   AND i.status='resolved' AND i.guest_confirmed_resolved=true
   AND i.severity IN ('low','medium')
   AND ((i.category='climate' AND i.summary ~* '(no enfr[ií]a|no tira fr[ií]o|sin aire fr[ií]o|does not cool|not cooling)')
     OR (i.category='wifi' AND i.summary ~* '(sin internet|sin conexi[oó]n|no tengo internet|no hay wifi|no anda el wifi|no funciona el wifi|wifi no (anda|funciona|conecta)|wifi not working|no internet|no connection|wifi non funziona|wifi n[aã]o funciona)'))
   AND i.resolved_at>now()-interval '7 days'
   AND grant_check.result='allow' AND grant_check.account_id=i.account_id
   AND incident_grant.result='allow' AND incident_grant.account_id=i.account_id
   AND NOT EXISTS(SELECT 1 FROM public.concierge_pending_actions a
      WHERE a.actor_account_member_id=p_manager_id
        AND a.action_type='learn_incident' AND a.target_entity_id=i.id)
 ORDER BY i.resolved_at DESC, i.id
 LIMIT 1;
 IF v_incident.id IS NULL THEN
   RETURN QUERY SELECT false,NULL::text,NULL::text; RETURN;
 END IF;
 SELECT p.internal_name INTO v_name FROM public.concierge_properties p WHERE p.id=v_incident.property_id AND p.account_id=v_incident.account_id;
 INSERT INTO public.concierge_pending_actions(
  account_id,actor_type,actor_account_member_id,action_type,summary,property_id,stay_id,
  target_entity_type,target_entity_id,payload_jsonb,status,expires_at)
 VALUES(v_incident.account_id,'account_member',p_manager_id,'learn_incident',
   'Aprendizaje opcional sobre incidencia resuelta',v_incident.property_id,v_incident.stay_id,
   'incident',v_incident.id,jsonb_build_object('stage','offer'),
   'pending',now()+interval '30 minutes')
 RETURNING id INTO v_action;
 RETURN QUERY SELECT true,
  ('La incidencia de '||v_incident.category||' en '||v_name||
  ' ya fue resuelta y confirmada por el huésped. ¿Querés que Chebot aprenda una solución para futuras estadías? Respondé *SÍ* o *NO*. No guardaré nada sin tu confirmación.')::text,
  'offer'::text;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_manager_learning_text_allowed(p_text text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 SELECT COALESCE(
   length(btrim(p_text)) BETWEEN 20 AND 450
   AND NOT (p_text ~* '(contraseñ|contrasen|password|passwd|passcode|passphrase|clave|c[oó]digo|codigo|\mpin\M|\motp\M|token|secreto|secret|credencial|\mkeybox\M|lockbox|caja de llaves|\mpuerta\M|access code|codigo de acceso|código de acceso|pin de acceso)')
   AND NOT (p_text ~* '(https?://|www[.]|[[:alnum:]._%+-]+@[[:alnum:].-]+[.][[:alpha:]]{2,}|[+][0-9][0-9 ()-]{6,}|[0-9]{4,})')
 ,false)
 $function$
;

CREATE OR REPLACE FUNCTION public.concierge_manager_set_incident_state(p_incident_id uuid, p_account_member_id uuid, p_new_status text, p_event_summary text)
 RETURNS TABLE(incident_id uuid, resulting_status text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_incident public.concierge_incidents%rowtype;
  v_member_role text;
  v_member_status text;
  v_can_manage boolean := false;
begin
  if p_new_status not in (
    'resolving',
    'waiting_guest',
    'escalated',
    'waiting_manager',
    'learning_pending',
    'closed'
  ) then
    if p_new_status='resolved' then
      raise exception using
        errcode='23514',
        message='GUEST_CONFIRMATION_REQUIRED';
    end if;

    raise exception using
      errcode='22023',
      message='INVALID_INCIDENT_STATUS';
  end if;

  if p_event_summary is null
     or length(trim(p_event_summary)) < 1
     or length(trim(p_event_summary)) > 4000 then
    raise exception using
      errcode='22023',
      message='INVALID_INCIDENT_EVENT_SUMMARY';
  end if;

  select i.*
    into v_incident
  from public.concierge_incidents i
  where i.id=p_incident_id
  for update;

  if not found then
    raise exception using
      errcode='42501',
      message='RESOURCE_OUT_OF_SCOPE';
  end if;

  select m.role, m.status
    into v_member_role, v_member_status
  from public.concierge_account_members m
  where m.id=p_account_member_id
    and m.account_id=v_incident.account_id;

  if not found or v_member_status <> 'active' then
    raise exception using
      errcode='42501',
      message='MANAGER_PERMISSION_DENIED';
  end if;

  if v_member_role in ('owner','manager') then
    v_can_manage := true;
  elsif v_member_role='co_manager' then
    select coalesce(mp.can_manage_incidents,false)
      into v_can_manage
    from public.concierge_member_property_permissions mp
    where mp.account_id=v_incident.account_id
      and mp.member_id=p_account_member_id
      and mp.property_id=v_incident.property_id;
  end if;

  if not coalesce(v_can_manage,false) then
    raise exception using
      errcode='42501',
      message='MANAGER_PERMISSION_DENIED';
  end if;

  if p_new_status='learning_pending'
     and v_incident.status <> 'resolved' then
    raise exception using
      errcode='23514',
      message='INCIDENT_NOT_RESOLVED';
  end if;

  if p_new_status='closed'
     and v_incident.status not in ('resolved','learning_pending') then
    raise exception using
      errcode='23514',
      message='INCIDENT_NOT_RESOLVED';
  end if;

  update public.concierge_incidents i
     set
       status=p_new_status,
       manager_intervention_required=
         case
           when p_new_status in ('waiting_manager','escalated') then true
           when p_new_status in ('resolving','waiting_guest') then false
           else i.manager_intervention_required
         end,
       closed_at=
         case
           when p_new_status='closed' then now()
           else i.closed_at
         end,
       updated_at=now()
   where i.id=v_incident.id;

  insert into public.concierge_incident_events (
    account_id,
    incident_id,
    actor_type,
    actor_ref,
    event_type,
    event_summary
  )
  values (
    v_incident.account_id,
    v_incident.id,
    'account_member',
    p_account_member_id,
    case
      when p_new_status='closed' then 'closed'
      else 'manager_state_changed'
    end,
    trim(p_event_summary)
  );

  insert into public.concierge_audit_events (
    account_id,
    actor_type,
    actor_ref,
    property_id,
    stay_id,
    action_type,
    entity_type,
    entity_id,
    result,
    reason_code
  )
  values (
    v_incident.account_id,
    'account_member',
    p_account_member_id,
    v_incident.property_id,
    v_incident.stay_id,
    'incident_state_changed',
    'incident',
    v_incident.id,
    'changed',
    null
  );

  return query
  select v_incident.id, p_new_status;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_mark_request_communicated(p_request_id uuid)
 RETURNS TABLE(request_id uuid, resulting_status text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_request public.concierge_requests%rowtype;
begin
  select r.*
    into v_request
  from public.concierge_requests r
  where r.id=p_request_id
  for update;

  if not found then
    raise exception using
      errcode='42501',
      message='RESOURCE_OUT_OF_SCOPE';
  end if;

  if v_request.status not in ('approved','rejected') then
    raise exception using
      errcode='23514',
      message='REQUEST_NOT_DECIDED';
  end if;

  update public.concierge_requests r
     set
       status='communicated',
       communicated_at=now(),
       updated_at=now()
   where r.id=v_request.id;

  insert into public.concierge_request_events (
    account_id,
    request_id,
    actor_type,
    actor_ref,
    event_type,
    event_summary
  )
  values (
    v_request.account_id,
    v_request.id,
    'system',
    null,
    'communicated',
    'Request decision communicated to guest'
  );

  return query
  select v_request.id, 'communicated'::text;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_notification_delivery_advances(p_old text, p_new text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  SELECT
    p_new IN ('sent','delivered','read','failed')
    AND (
      p_old IS NULL
      OR (p_old='sent' AND p_new IN ('delivered','read','failed'))
      OR (p_old='delivered' AND p_new='read')
    );
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_open_incident(p_guest_identity_id uuid, p_stay_member_id uuid, p_category text, p_severity text, p_summary text)
 RETURNS TABLE(result text, reason_code text, incident_id uuid, resulting_status text, manager_intervention_required boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_identity_status text;

  v_account_id uuid;
  v_stay_id uuid;
  v_property_id uuid;
  v_member_identity_id uuid;
  v_member_status text;
  v_whatsapp_enabled boolean;
  v_stay_status text;

  v_incident_id uuid;
  v_status text;
  v_manager_required boolean;
  v_explicit_manager_request boolean := false;
begin
  if p_category not in (
    'access','wifi','climate','plumbing','electricity','appliance',
    'noise','cleaning','safety','health','other'
  ) then
    raise exception using
      errcode='22023',
      message='INVALID_INCIDENT_CATEGORY';
  end if;

  if p_severity not in ('low','medium','high','critical') then
    raise exception using
      errcode='22023',
      message='INVALID_INCIDENT_SEVERITY';
  end if;

  if p_summary is null
     or length(trim(p_summary)) < 1
     or length(trim(p_summary)) > 2000 then
    raise exception using
      errcode='22023',
      message='INVALID_INCIDENT_SUMMARY';
  end if;

  select gi.status
    into v_identity_status
  from public.concierge_guest_identities gi
  where gi.id=p_guest_identity_id;

  if not found or v_identity_status <> 'active' then
    return query
    select
      'deny'::text,
      'IDENTITY_UNKNOWN'::text,
      null::uuid,
      null::text,
      false;
    return;
  end if;

  select
    sm.account_id,
    sm.stay_id,
    s.property_id,
    sm.guest_identity_id,
    sm.status,
    sm.whatsapp_enabled,
    s.status
  into
    v_account_id,
    v_stay_id,
    v_property_id,
    v_member_identity_id,
    v_member_status,
    v_whatsapp_enabled,
    v_stay_status
  from public.concierge_stay_members sm
  join public.concierge_stays s
    on s.id=sm.stay_id
   and s.account_id=sm.account_id
  where sm.id=p_stay_member_id;

  if not found or v_member_status <> 'active' then
    return query
    select
      'deny'::text,
      'MEMBER_NOT_ACTIVE'::text,
      null::uuid,
      null::text,
      false;
    return;
  end if;

  if v_member_identity_id is null
     or v_member_identity_id <> p_guest_identity_id then
    return query
    select
      'deny'::text,
      'IDENTITY_UNKNOWN'::text,
      null::uuid,
      null::text,
      false;
    return;
  end if;

  if not v_whatsapp_enabled then
    return query
    select
      'deny'::text,
      'WHATSAPP_NOT_ENABLED'::text,
      null::uuid,
      null::text,
      false;
    return;
  end if;

  if v_stay_status not in ('scheduled','active') then
    return query
    select
      'deny'::text,
      'MEMBER_NOT_ACTIVE'::text,
      null::uuid,
      null::text,
      false;
    return;
  end if;

  -- A direct request for human support must be visible as manager attention,
  -- independently of technical severity. Keep critical escalation separate.
  v_explicit_manager_request := (
    lower(p_summary) ~
      '(necesito|quiero|preciso|solicito|pod[eé]s|podem|please|need|help|ajuda|falar|hablar|contactar|contact|avisa|avisar|llama|chama).{0,90}(manager|administrador|anfitri[oó]n|propietario|host|gestor|propriet[aá]rio)'
    or lower(p_summary) ~
      '(manager|administrador|anfitri[oó]n|propietario|host|gestor|propriet[aá]rio).{0,45}(ayuda|help|ajuda|interven|contacto|contact|venir|venga)'
  );
  v_manager_required := p_severity in ('high','critical') or v_explicit_manager_request;
  v_status := case
    when p_severity='critical' then 'escalated'
    when v_explicit_manager_request then 'waiting_manager'
    else 'new'
  end;

  insert into public.concierge_incidents (
    account_id,
    property_id,
    stay_id,
    reported_by_stay_member_id,
    category,
    severity,
    status,
    summary,
    manager_intervention_required
  )
  values (
    v_account_id,
    v_property_id,
    v_stay_id,
    p_stay_member_id,
    p_category,
    p_severity,
    v_status,
    trim(p_summary),
    v_manager_required
  )
  returning id into v_incident_id;

  insert into public.concierge_incident_events (
    account_id,
    incident_id,
    actor_type,
    actor_ref,
    event_type,
    event_summary
  )
  values (
    v_account_id,
    v_incident_id,
    'stay_member',
    p_stay_member_id,
    'reported',
    'Incident reported by authorized stay member'
  );

  if p_severity='critical' then
    insert into public.concierge_incident_events (
      account_id,
      incident_id,
      actor_type,
      actor_ref,
      event_type,
      event_summary
    )
    values (
      v_account_id,
      v_incident_id,
      'system',
      null,
      'escalation_triggered',
      'Critical incident requires immediate escalation'
    );
  end if;

  insert into public.concierge_audit_events (
    account_id,
    actor_type,
    actor_ref,
    property_id,
    stay_id,
    action_type,
    entity_type,
    entity_id,
    result,
    reason_code
  )
  values (
    v_account_id,
    'guest',
    p_guest_identity_id,
    v_property_id,
    v_stay_id,
    'incident_opened',
    'incident',
    v_incident_id,
    'created',
    null
  );

  return query
  select
    'allow'::text,
    null::text,
    v_incident_id,
    v_status,
    v_manager_required;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_open_request(p_guest_identity_id uuid, p_stay_member_id uuid, p_request_type text, p_requested_value text DEFAULT NULL::text, p_requested_at_time timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(result text, reason_code text, request_id uuid, resulting_status text, handling_mode text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_identity_status text;

  v_account_id uuid;
  v_stay_id uuid;
  v_property_id uuid;
  v_member_identity_id uuid;
  v_member_status text;
  v_whatsapp_enabled boolean;
  v_stay_status text;

  v_policy_id uuid;
  v_policy_mode text;
  v_policy_note text;
  v_status text;
  v_decision_source text;
  v_decision_at timestamptz;
  v_request_id uuid;
begin
  if p_request_type not in (
    'early_checkin','late_checkout','luggage','parking',
    'cleaning','extra_items','special_request','other'
  ) then
    raise exception using
      errcode='22023',
      message='INVALID_REQUEST_TYPE';
  end if;

  if p_requested_value is not null
     and (
       length(trim(p_requested_value)) < 1
       or length(trim(p_requested_value)) > 2000
     ) then
    raise exception using
      errcode='22023',
      message='INVALID_REQUEST_VALUE';
  end if;

  if p_request_type in ('early_checkin','late_checkout')
     and p_requested_at_time is null then
    raise exception using
      errcode='22023',
      message='REQUEST_TIME_REQUIRED';
  end if;

  select gi.status
    into v_identity_status
  from public.concierge_guest_identities gi
  where gi.id=p_guest_identity_id;

  if not found or v_identity_status <> 'active' then
    return query
    select
      'deny'::text,
      'IDENTITY_UNKNOWN'::text,
      null::uuid,
      null::text,
      null::text;
    return;
  end if;

  select
    sm.account_id,
    sm.stay_id,
    s.property_id,
    sm.guest_identity_id,
    sm.status,
    sm.whatsapp_enabled,
    s.status
  into
    v_account_id,
    v_stay_id,
    v_property_id,
    v_member_identity_id,
    v_member_status,
    v_whatsapp_enabled,
    v_stay_status
  from public.concierge_stay_members sm
  join public.concierge_stays s
    on s.id=sm.stay_id
   and s.account_id=sm.account_id
  where sm.id=p_stay_member_id;

  if not found or v_member_status <> 'active' then
    return query
    select
      'deny'::text,
      'MEMBER_NOT_ACTIVE'::text,
      null::uuid,
      null::text,
      null::text;
    return;
  end if;

  if v_member_identity_id is null
     or v_member_identity_id <> p_guest_identity_id then
    return query
    select
      'deny'::text,
      'IDENTITY_UNKNOWN'::text,
      null::uuid,
      null::text,
      null::text;
    return;
  end if;

  if not v_whatsapp_enabled then
    return query
    select
      'deny'::text,
      'WHATSAPP_NOT_ENABLED'::text,
      null::uuid,
      null::text,
      null::text;
    return;
  end if;

  if v_stay_status not in ('scheduled','active') then
    return query
    select
      'deny'::text,
      'MEMBER_NOT_ACTIVE'::text,
      null::uuid,
      null::text,
      null::text;
    return;
  end if;

  select rp.policy_id, rp.handling_mode, rp.response_note
    into v_policy_id, v_policy_mode, v_policy_note
  from public.concierge_resolve_request_policy(
    v_account_id,
    v_property_id,
    p_request_type
  ) rp;

  if not found then
    v_policy_id := null;
    v_policy_mode := 'approval_required';
    v_policy_note := null;
  end if;

  if v_policy_mode='unavailable' then
    v_status := 'rejected';
    v_decision_source := 'policy';
    v_decision_at := now();

  elsif v_policy_mode='available' then
    -- early/late no pueden llegar aquí por constraint de policy.
    v_status := 'approved';
    v_decision_source := 'policy';
    v_decision_at := now();

  else
    v_status := 'waiting_manager';
    v_decision_source := null;
    v_decision_at := null;
  end if;

  insert into public.concierge_requests (
    account_id,
    property_id,
    stay_id,
    requested_by_stay_member_id,
    request_type,
    status,
    requested_value,
    requested_at_time,
    applied_policy_id,
    decision_source,
    decision_at
  )
  values (
    v_account_id,
    v_property_id,
    v_stay_id,
    p_stay_member_id,
    p_request_type,
    v_status,
    nullif(trim(p_requested_value),''),
    p_requested_at_time,
    v_policy_id,
    v_decision_source,
    v_decision_at
  )
  returning id into v_request_id;

  insert into public.concierge_request_events (
    account_id,
    request_id,
    actor_type,
    actor_ref,
    event_type,
    event_summary
  )
  values (
    v_account_id,
    v_request_id,
    'stay_member',
    p_stay_member_id,
    'opened',
    'Request opened by authorized stay member'
  );

  if v_policy_id is not null then
    insert into public.concierge_request_events (
      account_id,
      request_id,
      actor_type,
      actor_ref,
      event_type,
      event_summary
    )
    values (
      v_account_id,
      v_request_id,
      'system',
      null,
      'policy_applied',
      'Request policy applied: ' || v_policy_mode
    );
  end if;

  insert into public.concierge_audit_events (
    account_id,
    actor_type,
    actor_ref,
    property_id,
    stay_id,
    action_type,
    entity_type,
    entity_id,
    result,
    reason_code
  )
  values (
    v_account_id,
    'guest',
    p_guest_identity_id,
    v_property_id,
    v_stay_id,
    'request_opened',
    'request',
    v_request_id,
    'created',
    null
  );

  return query
  select
    'allow'::text,
    null::text,
    v_request_id,
    v_status,
    v_policy_mode;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_open_system_intervention(p_account_id uuid, p_property_id uuid, p_reason_type text, p_minutes_estimated integer, p_occurred_at timestamp with time zone DEFAULT now())
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_intervention_id uuid;
begin
  insert into public.concierge_system_interventions (
    account_id,
    property_id,
    reason_type,
    minutes_estimated,
    occurred_at
  )
  values (
    p_account_id,
    p_property_id,
    p_reason_type,
    p_minutes_estimated,
    p_occurred_at
  )
  returning id into v_intervention_id;

  if p_account_id is not null then
    perform public.concierge_record_event(
      p_account_id,
      p_property_id,
      null,
      'systems_intervention',
      'systems',
      p_reason_type,
      p_occurred_at
    );
  end if;

  return v_intervention_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_propose_incident_learning(p_incident_id uuid, p_account_member_id uuid, p_knowledge_key text, p_content text, p_risk_level text DEFAULT 'normal'::text, p_change_summary text DEFAULT NULL::text)
 RETURNS TABLE(knowledge_item_id uuid, version_id uuid, version_number integer, item_status text, version_status text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_incident public.concierge_incidents%rowtype;

  v_member_role text;
  v_member_status text;
  v_can_manage_knowledge boolean := false;

  v_item public.concierge_knowledge_items%rowtype;
  v_version public.concierge_knowledge_versions%rowtype;

  v_key text;
  v_content text;
  v_risk_level text;
  v_change_summary text;
  v_incident_marker text;

  v_next_version integer;
begin
  v_key := lower(trim(coalesce(p_knowledge_key, '')));
  v_content := trim(coalesce(p_content, ''));
  v_risk_level := lower(trim(coalesce(p_risk_level, 'normal')));
  v_incident_marker := 'incident:' || p_incident_id::text;

  if length(v_key) < 1 or length(v_key) > 160 then
    raise exception using
      errcode = '22023',
      message = 'INVALID_KNOWLEDGE_KEY';
  end if;

  if length(v_content) < 1 or length(v_content) > 12000 then
    raise exception using
      errcode = '22023',
      message = 'INVALID_KNOWLEDGE_CONTENT';
  end if;

  if v_risk_level not in ('normal', 'sensitive', 'safety_review') then
    raise exception using
      errcode = '22023',
      message = 'INVALID_KNOWLEDGE_RISK_LEVEL';
  end if;

  v_change_summary :=
    v_incident_marker
    || ' | '
    || coalesce(
         nullif(trim(p_change_summary), ''),
         'Propuesta de aprendizaje desde incidencia resuelta.'
       );

  if length(v_change_summary) > 1000 then
    raise exception using
      errcode = '22023',
      message = 'INVALID_KNOWLEDGE_CHANGE_SUMMARY';
  end if;

  select i.*
    into v_incident
  from public.concierge_incidents i
  where i.id = p_incident_id
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'RESOURCE_OUT_OF_SCOPE';
  end if;

  if v_incident.status <> 'learning_pending'
     or coalesce(v_incident.guest_confirmed_resolved, false) <> true then
    raise exception using
      errcode = '23514',
      message = 'INCIDENT_NOT_READY_FOR_LEARNING';
  end if;

  select m.role, m.status
    into v_member_role, v_member_status
  from public.concierge_account_members m
  where m.id = p_account_member_id
    and m.account_id = v_incident.account_id;

  if not found or v_member_status <> 'active' then
    raise exception using
      errcode = '42501',
      message = 'MANAGER_PERMISSION_DENIED';
  end if;

  if v_member_role in ('owner', 'manager') then
    v_can_manage_knowledge := true;

  elsif v_member_role = 'co_manager' then
    select coalesce(mp.can_manage_knowledge, false)
      into v_can_manage_knowledge
    from public.concierge_member_property_permissions mp
    where mp.account_id = v_incident.account_id
      and mp.member_id = p_account_member_id
      and mp.property_id = v_incident.property_id;
  end if;

  if not coalesce(v_can_manage_knowledge, false) then
    raise exception using
      errcode = '42501',
      message = 'MANAGER_PERMISSION_DENIED';
  end if;

  select ki.*
    into v_item
  from public.concierge_knowledge_items ki
  where ki.account_id = v_incident.account_id
    and ki.scope_type = 'property'
    and ki.property_id = v_incident.property_id
    and lower(ki.knowledge_key) = v_key
    and ki.status <> 'archived'
  for update;

  if found then
    if v_item.category <> 'incident_protocol'
       or v_item.risk_level <> v_risk_level then
      raise exception using
        errcode = '23514',
        message = 'KNOWLEDGE_KEY_CONFLICT';
    end if;
  else
    insert into public.concierge_knowledge_items (
      account_id,
      scope_type,
      building_id,
      property_id,
      category,
      knowledge_key,
      risk_level,
      status,
      current_version_id
    )
    values (
      v_incident.account_id,
      'property',
      null,
      v_incident.property_id,
      'incident_protocol',
      v_key,
      v_risk_level,
      'review',
      null
    )
    returning *
      into v_item;
  end if;

  /*
    Idempotencia:
    si esta misma incidencia ya generó un draft,
    devolvemos ese draft en lugar de duplicarlo.
  */
  select kv.*
    into v_version
  from public.concierge_knowledge_versions kv
  where kv.account_id = v_incident.account_id
    and kv.knowledge_item_id = v_item.id
    and kv.source_type = 'learned_from_incident'
    and kv.status = 'draft'
    and kv.change_summary like v_incident_marker || ' |%'
  order by kv.version_number desc
  limit 1;

  if found then
    return query
    select
      v_item.id,
      v_version.id,
      v_version.version_number,
      v_item.status,
      v_version.status;
    return;
  end if;

  select coalesce(max(kv.version_number), 0) + 1
    into v_next_version
  from public.concierge_knowledge_versions kv
  where kv.knowledge_item_id = v_item.id;

  insert into public.concierge_knowledge_versions (
    account_id,
    knowledge_item_id,
    version_number,
    content,
    source_type,
    status,
    created_by_member_id,
    approved_by_member_id,
    change_summary,
    approved_at
  )
  values (
    v_incident.account_id,
    v_item.id,
    v_next_version,
    v_content,
    'learned_from_incident',
    'draft',
    p_account_member_id,
    null,
    v_change_summary,
    null
  )
  returning *
    into v_version;

  /*
    Si el item ya tenía una versión activa, NO la desactivamos.
    El nuevo draft espera revisión y aprobación.
  */
  update public.concierge_knowledge_items
     set updated_at = now()
   where id = v_item.id;

  insert into public.concierge_incident_events (
    account_id,
    incident_id,
    actor_type,
    actor_ref,
    event_type,
    event_summary
  )
  values (
    v_incident.account_id,
    v_incident.id,
    'account_member',
    p_account_member_id,
    'note',
    'Learning draft created: knowledge_item='
      || v_item.id::text
      || ', version='
      || v_version.id::text
  );

  insert into public.concierge_audit_events (
    account_id,
    actor_type,
    actor_ref,
    property_id,
    stay_id,
    action_type,
    entity_type,
    entity_id,
    result,
    reason_code
  )
  values (
    v_incident.account_id,
    'account_member',
    p_account_member_id,
    v_incident.property_id,
    v_incident.stay_id,
    'incident_learning_draft_created',
    'knowledge_item',
    v_item.id,
    'created',
    null
  );

  return query
  select
    v_item.id,
    v_version.id,
    v_version.version_number,
    v_item.status,
    v_version.status;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_record_event(p_account_id uuid, p_property_id uuid, p_stay_id uuid, p_event_type text, p_category text, p_result text DEFAULT NULL::text, p_occurred_at timestamp with time zone DEFAULT now())
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_event_id uuid;
begin
  insert into public.concierge_events (
    account_id,
    property_id,
    stay_id,
    event_type,
    category,
    result,
    occurred_at
  )
  values (
    p_account_id,
    p_property_id,
    p_stay_id,
    p_event_type,
    trim(p_category),
    nullif(trim(p_result),''),
    p_occurred_at
  )
  returning id into v_event_id;

  return v_event_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_record_manager_signup_screening(p_invite_id uuid, p_reviewer_auth_user_id uuid, p_decision text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
 IF p_invite_id IS NULL OR p_reviewer_auth_user_id IS NULL
   OR p_decision IS NULL OR p_decision NOT IN
    ('needs_owner_followup','not_selected','shortlisted_pending_go_b')
 THEN RETURN 'INVALID_REQUEST'; END IF;

 INSERT INTO public.concierge_manager_signup_screenings (
  invite_id,decision,reviewed_by_auth_user_id
 )
 SELECT i.id,p_decision,p_reviewer_auth_user_id
 FROM public.concierge_manager_signup_invites i
 WHERE i.id=p_invite_id AND i.status='submitted'
  AND i.privacy_accepted=true
  AND i.privacy_notice_version='concierge-privacy-beta-v1-2026-10-11'
  AND i.beta_terms_version='beta-v1-2026-10-11'
 ON CONFLICT (invite_id) DO NOTHING
 RETURNING invite_id INTO v_id;
 IF v_id IS NOT NULL THEN
   INSERT INTO public.concierge_manager_signup_screening_events (
     invite_id,previous_decision,decision,reviewer_auth_user_id
   ) VALUES (v_id,NULL,p_decision,p_reviewer_auth_user_id);
   RETURN 'SCREENING_RECORDED';
 END IF;
 IF EXISTS (SELECT 1 FROM public.concierge_manager_signup_screenings WHERE invite_id=p_invite_id) THEN
   RETURN 'ALREADY_REVIEWED';
 END IF;
 RETURN 'APPLICATION_NOT_REVIEWABLE';
END $function$
;

CREATE OR REPLACE FUNCTION public.concierge_record_notification_meta_acceptance(p_notification_id uuid, p_provider_message_id text, p_provider_acceptance_status text, p_at timestamp with time zone DEFAULT now())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_id text := btrim(coalesce(p_provider_message_id,''));
  v_status text := lower(btrim(coalesce(p_provider_acceptance_status,'')));
  v_pending_status text;
  v_pending_at timestamptz;
  v_pending_received_at timestamptz;
BEGIN
  IF p_notification_id IS NULL OR length(v_id) NOT BETWEEN 8 AND 512
    OR v_status NOT IN ('accepted','held_for_quality_assessment','unknown') THEN
    RETURN false;
  END IF;

  -- Serialize acceptance and callback for the SAME opaque provider message ID.
  -- This prevents a callback from missing the outbox ID while another
  -- transaction is attaching it.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('chebot_concierge_meta:' || v_id, 0)
  );

  UPDATE public.concierge_notification_outbox
    SET provider_message_id = v_id,
        provider_acceptance_status = v_status,
        updated_at = now()
    WHERE id = p_notification_id AND status = 'sent'
      AND (provider_message_id IS NULL OR provider_message_id = v_id);
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT provider_delivery_status,provider_status_at,received_at
    INTO v_pending_status,v_pending_at,v_pending_received_at
  FROM public.concierge_notification_meta_callback_buffer
  WHERE provider_message_id = v_id FOR UPDATE;

  IF FOUND AND v_pending_received_at >= now()-interval '30 minutes' THEN
    UPDATE public.concierge_notification_outbox
      SET provider_delivery_status = v_pending_status,
          provider_status_at = v_pending_at,
          updated_at = now()
    WHERE id = p_notification_id
      AND public.concierge_notification_delivery_advances(
        provider_delivery_status,v_pending_status
      );
  END IF;
  -- A stale callback must NEVER be promoted after its validation window.
  -- Delete only this ID (including stale entries). Avoid cross-ID
  -- row locks inside an advisory-locked RPC: those could create deadlocks
  -- with two concurrent provider IDs. Unmatched stale entries are swept
  -- by the callback-ingestion RPC on its opportunistic cleanup path.
  DELETE FROM public.concierge_notification_meta_callback_buffer
    WHERE provider_message_id = v_id;
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_record_notification_meta_delivery(p_provider_message_id text, p_status text, p_at timestamp with time zone DEFAULT now())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_id text := btrim(coalesce(p_provider_message_id,''));
  v_status text := lower(btrim(coalesce(p_status,'')));
  v_time timestamptz := coalesce(p_at,now());
BEGIN
  IF length(v_id) NOT BETWEEN 8 AND 512
    OR v_status NOT IN ('sent','delivered','read','failed') THEN
    RETURN false;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('chebot_concierge_meta:' || v_id, 0)
  );

  UPDATE public.concierge_notification_outbox
    SET provider_delivery_status=v_status,
        provider_status_at=v_time,
        updated_at=now()
    WHERE provider_message_id=v_id
      AND public.concierge_notification_delivery_advances(
        provider_delivery_status,v_status
      );
  IF FOUND THEN RETURN true; END IF;

  -- An already-matched duplicate/out-of-order callback must NOT be buffered.
  IF EXISTS(SELECT 1 FROM public.concierge_notification_outbox
    WHERE provider_message_id=v_id) THEN
    RETURN false;
  END IF;

  -- Opportunistic bounded cleanup, with no background cron or extra job.
  DELETE FROM public.concierge_notification_meta_callback_buffer
    WHERE received_at < now() - interval '30 minutes';

  -- Unknown messages are staged ONLY when an actual Concierge notification
  -- might be racing its Meta acceptance save. This avoids storing every
  -- WhatsApp delivery receipt from the public tourist guide.
  IF NOT EXISTS(
    SELECT 1 FROM public.concierge_notification_outbox
    WHERE (status='processing' AND claimed_at >= now()-interval '10 minutes')
       OR (status='sent' AND provider_message_id IS NULL
           AND sent_at >= now()-interval '10 minutes')
  ) THEN
    RETURN false;
  END IF;

  -- Never allow unbounded storage of unrelated (though signed) callbacks.
  IF NOT EXISTS (SELECT 1 FROM public.concierge_notification_meta_callback_buffer
                  WHERE provider_message_id=v_id)
     AND (SELECT count(*) FROM public.concierge_notification_meta_callback_buffer) >= 2000 THEN
    RETURN false;
  END IF;

  INSERT INTO public.concierge_notification_meta_callback_buffer(
    provider_message_id,provider_delivery_status,provider_status_at
  ) VALUES (v_id,v_status,v_time)
  ON CONFLICT(provider_message_id) DO UPDATE
    SET provider_delivery_status=EXCLUDED.provider_delivery_status,
        provider_status_at=EXCLUDED.provider_status_at,
        updated_at=now()
    WHERE public.concierge_notification_delivery_advances(
      public.concierge_notification_meta_callback_buffer.provider_delivery_status,
      EXCLUDED.provider_delivery_status
    );
  RETURN FOUND;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_reject_knowledge_version(p_knowledge_item_id uuid, p_version_id uuid, p_rejected_by_member_id uuid)
 RETURNS TABLE(knowledge_item_id uuid, version_id uuid, version_number integer, resulting_item_status text, resulting_version_status text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_item public.concierge_knowledge_items%rowtype;
  v_version public.concierge_knowledge_versions%rowtype;

  v_member_role text;
  v_member_status text;
  v_can_manage_knowledge boolean := false;

  v_resulting_item_status text;
  v_other_drafts integer := 0;
begin
  select ki.*
    into v_item
  from public.concierge_knowledge_items ki
  where ki.id = p_knowledge_item_id
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'RESOURCE_OUT_OF_SCOPE';
  end if;

  select kv.*
    into v_version
  from public.concierge_knowledge_versions kv
  where kv.id = p_version_id
    and kv.knowledge_item_id = v_item.id
    and kv.account_id = v_item.account_id
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'RESOURCE_OUT_OF_SCOPE';
  end if;

  if v_version.status <> 'draft' then
    raise exception using
      errcode = '23514',
      message = 'KNOWLEDGE_VERSION_NOT_REJECTABLE';
  end if;

  select m.role, m.status
    into v_member_role, v_member_status
  from public.concierge_account_members m
  where m.id = p_rejected_by_member_id
    and m.account_id = v_item.account_id;

  if not found or v_member_status <> 'active' then
    raise exception using
      errcode = '42501',
      message = 'MANAGER_PERMISSION_DENIED';
  end if;

  if v_member_role in ('owner', 'manager') then
    v_can_manage_knowledge := true;

  elsif v_member_role = 'co_manager'
        and v_item.scope_type = 'property' then

    select coalesce(p.can_manage_knowledge, false)
      into v_can_manage_knowledge
    from public.concierge_member_property_permissions p
    where p.account_id = v_item.account_id
      and p.member_id = p_rejected_by_member_id
      and p.property_id = v_item.property_id;
  end if;

  if not coalesce(v_can_manage_knowledge, false) then
    raise exception using
      errcode = '42501',
      message = 'MANAGER_PERMISSION_DENIED';
  end if;

  update public.concierge_knowledge_versions
     set status = 'rejected'
   where id = v_version.id;

  /*
    Un item nuevo cuyo único draft fue rechazado no debe
    quedar eternamente visible como "En revisión".
    Conservamos el historial archivando el item.

    Si ya existe una versión activa, no alteramos su estado.
    Si quedan otros drafts pendientes, el item continúa review.
  */
  if v_item.current_version_id is null then

    select count(*)
      into v_other_drafts
    from public.concierge_knowledge_versions kv
    where kv.knowledge_item_id = v_item.id
      and kv.id <> v_version.id
      and kv.status = 'draft';

    if v_other_drafts > 0 then
      update public.concierge_knowledge_items
         set status = 'review',
             updated_at = now()
       where id = v_item.id;

      v_resulting_item_status := 'review';
    else
      update public.concierge_knowledge_items
         set status = 'archived',
             updated_at = now()
       where id = v_item.id;

      v_resulting_item_status := 'archived';
    end if;

  else
    update public.concierge_knowledge_items
       set updated_at = now()
     where id = v_item.id;

    v_resulting_item_status := v_item.status;
  end if;

  insert into public.concierge_audit_events (
    account_id,
    actor_type,
    actor_ref,
    property_id,
    action_type,
    entity_type,
    entity_id,
    result,
    reason_code
  )
  values (
    v_item.account_id,
    'account_member',
    p_rejected_by_member_id,
    case
      when v_item.scope_type = 'property'
      then v_item.property_id
      else null
    end,
    'knowledge_version_rejected',
    'knowledge_item',
    v_item.id,
    'changed',
    'MANAGER_REJECTED_KNOWLEDGE_DRAFT'
  );

  return query
  select
    v_item.id,
    v_version.id,
    v_version.version_number,
    v_resulting_item_status,
    'rejected'::text;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_request_guest_phone_replacement(p_manager_id uuid, p_stay_member_id uuid, p_new_phone_hash text)
 RETURNS TABLE(result text, reason_code text, change_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_sm public.concierge_stay_members%rowtype;
 v_stay public.concierge_stays%rowtype;
 v_property public.concierge_properties%rowtype;
 v_old_hash text;
 v_auth record;
 v_id uuid;
BEGIN
 IF p_new_phone_hash IS NULL OR p_new_phone_hash !~ '^[0-9a-f]{64}$' THEN
  RETURN QUERY SELECT 'deny'::text,'PHONE_HASH_INVALID'::text,NULL::uuid; RETURN;
 END IF;
 SELECT sm.* INTO v_sm FROM public.concierge_stay_members sm
 WHERE sm.id=p_stay_member_id FOR UPDATE;
 IF NOT FOUND OR v_sm.status <> 'active' OR v_sm.whatsapp_enabled IS DISTINCT FROM true
 OR v_sm.guest_identity_id IS NULL THEN
  RETURN QUERY SELECT 'deny'::text,'STAY_MEMBER_NOT_ACTIVE'::text,NULL::uuid; RETURN;
 END IF;
 SELECT s.* INTO v_stay FROM public.concierge_stays s
 WHERE s.id=v_sm.stay_id AND s.account_id=v_sm.account_id;
 IF NOT FOUND OR v_stay.status NOT IN ('scheduled','active') OR v_stay.check_out_at <= now() THEN
  RETURN QUERY SELECT 'deny'::text,'STAY_NOT_ACTIVE'::text,NULL::uuid; RETURN;
 END IF;
 SELECT p.* INTO v_property FROM public.concierge_properties p
 WHERE p.id=v_stay.property_id AND p.account_id=v_stay.account_id;
 IF NOT FOUND OR v_property.status <> 'active' THEN
  RETURN QUERY SELECT 'deny'::text,'PROPERTY_NOT_ACTIVE'::text,NULL::uuid; RETURN;
 END IF;
 SELECT * INTO v_auth FROM public.concierge_authorize_manager_member_action(
  p_manager_id,v_stay.property_id,'manage_stays');
 IF NOT FOUND OR v_auth.result <> 'allow' OR v_auth.account_id <> v_stay.account_id THEN
  RETURN QUERY SELECT 'deny'::text,'MANAGER_PERMISSION_DENIED'::text,NULL::uuid; RETURN;
 END IF;
 SELECT phone_hash INTO v_old_hash FROM public.concierge_guest_identities
 WHERE id=v_sm.guest_identity_id AND status='active';
 IF NOT FOUND OR v_old_hash=p_new_phone_hash THEN
  RETURN QUERY SELECT 'deny'::text,'PHONE_IDENTITY_NOT_ELIGIBLE'::text,NULL::uuid; RETURN;
 END IF;
 IF EXISTS(SELECT 1 FROM public.concierge_guest_identities gi
   WHERE gi.phone_hash=p_new_phone_hash AND gi.status <> 'active')
  OR EXISTS(SELECT 1 FROM public.concierge_account_members am
   WHERE am.phone_hash=p_new_phone_hash AND am.status='active')
  OR EXISTS(SELECT 1 FROM public.concierge_operational_people op
   WHERE op.phone_hash=p_new_phone_hash AND op.status='active')
  OR EXISTS(SELECT 1 FROM public.concierge_guest_identities gi
   JOIN public.concierge_stay_members sm ON sm.guest_identity_id=gi.id
   JOIN public.concierge_stays s ON s.id=sm.stay_id AND s.account_id=sm.account_id
   WHERE gi.phone_hash=p_new_phone_hash AND sm.status IN ('invited','active')
   AND sm.whatsapp_enabled=true AND s.status IN ('scheduled','active')
   AND s.check_out_at > now())
 THEN
  RETURN QUERY SELECT 'deny'::text,'NEW_PHONE_ALREADY_ASSIGNED'::text,NULL::uuid; RETURN;
 END IF;
 UPDATE public.concierge_guest_phone_changes ch SET status='expired',updated_at=now()
 WHERE ch.stay_member_id=v_sm.id AND ch.status IN ('pending','approved') AND ch.expires_at<=now();
 IF EXISTS(SELECT 1 FROM public.concierge_guest_phone_changes ch
   WHERE ch.stay_member_id=v_sm.id AND ch.status IN ('pending','approved'))
 THEN
  RETURN QUERY SELECT 'deny'::text,'CHANGE_ALREADY_PENDING'::text,NULL::uuid; RETURN;
 END IF;
 INSERT INTO public.concierge_guest_phone_changes(
  account_id,property_id,stay_id,stay_member_id,original_guest_identity_id,
  proposed_phone_hash,mode,status,requested_by_member_id,expires_at)
 VALUES(v_stay.account_id,v_stay.property_id,v_stay.id,v_sm.id,v_sm.guest_identity_id,
  p_new_phone_hash,'replace','pending',p_manager_id,least(now()+interval '15 minutes',v_stay.check_out_at))
 RETURNING id INTO v_id;
 RETURN QUERY SELECT 'pending'::text,NULL::text,v_id;
END
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_resolve_actor_context(p_phone_hash text, p_selected_mode text DEFAULT NULL::text, p_selected_account_id uuid DEFAULT NULL::uuid, p_selected_stay_id uuid DEFAULT NULL::uuid, p_selected_task_id uuid DEFAULT NULL::uuid, p_at timestamp with time zone DEFAULT now())
 RETURNS TABLE(resolved_mode text, reason_code text, account_id uuid, account_member_id uuid, property_id uuid, stay_id uuid, stay_member_id uuid, operational_person_id uuid, operational_task_id uuid)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_manager_count integer := 0;
  v_guest_count integer := 0;
  v_operational_count integer := 0;
  v_total integer := 0;

  v_account_id uuid;
  v_account_member_id uuid;
  v_property_id uuid;
  v_stay_id uuid;
  v_stay_member_id uuid;
  v_operational_person_id uuid;
  v_operational_task_id uuid;

  v_member_role text;
begin
  if p_phone_hash is null
     or p_phone_hash !~ '^[0-9a-f]{64}$' then
    return query
    select
      'unresolved'::text,
      'IDENTITY_UNKNOWN'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid;
    return;
  end if;

  if p_selected_mode is not null
     and p_selected_mode not in (
       'free',
       'concierge_guest',
       'manager',
       'co_manager',
       'operational'
     ) then
    raise exception using
      errcode='22023',
      message='INVALID_SESSION_MODE';
  end if;

  if p_selected_stay_id is not null
     and p_selected_task_id is not null then
    raise exception using
      errcode='22023',
      message='INVALID_CONTEXT_SELECTION';
  end if;

  -- Elegir explícitamente Free siempre es seguro: reduce privilegios.
  if p_selected_mode='free' then
    return query
    select
      'free'::text,
      null::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid;
    return;
  end if;

  -- ------------------------------------------------------------------------
  -- Manager / co-manager
  -- ------------------------------------------------------------------------
  if p_selected_stay_id is null
     and p_selected_task_id is null
     and (
       p_selected_mode is null
       or p_selected_mode in ('manager','co_manager')
     ) then

    select count(*)::integer
      into v_manager_count
    from public.concierge_account_members m
    where m.phone_hash=p_phone_hash
      and m.status='active'
      and (
        p_selected_account_id is null
        or m.account_id=p_selected_account_id
      )
      and (
        p_selected_mode is null
        or (p_selected_mode='manager' and m.role in ('owner','manager'))
        or (p_selected_mode='co_manager' and m.role='co_manager')
      );
  end if;

  -- ------------------------------------------------------------------------
  -- Guest
  -- ------------------------------------------------------------------------
  if p_selected_task_id is null
     and (
       p_selected_mode is null
       or p_selected_mode='concierge_guest'
     ) then

    select count(*)::integer
      into v_guest_count
    from public.concierge_guest_identities gi
    join public.concierge_stay_members sm
      on sm.guest_identity_id=gi.id
    join public.concierge_stays s
      on s.id=sm.stay_id
     and s.account_id=sm.account_id
    join public.concierge_properties p
      on p.id=s.property_id
     and p.account_id=s.account_id
    where gi.phone_hash=p_phone_hash
      and gi.status='active'
      and (
         sm.status='active'
         or (
           sm.status='invited'
           and exists (
             select 1 from public.concierge_guest_invites inv
             where inv.stay_member_id=sm.id
               and inv.account_id=sm.account_id
               and inv.status='sent'
               and inv.sent_at is not null
               and inv.activated_at is null
               and inv.rejected_at is null
               and inv.expires_at > p_at
           )
         )
       )
      and sm.whatsapp_enabled=true
      and s.status in ('scheduled','active')
      and p.status='active'
      and p_at < s.check_out_at
      and (
        p_selected_account_id is null
        or s.account_id=p_selected_account_id
      )
      and (
        p_selected_stay_id is null
        or s.id=p_selected_stay_id
      );
  end if;

  -- ------------------------------------------------------------------------
  -- Operational
  -- ------------------------------------------------------------------------
  if p_selected_stay_id is null
     and (
       p_selected_mode is null
       or p_selected_mode='operational'
     ) then

    select count(*)::integer
      into v_operational_count
    from public.concierge_operational_people op
    join public.concierge_operational_tasks t
      on t.operational_person_id=op.id
     and t.account_id=op.account_id
    join public.concierge_properties p
      on p.id=t.property_id
     and p.account_id=t.account_id
    where op.phone_hash=p_phone_hash
      and op.status='active'
      and t.status in ('scheduled','active')
      and p.status='active'
      and p_at >= t.access_from
      and p_at < t.access_until
      and (
        p_selected_account_id is null
        or t.account_id=p_selected_account_id
      )
      and (
        p_selected_task_id is null
        or t.id=p_selected_task_id
      );
  end if;

  v_total := v_manager_count + v_guest_count + v_operational_count;

  if v_total=0 then
    -- Si se pidió contexto concreto, no degradar silenciosamente a otro modo.
    if p_selected_mode is not null
       or p_selected_account_id is not null
       or p_selected_stay_id is not null
       or p_selected_task_id is not null then
      return query
      select
        'unresolved'::text,
        'CONTEXT_NOT_FOUND'::text,
        null::uuid,
        null::uuid,
        null::uuid,
        null::uuid,
        null::uuid,
        null::uuid,
        null::uuid;
      return;
    end if;

    return query
    select
      'free'::text,
      null::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid;
    return;
  end if;

  if v_total>1 then
    return query
    select
      'unresolved'::text,
      'ACTOR_CONTEXT_AMBIGUOUS'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid;
    return;
  end if;

  -- ------------------------------------------------------------------------
  -- Exactly one manager context
  -- ------------------------------------------------------------------------
  if v_manager_count=1 then
    select
      m.account_id,
      m.id,
      m.role
    into
      v_account_id,
      v_account_member_id,
      v_member_role
    from public.concierge_account_members m
    where m.phone_hash=p_phone_hash
      and m.status='active'
      and (
        p_selected_account_id is null
        or m.account_id=p_selected_account_id
      )
      and (
        p_selected_mode is null
        or (p_selected_mode='manager' and m.role in ('owner','manager'))
        or (p_selected_mode='co_manager' and m.role='co_manager')
      )
    limit 1;

    return query
    select
      case
        when v_member_role='co_manager' then 'co_manager'
        else 'manager'
      end,
      null::text,
      v_account_id,
      v_account_member_id,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid;
    return;
  end if;

  -- ------------------------------------------------------------------------
  -- Exactly one guest context
  -- ------------------------------------------------------------------------
  if v_guest_count=1 then
    select
      s.account_id,
      s.property_id,
      s.id,
      sm.id
    into
      v_account_id,
      v_property_id,
      v_stay_id,
      v_stay_member_id
    from public.concierge_guest_identities gi
    join public.concierge_stay_members sm
      on sm.guest_identity_id=gi.id
    join public.concierge_stays s
      on s.id=sm.stay_id
     and s.account_id=sm.account_id
    join public.concierge_properties p
      on p.id=s.property_id
     and p.account_id=s.account_id
    where gi.phone_hash=p_phone_hash
      and gi.status='active'
      and (
         sm.status='active'
         or (
           sm.status='invited'
           and exists (
             select 1 from public.concierge_guest_invites inv
             where inv.stay_member_id=sm.id
               and inv.account_id=sm.account_id
               and inv.status='sent'
               and inv.sent_at is not null
               and inv.activated_at is null
               and inv.rejected_at is null
               and inv.expires_at > p_at
           )
         )
       )
      and sm.whatsapp_enabled=true
      and s.status in ('scheduled','active')
      and p.status='active'
      and p_at < s.check_out_at
      and (
        p_selected_account_id is null
        or s.account_id=p_selected_account_id
      )
      and (
        p_selected_stay_id is null
        or s.id=p_selected_stay_id
      )
    limit 1;

    return query
    select
      'concierge_guest'::text,
      null::text,
      v_account_id,
      null::uuid,
      v_property_id,
      v_stay_id,
      v_stay_member_id,
      null::uuid,
      null::uuid;
    return;
  end if;

  -- ------------------------------------------------------------------------
  -- Exactly one operational context
  -- ------------------------------------------------------------------------
  select
    t.account_id,
    t.property_id,
    op.id,
    t.id
  into
    v_account_id,
    v_property_id,
    v_operational_person_id,
    v_operational_task_id
  from public.concierge_operational_people op
  join public.concierge_operational_tasks t
    on t.operational_person_id=op.id
   and t.account_id=op.account_id
  join public.concierge_properties p
    on p.id=t.property_id
   and p.account_id=t.account_id
  where op.phone_hash=p_phone_hash
    and op.status='active'
    and t.status in ('scheduled','active')
    and p.status='active'
    and p_at >= t.access_from
    and p_at < t.access_until
    and (
      p_selected_account_id is null
      or t.account_id=p_selected_account_id
    )
    and (
      p_selected_task_id is null
      or t.id=p_selected_task_id
    )
  limit 1;

  return query
  select
    'operational'::text,
    null::text,
    v_account_id,
    null::uuid,
    v_property_id,
    null::uuid,
    null::uuid,
    v_operational_person_id,
    v_operational_task_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_resolve_entry_link(p_token_hash text, p_at timestamp with time zone DEFAULT now())
 RETURNS TABLE(result text, reason_code text, entry_link_id uuid, account_id uuid, property_id uuid, channel text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if p_token_hash is null
     or p_token_hash !~ '^[0-9a-f]{64}$' then
    return query
    select
      'deny'::text,
      'ENTRY_LINK_INVALID'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text;
    return;
  end if;

  return query
  select
    'context'::text,
    null::text,
    el.id,
    el.account_id,
    el.property_id,
    el.channel
  from public.concierge_entry_links el
  join public.concierge_properties p
    on p.id=el.property_id
   and p.account_id=el.account_id
  where el.token_hash=p_token_hash
    and el.active=true
    and (el.expires_at is null or p_at < el.expires_at)
    and p.status='active'
  limit 1;

  if not found then
    return query
    select
      'deny'::text,
      'ENTRY_LINK_NOT_ACTIVE'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_resolve_escalation_policy(p_account_id uuid, p_property_id uuid, p_severity text)
 RETURNS TABLE(policy_id uuid, scope_type text, manager_notify_after_minutes integer, backup_notify_after_minutes integer)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select
    ep.id,
    ep.scope_type,
    ep.manager_notify_after_minutes,
    ep.backup_notify_after_minutes
  from public.concierge_escalation_policies ep
  where ep.account_id=p_account_id
    and ep.status='active'
    and ep.severity=p_severity
    and (
      (ep.scope_type='property' and ep.property_id=p_property_id)
      or
      ep.scope_type='account'
    )
  order by
    case ep.scope_type
      when 'property' then 1
      when 'account' then 2
      else 99
    end
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_resolve_knowledge(p_account_id uuid, p_property_id uuid, p_knowledge_key text)
 RETURNS TABLE(knowledge_item_id uuid, knowledge_version_id uuid, scope_type text, category text, risk_level text, content text)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  with property_ctx as (
    select p.id as property_id, p.building_id
    from public.concierge_properties p
    where p.id=p_property_id
      and p.account_id=p_account_id
      and p.status in ('ready_for_review','active','paused')
  ),
  candidates as (
    select
      ki.id as knowledge_item_id,
      kv.id as knowledge_version_id,
      ki.scope_type,
      ki.category,
      ki.risk_level,
      kv.content,
      case ki.scope_type
        when 'property' then 1
        when 'building' then 2
        when 'account' then 3
        else 99
      end as precedence
    from public.concierge_knowledge_items ki
    join public.concierge_knowledge_versions kv
      on kv.id=ki.current_version_id
     and kv.knowledge_item_id=ki.id
     and kv.account_id=ki.account_id
    cross join property_ctx pc
    where ki.account_id=p_account_id
      and lower(ki.knowledge_key)=lower(trim(p_knowledge_key))
      and ki.status='active'
      and kv.status='approved'
      and (
        (ki.scope_type='property' and ki.property_id=pc.property_id)
        or
        (ki.scope_type='building' and pc.building_id is not null and ki.building_id=pc.building_id)
        or
        (ki.scope_type='account')
      )
  )
  select
    knowledge_item_id,
    knowledge_version_id,
    scope_type,
    category,
    risk_level,
    content
  from candidates
  order by precedence
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_resolve_manager_signup_followup(p_invite_id uuid, p_reviewer_auth_user_id uuid, p_decision text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
 IF p_invite_id IS NULL OR p_reviewer_auth_user_id IS NULL
   OR p_decision IS NULL OR p_decision NOT IN ('not_selected','shortlisted_pending_go_b')
 THEN RETURN 'INVALID_REQUEST'; END IF;
 UPDATE public.concierge_manager_signup_screenings s
 SET decision=p_decision,
     reviewed_by_auth_user_id=p_reviewer_auth_user_id,
     reviewed_at=now()
 FROM public.concierge_manager_signup_invites i
 WHERE s.invite_id=p_invite_id AND i.id=s.invite_id
   AND s.decision='needs_owner_followup'
   AND i.status='submitted'
   AND i.privacy_accepted=true
   AND i.privacy_notice_version='concierge-privacy-beta-v1-2026-10-11'
   AND i.beta_terms_version='beta-v1-2026-10-11'
 RETURNING s.invite_id INTO v_id;
 IF v_id IS NOT NULL THEN
   INSERT INTO public.concierge_manager_signup_screening_events (
     invite_id,previous_decision,decision,reviewer_auth_user_id
   ) VALUES (v_id,'needs_owner_followup',p_decision,p_reviewer_auth_user_id);
   RETURN 'FOLLOWUP_RESOLVED_NO_PROVISIONING';
 END IF;
 IF EXISTS (SELECT 1 FROM public.concierge_manager_signup_screenings
   WHERE invite_id=p_invite_id AND decision IN ('not_selected','shortlisted_pending_go_b'))
 THEN RETURN 'ALREADY_RESOLVED'; END IF;
 RETURN 'FOLLOWUP_NOT_REVIEWABLE';
END $function$
;

CREATE OR REPLACE FUNCTION public.concierge_resolve_manager_web_context(p_auth_user_id uuid)
 RETURNS TABLE(result text, reason_code text, account_id uuid, member_id uuid, member_role text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_identity public.concierge_manager_web_identities%rowtype;
  v_member public.concierge_account_members%rowtype;
begin
  if p_auth_user_id is null then
    return query
    select
      'deny'::text,
      'WEB_IDENTITY_UNKNOWN'::text,
      null::uuid,
      null::uuid,
      null::text;
    return;
  end if;

  select i.*
    into v_identity
  from public.concierge_manager_web_identities i
  where i.auth_user_id=p_auth_user_id
    and i.status='active'
  limit 1;

  if not found then
    return query
    select
      'deny'::text,
      'WEB_IDENTITY_UNKNOWN'::text,
      null::uuid,
      null::uuid,
      null::text;
    return;
  end if;

  select m.*
    into v_member
  from public.concierge_account_members m
  where m.id=v_identity.member_id
    and m.account_id=v_identity.account_id
  limit 1;

  if not found
     or v_member.status <> 'active' then
    return query
    select
      'deny'::text,
      'MANAGER_MEMBER_NOT_ACTIVE'::text,
      null::uuid,
      null::uuid,
      null::text;
    return;
  end if;

  return query
  select
    'allow'::text,
    null::text,
    v_member.account_id,
    v_member.id,
    v_member.role;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_resolve_request_policy(p_account_id uuid, p_property_id uuid, p_request_type text)
 RETURNS TABLE(policy_id uuid, scope_type text, handling_mode text, response_note text)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select
    rp.id,
    rp.scope_type,
    rp.handling_mode,
    rp.response_note
  from public.concierge_request_policies rp
  where rp.account_id=p_account_id
    and rp.status='active'
    and rp.request_type=p_request_type
    and (
      (rp.scope_type='property' and rp.property_id=p_property_id)
      or rp.scope_type='account'
    )
  order by
    case rp.scope_type
      when 'property' then 1
      when 'account' then 2
      else 99
    end
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_resolve_system_intervention(p_intervention_id uuid, p_resolved_at timestamp with time zone DEFAULT now())
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_count integer := 0;
begin
  update public.concierge_system_interventions i
     set resolved_at=p_resolved_at
   where i.id=p_intervention_id
     and i.resolved_at is null;

  get diagnostics v_count = row_count;

  return v_count=1;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_reveal_operational_secret(p_operational_person_id uuid, p_operational_task_id uuid, p_access_point_id uuid)
 RETURNS TABLE(result text, reason_code text, secret_version_id uuid, secret_value text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_account_id uuid;
  v_property_id uuid;

  v_auth_result text;
  v_reason_code text;
  v_secret_version_id uuid;
  v_vault_secret_id uuid;

  v_secret_value text;
begin
  select
    t.account_id,
    t.property_id
  into
    v_account_id,
    v_property_id
  from public.concierge_operational_tasks t
  where t.id=p_operational_task_id
    and t.operational_person_id=p_operational_person_id;

  if not found then
    return query
    select
      'deny'::text,
      'OPERATIONAL_TASK_OUT_OF_SCOPE'::text,
      null::uuid,
      null::text;
    return;
  end if;

  -- GATE OBLIGATORIO ANTES DE VAULT.
  select
    a.result,
    a.reason_code,
    a.secret_version_id,
    a.vault_secret_id
  into
    v_auth_result,
    v_reason_code,
    v_secret_version_id,
    v_vault_secret_id
  from public.concierge_authorize_operational_secret_access(
    p_operational_person_id,
    p_operational_task_id,
    p_access_point_id
  ) a;

  if v_auth_result <> 'allow' then
    insert into public.concierge_audit_events (
      account_id,
      actor_type,
      actor_ref,
      property_id,
      stay_id,
      action_type,
      entity_type,
      entity_id,
      result,
      reason_code
    )
    values (
      v_account_id,
      'operational',
      p_operational_person_id,
      v_property_id,
      null,
      'secret_access_denied',
      'access_point',
      p_access_point_id,
      'denied',
      coalesce(v_reason_code,'RESOURCE_OUT_OF_SCOPE')
    );

    return query
    select
      'deny'::text,
      coalesce(v_reason_code,'RESOURCE_OUT_OF_SCOPE')::text,
      null::uuid,
      null::text;
    return;
  end if;

  -- SOLO DESPUÉS DE ALLOW.
  select ds.decrypted_secret
    into v_secret_value
  from vault.decrypted_secrets ds
  where ds.id=v_vault_secret_id;

  if not found or v_secret_value is null then
    insert into public.concierge_audit_events (
      account_id,
      actor_type,
      actor_ref,
      property_id,
      stay_id,
      action_type,
      entity_type,
      entity_id,
      result,
      reason_code
    )
    values (
      v_account_id,
      'operational',
      p_operational_person_id,
      v_property_id,
      null,
      'secret_access_failed',
      'access_point',
      p_access_point_id,
      'failed',
      'VAULT_SECRET_NOT_FOUND'
    );

    return query
    select
      'deny'::text,
      'VAULT_SECRET_NOT_FOUND'::text,
      null::uuid,
      null::text;
    return;
  end if;

  insert into public.concierge_audit_events (
    account_id,
    actor_type,
    actor_ref,
    property_id,
    stay_id,
    action_type,
    entity_type,
    entity_id,
    result,
    reason_code
  )
  values (
    v_account_id,
    'operational',
    p_operational_person_id,
    v_property_id,
    null,
    'secret_access_allowed',
    'access_point',
    p_access_point_id,
    'allowed',
    null
  );

  return query
  select
    'allow'::text,
    null::text,
    v_secret_version_id,
    v_secret_value;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_reveal_secret(p_guest_identity_id uuid, p_stay_member_id uuid, p_access_point_id uuid)
 RETURNS TABLE(result text, reason_code text, secret_version_id uuid, secret_value text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_account_id uuid;
  v_stay_id uuid;
  v_property_id uuid;

  v_auth_result text;
  v_reason_code text;
  v_secret_version_id uuid;
  v_vault_secret_id uuid;

  v_secret_value text;
begin
  -- Contexto mínimo para auditar. Si stay_member no existe, no inventamos tenant.
  select
    sm.account_id,
    sm.stay_id,
    s.property_id
  into
    v_account_id,
    v_stay_id,
    v_property_id
  from public.concierge_stay_members sm
  join public.concierge_stays s
    on s.id=sm.stay_id
   and s.account_id=sm.account_id
  where sm.id=p_stay_member_id;

  if not found then
    return query
    select
      'deny'::text,
      'MEMBER_NOT_ACTIVE'::text,
      null::uuid,
      null::text;
    return;
  end if;

  -- GATE OBLIGATORIO: autorización antes de cualquier lectura de Vault.
  select
    a.result,
    a.reason_code,
    a.secret_version_id,
    a.vault_secret_id
  into
    v_auth_result,
    v_reason_code,
    v_secret_version_id,
    v_vault_secret_id
  from public.concierge_authorize_secret_access(
    p_guest_identity_id,
    p_stay_member_id,
    p_access_point_id
  ) a;

  if v_auth_result <> 'allow' then
    insert into public.concierge_audit_events (
      account_id,
      actor_type,
      actor_ref,
      property_id,
      stay_id,
      action_type,
      entity_type,
      entity_id,
      result,
      reason_code
    )
    values (
      v_account_id,
      'guest',
      p_guest_identity_id,
      v_property_id,
      v_stay_id,
      'secret_access_denied',
      'access_point',
      p_access_point_id,
      'denied',
      coalesce(v_reason_code, 'RESOURCE_OUT_OF_SCOPE')
    );

    return query
    select
      'deny'::text,
      coalesce(v_reason_code, 'RESOURCE_OUT_OF_SCOPE')::text,
      null::uuid,
      null::text;
    return;
  end if;

  -- SOLO DESPUÉS DE ALLOW.
  select ds.decrypted_secret
    into v_secret_value
  from vault.decrypted_secrets ds
  where ds.id=v_vault_secret_id;

  if not found or v_secret_value is null then
    insert into public.concierge_audit_events (
      account_id,
      actor_type,
      actor_ref,
      property_id,
      stay_id,
      action_type,
      entity_type,
      entity_id,
      result,
      reason_code
    )
    values (
      v_account_id,
      'guest',
      p_guest_identity_id,
      v_property_id,
      v_stay_id,
      'secret_access_failed',
      'access_point',
      p_access_point_id,
      'failed',
      'VAULT_SECRET_NOT_FOUND'
    );

    return query
    select
      'deny'::text,
      'VAULT_SECRET_NOT_FOUND'::text,
      null::uuid,
      null::text;
    return;
  end if;

  insert into public.concierge_audit_events (
    account_id,
    actor_type,
    actor_ref,
    property_id,
    stay_id,
    action_type,
    entity_type,
    entity_id,
    result,
    reason_code
  )
  values (
    v_account_id,
    'guest',
    p_guest_identity_id,
    v_property_id,
    v_stay_id,
    'secret_access_allowed',
    'access_point',
    p_access_point_id,
    'allowed',
    null
  );

  return query
  select
    'allow'::text,
    null::text,
    v_secret_version_id,
    v_secret_value;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_revoke_access_secret(p_account_id uuid, p_secret_version_id uuid, p_revoked_by_account_member_id uuid)
 RETURNS TABLE(secret_version_id uuid, resulting_status text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_secret public.concierge_secret_versions%rowtype;
  v_actor_id uuid;
begin
  select sv.*
    into v_secret
  from public.concierge_secret_versions sv
  where sv.id = p_secret_version_id
    and sv.account_id = p_account_id
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'RESOURCE_OUT_OF_SCOPE';
  end if;

  select m.id
    into v_actor_id
  from public.concierge_account_members m
  where m.id = p_revoked_by_account_member_id
    and m.account_id = p_account_id
    and m.status = 'active';

  if not found then
    raise exception using
      errcode = '42501',
      message = 'MANAGER_PERMISSION_DENIED';
  end if;

  if v_secret.status = 'revoked' then
    return query
    select v_secret.id, 'revoked'::text;
    return;
  end if;

  update public.concierge_secret_versions
     set status = 'revoked',
         revoked_at = now()
   where id = v_secret.id;

  return query
  select v_secret.id, 'revoked'::text;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_rotate_access_secret(p_account_id uuid, p_access_point_id uuid, p_created_by_account_member_id uuid, p_secret_value text, p_rotation_reason text DEFAULT NULL::text)
 RETURNS TABLE(secret_version_id uuid, version_number integer, resulting_status text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_access_point_id uuid;
  v_actor_id uuid;
  v_next_version integer;
  v_vault_secret_id uuid;
  v_secret_version_id uuid;
  v_vault_name text;
begin
  if p_secret_value is null
     or octet_length(p_secret_value) < 1
     or octet_length(p_secret_value) > 4096 then
    raise exception using
      errcode = '22023',
      message = 'INVALID_SECRET_VALUE';
  end if;

  if p_rotation_reason is not null
     and (
       length(trim(p_rotation_reason)) < 1
       or length(trim(p_rotation_reason)) > 500
     ) then
    raise exception using
      errcode = '22023',
      message = 'INVALID_ROTATION_REASON';
  end if;

  -- Bloqueo por access point: evita dos rotaciones concurrentes.
  select ap.id
    into v_access_point_id
  from public.concierge_access_points ap
  where ap.id = p_access_point_id
    and ap.account_id = p_account_id
    and ap.status = 'active'
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'RESOURCE_OUT_OF_SCOPE';
  end if;

  -- El actor debe existir, estar activo y pertenecer al mismo account.
  -- Los permisos finos se validan antes, en la capa de autorización.
  select m.id
    into v_actor_id
  from public.concierge_account_members m
  where m.id = p_created_by_account_member_id
    and m.account_id = p_account_id
    and m.status = 'active';

  if not found then
    raise exception using
      errcode = '42501',
      message = 'MANAGER_PERMISSION_DENIED';
  end if;

  select coalesce(max(sv.version_number), 0) + 1
    into v_next_version
  from public.concierge_secret_versions sv
  where sv.access_point_id = p_access_point_id;

  -- La versión anterior deja de ser revelable antes de crear la nueva metadata.
  update public.concierge_secret_versions sv
     set status = 'retired',
         retired_at = now()
   where sv.access_point_id = p_access_point_id
     and sv.status = 'active';

  v_vault_name :=
    'chebot-concierge:' || p_access_point_id::text || ':v' || v_next_version::text;

  -- El plaintext se entrega directamente a Vault y no se guarda en public.*.
  select vault.create_secret(
    p_secret_value,
    v_vault_name,
    'Chebot Concierge managed access secret'
  )
  into v_vault_secret_id;

  insert into public.concierge_secret_versions (
    account_id,
    access_point_id,
    version_number,
    vault_secret_id,
    status,
    created_by_account_member_id,
    rotation_reason
  )
  values (
    p_account_id,
    p_access_point_id,
    v_next_version,
    v_vault_secret_id,
    'active',
    p_created_by_account_member_id,
    nullif(trim(p_rotation_reason), '')
  )
  returning id into v_secret_version_id;

  return query
  select
    v_secret_version_id,
    v_next_version,
    'active'::text;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_select_unique_pending_guest_invitation(p_phone_hash text, p_at timestamp with time zone DEFAULT now())
 RETURNS TABLE(result text, reason_code text, selected_stay_id uuid)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  with eligible_stays as (
    select distinct s.id
    from public.concierge_guest_identities gi
    join public.concierge_stay_members sm on sm.guest_identity_id=gi.id
    join public.concierge_stays s on s.id=sm.stay_id and s.account_id=sm.account_id
    join public.concierge_properties p on p.id=s.property_id and p.account_id=s.account_id
    join public.concierge_guest_invites inv on inv.stay_member_id=sm.id and inv.account_id=sm.account_id
    where gi.phone_hash=p_phone_hash
      and gi.status='active'
      and sm.status='invited'
      and sm.whatsapp_enabled=true
      and s.status in ('scheduled','active')
      and p.status='active'
      and p_at<s.check_out_at
      and inv.status='sent'
      and inv.sent_at is not null
      and inv.activated_at is null
      and inv.rejected_at is null
      and inv.expires_at>p_at
  )
  select
    case when count(*)=1 then 'allow'::text else 'deny'::text end,
    case when count(*)=0 then 'GUEST_INVITE_NOT_FOUND_OR_EXPIRED'::text
         when count(*)>1 then 'GUEST_INVITE_AMBIGUOUS'::text
         else null::text end,
    case when count(*)=1 then (array_agg(id))[1] else null::uuid end
  from eligible_stays;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_set_operational_task_status(p_operational_task_id uuid, p_account_member_id uuid, p_new_status text)
 RETURNS TABLE(operational_task_id uuid, resulting_status text, revoked_authorizations integer)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_task public.concierge_operational_tasks%rowtype;

  v_member_role text;
  v_member_status text;
  v_can_manage_team boolean := false;

  v_revoked integer := 0;
begin
  if p_new_status not in ('active','completed','revoked','expired') then
    raise exception using
      errcode='22023',
      message='INVALID_OPERATIONAL_TASK_STATUS';
  end if;

  select t.*
    into v_task
  from public.concierge_operational_tasks t
  where t.id=p_operational_task_id
  for update;

  if not found then
    raise exception using
      errcode='42501',
      message='OPERATIONAL_TASK_OUT_OF_SCOPE';
  end if;

  select m.role, m.status
    into v_member_role, v_member_status
  from public.concierge_account_members m
  where m.id=p_account_member_id
    and m.account_id=v_task.account_id;

  if not found or v_member_status <> 'active' then
    raise exception using
      errcode='42501',
      message='MANAGER_PERMISSION_DENIED';
  end if;

  if v_member_role in ('owner','manager') then
    v_can_manage_team := true;
  elsif v_member_role='co_manager' then
    select coalesce(mp.can_manage_team,false)
      into v_can_manage_team
    from public.concierge_member_property_permissions mp
    where mp.account_id=v_task.account_id
      and mp.member_id=p_account_member_id
      and mp.property_id=v_task.property_id;
  end if;

  if not coalesce(v_can_manage_team,false) then
    raise exception using
      errcode='42501',
      message='MANAGER_PERMISSION_DENIED';
  end if;

  if v_task.status in ('completed','revoked','expired') then
    if v_task.status=p_new_status then
      return query
      select v_task.id, v_task.status, 0;
      return;
    end if;

    raise exception using
      errcode='23514',
      message='OPERATIONAL_TASK_OUT_OF_SCOPE';
  end if;

  if p_new_status in ('completed','revoked','expired') then
    update public.concierge_access_authorizations a
       set status='revoked',
           revoked_at=coalesce(a.revoked_at,now()),
           updated_at=now()
     where a.account_id=v_task.account_id
       and a.operational_task_id=v_task.id
       and a.operational_person_id=v_task.operational_person_id
       and a.status='active';

    get diagnostics v_revoked = row_count;
  end if;

  update public.concierge_operational_tasks t
     set
       status=p_new_status,
       completed_at=
         case
           when p_new_status='completed' then now()
           else null
         end,
       revoked_at=
         case
           when p_new_status='revoked' then now()
           else null
         end,
       updated_at=now()
   where t.id=v_task.id;

  insert into public.concierge_audit_events (
    account_id,
    actor_type,
    actor_ref,
    property_id,
    stay_id,
    action_type,
    entity_type,
    entity_id,
    result,
    reason_code
  )
  values (
    v_task.account_id,
    'account_member',
    p_account_member_id,
    v_task.property_id,
    null,
    'operational_task_status_changed',
    'operational_task',
    v_task.id,
    case
      when p_new_status='revoked' then 'revoked'
      else 'changed'
    end,
    null
  );

  return query
  select v_task.id, p_new_status, v_revoked;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_start_or_refresh_session(p_phone_hash text, p_selected_mode text DEFAULT NULL::text, p_selected_account_id uuid DEFAULT NULL::uuid, p_selected_stay_id uuid DEFAULT NULL::uuid, p_selected_task_id uuid DEFAULT NULL::uuid, p_language text DEFAULT 'es'::text, p_current_intent text DEFAULT NULL::text, p_at timestamp with time zone DEFAULT now())
 RETURNS TABLE(session_id uuid, resolved_mode text, reason_code text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_ctx record;
  v_unselected_ctx record;
  v_existing public.concierge_sessions%rowtype;
  v_session_id uuid;
begin
  if p_language not in ('es','en','it','pt') then
    raise exception using
      errcode='22023',
      message='INVALID_LANGUAGE';
  end if;

  if p_current_intent is not null
     and (
       length(trim(p_current_intent)) < 1
       or length(trim(p_current_intent)) > 160
     ) then
    raise exception using
      errcode='22023',
      message='INVALID_CURRENT_INTENT';
  end if;

  select *
    into v_ctx
  from public.concierge_resolve_actor_context(
    p_phone_hash,
    p_selected_mode,
    p_selected_account_id,
    p_selected_stay_id,
    p_selected_task_id,
    p_at
  );

  -- Beta V1: expired/completed guest stay must not strand the number in
  -- an old selected Concierge context. Only downgrade to Free if:
  -- (a) the expired selected stay genuinely belongs to this exact phone,
  -- (b) that stay ended/was cancelled,
  -- (c) resolving with NO selection finds precisely Free (no other roles).
  -- Any ambiguous or currently privileged alternative still fails closed.
  if v_ctx.resolved_mode='unresolved'
     and v_ctx.reason_code='CONTEXT_NOT_FOUND'
     and p_selected_mode='concierge_guest'
     and p_selected_stay_id is not null
     and p_selected_account_id is null
     and p_selected_task_id is null
     and exists (
       select 1
         from public.concierge_guest_identities gi
         join public.concierge_stay_members sm
           on sm.guest_identity_id=gi.id
         join public.concierge_stays s
           on s.id=sm.stay_id and s.account_id=sm.account_id
       where gi.phone_hash=p_phone_hash
         and sm.stay_id=p_selected_stay_id
         and sm.member_role='primary_guest'
         and (s.status in ('completed','cancelled','revoked')
              or s.check_out_at <= p_at)
     )
  then
    select *
      into v_unselected_ctx
    from public.concierge_resolve_actor_context(
      p_phone_hash,
      null::text,
      null::uuid,
      null::uuid,
      null::uuid,
      p_at
    );
    if v_unselected_ctx.resolved_mode='free' then
      v_ctx := v_unselected_ctx;
    end if;
  end if;

  if v_ctx.resolved_mode='unresolved' then
    return query
    select
      null::uuid,
      v_ctx.resolved_mode,
      v_ctx.reason_code;
    return;
  end if;

  /*
   * Activación de invitación:
   * solo cuando el mismo número ya fue resuelto como huésped Concierge.
   *
   * No activa:
   * - invitaciones todavía en created
   * - vencidas
   * - rechazadas
   * - revocadas
   * - invitaciones de otra estadía/huésped
   */
  if v_ctx.resolved_mode='concierge_guest'
     and v_ctx.stay_member_id is not null then

    with activated_invite as (
      update public.concierge_guest_invites inv
         set status='activated',
             activated_at=p_at
       where inv.id = (
         select candidate.id
           from public.concierge_guest_invites candidate
          where candidate.stay_member_id=v_ctx.stay_member_id
            and candidate.account_id=v_ctx.account_id
            and candidate.status='sent'
            and candidate.sent_at is not null
            and candidate.activated_at is null
            and candidate.rejected_at is null
            and (
              candidate.expires_at is null
              or candidate.expires_at > p_at
            )
          order by candidate.created_at desc
          limit 1
       )
       returning inv.stay_member_id, inv.account_id
    )
    update public.concierge_stay_members as sm
       set status='active',
           activated_at=coalesce(sm.activated_at,p_at)
      from activated_invite as ai
     where sm.id=ai.stay_member_id
       and sm.id=v_ctx.stay_member_id
       and sm.account_id=ai.account_id
       and sm.account_id=v_ctx.account_id
       and sm.stay_id=v_ctx.stay_id
       and sm.status='invited'
       and sm.whatsapp_enabled=true;

  end if;

  select s.*
    into v_existing
  from public.concierge_sessions s
  where s.phone_hash=p_phone_hash
    and s.status='active'
  for update;

  if found
     and v_existing.mode=v_ctx.resolved_mode
     and v_existing.account_id is not distinct from v_ctx.account_id
     and v_existing.account_member_id is not distinct from v_ctx.account_member_id
     and v_existing.property_id is not distinct from v_ctx.property_id
     and v_existing.stay_id is not distinct from v_ctx.stay_id
     and v_existing.stay_member_id is not distinct from v_ctx.stay_member_id
     and v_existing.operational_person_id is not distinct from v_ctx.operational_person_id
     and v_existing.operational_task_id is not distinct from v_ctx.operational_task_id then

    update public.concierge_sessions s
       set language=p_language,
           current_intent=nullif(trim(p_current_intent),''),
           last_activity_at=p_at
     where s.id=v_existing.id;

    return query
    select
      v_existing.id,
      v_ctx.resolved_mode,
      null::text;
    return;
  end if;

  if found then
    update public.concierge_sessions s
       set status='closed',
           ended_at=p_at,
           last_activity_at=p_at
     where s.id=v_existing.id;
  end if;

  insert into public.concierge_sessions (
    phone_hash,
    mode,
    account_id,
    account_member_id,
    property_id,
    stay_id,
    stay_member_id,
    operational_person_id,
    operational_task_id,
    language,
    current_intent,
    status,
    started_at,
    last_activity_at
  )
  values (
    p_phone_hash,
    v_ctx.resolved_mode,
    v_ctx.account_id,
    v_ctx.account_member_id,
    v_ctx.property_id,
    v_ctx.stay_id,
    v_ctx.stay_member_id,
    v_ctx.operational_person_id,
    v_ctx.operational_task_id,
    p_language,
    nullif(trim(p_current_intent),''),
    'active',
    p_at,
    p_at
  )
  returning id into v_session_id;

  return query
  select
    v_session_id,
    v_ctx.resolved_mode,
    null::text;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_submit_manager_signup_request(p_token_sha256 text, p_email text, p_manager_name text, p_business_name text, p_terms_accepted boolean, p_privacy_accepted boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id uuid;
BEGIN
 IF p_token_sha256 IS NULL OR p_token_sha256 !~ '^[0-9a-f]{64}$'
    OR p_email IS NULL OR length(btrim(p_email)) NOT BETWEEN 5 AND 254
    OR p_manager_name IS NULL OR length(btrim(p_manager_name)) NOT BETWEEN 2 AND 100
    OR p_business_name IS NULL OR length(btrim(p_business_name)) NOT BETWEEN 2 AND 120
    OR NOT coalesce(p_terms_accepted,false) OR NOT coalesce(p_privacy_accepted,false)
    OR position('@' IN btrim(p_email)) < 2
 THEN RETURN 'INVALID_REQUEST'; END IF;

 UPDATE public.concierge_manager_signup_invites AS i
 SET status='submitted',
     submitted_at=now(),
     manager_display_name=btrim(p_manager_name),
     business_display_name=btrim(p_business_name),
     beta_terms_version='beta-v1-2026-10-11',
     privacy_accepted=true,
     privacy_notice_version='concierge-privacy-beta-v1-2026-10-11'
 WHERE i.invite_token_sha256=p_token_sha256 AND i.status='issued'
   AND i.expires_at > now() AND i.email_normalized=lower(btrim(p_email))
 RETURNING i.id INTO v_id;

 IF v_id IS NULL THEN RETURN 'INVITE_UNAVAILABLE'; END IF;
 RETURN 'PENDING_REVIEW';
END $function$
;

CREATE OR REPLACE FUNCTION public.concierge_sync_notification_outbox(p_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_cancelled bigint := 0;
  v_upserted bigint := 0;
begin

  update public.concierge_notification_outbox o
     set status = 'cancelled',
         cancelled_at = p_at,
         updated_at = p_at
  where o.status in ('pending', 'failed')
    and (
      not exists (
        select 1
        from public.concierge_stays s
        join public.concierge_stay_members sm
          on sm.stay_id = s.id
        where s.id = o.stay_id
          and sm.id = o.stay_member_id
          and s.status in ('scheduled', 'active')
          and sm.member_role = 'primary_guest'
          and sm.whatsapp_enabled = true
          and sm.guest_identity_id is not null
          and sm.status in ('invited', 'active')
      )

      or (
        o.notification_type = 'prearrival'
        and exists (
          select 1
          from public.concierge_stays s
          where s.id = o.stay_id
            and s.check_in_at <= p_at
        )
      )

      or (
        o.notification_type = 'access_enabled'
        and exists (
          select 1
          from public.concierge_stays s
          where s.id = o.stay_id
            and (
              s.access_from < p_at - interval '15 minutes'
              or s.check_out_at <= p_at
              or s.access_until <= p_at
            )
        )
      )

      or (
        o.notification_type = 'checkout'
        and exists (
          select 1
          from public.concierge_stays s
          where s.id = o.stay_id
            and (s.check_out_at <= p_at or s.check_out_at <= s.check_in_at + interval '4 hours')
        )
      )
    );

  get diagnostics v_cancelled = row_count;

  with eligible as (
    select
      s.account_id,
      s.id as stay_id,
      sm.id as stay_member_id,

      case
        when p.default_language in ('es','en','it','pt')
          then p.default_language
        else 'es'
      end as language,

      s.check_in_at,
      s.check_out_at,
      s.access_from,
      s.access_until

    from public.concierge_stays s

    join public.concierge_properties p
      on p.id = s.property_id
     and p.account_id = s.account_id

    join public.concierge_stay_members sm
      on sm.stay_id = s.id
     and sm.account_id = s.account_id

    where s.status in ('scheduled', 'active')
      and sm.member_role = 'primary_guest'
      and sm.whatsapp_enabled = true
      and sm.guest_identity_id is not null
      and sm.status in ('invited', 'active')
  ),

  candidate_notifications as (

    select
      account_id,
      stay_id,
      stay_member_id,
      'prearrival'::text as notification_type,
      language,
      check_in_at - interval '24 hours' as due_at
    from eligible
    where check_in_at > p_at

    union all

    select
      account_id,
      stay_id,
      stay_member_id,
      'access_enabled',
      language,
      access_from
    from eligible
    where check_out_at > p_at
      and access_until > p_at
      and (
        access_from >= p_at
        or (
          access_from >= p_at - interval '15 minutes'
          and exists (
            select 1
            from public.concierge_notification_outbox prior
            where prior.account_id = eligible.account_id
              and prior.stay_id = eligible.stay_id
              and prior.stay_member_id = eligible.stay_member_id
              and prior.notification_type = 'access_enabled'
              and prior.channel = 'whatsapp'
              and prior.status = 'failed'
              and prior.attempt_count < 3
              and prior.due_at = eligible.access_from
          )
        )
      )

    union all

    select
      account_id,
      stay_id,
      stay_member_id,
      'checkout',
      language,
      case
        when check_out_at >= check_in_at + interval '27 hours'
          then check_out_at - interval '24 hours'
        else check_out_at - interval '3 hours'
      end
    from eligible
    where check_out_at > p_at
      and check_out_at > check_in_at + interval '4 hours'
  ),

  written as (
    insert into public.concierge_notification_outbox (
      account_id,
      stay_id,
      stay_member_id,
      notification_type,
      channel,
      language,
      due_at,
      status,
      attempt_count,
      idempotency_key,
      created_at,
      updated_at
    )

    select
      n.account_id,
      n.stay_id,
      n.stay_member_id,
      n.notification_type,
      'whatsapp',
      n.language,
      n.due_at,
      'pending',
      0,
      concat(
        'stay:',
        n.stay_id::text,
        ':member:',
        n.stay_member_id::text,
        ':',
        n.notification_type
      ),
      p_at,
      p_at

    from candidate_notifications n

    on conflict (idempotency_key)
    do update
       set due_at =
             case
               when public.concierge_notification_outbox.status = 'pending'
                 then excluded.due_at

               when public.concierge_notification_outbox.status = 'failed'
                    and public.concierge_notification_outbox.attempt_count < 3
                 then excluded.due_at

               else public.concierge_notification_outbox.due_at
             end,

           language = excluded.language,

           status =
             case
               when public.concierge_notification_outbox.status = 'failed'
                    and public.concierge_notification_outbox.attempt_count < 3
                 then 'pending'
               else public.concierge_notification_outbox.status
             end,

           last_error =
             case
               when public.concierge_notification_outbox.status = 'failed'
                    and public.concierge_notification_outbox.attempt_count < 3
                 then null
               else public.concierge_notification_outbox.last_error
             end,

           updated_at = p_at

    returning id
  )

  select count(*)
    into v_upserted
  from written;

  return jsonb_build_object(
    'ok', true,
    'upserted', v_upserted,
    'cancelled', v_cancelled,
    'max_attempts', 3,
    'at', p_at
  );

end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_validate_access_authorization()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  -- guest
  v_stay_account_id uuid;
  v_guest_property_id uuid;
  v_guest_building_id uuid;
  v_stay_access_from timestamptz;
  v_stay_access_until timestamptz;

  -- operational
  v_task_account_id uuid;
  v_task_property_id uuid;
  v_task_building_id uuid;
  v_task_access_from timestamptz;
  v_task_access_until timestamptz;
  v_task_status text;
  v_person_status text;

  -- access point
  v_ap_scope text;
  v_ap_property_id uuid;
  v_ap_building_id uuid;
  v_ap_status text;

  -- shared
  v_grantor_status text;
  v_policy_ok boolean := false;
begin
  -- La revocación debe seguir siendo posible aunque la policy/AP/task
  -- haya cambiado después del grant.
  if NEW.status='revoked' then
    NEW.updated_at := now();
    return NEW;
  end if;

  -- ------------------------------------------------------------------------
  -- GUEST BRANCH: conserva la lógica aprobada de Migración 07.
  -- ------------------------------------------------------------------------
  if NEW.stay_member_id is not null then
    select
      s.account_id,
      s.property_id,
      p.building_id,
      s.access_from,
      s.access_until
    into
      v_stay_account_id,
      v_guest_property_id,
      v_guest_building_id,
      v_stay_access_from,
      v_stay_access_until
    from public.concierge_stay_members sm
    join public.concierge_stays s
      on s.id=sm.stay_id
     and s.account_id=sm.account_id
    join public.concierge_properties p
      on p.id=s.property_id
     and p.account_id=s.account_id
    where sm.id=NEW.stay_member_id
      and sm.account_id=NEW.account_id;

    if not found then
      raise exception using
        errcode='23503',
        message='MEMBER_NOT_FOUND';
    end if;

    select
      ap.scope_type,
      ap.property_id,
      ap.building_id,
      ap.status
    into
      v_ap_scope,
      v_ap_property_id,
      v_ap_building_id,
      v_ap_status
    from public.concierge_access_points ap
    where ap.id=NEW.access_point_id
      and ap.account_id=NEW.account_id;

    if not found or v_ap_status <> 'active' then
      raise exception using
        errcode='23514',
        message='RESOURCE_OUT_OF_SCOPE';
    end if;

    if not (
      (
        v_ap_scope='property'
        and v_ap_property_id=v_guest_property_id
      )
      or
      (
        v_ap_scope='building'
        and v_guest_building_id is not null
        and v_ap_building_id=v_guest_building_id
      )
    ) then
      raise exception using
        errcode='23514',
        message='PROPERTY_MISMATCH';
    end if;

    select exists (
      select 1
      from public.concierge_access_point_policies pol
      where pol.access_point_id=NEW.access_point_id
        and pol.account_id=NEW.account_id
        and pol.subject_type='stay_member'
        and pol.requires_explicit_authorization=true
        and pol.window_source='stay_access_window'
        and pol.status='active'
    )
    into v_policy_ok;

    if not v_policy_ok then
      raise exception using
        errcode='23514',
        message='RESOURCE_OUT_OF_SCOPE';
    end if;

    if NEW.authorized_from < v_stay_access_from
       or NEW.authorized_until > v_stay_access_until then
      raise exception using
        errcode='23514',
        message='AUTHORIZATION_OUTSIDE_STAY_WINDOW';
    end if;

  -- ------------------------------------------------------------------------
  -- OPERATIONAL BRANCH.
  -- ------------------------------------------------------------------------
  else
    select
      t.account_id,
      t.property_id,
      p.building_id,
      t.access_from,
      t.access_until,
      t.status,
      op.status
    into
      v_task_account_id,
      v_task_property_id,
      v_task_building_id,
      v_task_access_from,
      v_task_access_until,
      v_task_status,
      v_person_status
    from public.concierge_operational_tasks t
    join public.concierge_operational_people op
      on op.id=t.operational_person_id
     and op.account_id=t.account_id
    join public.concierge_properties p
      on p.id=t.property_id
     and p.account_id=t.account_id
    where t.id=NEW.operational_task_id
      and t.account_id=NEW.account_id
      and t.operational_person_id=NEW.operational_person_id;

    if not found
       or v_person_status <> 'active'
       or v_task_status not in ('scheduled','active') then
      raise exception using
        errcode='23514',
        message='OPERATIONAL_TASK_OUT_OF_SCOPE';
    end if;

    select
      ap.scope_type,
      ap.property_id,
      ap.building_id,
      ap.status
    into
      v_ap_scope,
      v_ap_property_id,
      v_ap_building_id,
      v_ap_status
    from public.concierge_access_points ap
    where ap.id=NEW.access_point_id
      and ap.account_id=NEW.account_id;

    if not found or v_ap_status <> 'active' then
      raise exception using
        errcode='23514',
        message='RESOURCE_OUT_OF_SCOPE';
    end if;

    if not (
      (
        v_ap_scope='property'
        and v_ap_property_id=v_task_property_id
      )
      or
      (
        v_ap_scope='building'
        and v_task_building_id is not null
        and v_ap_building_id=v_task_building_id
      )
    ) then
      raise exception using
        errcode='23514',
        message='PROPERTY_MISMATCH';
    end if;

    select exists (
      select 1
      from public.concierge_access_point_policies pol
      where pol.access_point_id=NEW.access_point_id
        and pol.account_id=NEW.account_id
        and pol.subject_type='operational_person'
        and pol.requires_explicit_authorization=true
        and pol.window_source='authorization_window'
        and pol.status='active'
    )
    into v_policy_ok;

    if not v_policy_ok then
      raise exception using
        errcode='23514',
        message='ACCESS_POINT_NOT_AUTHORIZED';
    end if;

    if NEW.authorized_from < v_task_access_from
       or NEW.authorized_until > v_task_access_until then
      raise exception using
        errcode='23514',
        message='OPERATIONAL_TASK_OUT_OF_SCOPE';
    end if;
  end if;

  select m.status
    into v_grantor_status
  from public.concierge_account_members m
  where m.id=NEW.granted_by_account_member_id
    and m.account_id=NEW.account_id;

  if not found or v_grantor_status <> 'active' then
    raise exception using
      errcode='23514',
      message='MANAGER_PERMISSION_DENIED';
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_validate_analytics_event_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_stay_property_id uuid;
begin
  if new.stay_id is not null
     and new.property_id is not null then

    select s.property_id
      into v_stay_property_id
    from public.concierge_stays s
    where s.id=new.stay_id
      and s.account_id=new.account_id;

    if v_stay_property_id is null
       or v_stay_property_id <> new.property_id then
      raise exception using
        errcode='23514',
        message='ANALYTICS_SCOPE_MISMATCH';
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_validate_incident_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_stay_property_id uuid;
  v_reporter_stay_id uuid;
  v_property_building_id uuid;

  v_knowledge_scope_type text;
  v_knowledge_property_id uuid;
  v_knowledge_building_id uuid;
begin
  select s.property_id
    into v_stay_property_id
  from public.concierge_stays s
  where s.id=NEW.stay_id
    and s.account_id=NEW.account_id;

  if not found or v_stay_property_id <> NEW.property_id then
    raise exception using
      errcode='23514',
      message='PROPERTY_MISMATCH';
  end if;

  select sm.stay_id
    into v_reporter_stay_id
  from public.concierge_stay_members sm
  where sm.id=NEW.reported_by_stay_member_id
    and sm.account_id=NEW.account_id;

  if not found or v_reporter_stay_id <> NEW.stay_id then
    raise exception using
      errcode='23514',
      message='RESOURCE_OUT_OF_SCOPE';
  end if;

  if NEW.used_knowledge_item_id is not null then
    select p.building_id
      into v_property_building_id
    from public.concierge_properties p
    where p.id=NEW.property_id
      and p.account_id=NEW.account_id;

    select
      ki.scope_type,
      ki.property_id,
      ki.building_id
    into
      v_knowledge_scope_type,
      v_knowledge_property_id,
      v_knowledge_building_id
    from public.concierge_knowledge_items ki
    where ki.id=NEW.used_knowledge_item_id
      and ki.account_id=NEW.account_id;

    if not found then
      raise exception using
        errcode='23514',
        message='RESOURCE_OUT_OF_SCOPE';
    end if;

    if not (
      v_knowledge_scope_type='account'
      or
      (
        v_knowledge_scope_type='property'
        and v_knowledge_property_id=NEW.property_id
      )
      or
      (
        v_knowledge_scope_type='building'
        and v_property_building_id is not null
        and v_knowledge_building_id=v_property_building_id
      )
    ) then
      raise exception using
        errcode='23514',
        message='KNOWLEDGE_SCOPE_MISMATCH';
    end if;
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.concierge_validate_request_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_stay_property_id uuid;
  v_requester_stay_id uuid;
  v_policy_scope_type text;
  v_policy_property_id uuid;
begin
  select s.property_id
    into v_stay_property_id
  from public.concierge_stays s
  where s.id=NEW.stay_id
    and s.account_id=NEW.account_id;

  if not found or v_stay_property_id <> NEW.property_id then
    raise exception using
      errcode='23514',
      message='PROPERTY_MISMATCH';
  end if;

  select sm.stay_id
    into v_requester_stay_id
  from public.concierge_stay_members sm
  where sm.id=NEW.requested_by_stay_member_id
    and sm.account_id=NEW.account_id;

  if not found or v_requester_stay_id <> NEW.stay_id then
    raise exception using
      errcode='23514',
      message='RESOURCE_OUT_OF_SCOPE';
  end if;

  if NEW.applied_policy_id is not null then
    select rp.scope_type, rp.property_id
      into v_policy_scope_type, v_policy_property_id
    from public.concierge_request_policies rp
    where rp.id=NEW.applied_policy_id
      and rp.account_id=NEW.account_id
      and rp.request_type=NEW.request_type;

    if not found then
      raise exception using
        errcode='23514',
        message='REQUEST_POLICY_MISMATCH';
    end if;

    if not (
      v_policy_scope_type='account'
      or (
        v_policy_scope_type='property'
        and v_policy_property_id=NEW.property_id
      )
    ) then
      raise exception using
        errcode='23514',
        message='REQUEST_POLICY_MISMATCH';
    end if;
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$function$
;

set check_function_bodies=on;
revoke all on all functions in schema public from public,anon,authenticated,service_role;
