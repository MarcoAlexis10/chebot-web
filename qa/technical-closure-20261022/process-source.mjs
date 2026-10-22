// Low-level pump for a capability already restricted to an owned fictional source.
import {Readable} from 'node:stream';
export function captureStream(source,{maxBytes=64*1024*1024,timeoutMs=35000,signal}={}) {
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>64*1024*1024||!Number.isSafeInteger(timeoutMs)||timeoutMs<50||timeoutMs>35000)throw Error('CAPTURE_LIMIT_INVALID');
 async function* run(){
  const deadline=performance.now()+timeoutMs;
  if(signal?.aborted)throw Error('CAPTURE_CANCELLED');
  await source.assertIsolated();
  if(performance.now()>=deadline)throw Error('CAPTURE_TIMEOUT');
  const probe=await source.probe();
  if(signal?.aborted)throw Error('CAPTURE_CANCELLED');
  if(performance.now()>=deadline)throw Error('CAPTURE_TIMEOUT');
  if(probe.database!=='fixture_source'||probe.marker!==source.id||!/^17\.11(?:\D|$)/.test(probe.version)||probe.readOnly!==true||probe.tls!==true)throw Error('SOURCE_ATTESTATION_FAILED');
  const child=source.dump();let settled=false,spawnFailed=false,stderrBytes=0,bytes=0,abortReason;
  const closed=new Promise(resolve=>{child.once('error',()=>{spawnFailed=true;resolve(null);});child.once('close',c=>{settled=true;resolve(c);});});
  child.stderr.on('data',b=>{stderrBytes+=b.length;});
  let rejectStopped;const stopped=new Promise((_,reject)=>{rejectStopped=reject;});stopped.catch(()=>{});
  const abort=code=>{abortReason=code;rejectStopped(Error(code));child.stdout.destroy(Error(code));};
  const timer=setTimeout(()=>abort('CAPTURE_TIMEOUT'),Math.max(1,deadline-performance.now()));
  const onAbort=()=>abort('CAPTURE_CANCELLED');signal?.addEventListener('abort',onAbort,{once:true});
  try{
   for await(const b of child.stdout){bytes+=b.length;if(bytes>maxBytes)throw Error('CAPTURE_TOO_LARGE');yield b;}
   const exit=await Promise.race([closed,stopped]);
   if(abortReason)throw Error(abortReason);
   if(spawnFailed||exit!==0)throw Error('PG_DUMP_FAILED');
   // Non-empty stderr needs private operator review, never publish a successful pair.
   if(stderrBytes)throw Error('PG_DUMP_DIAGNOSTIC_REVIEW_REQUIRED');
   if(bytes===0)throw Error('PG_DUMP_EMPTY');
  }catch(e){throw Error(/^(CAPTURE_TIMEOUT|CAPTURE_CANCELLED|CAPTURE_TOO_LARGE|PG_DUMP_DIAGNOSTIC_REVIEW_REQUIRED|PG_DUMP_EMPTY)$/.test(e.message)?e.message:'PG_DUMP_FAILED');}
  finally{
   clearTimeout(timer);signal?.removeEventListener('abort',onAbort);
   if(!settled){try{await source.cancel();}finally{child.kill();await closed;}}
  }
 }
 return Readable.from(run());
}
