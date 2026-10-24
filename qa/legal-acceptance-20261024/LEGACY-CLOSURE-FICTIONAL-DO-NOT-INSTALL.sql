-- New QA-only closure candidate, separate from approved A2 bundles. Never apply live.
do $$begin if current_setting('cheveni.qa_mode',true) is distinct from 'FICTIONAL_ONLY' then raise exception 'FICTIONAL_FIXTURE_REQUIRED';end if;end$$;
-- Missing reviewed signatures must stop preparation instead of producing false GO.
revoke all on function
 public.concierge_submit_manager_signup_request(text,text,text,text,boolean,boolean),
 public.concierge_record_manager_signup_screening(uuid,uuid,text),
 public.concierge_resolve_manager_signup_followup(uuid,uuid,text)
 from public,anon,authenticated,service_role,qa_legal_bridge;
do $$declare t record;cols text;begin
 if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') and c.relname in('concierge_manager_signup_invites','concierge_manager_signup_screenings'))<>2 then raise exception 'LEGACY_REVIEWED_TABLES_REQUIRED';end if;
 for t in select c.oid,n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') and c.relname like 'concierge\_manager\_signup\_%' escape '\' loop
  execute format('lock table %I.%I in access exclusive mode',t.nspname,t.relname);
  execute format('revoke insert,update,delete,truncate on %I.%I from public,anon,authenticated,service_role,qa_legal_bridge',t.nspname,t.relname);
  select string_agg(quote_ident(attname),',') into cols from pg_attribute where attrelid=t.oid and attnum>0 and not attisdropped;
  execute format('revoke insert (%s),update (%s) on %I.%I from public,anon,authenticated,service_role,qa_legal_bridge',cols,cols,t.nspname,t.relname);
 end loop;
end$$;
-- MUST run legacy-readiness SQL in the SAME transaction before any future commit.
-- Revocation of direct grants cannot remove inherited/SET ROLE capabilities.
