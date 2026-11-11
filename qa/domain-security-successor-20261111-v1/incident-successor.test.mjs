import test from 'node:test';
import assert from 'node:assert/strict';
import {createHeldIncidentCandidate,createIncidentContractReview,OP,SERVICE_SQL,QA_ISSUER,snapshot} from './incident-successor.mjs';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const T=1794398400000, token='ZmFrZQ.c3ludGhldGlj.bm90LXNpZ25lZA';
const command=()=>({p_auth_user_id:id(1),p_session_id:id(2),p_request_id:id(3),p_intent_id:id(4),p_operation:OP,p_token_expires_at:T/1000+3600,p_arguments:{p_incident_id:id(5),p_account_member_id:id(6),p_new_status:'resolving',p_event_summary:'  Fictitious QA incident  '}});
function lab() {
 const x={time:T,writes:0,reads:0,resolves:0,row:{issuer:QA_ISSUER,userId:id(1),sessionId:id(2),accountId:id(7),memberId:id(6),memberRole:'co_manager',propertyId:id(8),stayId:id(9),incidentId:id(5),incidentStatus:'waiting_manager',active:true,manageIncidents:true,authorityVersion:1,restrictionVersion:1,observedAtMs:T,expiresAtMs:T+4000},claims:{sub:id(1),session_id:id(2),iss:QA_ISSUER,exp:T/1000+3600,iat:T/1000-10,role:'authenticated',aud:'authenticated',is_anonymous:false}};
 x.options={mode:'OFFLINE_FIXTURE',clock:()=>x.time,getClaims:async()=>({error:null,data:{claims:{...x.claims}}}),resolveCurrent:async()=>{x.resolves++;if(x.onResolve) await x.onResolve();return {...x.row};},writer:{principal:'cheveni_service_manager_backend_v2',dispatch:async p=>{x.writes++;x.plan=p;if(x.onWrite) await x.onWrite(p);return {nativeCommandId:p.nativeCommandId,attemptId:p.attemptId,dispatchId:p.attemptId,transaction:'COMMIT'};}},reader:{principal:'cheveni_incident_readback_backend_v1',readOnly:true,readback:async p=>{x.reads++;const e={status:'COMMITTED',intentId:p.intentId,attemptId:p.attemptId,userId:p.userId,sessionId:p.sessionId,operation:p.operation,argsFingerprint:p.argsFingerprint,authorityVersion:p.authorityVersion,restrictionVersion:p.restrictionVersion,dispatchId:p.attemptId,commitId:id(10),journalRecordId:id(11),witnessRecordId:id(12),observedAtMs:x.time,expiresAtMs:x.time+1000,effect:{...p.effect}};if(x.onRead) await x.onRead(e);return e;}}};
 x.review=()=>createIncidentContractReview(x.options);return x;
}
test('product candidate keeps original guards before inspecting hostile inputs',async()=>{
 const hostile=new Proxy({},{get(){throw Error('must not inspect');}});
 const c=createHeldIncidentCandidate(hostile);
 assert.equal((await c.execute(hostile,hostile)).status,'HELD');assert.equal((await c.reconcile(hostile,hostile)).status,'HELD');
});
test('incident mapping preserves all four historical arguments and separates stable intent from attempt',async()=>{
 const x=lab(), c=command(), r=await x.review().execute(token,c);
 assert.equal(r.status,'REVIEW_MATCHED');assert.equal(r.actualSqlVerified,false);assert.equal(r.operationalApproval,false);
 assert.equal(x.plan.sql,SERVICE_SQL);assert.equal(x.plan.nativeCommandId,c.p_intent_id);assert.notEqual(x.plan.nativeCommandId,c.p_request_id);
 assert.deepEqual(x.plan.parameters,[id(1),id(2),c.p_token_expires_at,id(8),id(9),id(4),'incident_state',{incidentId:id(5),status:'resolving',summary:c.p_arguments.p_event_summary}]);
 assert.equal(x.plan.requiredEvidenceAbi,'INCIDENT_EVIDENCE_SUCCESSOR_NOT_INSTALLED');assert.equal(Object.isFrozen(x.plan.parameters[7]),true);
});
test('all other legacy operations and ambiguous or extra arguments remain unmapped',async()=>{
 const ops=['concierge_manager_decide_request','concierge_activate_knowledge_version','concierge_reject_knowledge_version','concierge_propose_incident_learning','concierge_request_guest_phone_replacement','concierge_approve_guest_phone_replacement','concierge_record_manager_signup_screening','concierge_resolve_manager_signup_followup','concierge_prepare_signup_invite','concierge_revoke_signup_invite','concierge_manager_create_stay'];
 for(const op of ops){const x=lab(),c=command();c.p_operation=op;assert.equal((await x.review().execute(token,c)).status,'HELD');assert.equal(x.writes,0);}
 const c=command();c.p_arguments.extra=true;assert.throws(()=>snapshot(c));
 const a=command();Object.defineProperty(a.p_arguments,'p_event_summary',{get(){throw Error('accessor evaluated');}});assert.throws(()=>snapshot(a),/ARGUMENTS/);
});
test('summary uses PostgreSQL character length and space trimming without losing original value',()=>{
 const c=command();c.p_arguments.p_event_summary='😀'.repeat(4000);assert.equal(snapshot(c).p_arguments.p_event_summary,c.p_arguments.p_event_summary);
 c.p_arguments.p_event_summary='😀'.repeat(4001);assert.throws(()=>snapshot(c));
 c.p_arguments.p_event_summary='\t';assert.equal(snapshot(c).p_arguments.p_event_summary,'\t');
 for(const s of ['   ','\u0000','\ud800']){c.p_arguments.p_event_summary=s;assert.throws(()=>snapshot(c));}
});
test('current resolved incident/account/stay/property/actor and permission cannot be inferred from names',async()=>{
 for(const patch of [{incidentId:id(66)},{memberId:id(66)},{stayId:null},{propertyId:null},{accountId:null},{manageIncidents:false},{active:false},{issuer:'https://tyvwgsdzqipusodxtydv.supabase.co/auth/v1'}]){const x=lab();Object.assign(x.row,patch);assert.equal((await x.review().execute(token,command())).status,'HELD');assert.equal(x.writes,0);}
});
test('DEV issuer, expired JWT and changed session are denied before dispatch',async()=>{
 for(const patch of [{iss:'https://tyvwgsdzqipusodxtydv.supabase.co/auth/v1'},{exp:T/1000},{session_id:id(70)}]){const x=lab();Object.assign(x.claims,patch);assert.equal((await x.review().execute(token,command())).status,'HELD');assert.equal(x.writes,0);}
});
test('revocation or authority revision between resolve and dispatch prevents write',async()=>{
 for(const patch of [{active:false},{authorityVersion:2},{restrictionVersion:2}]){const x=lab();x.onResolve=()=>{if(x.resolves===2)Object.assign(x.row,patch);};assert.equal((await x.review().execute(token,command())).status,'HELD');assert.equal(x.writes,0);}
});
test('native transition restrictions stay enforced for close, learning and guest-only resolved',async()=>{
 for(const status of ['closed','learning_pending','resolved']){const x=lab(),c=command();c.p_arguments.p_new_status=status;assert.equal((await x.review().execute(token,c)).status,'HELD');assert.equal(x.writes,0);}
 const x=lab(),c=command();x.row.incidentStatus='resolved';c.p_arguments.p_new_status='closed';assert.equal((await x.review().execute(token,c)).status,'REVIEW_MATCHED');
});
test('ACK loss after model effect stays UNKNOWN; readback never resends',async()=>{
 const x=lab(),r=x.review();x.onWrite=()=>{throw Error('lost ACK after fictional commit');};assert.equal((await r.execute(token,command())).status,'UNKNOWN');assert.equal(x.reads,0);
 assert.equal((await r.execute(token,command())).status,'UNKNOWN');assert.equal(x.writes,1);
 assert.equal((await r.reconcile(token,id(4))).status,'REVIEW_MATCHED');assert.equal(x.writes,1);
});
test('same intent with changed arguments conflicts and local interleaving issues one dispatch',async()=>{
 const x=lab(),r=x.review();let release;const gate=new Promise(resolve=>release=resolve);x.onWrite=()=>gate;
 const first=r.execute(token,command());await new Promise(resolve=>setImmediate(resolve));
 const other=command();other.p_request_id=id(33);assert.equal((await r.execute(token,other)).status,'UNKNOWN');
 other.p_arguments.p_event_summary='changed';assert.equal((await r.execute(token,other)).status,'CONFLICT');release();assert.equal((await first).status,'REVIEW_MATCHED');assert.equal(x.writes,1);
});
test('readback requires all effect, intent, attempt, authority, commit, journal and witness correlations',async()=>{
 const patches=[{intentId:id(77)},{attemptId:id(77)},{sessionId:id(77)},{argsFingerprint:'0'.repeat(64)},{authorityVersion:2},{restrictionVersion:2},{dispatchId:id(77)},{commitId:null},{journalRecordId:null},{witnessRecordId:id(11)},{status:'DENIED'},{expiresAtMs:T},{observedAtMs:T+1},{effect:{incident_id:id(77),resulting_status:'resolving'}}];
 for(const patch of patches){const x=lab();x.onRead=e=>Object.assign(e,patch);const result=await x.review().execute(token,command());assert.equal(result.status,'UNKNOWN');assert.equal('effect' in result,false);assert.equal(x.writes,1);}
});
test('revocation after possible effects preserves UNKNOWN and withholds private readback',async()=>{
 const x=lab(),r=x.review();x.onWrite=()=>{x.row.active=false;};assert.equal((await r.execute(token,command())).status,'UNKNOWN');assert.equal(x.reads,0);assert.equal((await r.reconcile(token,id(4))).status,'UNKNOWN');assert.equal(x.writes,1);
 const y=lab();y.onRead=()=>{y.row.authorityVersion++;};assert.equal((await y.review().execute(token,command())).status,'UNKNOWN');
});
test('refresh or new session cannot reuse an old binding and restart cannot accept client snapshot',async()=>{
 const x=lab(),r=x.review();x.onWrite=()=>{throw Error('lost');};await r.execute(token,command());
 x.claims.exp++;assert.equal((await r.reconcile(token,id(4))).status,'UNKNOWN');assert.equal(x.reads,0);
 x.claims.session_id=id(99);assert.equal((await r.reconcile(token,id(4))).status,'UNKNOWN');assert.equal(x.reads,0);
 const fresh=x.review();assert.equal((await fresh.reconcile(token,id(4),command())).status,'UNKNOWN');assert.equal(x.writes,1);assert.equal(x.reads,0);
});
test('connection configuration rejects shared credential and reused callbacks',()=>{
 const x=lab();x.options.reader.principal=x.options.writer.principal;assert.throws(()=>x.review());
 const y=lab();y.options.reader.readback=y.options.writer.dispatch;assert.throws(()=>y.review());
 const z=lab();z.options.reader.readOnly=false;assert.throws(()=>z.review());
});
test('deadline after dispatch and clock rollback cannot establish an outcome',async()=>{
 const x=lab();x.onWrite=()=>{x.time+=600;};assert.equal((await x.review().execute(token,command())).status,'UNKNOWN');
 const y=lab();y.onResolve=()=>{y.time--;};assert.equal((await y.review().execute(token,command())).status,'HELD');assert.equal(y.writes,0);
});
test('provider exceptions never expose tokens, payloads or summaries in review results',async()=>{
 const x=lab();x.options.getClaims=async()=>{throw Error('PRIVATE_TOKEN_AND_SUMMARY_SENTINEL');};
 const result=await x.review().execute(token,command());assert.equal(result.status,'HELD');
 assert.equal(JSON.stringify(result).includes('PRIVATE_TOKEN_AND_SUMMARY_SENTINEL'),false);
});
test('expiry during final authority read and same-claims refresh cannot expose a result',async()=>{
 const x=lab(),c=command();x.options.budgetMs=2000;x.claims.exp=T/1000+1;c.p_token_expires_at=x.claims.exp;
 x.onResolve=()=>{if(x.resolves===4)x.time+=1100;};
 assert.equal((await x.review().execute(token,c)).status,'UNKNOWN');
 const y=lab(),r=y.review();y.onWrite=()=>{throw Error('lost');};await r.execute(token,command());
 assert.equal((await r.reconcile('b3RoZXI.c3ludGhldGlj.bm90LXNpZ25lZA',id(4))).status,'UNKNOWN');assert.equal(y.reads,0);
});
