-- REVIEW ONLY / DO NOT APPLY. Phase fragment; never an installer.
begin;
do $$begin raise exception 'PROPERTY_PHASE_REVIEW_ONLY';end$$;

create role cheveni_property_governance_owner_v1 nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
create role cheveni_property_bootstrap_owner_v1 nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
create role cheveni_property_admission_owner_v1 nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
create role cheveni_property_capture_read_owner_v2 nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
create role cheveni_property_bootstrap_scope_backend_v1 login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit 1;
create role cheveni_property_capture_reader_backend_v2 login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit 1;

-- Historical writer roles are external prerequisites, not aliases.
rollback;
