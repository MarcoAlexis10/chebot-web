-- FICTIONAL LOCAL TEST DATABASE ONLY. Never execute on a shared database.
truncate public.concierge_invite_dispatch_attempts_v1, public.concierge_guest_invites,
 public.concierge_stay_members, public.concierge_stays, public.concierge_properties,
 public.concierge_guest_identities, public.concierge_accounts,
 public.concierge_account_members, public.concierge_buildings cascade;
insert into public.concierge_accounts(id,display_name,status,default_language,timezone,founding_manager,created_at,updated_at)
 values('11111111-1111-4111-8111-111111111111','Fictional account','testing','es','America/Argentina/Buenos_Aires',false,now(),now());
insert into public.concierge_account_members values('88888888-8888-4888-8888-888888888888','11111111-1111-4111-8111-111111111111');
insert into public.concierge_properties(id,account_id,internal_name,property_type,address,city,default_language,default_check_in_time,default_check_out_time,status,activated_at,created_at,updated_at)
 values('66666666-6666-4666-8666-666666666666','11111111-1111-4111-8111-111111111111','Fictional property','apartment','Fictional address','Buenos Aires','es','15:00','12:00','active',now(),now(),now());
insert into public.concierge_guest_identities(id,phone_hash,status,created_at,updated_at)
 values('44444444-4444-4444-8444-444444444444',repeat('a',64),'active',now(),now());
insert into public.concierge_stays(id,account_id,property_id,status,check_in_at,check_out_at,access_from,access_until,created_by_member_id,created_at,updated_at)
 values('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','66666666-6666-4666-8666-666666666666','scheduled',now()-interval '1 day',now()+interval '2 days',now()-interval '1 day',now()+interval '2 days','88888888-8888-4888-8888-888888888888',now(),now());
insert into public.concierge_stay_members(id,account_id,stay_id,guest_identity_id,display_name,member_role,whatsapp_enabled,property_access,stay_manage,status,created_at,updated_at)
 values('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','55555555-5555-4555-8555-555555555555','44444444-4444-4444-8444-444444444444','Fictional guest','primary_guest',true,true,true,'invited',now(),now());
insert into public.concierge_guest_invites(id,account_id,stay_member_id,status,expires_at,created_at)
 values('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','created',now()+interval '1 day',now());
