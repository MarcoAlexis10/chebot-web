// NEW assembled release integration only. Uses the built payload, not old suites.
import assert from 'node:assert/strict';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {mkdtemp,rm,readFile,writeFile,mkdir,copyFile,readdir,lstat} from 'node:fs/promises';import {readFileSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';
const dir=path.resolve(process.argv[2]),get=n=>import(pathToFileURL(path.join(dir,n)));
const {startFixture,sql,cleanup,assertNoResources}=await get('pg-fixture.mjs');
const {createOwnedQaSource,assertNoPrivateClients}=await get('source.mjs');
const {createCustody,assertCustody,pairDigest}=await get('custody.mjs');
const {captureToCustody,verifyCustodialCopy,restoreCustodialCopy,assertNoTemporaryRuns}=await get('operation.mjs');
const {frontierFixture}=await import('../../private-adapter-20261023/qa/frontier-fixture.mjs');
const phrase='FICTIONAL_ASSEMBLED_PRIVATE_OPERATION_PHRASE';const checks=[],pass=s=>{checks.push(s);console.log('PASS '+s);};let id,base,root;
const defs=readFileSync(path.join(dir,'concierge-runtime-dev-schema.sql'),'utf8');
const tables=['concierge_accounts','concierge_account_members','concierge_buildings','concierge_properties','concierge_knowledge_items','concierge_knowledge_versions'];
const schema=tables.map(t=>{const a=defs.indexOf('create table public."'+t+'"('),b=defs.indexOf('\n);',a);return defs.slice(a,b+3);}).join('\n');
const A='11111111-1111-4111-8111-111111111111',M='22222222-2222-4222-8222-222222222222',P='44444444-4444-4444-8444-444444444444',K='55555555-5555-4555-8555-555555555555';
try{
 base=await mkdtemp(path.join(tmpdir(),'cv-assembled-new-'));id=await startFixture();sql(id,'fixture_source',schema+`insert into concierge_accounts(id,display_name,status,beta_started_at,beta_ends_at) values('${A}','FICTIONAL ASSEMBLY','active','2026-10-01T00:00:00Z','2026-10-31T00:00:00Z');insert into concierge_account_members(id,account_id,display_name,phone_hash,role,status) values('${M}','${A}','FICTIONAL OWNER',repeat('a',64),'owner','active');insert into concierge_properties(id,account_id,internal_name,address,city,status) values('${P}','${A}','FICTIONAL PROPERTY','FICTIONAL ADDRESS','Buenos Aires','active');insert into concierge_knowledge_items(id,account_id,scope_type,property_id,category,knowledge_key,status) values('${K}','${A}','property','${P}','other','assembly','review');insert into concierge_knowledge_versions(account_id,knowledge_item_id,version_number,content,source_type,status,created_by_member_id) values('${A}','${K}',1,'FICTIONAL ASSEMBLED CONTENT','manager_entered','draft','${M}');`);
 const custody=await createCustody(base);root=await assertCustody(custody);
 const saved=await captureToCustody({custody,source:await createOwnedQaSource(id),passphrase:phrase,name:'assembled'});
 assert.equal(saved.receipt.executionClass,'QA_FICTIONAL');assert.equal(saved.receipt.realCaptureExecuted,false);assert.equal(saved.receipt.restoreVerified,false);
 assert.equal(path.dirname(saved.pair.dataFile),root.data);assert.equal(path.dirname(saved.pair.keyFile),root.keys);await assertNoTemporaryRuns(custody);assertNoPrivateClients();
 pass('built_payload_captures_TLS_dump_to_durable_separate_cipher_key_folders_and_receipt_then_removes_session');
 const hashes=await pairDigest(saved.pair);assert.deepEqual(JSON.parse(await readFile(saved.receiptFile,'utf8')).dataSha256,hashes.dataSha256);
 let clientStarts=0;await assert.rejects(captureToCustody({custody,source:await createOwnedQaSource(id,{beforeStart:()=>{clientStarts++;}}),passphrase:phrase,name:'assembled'}),/EXISTING_CAPTURE_PRESERVED/);assert.equal(clientStarts,0);await assertNoTemporaryRuns(custody);
 pass('resume_name_collision_is_rejected_before_probe_dump_or_private_client_and_preserves_capture');
 const download=path.join(base,'fake-private-download');await mkdir(download,{mode:0o700});const copy={dataFile:path.join(download,'data.cva'),keyFile:path.join(download,'key.cclave')};await copyFile(saved.pair.dataFile,copy.dataFile);await copyFile(saved.pair.keyFile,copy.keyFile);
 const verified=await verifyCustodialCopy({custody,original:saved.pair,downloaded:copy,passphrase:phrase});assert.equal(verified.pairHashMatch,true);assert.equal(verified.driveUploadOrDownloadObserved,false);assert.equal(verified.drivePrivacyVerified,false);
 pass('local_fictional_copy_roundtrip_verifies_both_cipher_files_and_GCM_without_fabricating_Drive_evidence');
 const bytes=await readFile(copy.dataFile);bytes[bytes.length-20]^=1;await writeFile(copy.dataFile,bytes,{mode:0o600});await assert.rejects(verifyCustodialCopy({custody,original:saved.pair,downloaded:copy,passphrase:phrase}),/HASH_MISMATCH/);await copyFile(saved.pair.dataFile,copy.dataFile);
 pass('assembled_copy_verifier_rejects_corrupted_download_and_keeps_original_pair');
 let restored=false;const bad=frontierFixture();bad.captureFinishedAt=saved.receipt.captureFinishedAt;bad.minimumHead.sequence++;
 await assert.rejects(restoreCustodialCopy({custody,pair:copy,receipt:saved.receipt,passphrase:phrase,frontier:bad,inspectOwnedTarget:()=>{restored=true;}}),/NONROLLBACK/);assert.equal(restored,false);
 pass('assembled_restore_refuses_stale_independent_floor_before_creating_target');
 const frontier=frontierFixture();frontier.captureFinishedAt=saved.receipt.captureFinishedAt;
 const result=await restoreCustodialCopy({custody,pair:copy,receipt:saved.receipt,passphrase:phrase,frontier,inspectOwnedTarget:target=>{
  assert.equal(sql(target,'postgres',"select content from concierge_knowledge_versions;"),'FICTIONAL ASSEMBLED CONTENT');
  assert.equal(sql(target,'postgres',"select beta_started_at='2026-10-01T00:00:00Z' and beta_ends_at='2026-10-31T00:00:00Z' from concierge_accounts;"),'t');restored=true;
 }});assert.equal(restored,true);assert.equal(result.targetCleanedOnReturn,true);assert.equal(result.accessOpen,false);assert.equal(result.realDataRestored,false);assert.equal(result.businessTablesQuarantined,6);
 pass('built_release_reconstructs_six_table_private_copy_in_no_network_target_and_cleans_target_before_return');
 const controller=new AbortController();controller.abort();await assert.rejects(captureToCustody({custody,source:await createOwnedQaSource(id),passphrase:phrase,name:'cancelled',limits:{signal:controller.signal}}),/CAPTURE_CANCELLED/);await assertNoTemporaryRuns(custody);assertNoPrivateClients();
 pass('assembled_cancelled_operation_cleans_session_without_deleting_durable_capture');
 const receiptRace=path.join(root.receipts,'receipt-race.json');const racing=await createOwnedQaSource(id,{beforeStart:({inspection:c})=>{if(c.Config.Cmd.includes('pg_dump')&&!c.Config.Cmd.includes('--help'))writeFileSync(receiptRace,'FICTIONAL_CONCURRENT_RECEIPT',{mode:0o600,flag:'wx'});}});
 await assert.rejects(captureToCustody({custody,source:racing,passphrase:phrase,name:'receipt-race'}),/CAPTURE_PRESERVED__POST_PUBLICATION_REVIEW_REQUIRED/);
 await lstat(path.join(root.data,'receipt-race.cva'));await lstat(path.join(root.keys,'receipt-race.cclave'));assert.equal(await readFile(receiptRace,'utf8'),'FICTIONAL_CONCURRENT_RECEIPT');await assertNoTemporaryRuns(custody);
 pass('post_publication_receipt_failure_preserves_complete_pair_and_foreign_receipt_instead_of_erasing_backup');
 assert.deepEqual(await pairDigest(saved.pair),hashes);assert.equal((await readdir(root.root)).includes('.capture-lock'),false);assert.ok((await lstat(root.root)).isDirectory());
 pass('durable_original_and_receipt_survive_all_failures_with_no_staging_or_lock');
}finally{try{assertNoPrivateClients();}finally{try{if(id)cleanup(id);}finally{if(base)await rm(base,{recursive:true,force:true});}}}
assertNoResources();assertNoPrivateClients();pass('independent_owned_Docker_cleanup_and_explicit_QA_only_test_data_disposal');
console.log(JSON.stringify({result:'ASSEMBLED_PRIVATE_RELEASE_QA_PASS',checks:checks.length,realCaptureExecuted:false,remoteConnectionEnabled:false,driveVerified:false,integralRecoveryVerified:false,operationalControlsClosed:[]}));
