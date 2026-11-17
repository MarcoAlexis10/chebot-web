-- REVIEW ONLY / DO NOT APPLY. Narrow transitive closure, not an activation.
-- Missing protected functions MUST stop future work before any mutation.
begin;
do $$begin raise exception 'PROPERTY_DEPENDENCY_ACL_REVIEW_ONLY';end$$;

grant usage on schema public,concierge_invite_private to
 cheveni_property_bootstrap_owner_v1,cheveni_property_admission_owner_v1,
 cheveni_property_capture_read_owner_v2,cheveni_private_mutation_owner_v1;
-- Only the private schema is needed to resolve these application entries.
-- No entry EXECUTE is granted to application logins by this review fragment.
grant usage on schema concierge_invite_private to
 cheveni_property_bootstrap_scope_backend_v1,cheveni_private_mutation_backend_v1,
 cheveni_property_capture_reader_backend_v2;

revoke all on type concierge_invite_private.property_current_cut_v1,
 concierge_invite_private.property_original_payload_v1,
 concierge_invite_private.property_original_metadata_v1 from public,anon,authenticated,service_role;
grant usage on type concierge_invite_private.property_current_cut_v1 to
 cheveni_property_bootstrap_owner_v1,cheveni_property_admission_owner_v1,
 cheveni_property_capture_read_owner_v2,cheveni_private_mutation_owner_v1;
grant usage on type concierge_invite_private.property_original_payload_v1 to cheveni_property_admission_owner_v1;
grant usage on type concierge_invite_private.property_original_metadata_v1 to cheveni_property_capture_read_owner_v2;

grant execute on function
 concierge_invite_private.bootstrap_current_cut_v1(uuid,text,uuid),
 concierge_invite_private.bootstrap_require_independent_floor_v1(concierge_invite_private.property_current_cut_v1),
 concierge_invite_private.bootstrap_require_complete_catalog_v1(),
 concierge_invite_private.validate_property_cut_review_v1(concierge_invite_private.property_current_cut_v1,uuid,text)
 to cheveni_property_bootstrap_owner_v1,cheveni_property_admission_owner_v1,cheveni_property_capture_read_owner_v2;
grant execute on function
 concierge_invite_private.resolve_first_property_review_v1(uuid,uuid,uuid)
 to cheveni_property_admission_owner_v1,cheveni_private_mutation_owner_v1;
grant execute on function
 concierge_invite_private.property_original_payload_v1(uuid,concierge_invite_private.property_current_cut_v1),
 concierge_invite_private.property_require_original_equal_v1(uuid,uuid),
 concierge_invite_private.property_require_original_cut_v1(uuid,concierge_invite_private.property_current_cut_v1),
 concierge_invite_private.property_require_no_prior_dispatch_v1(uuid,uuid,bytea),
 concierge_invite_private.write_property_capture_v1(uuid,uuid,bigint,uuid,text,bigint,uuid,uuid,bytea,text,text)
 to cheveni_property_admission_owner_v1;
grant execute on function
 concierge_invite_private.property_original_metadata_v1(uuid,concierge_invite_private.property_current_cut_v1),
 concierge_invite_private.property_require_capture_matches_original_v1(uuid,uuid,uuid)
 to cheveni_property_capture_read_owner_v2;
grant execute on function
 concierge_invite_private.private_mutation_authority_v1(uuid,uuid,bigint,uuid,text),
 concierge_invite_private.check_private_mutation_authority_v1(uuid,uuid,bigint,uuid,text,bigint,uuid,uuid,text)
 to cheveni_private_mutation_owner_v1;

-- Custodian/provider/revoker source privileges and owners remain unimplemented.
-- Those principals do not inherit any grants from this fragment. Native catalog
-- must reject PUBLIC/default/role inheritance drift before considering entries.
rollback;
