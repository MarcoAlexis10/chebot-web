-- FICTIONAL LOCAL DATABASE ONLY. DEV catalog metadata, no user rows.
-- auth.users is a minimal external anchor. Vault, triggers, policies/JWT are not cloned.
create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
create extension btree_gist;
create schema auth;create table auth.users(id uuid primary key);
create table public."concierge_access_authorizations"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"stay_member_id" uuid,
"access_point_id" uuid not null,
"authorized_from" timestamp with time zone not null,
"authorized_until" timestamp with time zone not null,
"status" text default 'active'::text not null,
"granted_by_account_member_id" uuid not null,
"grant_reason" text,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null,
"revoked_at" timestamp with time zone,
"operational_person_id" uuid,
"operational_task_id" uuid
);
create table public."concierge_access_point_policies"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"access_point_id" uuid not null,
"subject_type" text not null,
"requires_explicit_authorization" boolean default true not null,
"window_source" text not null,
"start_offset_minutes" integer default 0 not null,
"end_offset_minutes" integer default 0 not null,
"status" text default 'active'::text not null,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_access_points"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"scope_type" text not null,
"building_id" uuid,
"property_id" uuid,
"display_name" text not null,
"access_type" text not null,
"status" text default 'active'::text not null,
"sort_order" integer default 100 not null,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_account_members"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"display_name" text not null,
"phone_hash" text not null,
"email" text,
"role" text not null,
"status" text default 'invited'::text not null,
"created_at" timestamp with time zone default now() not null,
"revoked_at" timestamp with time zone
);
create table public."concierge_accounts"(
"id" uuid default gen_random_uuid() not null,
"display_name" text not null,
"status" text default 'onboarding'::text not null,
"default_language" text default 'es'::text not null,
"timezone" text default 'America/Argentina/Buenos_Aires'::text not null,
"founding_manager" boolean default false not null,
"beta_started_at" timestamp with time zone,
"beta_ends_at" timestamp with time zone,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_audit_events"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"actor_type" text not null,
"actor_ref" uuid,
"property_id" uuid,
"stay_id" uuid,
"action_type" text not null,
"entity_type" text not null,
"entity_id" uuid,
"result" text not null,
"reason_code" text,
"occurred_at" timestamp with time zone default now() not null
);
create table public."concierge_buildings"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"display_name" text not null,
"address" text not null,
"city" text not null,
"timezone" text default 'America/Argentina/Buenos_Aires'::text not null,
"status" text default 'active'::text not null,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_entry_links"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"property_id" uuid not null,
"token_hash" text not null,
"channel" text not null,
"label" text,
"active" boolean default true not null,
"created_at" timestamp with time zone default now() not null,
"expires_at" timestamp with time zone
);
create table public."concierge_escalation_policies"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"scope_type" text not null,
"property_id" uuid,
"severity" text not null,
"manager_notify_after_minutes" integer not null,
"backup_notify_after_minutes" integer,
"status" text default 'active'::text not null,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_events"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"property_id" uuid,
"stay_id" uuid,
"event_type" text not null,
"category" text not null,
"result" text,
"occurred_at" timestamp with time zone default now() not null
);
create table public."concierge_gastronomy_catalog_staging"(
"id" uuid default gen_random_uuid() not null,
"city" text not null,
"neighborhood" text not null,
"venue_name" text not null,
"address" text not null,
"maps_url" text,
"cuisine_tags" text[] default '{}'::text[] not null,
"cuisine_review_status" text default 'pending'::text not null,
"cuisine_source_url" text,
"cuisine_evidence_note" text,
"cuisine_reviewed_on" date,
"dinner_hours_status" text default 'unverified'::text not null,
"table_availability_status" text default 'unconfirmed'::text not null,
"source_repo" text not null,
"source_branch" text not null,
"staged_at" timestamp with time zone default now() not null,
"cuisine_candidate_tags" text[] default '{}'::text[] not null,
"weekly_opening_hours" jsonb default '{}'::jsonb not null,
"hours_source_url" text,
"hours_checked_on" date,
"timezone" text,
"hours_review_note" text,
"operational_status" text default 'unverified'::text not null,
"operational_source_url" text,
"operational_review_note" text
);
create table public."concierge_guest_channels"(
"id" uuid default gen_random_uuid() not null,
"guest_identity_id" uuid not null,
"channel" text not null,
"recipient_ciphertext" text not null,
"cipher_version" integer default 1 not null,
"business_phone_number_id" text not null,
"status" text default 'active'::text not null,
"last_seen_at" timestamp with time zone default now() not null,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_guest_identities"(
"id" uuid default gen_random_uuid() not null,
"phone_hash" text not null,
"preferred_language" text,
"status" text default 'active'::text not null,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_guest_invites"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"stay_member_id" uuid not null,
"invite_token_hash" text,
"status" text default 'created'::text not null,
"sent_at" timestamp with time zone,
"activated_at" timestamp with time zone,
"rejected_at" timestamp with time zone,
"expires_at" timestamp with time zone,
"created_at" timestamp with time zone default now() not null
);
create table public."concierge_guest_phone_changes"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"property_id" uuid not null,
"stay_id" uuid not null,
"stay_member_id" uuid not null,
"original_guest_identity_id" uuid not null,
"proposed_phone_hash" text not null,
"mode" text default 'replace'::text not null,
"status" text default 'pending'::text not null,
"requested_by_member_id" uuid not null,
"approved_by_member_id" uuid,
"expires_at" timestamp with time zone not null,
"approved_at" timestamp with time zone,
"activated_at" timestamp with time zone,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_incident_events"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"incident_id" uuid not null,
"actor_type" text not null,
"actor_ref" uuid,
"event_type" text not null,
"event_summary" text not null,
"occurred_at" timestamp with time zone default now() not null
);
create table public."concierge_incidents"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"property_id" uuid not null,
"stay_id" uuid not null,
"reported_by_stay_member_id" uuid not null,
"category" text not null,
"severity" text not null,
"status" text default 'new'::text not null,
"summary" text not null,
"used_knowledge_item_id" uuid,
"manager_intervention_required" boolean default false not null,
"mediated_without_direct_contact" boolean,
"guest_confirmed_resolved" boolean,
"resolution_summary" text,
"opened_at" timestamp with time zone default now() not null,
"resolved_at" timestamp with time zone,
"closed_at" timestamp with time zone,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_knowledge_items"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"scope_type" text not null,
"building_id" uuid,
"property_id" uuid,
"category" text not null,
"knowledge_key" text not null,
"risk_level" text default 'normal'::text not null,
"status" text default 'review'::text not null,
"current_version_id" uuid,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_knowledge_versions"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"knowledge_item_id" uuid not null,
"version_number" integer not null,
"content" text not null,
"source_type" text not null,
"status" text default 'draft'::text not null,
"created_by_member_id" uuid not null,
"approved_by_member_id" uuid,
"change_summary" text,
"created_at" timestamp with time zone default now() not null,
"approved_at" timestamp with time zone
);
create table public."concierge_manager_phone_enrollments"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"member_id" uuid not null,
"code_hash" text not null,
"status" text default 'pending'::text not null,
"expires_at" timestamp with time zone not null,
"created_at" timestamp with time zone default now() not null,
"used_at" timestamp with time zone
);
create table public."concierge_manager_signup_invites"(
"id" uuid default gen_random_uuid() not null,
"invite_token_sha256" text not null,
"email_normalized" text not null,
"status" text default 'issued'::text not null,
"expires_at" timestamp with time zone not null,
"created_at" timestamp with time zone default now() not null,
"submitted_at" timestamp with time zone,
"manager_display_name" text,
"business_display_name" text,
"beta_terms_version" text,
"privacy_accepted" boolean default false not null,
"privacy_notice_version" text,
"issued_by_auth_user_id" uuid,
"revoked_by_auth_user_id" uuid,
"revoked_at" timestamp with time zone
);
create table public."concierge_manager_signup_screening_events"(
"id" uuid default gen_random_uuid() not null,
"invite_id" uuid not null,
"previous_decision" text,
"decision" text not null,
"reviewer_auth_user_id" uuid not null,
"decided_at" timestamp with time zone default now() not null
);
create table public."concierge_manager_signup_screenings"(
"invite_id" uuid not null,
"decision" text not null,
"reviewed_by_auth_user_id" uuid not null,
"reviewed_at" timestamp with time zone default now() not null
);
create table public."concierge_manager_web_identities"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"member_id" uuid not null,
"auth_user_id" uuid not null,
"status" text default 'active'::text not null,
"created_at" timestamp with time zone default now() not null,
"revoked_at" timestamp with time zone
);
create table public."concierge_member_property_permissions"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"member_id" uuid not null,
"property_id" uuid not null,
"can_manage_stays" boolean default false not null,
"can_manage_incidents" boolean default false not null,
"can_approve_requests" boolean default false not null,
"can_manage_knowledge" boolean default false not null,
"can_manage_secrets" boolean default false not null,
"can_manage_team" boolean default false not null,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_notification_meta_callback_buffer"(
"provider_message_id" text not null,
"provider_delivery_status" text not null,
"provider_status_at" timestamp with time zone not null,
"received_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_notification_outbox"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"stay_id" uuid not null,
"stay_member_id" uuid not null,
"notification_type" text not null,
"channel" text default 'whatsapp'::text not null,
"language" text default 'es'::text not null,
"due_at" timestamp with time zone not null,
"status" text default 'pending'::text not null,
"attempt_count" integer default 0 not null,
"claimed_at" timestamp with time zone,
"sent_at" timestamp with time zone,
"cancelled_at" timestamp with time zone,
"last_error" text,
"idempotency_key" text not null,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null,
"provider_message_id" text,
"provider_acceptance_status" text,
"provider_delivery_status" text,
"provider_status_at" timestamp with time zone
);
create table public."concierge_operational_people"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"display_name" text not null,
"phone_hash" text not null,
"role_type" text not null,
"status" text default 'active'::text not null,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null,
"revoked_at" timestamp with time zone
);
create table public."concierge_operational_tasks"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"operational_person_id" uuid not null,
"property_id" uuid not null,
"task_type" text not null,
"task_summary" text not null,
"access_from" timestamp with time zone not null,
"access_until" timestamp with time zone not null,
"status" text default 'scheduled'::text not null,
"created_by_member_id" uuid not null,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null,
"completed_at" timestamp with time zone,
"revoked_at" timestamp with time zone
);
create table public."concierge_pending_actions"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"actor_type" text not null,
"actor_account_member_id" uuid,
"actor_stay_member_id" uuid,
"action_type" text not null,
"summary" text not null,
"property_id" uuid,
"stay_id" uuid,
"target_entity_type" text not null,
"target_entity_id" uuid,
"payload_jsonb" jsonb default '{}'::jsonb not null,
"status" text default 'pending'::text not null,
"expires_at" timestamp with time zone not null,
"created_at" timestamp with time zone default now() not null,
"confirmed_at" timestamp with time zone,
"rejected_at" timestamp with time zone,
"executed_at" timestamp with time zone,
"failed_at" timestamp with time zone,
"failure_code" text
);
create table public."concierge_properties"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"building_id" uuid,
"internal_name" text not null,
"property_type" text default 'apartment'::text not null,
"address" text not null,
"floor_or_unit" text,
"city" text not null,
"default_language" text default 'es'::text not null,
"default_check_in_time" time without time zone default '15:00:00'::time without time zone not null,
"default_check_out_time" time without time zone default '10:00:00'::time without time zone not null,
"status" text default 'draft'::text not null,
"readiness_checked_at" timestamp with time zone,
"activated_at" timestamp with time zone,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_property_contacts"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"property_id" uuid not null,
"contact_type" text not null,
"display_name" text not null,
"phone_hash" text,
"secure_channel_ref" text,
"priority" integer default 100 not null,
"active" boolean default true not null,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_request_events"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"request_id" uuid not null,
"actor_type" text not null,
"actor_ref" uuid,
"event_type" text not null,
"event_summary" text not null,
"occurred_at" timestamp with time zone default now() not null
);
create table public."concierge_request_policies"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"scope_type" text not null,
"property_id" uuid,
"request_type" text not null,
"handling_mode" text not null,
"response_note" text,
"status" text default 'active'::text not null,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_requests"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"property_id" uuid not null,
"stay_id" uuid not null,
"requested_by_stay_member_id" uuid not null,
"request_type" text not null,
"status" text default 'new'::text not null,
"requested_value" text,
"requested_at_time" timestamp with time zone,
"approved_value" text,
"approved_at_time" timestamp with time zone,
"approved_until" timestamp with time zone,
"applied_policy_id" uuid,
"decision_source" text,
"decided_by_member_id" uuid,
"decision_at" timestamp with time zone,
"created_at" timestamp with time zone default now() not null,
"communicated_at" timestamp with time zone,
"completed_at" timestamp with time zone,
"cancelled_at" timestamp with time zone,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_secret_versions"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"access_point_id" uuid not null,
"version_number" integer not null,
"vault_secret_id" uuid not null,
"status" text default 'active'::text not null,
"created_by_account_member_id" uuid not null,
"rotation_reason" text,
"created_at" timestamp with time zone default now() not null,
"activated_at" timestamp with time zone default now() not null,
"retired_at" timestamp with time zone,
"revoked_at" timestamp with time zone
);
create table public."concierge_sessions"(
"id" uuid default gen_random_uuid() not null,
"phone_hash" text not null,
"mode" text not null,
"account_id" uuid,
"account_member_id" uuid,
"property_id" uuid,
"stay_id" uuid,
"stay_member_id" uuid,
"operational_person_id" uuid,
"operational_task_id" uuid,
"language" text default 'es'::text not null,
"current_intent" text,
"status" text default 'active'::text not null,
"started_at" timestamp with time zone default now() not null,
"last_activity_at" timestamp with time zone default now() not null,
"ended_at" timestamp with time zone,
"guide_context" jsonb default '{}'::jsonb not null
);
create table public."concierge_stay_members"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"stay_id" uuid not null,
"guest_identity_id" uuid,
"display_name" text not null,
"member_role" text not null,
"whatsapp_enabled" boolean default false not null,
"property_access" boolean default false not null,
"stay_manage" boolean default false not null,
"status" text default 'registered'::text not null,
"activated_at" timestamp with time zone,
"revoked_at" timestamp with time zone,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_stays"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid not null,
"property_id" uuid not null,
"check_in_at" timestamp with time zone not null,
"check_out_at" timestamp with time zone not null,
"access_from" timestamp with time zone not null,
"access_until" timestamp with time zone not null,
"status" text default 'scheduled'::text not null,
"created_by_member_id" uuid not null,
"created_at" timestamp with time zone default now() not null,
"updated_at" timestamp with time zone default now() not null
);
create table public."concierge_system_interventions"(
"id" uuid default gen_random_uuid() not null,
"account_id" uuid,
"property_id" uuid,
"reason_type" text not null,
"minutes_estimated" integer not null,
"occurred_at" timestamp with time zone default now() not null,
"resolved_at" timestamp with time zone
);
alter table public."concierge_access_authorizations" add constraint "concierge_access_authorizations_id_account_uk" UNIQUE (id, account_id);
alter table public."concierge_access_authorizations" add constraint "concierge_access_authorizations_pkey" PRIMARY KEY (id);
alter table public."concierge_access_point_policies" add constraint "concierge_access_point_policies_access_subject_uk" UNIQUE (access_point_id, subject_type);
alter table public."concierge_access_point_policies" add constraint "concierge_access_point_policies_pkey" PRIMARY KEY (id);
alter table public."concierge_access_points" add constraint "concierge_access_points_id_account_uk" UNIQUE (id, account_id);
alter table public."concierge_access_points" add constraint "concierge_access_points_pkey" PRIMARY KEY (id);
alter table public."concierge_account_members" add constraint "concierge_account_members_account_phone_uk" UNIQUE (account_id, phone_hash);
alter table public."concierge_account_members" add constraint "concierge_account_members_id_account_uk" UNIQUE (id, account_id);
alter table public."concierge_account_members" add constraint "concierge_account_members_pkey" PRIMARY KEY (id);
alter table public."concierge_accounts" add constraint "concierge_accounts_pkey" PRIMARY KEY (id);
alter table public."concierge_audit_events" add constraint "concierge_audit_events_pkey" PRIMARY KEY (id);
alter table public."concierge_buildings" add constraint "concierge_buildings_id_account_uk" UNIQUE (id, account_id);
alter table public."concierge_buildings" add constraint "concierge_buildings_pkey" PRIMARY KEY (id);
alter table public."concierge_entry_links" add constraint "concierge_entry_links_id_account_uk" UNIQUE (id, account_id);
alter table public."concierge_entry_links" add constraint "concierge_entry_links_pkey" PRIMARY KEY (id);
alter table public."concierge_entry_links" add constraint "concierge_entry_links_token_hash_uk" UNIQUE (token_hash);
alter table public."concierge_escalation_policies" add constraint "concierge_escalation_policies_pkey" PRIMARY KEY (id);
alter table public."concierge_events" add constraint "concierge_events_pkey" PRIMARY KEY (id);
alter table public."concierge_gastronomy_catalog_staging" add constraint "concierge_gastronomy_catalog_s_city_neighborhood_venue_name_key" UNIQUE (city, neighborhood, venue_name);
alter table public."concierge_gastronomy_catalog_staging" add constraint "concierge_gastronomy_catalog_staging_pkey" PRIMARY KEY (id);
alter table public."concierge_guest_channels" add constraint "concierge_guest_channels_guest_identity_id_channel_key" UNIQUE (guest_identity_id, channel);
alter table public."concierge_guest_channels" add constraint "concierge_guest_channels_pkey" PRIMARY KEY (id);
alter table public."concierge_guest_identities" add constraint "concierge_guest_identities_phone_hash_uk" UNIQUE (phone_hash);
alter table public."concierge_guest_identities" add constraint "concierge_guest_identities_pkey" PRIMARY KEY (id);
alter table public."concierge_guest_invites" add constraint "concierge_guest_invites_pkey" PRIMARY KEY (id);
alter table public."concierge_guest_phone_changes" add constraint "concierge_guest_phone_changes_pkey" PRIMARY KEY (id);
alter table public."concierge_incident_events" add constraint "concierge_incident_events_pkey" PRIMARY KEY (id);
alter table public."concierge_incidents" add constraint "concierge_incidents_id_account_uk" UNIQUE (id, account_id);
alter table public."concierge_incidents" add constraint "concierge_incidents_pkey" PRIMARY KEY (id);
alter table public."concierge_knowledge_items" add constraint "concierge_knowledge_items_id_account_uk" UNIQUE (id, account_id);
alter table public."concierge_knowledge_items" add constraint "concierge_knowledge_items_pkey" PRIMARY KEY (id);
alter table public."concierge_knowledge_versions" add constraint "concierge_knowledge_versions_id_item_account_uk" UNIQUE (id, knowledge_item_id, account_id);
alter table public."concierge_knowledge_versions" add constraint "concierge_knowledge_versions_item_version_uk" UNIQUE (knowledge_item_id, version_number);
alter table public."concierge_knowledge_versions" add constraint "concierge_knowledge_versions_pkey" PRIMARY KEY (id);
alter table public."concierge_manager_phone_enrollments" add constraint "concierge_manager_phone_enrollments_pkey" PRIMARY KEY (id);
alter table public."concierge_manager_signup_invites" add constraint "concierge_manager_signup_invites_invite_token_sha256_key" UNIQUE (invite_token_sha256);
alter table public."concierge_manager_signup_invites" add constraint "concierge_manager_signup_invites_pkey" PRIMARY KEY (id);
alter table public."concierge_manager_signup_screening_events" add constraint "concierge_manager_signup_screening_events_pkey" PRIMARY KEY (id);
alter table public."concierge_manager_signup_screenings" add constraint "concierge_manager_signup_screenings_pkey" PRIMARY KEY (invite_id);
alter table public."concierge_manager_web_identities" add constraint "concierge_manager_web_identities_pkey" PRIMARY KEY (id);
alter table public."concierge_member_property_permissions" add constraint "concierge_member_property_permissions_member_property_uk" UNIQUE (member_id, property_id);
alter table public."concierge_member_property_permissions" add constraint "concierge_member_property_permissions_pkey" PRIMARY KEY (id);
alter table public."concierge_notification_meta_callback_buffer" add constraint "concierge_notification_meta_callback_buffer_pkey" PRIMARY KEY (provider_message_id);
alter table public."concierge_notification_outbox" add constraint "concierge_notification_outbox_idempotency_key_uq" UNIQUE (idempotency_key);
alter table public."concierge_notification_outbox" add constraint "concierge_notification_outbox_pkey" PRIMARY KEY (id);
alter table public."concierge_operational_people" add constraint "concierge_operational_people_id_account_uk" UNIQUE (id, account_id);
alter table public."concierge_operational_people" add constraint "concierge_operational_people_pkey" PRIMARY KEY (id);
alter table public."concierge_operational_tasks" add constraint "concierge_operational_tasks_id_account_person_uk" UNIQUE (id, account_id, operational_person_id);
alter table public."concierge_operational_tasks" add constraint "concierge_operational_tasks_id_account_uk" UNIQUE (id, account_id);
alter table public."concierge_operational_tasks" add constraint "concierge_operational_tasks_pkey" PRIMARY KEY (id);
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_pkey" PRIMARY KEY (id);
alter table public."concierge_properties" add constraint "concierge_properties_id_account_uk" UNIQUE (id, account_id);
alter table public."concierge_properties" add constraint "concierge_properties_pkey" PRIMARY KEY (id);
alter table public."concierge_property_contacts" add constraint "concierge_property_contacts_pkey" PRIMARY KEY (id);
alter table public."concierge_request_events" add constraint "concierge_request_events_pkey" PRIMARY KEY (id);
alter table public."concierge_request_policies" add constraint "concierge_request_policies_id_account_uk" UNIQUE (id, account_id);
alter table public."concierge_request_policies" add constraint "concierge_request_policies_pkey" PRIMARY KEY (id);
alter table public."concierge_requests" add constraint "concierge_requests_id_account_uk" UNIQUE (id, account_id);
alter table public."concierge_requests" add constraint "concierge_requests_pkey" PRIMARY KEY (id);
alter table public."concierge_secret_versions" add constraint "concierge_secret_versions_access_version_uk" UNIQUE (access_point_id, version_number);
alter table public."concierge_secret_versions" add constraint "concierge_secret_versions_pkey" PRIMARY KEY (id);
alter table public."concierge_secret_versions" add constraint "concierge_secret_versions_vault_secret_uk" UNIQUE (vault_secret_id);
alter table public."concierge_sessions" add constraint "concierge_sessions_pkey" PRIMARY KEY (id);
alter table public."concierge_stay_members" add constraint "concierge_stay_members_id_account_uk" UNIQUE (id, account_id);
alter table public."concierge_stay_members" add constraint "concierge_stay_members_pkey" PRIMARY KEY (id);
alter table public."concierge_stays" add constraint "concierge_stays_id_account_uk" UNIQUE (id, account_id);
alter table public."concierge_stays" add constraint "concierge_stays_pkey" PRIMARY KEY (id);
alter table public."concierge_system_interventions" add constraint "concierge_system_interventions_pkey" PRIMARY KEY (id);
alter table public."concierge_access_authorizations" add constraint "concierge_access_authorizations_grant_reason_check" CHECK (((grant_reason IS NULL) OR ((length(TRIM(BOTH FROM grant_reason)) >= 1) AND (length(TRIM(BOTH FROM grant_reason)) <= 500))));
alter table public."concierge_access_authorizations" add constraint "concierge_access_authorizations_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'revoked'::text])));
alter table public."concierge_access_authorizations" add constraint "concierge_access_authorizations_status_timestamp_chk" CHECK ((((status = 'active'::text) AND (revoked_at IS NULL)) OR ((status = 'revoked'::text) AND (revoked_at IS NOT NULL))));
alter table public."concierge_access_authorizations" add constraint "concierge_access_authorizations_subject_chk" CHECK ((((stay_member_id IS NOT NULL) AND (operational_person_id IS NULL) AND (operational_task_id IS NULL)) OR ((stay_member_id IS NULL) AND (operational_person_id IS NOT NULL) AND (operational_task_id IS NOT NULL))));
alter table public."concierge_access_authorizations" add constraint "concierge_access_authorizations_window_chk" CHECK ((authorized_until > authorized_from));
alter table public."concierge_access_point_policies" add constraint "concierge_access_point_policies_end_offset_minutes_check" CHECK (((end_offset_minutes >= '-1440'::integer) AND (end_offset_minutes <= 1440)));
alter table public."concierge_access_point_policies" add constraint "concierge_access_point_policies_explicit_auth_chk" CHECK ((requires_explicit_authorization = true));
alter table public."concierge_access_point_policies" add constraint "concierge_access_point_policies_start_offset_minutes_check" CHECK (((start_offset_minutes >= '-1440'::integer) AND (start_offset_minutes <= 1440)));
alter table public."concierge_access_point_policies" add constraint "concierge_access_point_policies_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])));
alter table public."concierge_access_point_policies" add constraint "concierge_access_point_policies_subject_type_check" CHECK ((subject_type = ANY (ARRAY['stay_member'::text, 'operational_person'::text])));
alter table public."concierge_access_point_policies" add constraint "concierge_access_point_policies_window_source_check" CHECK ((window_source = ANY (ARRAY['stay_access_window'::text, 'authorization_window'::text])));
alter table public."concierge_access_point_policies" add constraint "concierge_access_point_policies_window_subject_chk" CHECK ((((subject_type = 'stay_member'::text) AND (window_source = 'stay_access_window'::text)) OR ((subject_type = 'operational_person'::text) AND (window_source = 'authorization_window'::text))));
alter table public."concierge_access_points" add constraint "concierge_access_points_access_type_check" CHECK ((access_type = ANY (ARRAY['building_entrance'::text, 'unit_door'::text, 'keybox'::text, 'wifi'::text, 'garage'::text, 'other'::text])));
alter table public."concierge_access_points" add constraint "concierge_access_points_display_name_check" CHECK (((length(TRIM(BOTH FROM display_name)) >= 1) AND (length(TRIM(BOTH FROM display_name)) <= 160)));
alter table public."concierge_access_points" add constraint "concierge_access_points_scope_shape_chk" CHECK ((((scope_type = 'building'::text) AND (building_id IS NOT NULL) AND (property_id IS NULL)) OR ((scope_type = 'property'::text) AND (property_id IS NOT NULL) AND (building_id IS NULL))));
alter table public."concierge_access_points" add constraint "concierge_access_points_scope_type_check" CHECK ((scope_type = ANY (ARRAY['building'::text, 'property'::text])));
alter table public."concierge_access_points" add constraint "concierge_access_points_sort_order_check" CHECK (((sort_order >= 0) AND (sort_order <= 10000)));
alter table public."concierge_access_points" add constraint "concierge_access_points_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])));
alter table public."concierge_account_members" add constraint "concierge_account_members_display_name_check" CHECK (((length(TRIM(BOTH FROM display_name)) >= 1) AND (length(TRIM(BOTH FROM display_name)) <= 160)));
alter table public."concierge_account_members" add constraint "concierge_account_members_email_check" CHECK (((email IS NULL) OR ((length(TRIM(BOTH FROM email)) >= 3) AND (length(TRIM(BOTH FROM email)) <= 320))));
alter table public."concierge_account_members" add constraint "concierge_account_members_phone_hash_check" CHECK ((phone_hash ~ '^[0-9a-f]{64}$'::text));
alter table public."concierge_account_members" add constraint "concierge_account_members_revoked_at_chk" CHECK ((((status = 'revoked'::text) AND (revoked_at IS NOT NULL)) OR ((status <> 'revoked'::text) AND (revoked_at IS NULL))));
alter table public."concierge_account_members" add constraint "concierge_account_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'manager'::text, 'co_manager'::text])));
alter table public."concierge_account_members" add constraint "concierge_account_members_status_check" CHECK ((status = ANY (ARRAY['invited'::text, 'active'::text, 'revoked'::text])));
alter table public."concierge_accounts" add constraint "concierge_accounts_beta_window_chk" CHECK (((beta_started_at IS NULL) OR (beta_ends_at IS NULL) OR (beta_ends_at > beta_started_at)));
alter table public."concierge_accounts" add constraint "concierge_accounts_default_language_check" CHECK ((default_language = ANY (ARRAY['es'::text, 'en'::text, 'it'::text, 'pt'::text])));
alter table public."concierge_accounts" add constraint "concierge_accounts_display_name_check" CHECK (((length(TRIM(BOTH FROM display_name)) >= 1) AND (length(TRIM(BOTH FROM display_name)) <= 160)));
alter table public."concierge_accounts" add constraint "concierge_accounts_status_check" CHECK ((status = ANY (ARRAY['onboarding'::text, 'testing'::text, 'active'::text, 'paused'::text, 'suspended'::text, 'beta_completed'::text])));
alter table public."concierge_accounts" add constraint "concierge_accounts_timezone_check" CHECK (((length(TRIM(BOTH FROM timezone)) >= 1) AND (length(TRIM(BOTH FROM timezone)) <= 120)));
alter table public."concierge_audit_events" add constraint "concierge_audit_events_action_type_check" CHECK (((length(TRIM(BOTH FROM action_type)) >= 1) AND (length(TRIM(BOTH FROM action_type)) <= 120)));
alter table public."concierge_audit_events" add constraint "concierge_audit_events_actor_type_check" CHECK ((actor_type = ANY (ARRAY['account_member'::text, 'guest'::text, 'operational'::text, 'system'::text])));
alter table public."concierge_audit_events" add constraint "concierge_audit_events_entity_type_check" CHECK (((length(TRIM(BOTH FROM entity_type)) >= 1) AND (length(TRIM(BOTH FROM entity_type)) <= 120)));
alter table public."concierge_audit_events" add constraint "concierge_audit_events_reason_code_check" CHECK (((reason_code IS NULL) OR ((length(TRIM(BOTH FROM reason_code)) >= 1) AND (length(TRIM(BOTH FROM reason_code)) <= 120))));
alter table public."concierge_audit_events" add constraint "concierge_audit_events_result_check" CHECK ((result = ANY (ARRAY['allowed'::text, 'denied'::text, 'changed'::text, 'created'::text, 'revoked'::text, 'failed'::text])));
alter table public."concierge_buildings" add constraint "concierge_buildings_address_check" CHECK (((length(TRIM(BOTH FROM address)) >= 1) AND (length(TRIM(BOTH FROM address)) <= 500)));
alter table public."concierge_buildings" add constraint "concierge_buildings_city_check" CHECK (((length(TRIM(BOTH FROM city)) >= 1) AND (length(TRIM(BOTH FROM city)) <= 160)));
alter table public."concierge_buildings" add constraint "concierge_buildings_display_name_check" CHECK (((length(TRIM(BOTH FROM display_name)) >= 1) AND (length(TRIM(BOTH FROM display_name)) <= 160)));
alter table public."concierge_buildings" add constraint "concierge_buildings_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'archived'::text])));
alter table public."concierge_buildings" add constraint "concierge_buildings_timezone_check" CHECK (((length(TRIM(BOTH FROM timezone)) >= 1) AND (length(TRIM(BOTH FROM timezone)) <= 120)));
alter table public."concierge_entry_links" add constraint "concierge_entry_links_channel_check" CHECK ((channel = ANY (ARRAY['qr_property'::text, 'prearrival'::text, 'web'::text, 'other'::text])));
alter table public."concierge_entry_links" add constraint "concierge_entry_links_expiry_chk" CHECK (((expires_at IS NULL) OR (expires_at > created_at)));
alter table public."concierge_entry_links" add constraint "concierge_entry_links_label_check" CHECK (((label IS NULL) OR ((length(TRIM(BOTH FROM label)) >= 1) AND (length(TRIM(BOTH FROM label)) <= 160))));
alter table public."concierge_entry_links" add constraint "concierge_entry_links_token_hash_check" CHECK ((token_hash ~ '^[0-9a-f]{64}$'::text));
alter table public."concierge_escalation_policies" add constraint "concierge_escalation_policie_manager_notify_after_minutes_check" CHECK (((manager_notify_after_minutes >= 0) AND (manager_notify_after_minutes <= 1440)));
alter table public."concierge_escalation_policies" add constraint "concierge_escalation_policies_backup_notify_after_minutes_check" CHECK (((backup_notify_after_minutes IS NULL) OR ((backup_notify_after_minutes >= 0) AND (backup_notify_after_minutes <= 2880))));
alter table public."concierge_escalation_policies" add constraint "concierge_escalation_policies_critical_immediate_chk" CHECK (((severity <> 'critical'::text) OR (manager_notify_after_minutes = 0)));
alter table public."concierge_escalation_policies" add constraint "concierge_escalation_policies_scope_shape_chk" CHECK ((((scope_type = 'account'::text) AND (property_id IS NULL)) OR ((scope_type = 'property'::text) AND (property_id IS NOT NULL))));
alter table public."concierge_escalation_policies" add constraint "concierge_escalation_policies_scope_type_check" CHECK ((scope_type = ANY (ARRAY['account'::text, 'property'::text])));
alter table public."concierge_escalation_policies" add constraint "concierge_escalation_policies_severity_check" CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])));
alter table public."concierge_escalation_policies" add constraint "concierge_escalation_policies_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])));
alter table public."concierge_events" add constraint "concierge_events_category_check" CHECK (((length(TRIM(BOTH FROM category)) >= 1) AND (length(TRIM(BOTH FROM category)) <= 80)));
alter table public."concierge_events" add constraint "concierge_events_event_type_check" CHECK ((event_type = ANY (ARRAY['guest_invite_sent'::text, 'guest_activated'::text, 'property_question'::text, 'destination_question'::text, 'operational_query'::text, 'auto_resolution_confirmed'::text, 'mediated_resolution_confirmed'::text, 'manager_attention_required'::text, 'request_created'::text, 'request_approved'::text, 'request_rejected'::text, 'secret_access_denied'::text, 'security_incident'::text, 'systems_intervention'::text, 'post_checkout_free_use'::text])));
alter table public."concierge_events" add constraint "concierge_events_result_check" CHECK (((result IS NULL) OR ((length(TRIM(BOTH FROM result)) >= 1) AND (length(TRIM(BOTH FROM result)) <= 120))));
alter table public."concierge_gastronomy_catalog_staging" add constraint "concierge_gastronomy_catalog_st_table_availability_status_check" CHECK ((table_availability_status = ANY (ARRAY['unconfirmed'::text, 'confirmed'::text])));
alter table public."concierge_gastronomy_catalog_staging" add constraint "concierge_gastronomy_catalog_stagin_cuisine_review_status_check" CHECK ((cuisine_review_status = ANY (ARRAY['pending'::text, 'source_backed'::text])));
alter table public."concierge_gastronomy_catalog_staging" add constraint "concierge_gastronomy_catalog_staging_check" CHECK (((cuisine_review_status <> 'source_backed'::text) OR ((cuisine_source_url IS NOT NULL) AND (cuisine_reviewed_on IS NOT NULL))));
alter table public."concierge_gastronomy_catalog_staging" add constraint "concierge_gastronomy_catalog_staging_dinner_hours_status_check" CHECK ((dinner_hours_status = ANY (ARRAY['unverified'::text, 'verified'::text])));
alter table public."concierge_gastronomy_catalog_staging" add constraint "concierge_gastronomy_never_verify_hours_for_closed" CHECK (((operational_status <> 'closed_permanently'::text) OR (dinner_hours_status = 'unverified'::text)));
alter table public."concierge_gastronomy_catalog_staging" add constraint "concierge_gastronomy_operational_status_check" CHECK ((operational_status = ANY (ARRAY['unverified'::text, 'closed_permanently'::text])));
alter table public."concierge_guest_channels" add constraint "concierge_guest_channels_channel_check" CHECK ((channel = 'whatsapp'::text));
alter table public."concierge_guest_channels" add constraint "concierge_guest_channels_cipher_version_check" CHECK ((cipher_version >= 1));
alter table public."concierge_guest_channels" add constraint "concierge_guest_channels_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'revoked'::text])));
alter table public."concierge_guest_identities" add constraint "concierge_guest_identities_phone_hash_check" CHECK ((phone_hash ~ '^[0-9a-f]{64}$'::text));
alter table public."concierge_guest_identities" add constraint "concierge_guest_identities_preferred_language_check" CHECK (((preferred_language IS NULL) OR (preferred_language = ANY (ARRAY['es'::text, 'en'::text, 'it'::text, 'pt'::text]))));
alter table public."concierge_guest_identities" add constraint "concierge_guest_identities_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'blocked'::text])));
alter table public."concierge_guest_invites" add constraint "concierge_guest_invites_invite_token_hash_check" CHECK (((invite_token_hash IS NULL) OR (invite_token_hash ~ '^[0-9a-f]{64}$'::text)));
alter table public."concierge_guest_invites" add constraint "concierge_guest_invites_state_timestamps_chk" CHECK ((((status <> 'sent'::text) OR (sent_at IS NOT NULL)) AND ((status <> 'activated'::text) OR (activated_at IS NOT NULL)) AND ((status <> 'rejected'::text) OR (rejected_at IS NOT NULL))));
alter table public."concierge_guest_invites" add constraint "concierge_guest_invites_status_check" CHECK ((status = ANY (ARRAY['created'::text, 'sent'::text, 'activated'::text, 'rejected'::text, 'expired'::text, 'revoked'::text])));
alter table public."concierge_guest_phone_changes" add constraint "concierge_guest_phone_changes_mode_check" CHECK ((mode = 'replace'::text));
alter table public."concierge_guest_phone_changes" add constraint "concierge_guest_phone_changes_proposed_phone_hash_check" CHECK ((proposed_phone_hash ~ '^[0-9a-f]{64}$'::text));
alter table public."concierge_guest_phone_changes" add constraint "concierge_guest_phone_changes_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'activated'::text, 'expired'::text, 'rejected'::text])));
alter table public."concierge_incident_events" add constraint "concierge_incident_events_actor_type_check" CHECK ((actor_type = ANY (ARRAY['account_member'::text, 'stay_member'::text, 'operational'::text, 'system'::text])));
alter table public."concierge_incident_events" add constraint "concierge_incident_events_event_summary_check" CHECK (((length(TRIM(BOTH FROM event_summary)) >= 1) AND (length(TRIM(BOTH FROM event_summary)) <= 4000)));
alter table public."concierge_incident_events" add constraint "concierge_incident_events_event_type_check" CHECK ((event_type = ANY (ARRAY['reported'::text, 'guidance_sent'::text, 'escalation_triggered'::text, 'manager_state_changed'::text, 'manager_response'::text, 'guest_response'::text, 'guest_confirmed_resolved'::text, 'reopened'::text, 'closed'::text, 'note'::text])));
alter table public."concierge_incidents" add constraint "concierge_incidents_category_check" CHECK ((category = ANY (ARRAY['access'::text, 'wifi'::text, 'climate'::text, 'plumbing'::text, 'electricity'::text, 'appliance'::text, 'noise'::text, 'cleaning'::text, 'safety'::text, 'health'::text, 'other'::text])));
alter table public."concierge_incidents" add constraint "concierge_incidents_resolution_shape_chk" CHECK ((((status <> ALL (ARRAY['resolved'::text, 'learning_pending'::text, 'closed'::text])) OR (resolved_at IS NOT NULL)) AND ((status <> 'closed'::text) OR (closed_at IS NOT NULL))));
alter table public."concierge_incidents" add constraint "concierge_incidents_resolution_summary_check" CHECK (((resolution_summary IS NULL) OR ((length(TRIM(BOTH FROM resolution_summary)) >= 1) AND (length(TRIM(BOTH FROM resolution_summary)) <= 4000))));
alter table public."concierge_incidents" add constraint "concierge_incidents_severity_check" CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])));
alter table public."concierge_incidents" add constraint "concierge_incidents_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'resolving'::text, 'waiting_guest'::text, 'escalated'::text, 'waiting_manager'::text, 'resolved'::text, 'learning_pending'::text, 'closed'::text])));
alter table public."concierge_incidents" add constraint "concierge_incidents_summary_check" CHECK (((length(TRIM(BOTH FROM summary)) >= 1) AND (length(TRIM(BOTH FROM summary)) <= 2000)));
alter table public."concierge_knowledge_items" add constraint "concierge_knowledge_items_active_requires_version_chk" CHECK (((status <> 'active'::text) OR (current_version_id IS NOT NULL)));
alter table public."concierge_knowledge_items" add constraint "concierge_knowledge_items_category_check" CHECK ((category = ANY (ARRAY['arrival'::text, 'checkin'::text, 'checkout'::text, 'wifi'::text, 'equipment'::text, 'rules'::text, 'luggage'::text, 'parking'::text, 'amenities'::text, 'incident_protocol'::text, 'service'::text, 'other'::text])));
alter table public."concierge_knowledge_items" add constraint "concierge_knowledge_items_knowledge_key_check" CHECK (((length(TRIM(BOTH FROM knowledge_key)) >= 1) AND (length(TRIM(BOTH FROM knowledge_key)) <= 160)));
alter table public."concierge_knowledge_items" add constraint "concierge_knowledge_items_risk_level_check" CHECK ((risk_level = ANY (ARRAY['normal'::text, 'sensitive'::text, 'safety_review'::text])));
alter table public."concierge_knowledge_items" add constraint "concierge_knowledge_items_scope_shape_chk" CHECK ((((scope_type = 'account'::text) AND (building_id IS NULL) AND (property_id IS NULL)) OR ((scope_type = 'building'::text) AND (building_id IS NOT NULL) AND (property_id IS NULL)) OR ((scope_type = 'property'::text) AND (property_id IS NOT NULL) AND (building_id IS NULL))));
alter table public."concierge_knowledge_items" add constraint "concierge_knowledge_items_scope_type_check" CHECK ((scope_type = ANY (ARRAY['account'::text, 'building'::text, 'property'::text])));
alter table public."concierge_knowledge_items" add constraint "concierge_knowledge_items_status_check" CHECK ((status = ANY (ARRAY['review'::text, 'active'::text, 'paused'::text, 'archived'::text])));
alter table public."concierge_knowledge_versions" add constraint "concierge_knowledge_versions_approval_shape_chk" CHECK ((((status = ANY (ARRAY['approved'::text, 'superseded'::text])) AND (approved_by_member_id IS NOT NULL) AND (approved_at IS NOT NULL)) OR ((status = ANY (ARRAY['draft'::text, 'rejected'::text])) AND (approved_by_member_id IS NULL) AND (approved_at IS NULL))));
alter table public."concierge_knowledge_versions" add constraint "concierge_knowledge_versions_change_summary_check" CHECK (((change_summary IS NULL) OR ((length(TRIM(BOTH FROM change_summary)) >= 1) AND (length(TRIM(BOTH FROM change_summary)) <= 1000))));
alter table public."concierge_knowledge_versions" add constraint "concierge_knowledge_versions_content_check" CHECK (((length(TRIM(BOTH FROM content)) >= 1) AND (length(TRIM(BOTH FROM content)) <= 12000)));
alter table public."concierge_knowledge_versions" add constraint "concierge_knowledge_versions_source_type_check" CHECK ((source_type = ANY (ARRAY['manager_entered'::text, 'learned_from_incident'::text, 'system_curated'::text])));
alter table public."concierge_knowledge_versions" add constraint "concierge_knowledge_versions_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'superseded'::text, 'rejected'::text])));
alter table public."concierge_knowledge_versions" add constraint "concierge_knowledge_versions_version_number_check" CHECK ((version_number > 0));
alter table public."concierge_manager_phone_enrollments" add constraint "concierge_manager_phone_enrollments_code_hash_check" CHECK ((code_hash ~ '^[0-9a-f]{64}$'::text));
alter table public."concierge_manager_phone_enrollments" add constraint "concierge_manager_phone_enrollments_expiry_chk" CHECK ((expires_at > created_at));
alter table public."concierge_manager_phone_enrollments" add constraint "concierge_manager_phone_enrollments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'used'::text, 'revoked'::text, 'expired'::text])));
alter table public."concierge_manager_phone_enrollments" add constraint "concierge_manager_phone_enrollments_used_at_chk" CHECK ((((status = 'used'::text) AND (used_at IS NOT NULL)) OR ((status <> 'used'::text) AND (used_at IS NULL))));
alter table public."concierge_manager_signup_invites" add constraint "concierge_manager_invite_issuer_required_chk" CHECK ((issued_by_auth_user_id IS NOT NULL));
alter table public."concierge_manager_signup_invites" add constraint "concierge_manager_invite_revocation_audit_chk" CHECK ((((status = 'revoked'::text) AND (revoked_at IS NOT NULL) AND (revoked_by_auth_user_id IS NOT NULL)) OR ((status <> 'revoked'::text) AND (revoked_at IS NULL) AND (revoked_by_auth_user_id IS NULL))));
alter table public."concierge_manager_signup_invites" add constraint "concierge_manager_invite_revoked_after_creation_chk" CHECK (((revoked_at IS NULL) OR (revoked_at >= created_at)));
alter table public."concierge_manager_signup_invites" add constraint "concierge_manager_signup_invites_email_normalized_check" CHECK (((email_normalized = lower(btrim(email_normalized))) AND ((length(email_normalized) >= 5) AND (length(email_normalized) <= 254)) AND (POSITION(('@'::text) IN (email_normalized)) > 1)));
alter table public."concierge_manager_signup_invites" add constraint "concierge_manager_signup_invites_invite_token_sha256_check" CHECK ((invite_token_sha256 ~ '^[0-9a-f]{64}$'::text));
alter table public."concierge_manager_signup_invites" add constraint "concierge_manager_signup_invites_status_check" CHECK ((status = ANY (ARRAY['issued'::text, 'submitted'::text, 'revoked'::text])));
alter table public."concierge_manager_signup_invites" add constraint "concierge_signup_invite_ttl" CHECK (((expires_at > created_at) AND (expires_at <= (created_at + '7 days'::interval))));
alter table public."concierge_manager_signup_invites" add constraint "concierge_signup_names" CHECK ((((manager_display_name IS NULL) OR ((length(btrim(manager_display_name)) >= 2) AND (length(btrim(manager_display_name)) <= 100))) AND ((business_display_name IS NULL) OR ((length(btrim(business_display_name)) >= 2) AND (length(btrim(business_display_name)) <= 120)))));
alter table public."concierge_manager_signup_invites" add constraint "concierge_signup_privacy_version_chk" CHECK ((((status = 'submitted'::text) AND (privacy_notice_version = 'concierge-privacy-beta-v1-2026-10-11'::text)) OR ((status <> 'submitted'::text) AND (privacy_notice_version IS NULL))));
alter table public."concierge_manager_signup_invites" add constraint "concierge_signup_submit_shape" CHECK ((((status = 'submitted'::text) AND (submitted_at IS NOT NULL) AND (manager_display_name IS NOT NULL) AND (business_display_name IS NOT NULL) AND (beta_terms_version = 'beta-v1-2026-10-11'::text) AND privacy_accepted) OR ((status <> 'submitted'::text) AND (submitted_at IS NULL) AND (manager_display_name IS NULL) AND (business_display_name IS NULL) AND (beta_terms_version IS NULL) AND (NOT privacy_accepted))));
alter table public."concierge_manager_signup_screening_events" add constraint "concierge_manager_signup_screening_events_decision_check" CHECK ((decision = ANY (ARRAY['needs_owner_followup'::text, 'not_selected'::text, 'shortlisted_pending_go_b'::text])));
alter table public."concierge_manager_signup_screening_events" add constraint "concierge_signup_screening_event_transition_chk" CHECK (((previous_decision IS NULL) OR ((previous_decision = 'needs_owner_followup'::text) AND (decision = ANY (ARRAY['not_selected'::text, 'shortlisted_pending_go_b'::text])))));
alter table public."concierge_manager_signup_screenings" add constraint "concierge_manager_signup_screenings_decision_check" CHECK ((decision = ANY (ARRAY['needs_owner_followup'::text, 'not_selected'::text, 'shortlisted_pending_go_b'::text])));
alter table public."concierge_manager_web_identities" add constraint "concierge_manager_web_identities_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'revoked'::text])));
alter table public."concierge_manager_web_identities" add constraint "concierge_manager_web_identities_status_shape_chk" CHECK ((((status = 'active'::text) AND (revoked_at IS NULL)) OR ((status = 'revoked'::text) AND (revoked_at IS NOT NULL))));
alter table public."concierge_notification_meta_callback_buffer" add constraint "concierge_notification_meta_call_provider_delivery_status_check" CHECK ((provider_delivery_status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text, 'failed'::text])));
alter table public."concierge_notification_meta_callback_buffer" add constraint "concierge_notification_meta_callback__provider_message_id_check" CHECK (((length(provider_message_id) >= 8) AND (length(provider_message_id) <= 512)));
alter table public."concierge_notification_outbox" add constraint "concierge_notification_outbox_attempt_chk" CHECK ((attempt_count >= 0));
alter table public."concierge_notification_outbox" add constraint "concierge_notification_outbox_channel_chk" CHECK ((channel = 'whatsapp'::text));
alter table public."concierge_notification_outbox" add constraint "concierge_notification_outbox_language_chk" CHECK ((language = ANY (ARRAY['es'::text, 'en'::text, 'it'::text, 'pt'::text])));
alter table public."concierge_notification_outbox" add constraint "concierge_notification_outbox_status_chk" CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'sent'::text, 'cancelled'::text, 'failed'::text])));
alter table public."concierge_notification_outbox" add constraint "concierge_notification_outbox_type_chk" CHECK ((notification_type = ANY (ARRAY['prearrival'::text, 'access_enabled'::text, 'checkout'::text])));
alter table public."concierge_operational_people" add constraint "concierge_operational_people_display_name_check" CHECK (((length(TRIM(BOTH FROM display_name)) >= 1) AND (length(TRIM(BOTH FROM display_name)) <= 160)));
alter table public."concierge_operational_people" add constraint "concierge_operational_people_phone_hash_check" CHECK ((phone_hash ~ '^[0-9a-f]{64}$'::text));
alter table public."concierge_operational_people" add constraint "concierge_operational_people_revoked_at_chk" CHECK ((((status = 'revoked'::text) AND (revoked_at IS NOT NULL)) OR ((status <> 'revoked'::text) AND (revoked_at IS NULL))));
alter table public."concierge_operational_people" add constraint "concierge_operational_people_role_type_check" CHECK ((role_type = ANY (ARRAY['cleaning'::text, 'maintenance'::text, 'technician'::text, 'building_staff'::text, 'provider'::text])));
alter table public."concierge_operational_people" add constraint "concierge_operational_people_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'revoked'::text])));
alter table public."concierge_operational_tasks" add constraint "concierge_operational_tasks_status_check" CHECK ((status = ANY (ARRAY['scheduled'::text, 'active'::text, 'completed'::text, 'revoked'::text, 'expired'::text])));
alter table public."concierge_operational_tasks" add constraint "concierge_operational_tasks_status_timestamps_chk" CHECK ((((status = 'completed'::text) AND (completed_at IS NOT NULL) AND (revoked_at IS NULL)) OR ((status = 'revoked'::text) AND (revoked_at IS NOT NULL)) OR ((status = ANY (ARRAY['scheduled'::text, 'active'::text, 'expired'::text])) AND (completed_at IS NULL) AND (revoked_at IS NULL))));
alter table public."concierge_operational_tasks" add constraint "concierge_operational_tasks_task_summary_check" CHECK (((length(TRIM(BOTH FROM task_summary)) >= 1) AND (length(TRIM(BOTH FROM task_summary)) <= 2000)));
alter table public."concierge_operational_tasks" add constraint "concierge_operational_tasks_task_type_check" CHECK ((task_type = ANY (ARRAY['cleaning'::text, 'maintenance'::text, 'repair'::text, 'inspection'::text, 'delivery'::text, 'building_support'::text, 'other'::text])));
alter table public."concierge_operational_tasks" add constraint "concierge_operational_tasks_window_chk" CHECK ((access_until > access_from));
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_action_type_check" CHECK (((length(TRIM(BOTH FROM action_type)) >= 1) AND (length(TRIM(BOTH FROM action_type)) <= 120)));
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_actor_shape_chk" CHECK ((((actor_type = 'account_member'::text) AND (actor_account_member_id IS NOT NULL) AND (actor_stay_member_id IS NULL)) OR ((actor_type = 'stay_member'::text) AND (actor_stay_member_id IS NOT NULL) AND (actor_account_member_id IS NULL))));
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_actor_type_check" CHECK ((actor_type = ANY (ARRAY['account_member'::text, 'stay_member'::text])));
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_confirmed_at_chk" CHECK ((((status = ANY (ARRAY['confirmed'::text, 'executed'::text])) AND (confirmed_at IS NOT NULL)) OR ((status <> ALL (ARRAY['confirmed'::text, 'executed'::text])) AND (confirmed_at IS NULL))));
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_executed_at_chk" CHECK ((((status = 'executed'::text) AND (executed_at IS NOT NULL)) OR ((status <> 'executed'::text) AND (executed_at IS NULL))));
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_expiry_chk" CHECK ((expires_at > created_at));
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_failed_at_chk" CHECK ((((status = 'failed'::text) AND (failed_at IS NOT NULL)) OR ((status <> 'failed'::text) AND (failed_at IS NULL))));
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_failure_code_chk" CHECK ((((status = 'failed'::text) AND (failure_code IS NOT NULL)) OR ((status <> 'failed'::text) AND (failure_code IS NULL))));
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_payload_jsonb_check" CHECK ((jsonb_typeof(payload_jsonb) = 'object'::text));
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_rejected_at_chk" CHECK ((((status = 'rejected'::text) AND (rejected_at IS NOT NULL)) OR ((status <> 'rejected'::text) AND (rejected_at IS NULL))));
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text, 'expired'::text, 'executed'::text, 'failed'::text])));
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_summary_check" CHECK (((length(TRIM(BOTH FROM summary)) >= 1) AND (length(TRIM(BOTH FROM summary)) <= 1000)));
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_target_entity_type_check" CHECK (((length(TRIM(BOTH FROM target_entity_type)) >= 1) AND (length(TRIM(BOTH FROM target_entity_type)) <= 120)));
alter table public."concierge_properties" add constraint "concierge_properties_activation_state_chk" CHECK ((((status = 'active'::text) AND (activated_at IS NOT NULL)) OR (status <> 'active'::text)));
alter table public."concierge_properties" add constraint "concierge_properties_address_check" CHECK (((length(TRIM(BOTH FROM address)) >= 1) AND (length(TRIM(BOTH FROM address)) <= 500)));
alter table public."concierge_properties" add constraint "concierge_properties_city_check" CHECK (((length(TRIM(BOTH FROM city)) >= 1) AND (length(TRIM(BOTH FROM city)) <= 160)));
alter table public."concierge_properties" add constraint "concierge_properties_default_language_check" CHECK ((default_language = ANY (ARRAY['es'::text, 'en'::text, 'it'::text, 'pt'::text])));
alter table public."concierge_properties" add constraint "concierge_properties_floor_or_unit_check" CHECK (((floor_or_unit IS NULL) OR ((length(TRIM(BOTH FROM floor_or_unit)) >= 1) AND (length(TRIM(BOTH FROM floor_or_unit)) <= 80))));
alter table public."concierge_properties" add constraint "concierge_properties_internal_name_check" CHECK (((length(TRIM(BOTH FROM internal_name)) >= 1) AND (length(TRIM(BOTH FROM internal_name)) <= 160)));
alter table public."concierge_properties" add constraint "concierge_properties_property_type_check" CHECK ((property_type = ANY (ARRAY['apartment'::text, 'house'::text, 'room'::text, 'studio'::text, 'other'::text])));
alter table public."concierge_properties" add constraint "concierge_properties_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'ready_for_review'::text, 'active'::text, 'paused'::text, 'archived'::text])));
alter table public."concierge_property_contacts" add constraint "concierge_property_contacts_channel_chk" CHECK (((phone_hash IS NOT NULL) OR (secure_channel_ref IS NOT NULL)));
alter table public."concierge_property_contacts" add constraint "concierge_property_contacts_contact_type_check" CHECK ((contact_type = ANY (ARRAY['primary_manager'::text, 'backup_contact'::text, 'building_contact'::text, 'emergency_operational'::text])));
alter table public."concierge_property_contacts" add constraint "concierge_property_contacts_display_name_check" CHECK (((length(TRIM(BOTH FROM display_name)) >= 1) AND (length(TRIM(BOTH FROM display_name)) <= 160)));
alter table public."concierge_property_contacts" add constraint "concierge_property_contacts_phone_hash_check" CHECK (((phone_hash IS NULL) OR (phone_hash ~ '^[0-9a-f]{64}$'::text)));
alter table public."concierge_property_contacts" add constraint "concierge_property_contacts_priority_check" CHECK (((priority >= 1) AND (priority <= 10000)));
alter table public."concierge_property_contacts" add constraint "concierge_property_contacts_secure_channel_ref_check" CHECK (((secure_channel_ref IS NULL) OR ((length(TRIM(BOTH FROM secure_channel_ref)) >= 1) AND (length(TRIM(BOTH FROM secure_channel_ref)) <= 300))));
alter table public."concierge_request_events" add constraint "concierge_request_events_actor_type_check" CHECK ((actor_type = ANY (ARRAY['account_member'::text, 'stay_member'::text, 'system'::text])));
alter table public."concierge_request_events" add constraint "concierge_request_events_event_summary_check" CHECK (((length(TRIM(BOTH FROM event_summary)) >= 1) AND (length(TRIM(BOTH FROM event_summary)) <= 4000)));
alter table public."concierge_request_events" add constraint "concierge_request_events_event_type_check" CHECK ((event_type = ANY (ARRAY['opened'::text, 'policy_applied'::text, 'manager_decision'::text, 'stay_updated'::text, 'communicated'::text, 'completed'::text, 'cancelled'::text, 'note'::text])));
alter table public."concierge_request_policies" add constraint "concierge_request_policies_handling_mode_check" CHECK ((handling_mode = ANY (ARRAY['available'::text, 'approval_required'::text, 'unavailable'::text])));
alter table public."concierge_request_policies" add constraint "concierge_request_policies_request_type_check" CHECK ((request_type = ANY (ARRAY['early_checkin'::text, 'late_checkout'::text, 'luggage'::text, 'parking'::text, 'cleaning'::text, 'extra_items'::text, 'special_request'::text, 'other'::text])));
alter table public."concierge_request_policies" add constraint "concierge_request_policies_response_note_check" CHECK (((response_note IS NULL) OR ((length(TRIM(BOTH FROM response_note)) >= 1) AND (length(TRIM(BOTH FROM response_note)) <= 2000))));
alter table public."concierge_request_policies" add constraint "concierge_request_policies_scope_shape_chk" CHECK ((((scope_type = 'account'::text) AND (property_id IS NULL)) OR ((scope_type = 'property'::text) AND (property_id IS NOT NULL))));
alter table public."concierge_request_policies" add constraint "concierge_request_policies_scope_type_check" CHECK ((scope_type = ANY (ARRAY['account'::text, 'property'::text])));
alter table public."concierge_request_policies" add constraint "concierge_request_policies_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])));
alter table public."concierge_request_policies" add constraint "concierge_request_policies_structural_not_auto_chk" CHECK (((request_type <> ALL (ARRAY['early_checkin'::text, 'late_checkout'::text])) OR (handling_mode <> 'available'::text)));
alter table public."concierge_requests" add constraint "concierge_requests_approved_value_check" CHECK (((approved_value IS NULL) OR ((length(TRIM(BOTH FROM approved_value)) >= 1) AND (length(TRIM(BOTH FROM approved_value)) <= 2000))));
alter table public."concierge_requests" add constraint "concierge_requests_completion_shape_chk" CHECK ((((status <> 'communicated'::text) OR (communicated_at IS NOT NULL)) AND ((status <> 'completed'::text) OR (completed_at IS NOT NULL)) AND ((status <> 'cancelled'::text) OR (cancelled_at IS NOT NULL))));
alter table public."concierge_requests" add constraint "concierge_requests_decision_shape_chk" CHECK (((status = ANY (ARRAY['new'::text, 'waiting_manager'::text, 'cancelled'::text])) OR ((status = ANY (ARRAY['approved'::text, 'rejected'::text, 'communicated'::text, 'completed'::text])) AND (decision_at IS NOT NULL) AND (decision_source IS NOT NULL))));
alter table public."concierge_requests" add constraint "concierge_requests_decision_source_check" CHECK (((decision_source IS NULL) OR (decision_source = ANY (ARRAY['policy'::text, 'manager'::text]))));
alter table public."concierge_requests" add constraint "concierge_requests_request_type_check" CHECK ((request_type = ANY (ARRAY['early_checkin'::text, 'late_checkout'::text, 'luggage'::text, 'parking'::text, 'cleaning'::text, 'extra_items'::text, 'special_request'::text, 'other'::text])));
alter table public."concierge_requests" add constraint "concierge_requests_requested_value_check" CHECK (((requested_value IS NULL) OR ((length(TRIM(BOTH FROM requested_value)) >= 1) AND (length(TRIM(BOTH FROM requested_value)) <= 2000))));
alter table public."concierge_requests" add constraint "concierge_requests_status_check" CHECK ((status = ANY (ARRAY['new'::text, 'waiting_manager'::text, 'approved'::text, 'rejected'::text, 'communicated'::text, 'completed'::text, 'cancelled'::text])));
alter table public."concierge_requests" add constraint "concierge_requests_structural_time_chk" CHECK (((request_type <> ALL (ARRAY['early_checkin'::text, 'late_checkout'::text])) OR (requested_at_time IS NOT NULL)));
alter table public."concierge_secret_versions" add constraint "concierge_secret_versions_rotation_reason_check" CHECK (((rotation_reason IS NULL) OR ((length(TRIM(BOTH FROM rotation_reason)) >= 1) AND (length(TRIM(BOTH FROM rotation_reason)) <= 500))));
alter table public."concierge_secret_versions" add constraint "concierge_secret_versions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'retired'::text, 'revoked'::text])));
alter table public."concierge_secret_versions" add constraint "concierge_secret_versions_status_timestamps_chk" CHECK ((((status = 'active'::text) AND (retired_at IS NULL) AND (revoked_at IS NULL)) OR ((status = 'retired'::text) AND (retired_at IS NOT NULL) AND (revoked_at IS NULL)) OR ((status = 'revoked'::text) AND (revoked_at IS NOT NULL))));
alter table public."concierge_secret_versions" add constraint "concierge_secret_versions_version_number_check" CHECK ((version_number > 0));
alter table public."concierge_sessions" add constraint "concierge_sessions_current_intent_check" CHECK (((current_intent IS NULL) OR ((length(TRIM(BOTH FROM current_intent)) >= 1) AND (length(TRIM(BOTH FROM current_intent)) <= 160))));
alter table public."concierge_sessions" add constraint "concierge_sessions_language_check" CHECK ((language = ANY (ARRAY['es'::text, 'en'::text, 'it'::text, 'pt'::text])));
alter table public."concierge_sessions" add constraint "concierge_sessions_mode_check" CHECK ((mode = ANY (ARRAY['free'::text, 'concierge_guest'::text, 'manager'::text, 'co_manager'::text, 'operational'::text])));
alter table public."concierge_sessions" add constraint "concierge_sessions_mode_shape_chk" CHECK ((((mode = 'free'::text) AND (account_id IS NULL) AND (account_member_id IS NULL) AND (property_id IS NULL) AND (stay_id IS NULL) AND (stay_member_id IS NULL) AND (operational_person_id IS NULL) AND (operational_task_id IS NULL)) OR ((mode = ANY (ARRAY['manager'::text, 'co_manager'::text])) AND (account_id IS NOT NULL) AND (account_member_id IS NOT NULL) AND (property_id IS NULL) AND (stay_id IS NULL) AND (stay_member_id IS NULL) AND (operational_person_id IS NULL) AND (operational_task_id IS NULL)) OR ((mode = 'concierge_guest'::text) AND (account_id IS NOT NULL) AND (account_member_id IS NULL) AND (property_id IS NOT NULL) AND (stay_id IS NOT NULL) AND (stay_member_id IS NOT NULL) AND (operational_person_id IS NULL) AND (operational_task_id IS NULL)) OR ((mode = 'operational'::text) AND (account_id IS NOT NULL) AND (account_member_id IS NULL) AND (property_id IS NOT NULL) AND (stay_id IS NULL) AND (stay_member_id IS NULL) AND (operational_person_id IS NOT NULL) AND (operational_task_id IS NOT NULL))));
alter table public."concierge_sessions" add constraint "concierge_sessions_phone_hash_check" CHECK ((phone_hash ~ '^[0-9a-f]{64}$'::text));
alter table public."concierge_sessions" add constraint "concierge_sessions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text])));
alter table public."concierge_sessions" add constraint "concierge_sessions_status_end_chk" CHECK ((((status = 'active'::text) AND (ended_at IS NULL)) OR ((status = 'closed'::text) AND (ended_at IS NOT NULL))));
alter table public."concierge_stay_members" add constraint "concierge_stay_members_activation_chk" CHECK (((status <> 'active'::text) OR (activated_at IS NOT NULL)));
alter table public."concierge_stay_members" add constraint "concierge_stay_members_display_name_check" CHECK (((length(TRIM(BOTH FROM display_name)) >= 1) AND (length(TRIM(BOTH FROM display_name)) <= 160)));
alter table public."concierge_stay_members" add constraint "concierge_stay_members_member_role_check" CHECK ((member_role = ANY (ARRAY['primary_guest'::text, 'companion'::text])));
alter table public."concierge_stay_members" add constraint "concierge_stay_members_primary_guest_chk" CHECK (((member_role <> 'primary_guest'::text) OR ((whatsapp_enabled = true) AND (guest_identity_id IS NOT NULL) AND (property_access = true) AND (stay_manage = true))));
alter table public."concierge_stay_members" add constraint "concierge_stay_members_property_access_chk" CHECK (((property_access = false) OR ((whatsapp_enabled = true) AND (guest_identity_id IS NOT NULL))));
alter table public."concierge_stay_members" add constraint "concierge_stay_members_revocation_chk" CHECK ((((status = 'revoked'::text) AND (revoked_at IS NOT NULL)) OR ((status <> 'revoked'::text) AND (revoked_at IS NULL))));
alter table public."concierge_stay_members" add constraint "concierge_stay_members_status_check" CHECK ((status = ANY (ARRAY['registered'::text, 'invited'::text, 'active'::text, 'revoked'::text, 'expired'::text])));
alter table public."concierge_stay_members" add constraint "concierge_stay_members_whatsapp_identity_chk" CHECK (((whatsapp_enabled = false) OR (guest_identity_id IS NOT NULL)));
alter table public."concierge_stays" add constraint "concierge_stays_access_intersects_stay_chk" CHECK (((access_from < check_out_at) AND (access_until > check_in_at)));
alter table public."concierge_stays" add constraint "concierge_stays_access_window_chk" CHECK ((access_until > access_from));
alter table public."concierge_stays" add constraint "concierge_stays_check_window_chk" CHECK ((check_out_at > check_in_at));
alter table public."concierge_stays" add constraint "concierge_stays_no_effective_access_overlap_excl" EXCLUDE USING gist (property_id WITH =, tstzrange(access_from, access_until, '[)'::text) WITH &&) WHERE ((status = ANY (ARRAY['scheduled'::text, 'active'::text])));
alter table public."concierge_stays" add constraint "concierge_stays_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'active'::text, 'completed'::text, 'cancelled'::text, 'revoked'::text])));
alter table public."concierge_system_interventions" add constraint "concierge_system_interventions_minutes_estimated_check" CHECK (((minutes_estimated > 0) AND (minutes_estimated <= 10080)));
alter table public."concierge_system_interventions" add constraint "concierge_system_interventions_property_requires_account_chk" CHECK (((property_id IS NULL) OR (account_id IS NOT NULL)));
alter table public."concierge_system_interventions" add constraint "concierge_system_interventions_reason_type_check" CHECK ((reason_type = ANY (ARRAY['security'::text, 'bug'::text, 'knowledge_review'::text, 'manager_support'::text, 'configuration'::text, 'other'::text])));
alter table public."concierge_system_interventions" add constraint "concierge_system_interventions_resolution_time_chk" CHECK (((resolved_at IS NULL) OR (resolved_at >= occurred_at)));
alter table public."concierge_access_authorizations" add constraint "concierge_access_authorizations_access_point_same_account_fk" FOREIGN KEY (access_point_id, account_id) REFERENCES concierge_access_points(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_access_authorizations" add constraint "concierge_access_authorizations_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_access_authorizations" add constraint "concierge_access_authorizations_grantor_same_account_fk" FOREIGN KEY (granted_by_account_member_id, account_id) REFERENCES concierge_account_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_access_authorizations" add constraint "concierge_access_authorizations_operational_person_same_account" FOREIGN KEY (operational_person_id, account_id) REFERENCES concierge_operational_people(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_access_authorizations" add constraint "concierge_access_authorizations_operational_task_same_person_fk" FOREIGN KEY (operational_task_id, account_id, operational_person_id) REFERENCES concierge_operational_tasks(id, account_id, operational_person_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_access_authorizations" add constraint "concierge_access_authorizations_stay_member_same_account_fk" FOREIGN KEY (stay_member_id, account_id) REFERENCES concierge_stay_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_access_point_policies" add constraint "concierge_access_point_policies_access_point_same_account_fk" FOREIGN KEY (access_point_id, account_id) REFERENCES concierge_access_points(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_access_point_policies" add constraint "concierge_access_point_policies_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_access_points" add constraint "concierge_access_points_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_access_points" add constraint "concierge_access_points_building_same_account_fk" FOREIGN KEY (building_id, account_id) REFERENCES concierge_buildings(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_access_points" add constraint "concierge_access_points_property_same_account_fk" FOREIGN KEY (property_id, account_id) REFERENCES concierge_properties(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_account_members" add constraint "concierge_account_members_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_audit_events" add constraint "concierge_audit_events_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_audit_events" add constraint "concierge_audit_events_property_same_account_fk" FOREIGN KEY (property_id, account_id) REFERENCES concierge_properties(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_audit_events" add constraint "concierge_audit_events_stay_same_account_fk" FOREIGN KEY (stay_id, account_id) REFERENCES concierge_stays(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_buildings" add constraint "concierge_buildings_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_entry_links" add constraint "concierge_entry_links_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_entry_links" add constraint "concierge_entry_links_property_same_account_fk" FOREIGN KEY (property_id, account_id) REFERENCES concierge_properties(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_escalation_policies" add constraint "concierge_escalation_policies_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_escalation_policies" add constraint "concierge_escalation_policies_property_same_account_fk" FOREIGN KEY (property_id, account_id) REFERENCES concierge_properties(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_events" add constraint "concierge_events_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_events" add constraint "concierge_events_property_same_account_fk" FOREIGN KEY (property_id, account_id) REFERENCES concierge_properties(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_events" add constraint "concierge_events_stay_same_account_fk" FOREIGN KEY (stay_id, account_id) REFERENCES concierge_stays(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_guest_channels" add constraint "concierge_guest_channels_guest_identity_id_fkey" FOREIGN KEY (guest_identity_id) REFERENCES concierge_guest_identities(id) ON DELETE CASCADE;
alter table public."concierge_guest_invites" add constraint "concierge_guest_invites_member_same_account_fk" FOREIGN KEY (stay_member_id, account_id) REFERENCES concierge_stay_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_guest_phone_changes" add constraint "concierge_guest_phone_changes_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id);
alter table public."concierge_guest_phone_changes" add constraint "concierge_guest_phone_changes_approved_by_member_id_fkey" FOREIGN KEY (approved_by_member_id) REFERENCES concierge_account_members(id);
alter table public."concierge_guest_phone_changes" add constraint "concierge_guest_phone_changes_original_guest_identity_id_fkey" FOREIGN KEY (original_guest_identity_id) REFERENCES concierge_guest_identities(id);
alter table public."concierge_guest_phone_changes" add constraint "concierge_guest_phone_changes_property_id_fkey" FOREIGN KEY (property_id) REFERENCES concierge_properties(id);
alter table public."concierge_guest_phone_changes" add constraint "concierge_guest_phone_changes_requested_by_member_id_fkey" FOREIGN KEY (requested_by_member_id) REFERENCES concierge_account_members(id);
alter table public."concierge_guest_phone_changes" add constraint "concierge_guest_phone_changes_stay_id_fkey" FOREIGN KEY (stay_id) REFERENCES concierge_stays(id);
alter table public."concierge_guest_phone_changes" add constraint "concierge_guest_phone_changes_stay_member_id_fkey" FOREIGN KEY (stay_member_id) REFERENCES concierge_stay_members(id);
alter table public."concierge_incident_events" add constraint "concierge_incident_events_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_incident_events" add constraint "concierge_incident_events_incident_same_account_fk" FOREIGN KEY (incident_id, account_id) REFERENCES concierge_incidents(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_incidents" add constraint "concierge_incidents_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_incidents" add constraint "concierge_incidents_knowledge_same_account_fk" FOREIGN KEY (used_knowledge_item_id, account_id) REFERENCES concierge_knowledge_items(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_incidents" add constraint "concierge_incidents_property_same_account_fk" FOREIGN KEY (property_id, account_id) REFERENCES concierge_properties(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_incidents" add constraint "concierge_incidents_reporter_same_account_fk" FOREIGN KEY (reported_by_stay_member_id, account_id) REFERENCES concierge_stay_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_incidents" add constraint "concierge_incidents_stay_same_account_fk" FOREIGN KEY (stay_id, account_id) REFERENCES concierge_stays(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_knowledge_items" add constraint "concierge_knowledge_items_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_knowledge_items" add constraint "concierge_knowledge_items_building_same_account_fk" FOREIGN KEY (building_id, account_id) REFERENCES concierge_buildings(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_knowledge_items" add constraint "concierge_knowledge_items_current_version_fk" FOREIGN KEY (current_version_id, id, account_id) REFERENCES concierge_knowledge_versions(id, knowledge_item_id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_knowledge_items" add constraint "concierge_knowledge_items_property_same_account_fk" FOREIGN KEY (property_id, account_id) REFERENCES concierge_properties(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_knowledge_versions" add constraint "concierge_knowledge_versions_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_knowledge_versions" add constraint "concierge_knowledge_versions_approver_same_account_fk" FOREIGN KEY (approved_by_member_id, account_id) REFERENCES concierge_account_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_knowledge_versions" add constraint "concierge_knowledge_versions_creator_same_account_fk" FOREIGN KEY (created_by_member_id, account_id) REFERENCES concierge_account_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_knowledge_versions" add constraint "concierge_knowledge_versions_item_same_account_fk" FOREIGN KEY (knowledge_item_id, account_id) REFERENCES concierge_knowledge_items(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_manager_phone_enrollments" add constraint "concierge_manager_phone_enrollments_member_fk" FOREIGN KEY (member_id, account_id) REFERENCES concierge_account_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_manager_signup_screening_events" add constraint "concierge_manager_signup_screening_events_invite_id_fkey" FOREIGN KEY (invite_id) REFERENCES concierge_manager_signup_invites(id) ON DELETE RESTRICT;
alter table public."concierge_manager_signup_screenings" add constraint "concierge_manager_signup_screenings_invite_id_fkey" FOREIGN KEY (invite_id) REFERENCES concierge_manager_signup_invites(id) ON DELETE RESTRICT;
alter table public."concierge_manager_web_identities" add constraint "concierge_manager_web_identities_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_manager_web_identities" add constraint "concierge_manager_web_identities_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;
alter table public."concierge_manager_web_identities" add constraint "concierge_manager_web_identities_member_same_account_fk" FOREIGN KEY (member_id, account_id) REFERENCES concierge_account_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_member_property_permissions" add constraint "concierge_member_property_permissions_member_same_account_fk" FOREIGN KEY (member_id, account_id) REFERENCES concierge_account_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_member_property_permissions" add constraint "concierge_member_property_permissions_property_same_account_fk" FOREIGN KEY (property_id, account_id) REFERENCES concierge_properties(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_notification_outbox" add constraint "concierge_notification_outbox_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON DELETE CASCADE;
alter table public."concierge_notification_outbox" add constraint "concierge_notification_outbox_stay_id_fkey" FOREIGN KEY (stay_id) REFERENCES concierge_stays(id) ON DELETE CASCADE;
alter table public."concierge_notification_outbox" add constraint "concierge_notification_outbox_stay_member_id_fkey" FOREIGN KEY (stay_member_id) REFERENCES concierge_stay_members(id) ON DELETE CASCADE;
alter table public."concierge_operational_people" add constraint "concierge_operational_people_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_operational_tasks" add constraint "concierge_operational_tasks_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_operational_tasks" add constraint "concierge_operational_tasks_creator_same_account_fk" FOREIGN KEY (created_by_member_id, account_id) REFERENCES concierge_account_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_operational_tasks" add constraint "concierge_operational_tasks_person_same_account_fk" FOREIGN KEY (operational_person_id, account_id) REFERENCES concierge_operational_people(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_operational_tasks" add constraint "concierge_operational_tasks_property_same_account_fk" FOREIGN KEY (property_id, account_id) REFERENCES concierge_properties(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_actor_account_member_fk" FOREIGN KEY (actor_account_member_id, account_id) REFERENCES concierge_account_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_actor_stay_member_fk" FOREIGN KEY (actor_stay_member_id, account_id) REFERENCES concierge_stay_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_property_same_account_fk" FOREIGN KEY (property_id, account_id) REFERENCES concierge_properties(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_pending_actions" add constraint "concierge_pending_actions_stay_same_account_fk" FOREIGN KEY (stay_id, account_id) REFERENCES concierge_stays(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_properties" add constraint "concierge_properties_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_properties" add constraint "concierge_properties_building_same_account_fk" FOREIGN KEY (building_id, account_id) REFERENCES concierge_buildings(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_property_contacts" add constraint "concierge_property_contacts_property_same_account_fk" FOREIGN KEY (property_id, account_id) REFERENCES concierge_properties(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_request_events" add constraint "concierge_request_events_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_request_events" add constraint "concierge_request_events_request_same_account_fk" FOREIGN KEY (request_id, account_id) REFERENCES concierge_requests(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_request_policies" add constraint "concierge_request_policies_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_request_policies" add constraint "concierge_request_policies_property_same_account_fk" FOREIGN KEY (property_id, account_id) REFERENCES concierge_properties(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_requests" add constraint "concierge_requests_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_requests" add constraint "concierge_requests_decider_same_account_fk" FOREIGN KEY (decided_by_member_id, account_id) REFERENCES concierge_account_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_requests" add constraint "concierge_requests_policy_same_account_fk" FOREIGN KEY (applied_policy_id, account_id) REFERENCES concierge_request_policies(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_requests" add constraint "concierge_requests_property_same_account_fk" FOREIGN KEY (property_id, account_id) REFERENCES concierge_properties(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_requests" add constraint "concierge_requests_requester_same_account_fk" FOREIGN KEY (requested_by_stay_member_id, account_id) REFERENCES concierge_stay_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_requests" add constraint "concierge_requests_stay_same_account_fk" FOREIGN KEY (stay_id, account_id) REFERENCES concierge_stays(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_secret_versions" add constraint "concierge_secret_versions_access_point_same_account_fk" FOREIGN KEY (access_point_id, account_id) REFERENCES concierge_access_points(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_secret_versions" add constraint "concierge_secret_versions_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_secret_versions" add constraint "concierge_secret_versions_creator_same_account_fk" FOREIGN KEY (created_by_account_member_id, account_id) REFERENCES concierge_account_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_sessions" add constraint "concierge_sessions_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_sessions" add constraint "concierge_sessions_account_member_fk" FOREIGN KEY (account_member_id, account_id) REFERENCES concierge_account_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_sessions" add constraint "concierge_sessions_operational_person_fk" FOREIGN KEY (operational_person_id, account_id) REFERENCES concierge_operational_people(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_sessions" add constraint "concierge_sessions_operational_task_fk" FOREIGN KEY (operational_task_id, account_id, operational_person_id) REFERENCES concierge_operational_tasks(id, account_id, operational_person_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_sessions" add constraint "concierge_sessions_property_fk" FOREIGN KEY (property_id, account_id) REFERENCES concierge_properties(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_sessions" add constraint "concierge_sessions_stay_fk" FOREIGN KEY (stay_id, account_id) REFERENCES concierge_stays(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_sessions" add constraint "concierge_sessions_stay_member_fk" FOREIGN KEY (stay_member_id, account_id) REFERENCES concierge_stay_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_stay_members" add constraint "concierge_stay_members_guest_identity_id_fkey" FOREIGN KEY (guest_identity_id) REFERENCES concierge_guest_identities(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_stay_members" add constraint "concierge_stay_members_stay_same_account_fk" FOREIGN KEY (stay_id, account_id) REFERENCES concierge_stays(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_stays" add constraint "concierge_stays_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_stays" add constraint "concierge_stays_creator_same_account_fk" FOREIGN KEY (created_by_member_id, account_id) REFERENCES concierge_account_members(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_stays" add constraint "concierge_stays_property_same_account_fk" FOREIGN KEY (property_id, account_id) REFERENCES concierge_properties(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_system_interventions" add constraint "concierge_system_interventions_account_id_fkey" FOREIGN KEY (account_id) REFERENCES concierge_accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_system_interventions" add constraint "concierge_system_interventions_property_same_account_fk" FOREIGN KEY (property_id, account_id) REFERENCES concierge_properties(id, account_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
alter table public."concierge_access_authorizations" enable row level security;
alter table public."concierge_access_point_policies" enable row level security;
alter table public."concierge_access_points" enable row level security;
alter table public."concierge_account_members" enable row level security;
alter table public."concierge_accounts" enable row level security;
alter table public."concierge_audit_events" enable row level security;
alter table public."concierge_buildings" enable row level security;
alter table public."concierge_entry_links" enable row level security;
alter table public."concierge_escalation_policies" enable row level security;
alter table public."concierge_events" enable row level security;
alter table public."concierge_gastronomy_catalog_staging" enable row level security;
alter table public."concierge_guest_channels" enable row level security;
alter table public."concierge_guest_identities" enable row level security;
alter table public."concierge_guest_invites" enable row level security;
alter table public."concierge_guest_phone_changes" enable row level security;
alter table public."concierge_incident_events" enable row level security;
alter table public."concierge_incidents" enable row level security;
alter table public."concierge_knowledge_items" enable row level security;
alter table public."concierge_knowledge_versions" enable row level security;
alter table public."concierge_manager_phone_enrollments" enable row level security;
alter table public."concierge_manager_signup_invites" enable row level security;
alter table public."concierge_manager_signup_screening_events" enable row level security;
alter table public."concierge_manager_signup_screenings" enable row level security;
alter table public."concierge_manager_web_identities" enable row level security;
alter table public."concierge_member_property_permissions" enable row level security;
alter table public."concierge_notification_meta_callback_buffer" enable row level security;
alter table public."concierge_notification_outbox" enable row level security;
alter table public."concierge_operational_people" enable row level security;
alter table public."concierge_operational_tasks" enable row level security;
alter table public."concierge_pending_actions" enable row level security;
alter table public."concierge_properties" enable row level security;
alter table public."concierge_property_contacts" enable row level security;
alter table public."concierge_request_events" enable row level security;
alter table public."concierge_request_policies" enable row level security;
alter table public."concierge_requests" enable row level security;
alter table public."concierge_secret_versions" enable row level security;
alter table public."concierge_sessions" enable row level security;
alter table public."concierge_stay_members" enable row level security;
alter table public."concierge_stays" enable row level security;
alter table public."concierge_system_interventions" enable row level security;
