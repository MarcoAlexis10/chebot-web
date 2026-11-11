import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PROFILES,compareReadbackProposal} from './role-profile.mjs';
import {frame} from '../private-writer-composition-20261111-v1/vendor/qa/contract-v1/codec.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('pinned source demonstrates both role generations and disallows granting old readback to a new login',()=>{
 const pins=JSON.parse(read('SOURCE-PINS.json'));
 for(const x of Object.values(pins.nativeCatalogExcerpts))assert.equal(createHash('sha256').update(read(x.path)).digest('hex'),x.sha256);
 const fence=read('sources/concierge_writer_contract_v2__check_fences_v2.sql.txt');
 assert.ok(fence.includes("session_user<>'"+PROFILES.native17Writer.sessionUser+"'"));
 assert.ok(!fence.includes(PROFILES.historicalWriter.sessionUser));
 const auth=read('sources/concierge_writer_cap_v1__auth_live_v1.sql.txt');assert.ok(auth.includes("current_user<>'cheveni_writer_auth_owner_v3'"));
 const grants=JSON.parse(read('sources/native17-entry-grants.json'));
 assert.deepEqual(grants.cheveni_writer_backend_v3,['concierge_writer_contract_v2.scope_v2','concierge_writer_contract_v2.write_v2','concierge_writer_contract_v2.readback_v2']);
 assert.notEqual(PROFILES.native17Writer.sessionUser,PROFILES.proposedReadback.sessionUser);
});
test('existing Native17 action is incident-capable but has no separate attempt/session/authority receipt',()=>{
 const action=read('sources/concierge_service_qa_v1__manager_action.sql.txt');
 assert.ok(action.includes("'incident_state'"));assert.ok(action.includes("'manage_incidents'"));
 assert.ok(action.includes('stay_id=p_stay and property_id=p_property and account_id='));
 assert.ok(action.includes('concierge_manager_set_incident_state(i.id,(ctx->>\'memberId\')::uuid'));
 assert.ok(action.includes('where user_id=p_user and request_id=p_request'));
 assert.ok(action.includes("jsonb_build_array(p_property,p_stay,p_op,p_value)::text"));
 assert.ok(!action.includes('attempt_id'));assert.ok(!action.includes("'sessionId'"));assert.ok(!action.includes('authorityVersion'));
 const id='00000000-0000-4000-8000-000000000001';
 const stay={projectRef:'tjdgrzzeuuihhqnzvaox',intentId:id,operation:'concierge_manager_create_stay',userId:id,accountId:id,memberId:id,memberRole:'owner',propertyId:id,guestPhoneHash:'a'.repeat(64),guestDisplayName:'FICTIONAL QA',checkInAt:'2026-11-12T12:00:00.000Z',checkOutAt:'2026-11-14T12:00:00.000Z',accessFrom:'2026-11-12T12:00:00.000Z',accessUntil:'2026-11-14T12:00:00.000Z',language:'es'};
 assert.ok(frame('intent',stay).length>0);
 assert.throws(()=>frame('intent',{...stay,operation:'concierge_manager_set_incident_state'}));
});
function profile(){return {sessionUser:PROFILES.proposedReadback.sessionUser,currentUserAtConnect:PROFILES.proposedReadback.sessionUser,definerOwner:PROFILES.proposedReadback.definerOwner,ownerCanLogin:false,superuser:false,bypassRls:false,memberships:[],loginTablePrivileges:[],ownerTablePrivileges:['bindings:SELECT_COLUMNS','intents:SELECT_COLUMNS','scope:SELECT_COLUMNS'],loginExecute:['concierge_readback_v3.readback_v3(bytea,bytea)'],ownerExecute:['concierge_readback_v3.scope_v3(uuid,uuid,bigint,uuid,uuid)','concierge_contract_v1.parse_v1(text,bytea)','concierge_contract_v1.digest_v1(text,text[])','concierge_contract_v1.frame_v1(text,text[])','concierge_contract_v1.validate_v1(text,text[])'],publicReachableMutators:[],schemaCreate:false,ownsDataTables:false,rlsSelectPolicies:['bindings:SELECT','intents:SELECT','scope:SELECT'],catalogComplete:true};}
test('proposed role closure rejects indirect writes, PUBLIC, ownership, memberships and incomplete RLS/catalog',()=>{
 const p=profile(),r=compareReadbackProposal(p);assert.equal(r.state,'PROFILE_REVIEW_MATCHED');assert.equal(r.minimumPrivilegeAccredited,false);assert.equal(r.scopeImplemented,false);
 for(const patch of [{sessionUser:PROFILES.native17Writer.sessionUser},{currentUserAtConnect:'postgres'},{ownerCanLogin:true},{superuser:true},{bypassRls:true},{memberships:['writer']},{loginTablePrivileges:['SELECT']},{ownerTablePrivileges:['bindings:SELECT_COLUMNS','bindings:INSERT']},{loginExecute:[...p.loginExecute,'concierge_writer_contract_v2.write_v2(bytea,bytea)']},{ownerExecute:[...p.ownerExecute,'mutating_helper()']},{publicReachableMutators:['hidden_definer']},{schemaCreate:true},{ownsDataTables:true},{rlsSelectPolicies:[]},{catalogComplete:false}])assert.equal(compareReadbackProposal({...p,...patch}).state,'HELD');
});
test('SQL proposal aborts before DDL, exposes only reader entry and keeps scope unimplemented',()=>{
 const sql=read('readback-v3-DO-NOT-APPLY.sql');
 assert.ok(sql.indexOf("raise exception 'CHEVENI_REVIEW_ONLY_DO_NOT_APPLY'")<sql.indexOf('create schema'));
 assert.ok(sql.trim().endsWith('rollback;'));
 const body=sql.split('as $reader$')[1].split('$reader$')[0];
 assert.ok(!/\b(insert|update|delete|truncate|merge|write_v2|run_v2|reconcile_v1)\b/i.test(body));
 assert.ok(body.includes("is distinct from 'READBACK'"));
 assert.ok(sql.includes('READBACK_SCOPE_FENCE_AUTH_RESTRICTIONS_NOT_ACCREDITED'));
 const grants=sql.split('\n').filter(l=>l.startsWith('grant execute'));
 assert.deepEqual(grants,['grant execute on function concierge_readback_v3.readback_v3(bytea,bytea) to cheveni_writer_readback_backend_v4;']);
 assert.ok(!/\bcreate role\b/i.test(sql));
});
