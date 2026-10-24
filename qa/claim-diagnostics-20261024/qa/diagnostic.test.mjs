import test from 'node:test';import assert from 'node:assert/strict';
import {Readable,PassThrough,Writable} from 'node:stream';import {EventEmitter} from 'node:events';
import {createStageObserver,interpretIncidentMetadata} from '../diagnostic.mjs';
import {loadApproved,approvedCode} from './approved-vm.mjs';
const poison='FICTIONAL_PRIVATE_VALUE /fictional/private/path fictional.invalid';
function opBindings(o,{fault='ENCRYPT_STREAM',cleanupFault=null,message=poison}={}){
 const step=(s,value)=>async()=>o.run(s,async()=>{if(s===fault)throw Error(message);if(s===cleanupFault)throw Error('FICTIONAL_CLEANUP_FAILURE');return typeof value==='function'?value():value;});
 return {
 './private-host.mjs':{createRun:step('TEMP_PREPARE',{root:'/fictional/temp',data:'/fictional/temp/data'}),removeFictionalRun:step('TEMP_CLEANUP')},
 './envelope-v3.mjs':{sealPrivateStream:step('ENCRYPT_STREAM',{dataFile:'/fictional/temp/data/capture.cva',keyFile:'/fictional/temp/data/capture.cclave'}),verifyPrivateEnvelope:step('ENVELOPE_VERIFY')},
 './closed-business.mjs':{rebuildBusinessQuarantine:()=>{throw Error('UNUSED_QA_IMPORT');}},
 'node:crypto':{randomBytes:()=>{throw Error('UNUSED_QA_IMPORT');}},
 './pg-fixture.mjs':Object.fromEntries(['startFixture','cleanup','sql'].map(x=>[x,()=>{throw Error('UNUSED_QA_IMPORT');}])),
 './recovery-frontier.mjs':{reconcileRecoveryFrontier:()=>{throw Error('UNUSED_QA_IMPORT');}},
 './source.mjs':{isReleaseSource:s=>s?.executionClass==='QA_FICTIONAL'},
 './pump.mjs':{captureStream:()=>Readable.from([Buffer.from('FICTIONAL_NOT_A_PG_DUMP')])},
 './custody.mjs':{assertCustody:step('CUSTODY_CHECK',{root:'/fictional/custody'}),lockCustody:step('LOCK_CREATE',()=>step('LOCK_CLEANUP')),requireVacantCapture:step('TARGET_VACANCY'),publishPair:step('PAIR_PUBLISH',{}),pairDigest:step('PAIR_HASH',{}),writeReceipt:step('FINAL_RECEIPT'),assertNoTemporaryRuns:()=>{},privateRegular:()=>{throw Error('UNUSED_QA_IMPORT');}},
 'node:fs/promises':{open:()=>{throw Error('QA_REAL_FILE_OPEN_FORBIDDEN');}},
 './policy.mjs':{requireRealAuthorization:()=>{throw Error('REAL_CAPTURE_SUSPENDED');}}
 };
}
for(const fault of ['CUSTODY_CHECK','LOCK_CREATE','TARGET_VACANCY','TEMP_PREPARE','ENCRYPT_STREAM','ENVELOPE_VERIFY','PAIR_PUBLISH','PAIR_HASH','FINAL_RECEIPT']){
 test('new actual operation-body stage attribution: '+fault,async()=>{
  const o=createStageObserver(),bindings=opBindings(o,{fault});
  const m=await loadApproved('operation.mjs',bindings);
  const source={executionClass:'QA_FICTIONAL',dispose:async()=>o.run('CLIENT_CLEANUP',async()=>{})};
  await assert.rejects(m.captureToCustody({source,custody:{},passphrase:'FICTIONAL_ONLY_MINIMUM_20',name:'fictional'}));
  const s=o.snapshot();assert.equal(s.firstFailure,fault);assert.equal(s.authorizesCapture,false);assert.equal(s.sourceContact,'UNKNOWN');assert(!JSON.stringify(s).includes(poison));
 });
}
for(const cleanupFault of ['CLIENT_CLEANUP','TEMP_CLEANUP','LOCK_CLEANUP']){
 test('new primary failure retained when reviewed finally masks it: '+cleanupFault,async()=>{
  const o=createStageObserver(),b=opBindings(o,{fault:'ENCRYPT_STREAM',cleanupFault,message:'PG_DUMP_FAILED'});
  const m=await loadApproved('operation.mjs',b);
  const source={executionClass:'QA_FICTIONAL',dispose:async()=>o.run('CLIENT_CLEANUP',async()=>{if(cleanupFault==='CLIENT_CLEANUP')throw Error('FICTIONAL_CLEANUP_FAILURE');})};
  let thrown;try{await m.captureToCustody({source,custody:{},passphrase:'FICTIONAL_ONLY_MINIMUM_20',name:'fictional'});}catch(e){thrown=e;}
  assert.equal(thrown.message,'FICTIONAL_CLEANUP_FAILURE');assert.equal(o.snapshot().firstFailure,'ENCRYPT_STREAM');assert.deepEqual(o.snapshot().cleanupFailures,[cleanupFault]);
  // The observer keeps first failure independently of the exception finally rethrows.
 });
}
async function sourceFixture(o,{failHelp=false,failProbe=false,helpExit=1}={}){
 let created=null,spawnCount=0;
 const randomBytes=n=>Buffer.alloc(n,1),label='cheveni.private.release.client';
 const cmd=args=>{
  if(args[0]==='create'){created={name:args[args.indexOf('--name')+1],id:args[args.indexOf('--label')+1].slice(label.length+1)};return Buffer.from(created.name);}
  if(args[0]==='inspect')return Buffer.from(JSON.stringify([{Config:{Labels:{[label]:created.id},Image:'FICTIONAL_IMAGE'},HostConfig:{ReadonlyRootfs:true,Privileged:false,CapDrop:['ALL'],SecurityOpt:['no-new-privileges'],Binds:[],PortBindings:{},Tmpfs:{'/run/cheveni':'size=1048576'}},NetworkSettings:{Networks:{none:{}}},Mounts:[{Type:'tmpfs'}]}]));
  if(args[0]==='context')return Buffer.from(JSON.stringify([{Endpoints:{docker:{Host:'unix:///var/run/docker.sock'}}}]));
  if(args[0]==='container')return Buffer.from(created?.name??'');
  if(args[0]==='rm'){created=null;return Buffer.alloc(0);}
  throw Error('QA_DOCKER_CONTRACT_REJECTED');
 };
 const spawn=()=>{
  spawnCount++;const index=spawnCount,c=new EventEmitter();c.stdout=new PassThrough();c.stderr=new PassThrough();c.stdin=new Writable({write(_b,_e,done){done();}});c.kill=()=>{};
  queueMicrotask(()=>{if((index===1&&failHelp)||(index===2&&failProbe))c.stderr.write(poison);else c.stdout.write(index===1?'--lock-wait-timeout':JSON.stringify({database:'fixture_source',marker:'fictional',version:'17.11',readOnly:true,tls:true,user:'fictional_reader'}));c.stdout.end();c.stderr.end();setImmediate(()=>c.emit('close',(index===1&&failHelp)?helpExit:((index===2&&failProbe)?1:0)));});return c;
 };
 const bindings={
 'node:fs/promises':{readFile:()=>{throw Error('QA_PRIVATE_FILE_FORBIDDEN');}},
 './policy.mjs':{POLICY:{devEnabled:false},requireRealAuthorization:()=>{throw Error('REAL_CAPTURE_SUSPENDED');}},
 './private-release-plan.mjs':{compilePrivateDevReleasePlan:()=>{throw Error('QA_DEV_PROFILE_FORBIDDEN');}},
 './prepare-windows-source.mjs':{preparePrivateWindowsSource:()=>{throw Error('QA_REAL_CA_FORBIDDEN');}},
 'node:child_process':{spawn},'node:crypto':{randomBytes,X509Certificate:class{constructor(){throw Error('QA_REAL_CA_FORBIDDEN');}}},
 './private-host.mjs':{safeEnv:()=>({})},'./pg-fixture.mjs':{assertFixture:()=>{throw Error('UNUSED_QA_IMPORT');},sql:()=>{throw Error('QA_SQL_FORBIDDEN');},cmd,IMAGE:'FICTIONAL_IMAGE'},
 './one-shot.mjs':{consumeAttempt:()=>{throw Error('QA_CLAIM_FORBIDDEN');}},'./source-version.mjs':{supportsServer17:v=>v==='17.11'},
 './qa-stage-only.mjs':{observed:(stage,fn)=>o.run(stage,fn)}
 };
 // QA-only overlay of exact pinned function bodies. Not written into any release.
 const rewrite=code=>{
  const old="const help=(await collect('pg_dump',['--help'])).toString();";
  const probe="JSON.parse((await collect('psql',['-X','-qAt','--set','ON_ERROR_STOP=1','--command',query])).toString())";
  assert.equal(code.split(old).length,2);assert.equal(code.split(probe).length,2);
  return "import {observed} from './qa-stage-only.mjs';\n"+code.replace(old,"const help=(await observed('HELP_RESULT',()=>collect('pg_dump',['--help']))).toString();").replace(probe,"await observed('PROBE_RESULT',async()=>JSON.parse((await collect('psql',['-X','-qAt','--set','ON_ERROR_STOP=1','--command',query])).toString()))");
 };
 const m=await loadApproved('source.mjs',bindings,{rewrite,suffix:'\nexport {buildBoundClient as buildFictionalBoundClient};'});
 const s=m.buildFictionalBoundClient({id:'fictional',network:'none',host:'fictional.invalid',user:'fictional_reader',database:'fixture_source',password:'FICTIONAL_ONLY',ca:Buffer.from('FICTIONAL_NOT_A_CA'),marker:'fictional',executionClass:'QA_FICTIONAL',guard:()=>{}});
 return {source:s,module:m,dispose:()=>s.dispose()};
}
for(const helpExit of [0,1])test('new reproduced help-preflight redaction defect from reviewed source, exit '+helpExit,async()=>{
 const o=createStageObserver(),f=await sourceFixture(o,{failHelp:true,helpExit});let error;
 try{await f.source.probe();}catch(e){error=e;}finally{await f.dispose();}
 assert.equal(error.message,'PRIVATE_LIBPQ_PREFLIGHT_FAILED__EXIT_'+helpExit+'__DIAGNOSTIC_true');
 const op=await loadApproved('operation.mjs',opBindings(createStageObserver()),{suffix:'\nexport {safeFailure as reviewedSafeFailure};'});
 assert.equal(op.reviewedSafeFailure(error),'PRIVATE_OPERATION_FAILED__DETAILS_REDACTED');
 assert.equal(o.snapshot().firstFailure,'HELP_RESULT');assert(!JSON.stringify(o.snapshot()).includes(poison));
});
test('new source probe failure has its own code unless cleanup masks it; not evidence of actual pooler cause',async()=>{
 const o=createStageObserver(),f=await sourceFixture(o,{failProbe:true});let e;
 try{await f.source.probe();}catch(x){e=x;}finally{await f.dispose();}
 assert.equal(e.message,'PRIVATE_TLS_OR_SOURCE_PROBE_FAILED');assert.equal(o.snapshot().firstFailure,'PROBE_RESULT');
});
test('new QA VM real factory stays locked before any private getter or claim',async()=>{
 const o=createStageObserver(),f=await sourceFixture(o);await assert.rejects(f.module.createDevSource(new Proxy({},{get(){throw Error(poison);}})),/REAL_CAPTURE_SUSPENDED/);await f.dispose();
});
test('new observer never reads arbitrary error fields; codes, stack and secrets cannot be serialized',async()=>{
 const o=createStageObserver();let touched=false;const e=new Proxy({},{get(){touched=true;throw Error(poison);}});
 try{await o.run('PROBE_RESULT',async()=>{throw e;});}catch{}
 assert.equal(touched,false);assert.equal(o.snapshot().firstFailure,'PROBE_RESULT');assert(!JSON.stringify(o.snapshot()).includes(poison));
 await assert.rejects(o.run(poison,()=>{}),/DIAGNOSTIC_INPUT_REJECTED/);
});
test('new historical facts remain ambiguous, consumed and non-authorizing',()=>{
 const s=interpretIncidentMetadata({claimExists:true,publishedData:false,publishedKey:false,publishedReceipt:false,clientRemains:false});
 assert.equal(s.attempt,'CONSUMED_NO_RETRY');assert.equal(s.sourceContact,'UNKNOWN');assert.equal(s.failureStage,'UNKNOWN_NO_HISTORICAL_TRACE');assert.equal(s.authorizesCapture,false);assert.equal(s.integralRecoveryVerified,false);
 assert.throws(()=>interpretIncidentMetadata({claimExists:true,password:poison}),/DIAGNOSTIC_INPUT_REJECTED/);
});
test('new trace capacity does not prevent attempted cleanup and never retains private results',async()=>{
 const o=createStageObserver();for(let i=0;i<70;i++)assert.equal(await o.run('CUSTODY_CHECK',()=>poison),poison);
 await o.run('CLIENT_CLEANUP',()=>{});assert.equal(o.snapshot().truncated,true);assert.equal(o.snapshot().lastStage,'CLIENT_CLEANUP');assert(!JSON.stringify(o.snapshot()).includes(poison));
});
test('new reviewed raw Docker and crypto/native failures can map to generic; safe known code survives',async()=>{
 const m=await loadApproved('operation.mjs',opBindings(createStageObserver()),{suffix:'\nexport {safeFailure as reviewedSafeFailure};'});
 for(const message of ['FIXTURE_DOCKER_FAILED_CREATE','WINDOWS_PRIVATE_CHECK_FAILED','ENCRYPTED_FILE_WRITE_INCOMPLETE','ENOSPC '+poison,'PG17_HELP_CONTRACT_REQUIRED'])assert.equal(m.reviewedSafeFailure(Error(message)),'PRIVATE_OPERATION_FAILED__DETAILS_REDACTED');
 assert.equal(m.reviewedSafeFailure(Error('PG_DUMP_FAILED')),'PG_DUMP_FAILED');
});
for(const failurePoint of ['writeFile','sync','close']){
 test('new claim existence is not durability or source proof: '+failurePoint,async()=>{
  let exists=false,opens=0;const o=createStageObserver();
  const bindings={
   'node:fs/promises':{lstat:async()=>{if(!exists)throw Object.assign(Error('FICTIONAL_ABSENCE'),{code:'ENOENT'});return {};},open:async(_path,flag)=>{assert.equal(flag,'wx');opens++;exists=true;return Object.fromEntries(['writeFile','sync','close'].map(name=>[name,async()=>{if(name===failurePoint)throw Error('FICTIONAL_DURABILITY_FAILURE');}]));},readFile:()=>{throw Error('QA_FILE_READ_FORBIDDEN');}},
   'node:path':{default:(await import('node:path')).default},
   './custody.mjs':{privateRegular:()=>{throw Error('UNUSED_QA_IMPORT');},assertCustody:async()=>({root:'/fictional/custody'})},
   './private-host.mjs':{checkPrivate:async()=>{}},'./policy.mjs':{AUTHORIZATION:'QA_FICTIONAL_ONLY',DEV:'QA_FICTIONAL_ONLY'}
  };
  const m=await loadApproved('one-shot.mjs',bindings);
  await assert.rejects(o.run('CLAIM_PERSIST',()=>m.claimAttempt({home:'/fictional/home',custody:{},machineBinding:'a'.repeat(64)})),/FICTIONAL_DURABILITY_FAILURE/);
  assert.equal(exists,true);assert.equal(o.snapshot().firstFailure,'CLAIM_PERSIST');assert.equal(o.snapshot().authorizesCapture,false);
  await assert.rejects(m.checkUnused('/fictional/home'),/ONE_CAPTURE_ALREADY_CLAIMED__DO_NOT_RETRY/);assert.equal(opens,1);
 });
}
