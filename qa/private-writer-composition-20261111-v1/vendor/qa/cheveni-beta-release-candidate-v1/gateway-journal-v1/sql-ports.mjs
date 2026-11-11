// Fixed private-writer transport boundary. No client, connection or credentials.
import {performance} from 'node:perf_hooks';
import {record,array,parse,frame,digest,isUuid} from '../../contract-v1/codec.mjs';
import {backendPin,sameBackend} from './transport-identity.mjs';
import {SQL_STATEMENTS} from '../../writer-gateway-v2/gateway.mjs';
const unknown=()=>{throw Error('GATEWAY_SQL_OUTCOME_UNKNOWN');};
export function createWriterSqlPorts({transact,newRequestId,monotonic=()=>performance.now(),remainingMs=()=>4000,expectedBackend}={}){
 const uncertain=new Set(),backend=backendPin(expectedBackend);
 async function call(operation,request){
  request=record(request,['text','values','signal']);
  const begin=monotonic(),duration=remainingMs(),requestId=newRequestId?.();
  if(backend===null||typeof transact!=='function'||!isUuid(requestId)||!(request.signal instanceof AbortSignal)
   ||request.signal.aborted||!Number.isFinite(begin)||!Number.isSafeInteger(duration)||duration<1||duration>8000)unknown();
  if(request.text!==SQL_STATEMENTS[operation])unknown();
  const values=[...array(request.values,5)];
  let intent=null;
  if(operation==='inspect'){
   if(values.length!==5||![values[0],values[1],values[3],values[4]].every(isUuid)
    ||!Number.isSafeInteger(values[2])||values[2]<1)unknown();
  }else{
   if(values.length!==2)unknown();
   intent=parse('intent',values[0]);const attempt=parse('attempt',values[1]);
   if(digest(values[0])!==attempt.intentDigest||intent.projectRef!==attempt.projectRef)unknown();
   const key=intent.userId+':'+intent.intentId;
   if(operation==='write'){
    if(attempt.mode!=='DISPATCH'||uncertain.has(key))unknown();
    // Reserve before the transport await. Process memory is not durable uniqueness.
    uncertain.add(key);
   }else if(attempt.mode!=='READBACK')unknown();
   values[0]=Buffer.from(frame('intent',intent));values[1]=Buffer.from(frame('attempt',attempt));
  }
  let expired=false,last=begin;
  const checked=()=>{
   const now=monotonic(),elapsed=now-begin;
   if(expired||!Number.isFinite(now)||now<last||elapsed<0||elapsed>=duration||request.signal.aborted){expired=true;unknown();}
   last=now;
  };
  checked();
  const controller=new AbortController();let timer,onAbort,raw;
  try{
   const alarm=new Promise((_,reject)=>{
    onAbort=()=>{expired=true;controller.abort();reject(Error('GATEWAY_SQL_OUTCOME_UNKNOWN'));};
    request.signal.addEventListener('abort',onAbort,{once:true});
    timer=setTimeout(onAbort,Math.max(0,duration-(monotonic()-begin)));
    if(request.signal.aborted)onAbort();
   });
   const task=Promise.resolve().then(()=>{
    checked();if(controller.signal.aborted)unknown();
    return transact(Object.freeze({requestId,operation,readOnly:operation!=='write',text:SQL_STATEMENTS[operation],
     values:Object.freeze(values),signal:controller.signal,remainingMs:duration-(monotonic()-begin)}));
   });
   raw=await Promise.race([alarm,task]);
  }finally{clearTimeout(timer);request.signal.removeEventListener('abort',onAbort);controller.abort();}
  checked();
  // This transport ACK is independent of the SQL function's JSON result.
  const ack=record(raw,['requestId','operation','backend','commitTag','transactionStatus','rows']);
  if(!sameBackend(backend,ack.backend)||ack.requestId!==requestId||ack.operation!==operation||ack.commitTag!=='COMMIT'||ack.transactionStatus!=='IDLE'
    ||array(ack.rows,1).length!==1)unknown();
  return record(ack.rows[0],['value']).value;
 }
 return Object.freeze({inspect:r=>call('inspect',r),write:r=>call('write',r),readback:r=>call('readback',r)});
}
