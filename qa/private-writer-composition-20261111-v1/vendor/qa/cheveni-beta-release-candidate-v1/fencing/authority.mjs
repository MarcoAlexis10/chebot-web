// Held review adapter. The port must derive authority from current SQL/Auth
// facts and confirm participation in the same transaction fence.
import {isUuid,record} from '../../contract-v1/codec.mjs';

const roles=new Set(['owner','manager','co_manager']);
const positive=n=>Number.isSafeInteger(n)&&n>0;
const denied=()=>{throw Error('MANAGER_FENCE_HELD');};
const fields=['requestId','principal','userId','sessionId','accountId','memberId','propertyId',
 'role','revision','emailConfirmed','sessionActive','sessionNotAfterMs','suspended',
 'readInviteReceipts','dispatchInvites','manageStays','fenceCovered'];

export function createManagerFenceAuthority({readSnapshot,newRequestId,wall=Date.now}={}) {
 if(typeof readSnapshot!=='function'||typeof newRequestId!=='function')denied();

 async function resolve({auth,propertyId,operation,signal}) {
  if(signal?.aborted||!isUuid(auth.userId)||!isUuid(auth.sessionId)
    ||!(propertyId===null||isUuid(propertyId)))denied();
  const requestId=newRequestId();
  const before=wall();
  if(!isUuid(requestId)||!positive(before))denied();
  const row=record(await readSnapshot(Object.freeze({requestId,auth,propertyId,operation,signal})),fields);
  const now=wall();
  if(signal?.aborted||!positive(now)||now<before||row.requestId!==requestId
     ||row.principal!=='manager'||row.userId!==auth.userId||row.sessionId!==auth.sessionId
     ||row.propertyId!==propertyId||!isUuid(row.accountId)||!isUuid(row.memberId)||!roles.has(row.role)
     ||!positive(row.revision)||row.emailConfirmed!==true||row.sessionActive!==true
     ||!positive(row.sessionNotAfterMs)||now>=row.sessionNotAfterMs||row.suspended!==false
     ||row.fenceCovered!==true||[row.readInviteReceipts,row.dispatchInvites,row.manageStays].some(x=>typeof x!=='boolean'))denied();
  return row;
 }

 return Object.freeze({
  async dispatch(input) {
   if(!isUuid(input.propertyId))denied();
   const row=await resolve({...input,operation:'invite_dispatch'});
   if(row.dispatchInvites!==true)denied();
   const {userId,sessionId,accountId,propertyId,memberId,role,revision,dispatchInvites}=row;
   return Object.freeze({userId,sessionId,accountId,propertyId,memberId,role,revision,dispatchInvites});
  },
  async mutation(input) {
   const row=await resolve(input);
   const {userId,sessionId,accountId,propertyId,memberId,role,revision,readInviteReceipts,manageStays}=row;
   return Object.freeze({userId,sessionId,accountId,propertyId,memberId,role,revision,readInviteReceipts,manageStays});
  }
 });
}
