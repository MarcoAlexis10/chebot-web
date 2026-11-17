'use strict';
// Pure TEXT consistency checks, not a PostgreSQL parser or SQL execution.
// No files, network, Auth, keys, provider, database or positive authority.
function requireThat(ok,reason){if(!ok)throw Error(reason);}
function signature(sql,name){
 const escaped=name.replace(/[.]/g,'\\.');
 const m=new RegExp('create(?: or replace)? function '+escaped+'\\s*\\(([\\s\\S]*?)\\)\\s*returns','i').exec(sql);
 requireThat(m,'SIGNATURE_MISSING '+name);
 return m[1].split(',').map(p=>p.trim().replace(/\s+/g,' ').split(' '));
}
function review(files,originalWriter,existingReadSpec){
 const pick=suffix=>{const keys=Object.keys(files).filter(k=>k.endsWith(suffix));requireThat(keys.length===1,'ARTIFACT_MISSING '+suffix);return files[keys[0]];};
 const bootstrap=pick('01-bootstrap-DO-NOT-APPLY.sql'),admit=pick('02-admission-DO-NOT-APPLY.sql'),reader=pick('03-read2-DO-NOT-APPLY.sql'),roles=pick('04-role-rls-DO-NOT-APPLY.sql');
 for(const sql of [bootstrap,admit,reader,roles]){
  requireThat(sql.includes('REVIEW_ONLY_NOT_EXECUTED')&&sql.includes('DO NOT APPLY'),'REVIEW_CLASSIFICATION');
  requireThat(sql.indexOf('raise exception')>=0&&sql.indexOf('raise exception')<sql.search(/create (?:table|type|role|function)/i),'OUTER_ABORT_MISSING');
  requireThat(sql.trim().endsWith('rollback;'),'ROLLBACK_MISSING');
 }
 // Structural screen, not SQL parsing: reject duplicated/unterminated
 // function blocks and stray ROLLBACKs before checking valid inner fragments.
 // The additional end$ belongs to the mandatory outer DO-abort block.
 for(const [sql,declared] of [[bootstrap,3],[admit,2],[reader,1],[roles,0]]){
  const count=re=>[...sql.matchAll(re)].length;
  requireThat(count(/\bcreate(?: or replace)? function\b/gi)===declared,'SQL_STRUCTURE_FUNCTION_COUNT');
  requireThat(count(/\bas \$\$/g)===declared&&count(/\bend\$\$;/g)===declared+1,'SQL_STRUCTURE_BODY_COUNT');
  requireThat(count(/\bdo \$\$begin\s+raise exception\b/g)===1,'SQL_STRUCTURE_OUTER_DO');
  requireThat(!/\bas \$(?!\$)|\bend\$;/.test(sql),'SQL_STRUCTURE_BARE_DOLLAR');
  requireThat(count(/^rollback;/gm)===1,'SQL_STRUCTURE_ROLLBACK_COUNT');
 }
 requireThat((bootstrap.match(/perform concierge_invite_private\.validate_property_cut_review_v1\(c,p_request,'property_create'\);/g)||[]).length===1,
  'BOOTSTRAP_CURRENT_CUT_CHECK_MISSING');
 for(const sql of [bootstrap,admit,reader]){
  const functions=[...sql.matchAll(/as \$\$([\s\S]*?)end\$\$/g)];
  requireThat(functions.length>0,'FUNCTION_BODY_MISSING');
  for(const fn of functions)requireThat(/begin\s+raise exception/.test(fn[1]),'INNER_GUARD_MISSING');
 }
 const write=signature(originalWriter,'concierge_invite_private.write_property_capture_v1');
 const read=signature(reader,'concierge_invite_private.read_property_capture_v2');
 requireThat(write.length===11,'ORIGINAL_WRITER_ABI_DRIFT');
 requireThat(read.length===26&&JSON.stringify(read)===JSON.stringify(existingReadSpec),'READ2_ABI_DRIFT');
 const call=/ignored_function_result:=concierge_invite_private.write_property_capture_v1\(([\s\S]*?)\);/.exec(admit);
 requireThat(call&&call[1].split(',').length===11,'WRITER_COMPOSITION_DRIFT');
 requireThat(JSON.stringify(call[1].split(',').map(x=>x.trim()))===JSON.stringify(['c.user_id','c.session_id','c.expiry','c.member_id',"'owner'",'c.authority_revision','c.account_id','p_intent','p_key','o.address','o.floor_or_unit']),'WRITER_ARGUMENT_BINDING_DRIFT');
 requireThat(bootstrap.includes('create function concierge_invite_private.validate_property_cut_review_v1'),'CUT_VALIDATOR_MISSING');
 requireThat(bootstrap.includes('pilot_slot smallint primary key check(pilot_slot=1)'),'GLOBAL_FOUNDER_NOT_SINGLETON');
 const body=sql=>sql.replace(/--[^\n]*/g,'');
 requireThat(!/insert into concierge_invite_private.bootstrap_founder_assignment_v1/i.test(body(bootstrap)),'FOUNDER_SEEDED');
 requireThat(!/update public.concierge_accounts/i.test(body(bootstrap+admit)),'TRIAL_MUTATION');
 requireThat(admit.indexOf("'admission','KNOWN'")<admit.indexOf('ignored_function_result:='),'KNOWN_AFTER_WRITER');
 requireThat(admit.includes('historical_capture.address,historical_capture.floor_or_unit'),'KEY_ONLY_COMPARISON');
 requireThat(admit.includes('property_require_no_prior_dispatch_v1'),'RESTORE_ABSENCE_NOT_GUARDED');
 requireThat(admit.includes('pg_current_xact_id()')&&admit.includes('pg_backend_pid()'),'TRANSACTION_BINDING_MISSING');
 requireThat(!/set role|set_config/i.test(body(admit)),'CLIENT_AUTH_CONTEXT');
 requireThat(!/\b(insert|update|delete)\b/i.test(body(reader)),'READER_DML');
 requireThat(!/property_original_payload_v1|select[^;]*(?:address|floor_or_unit)/i.test(body(reader)),'READER_RAW_PAYLOAD');
 requireThat(!/'state'\s*,\s*'(?:SUCCESS|COMMITTED)'/.test(body(admit+reader)),'ACK_PROMOTED');
 const profile=JSON.parse(pick('PORTS-AND-ROLES.json'));
 requireThat(profile.readAbi.argumentCount===26&&profile.readAbi.accountParameter===false,'READER_PROFILE_DRIFT');
 requireThat(profile.owners.cheveni_property_capture_read_owner_v2.writeGrants.length===0,'READER_WRITE_GRANT');
 return {classification:'STATIC_TEXT_CONSISTENCY_ONLY',result:'PASS',sqlParsed:false,sqlExecuted:false,nodeExecuted:false,authVerified:false,externalCommitVerified:false,operationalApproval:false,betaDecision:'NO-GO'};
}
module.exports={review,signature};
