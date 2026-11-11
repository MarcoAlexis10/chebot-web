// Composition-only review. No SDK instance, HTTP, database or sender is installed.
import {performance} from 'node:perf_hooks';
import {record,isUuid} from '../contract-v1/codec.mjs';
import {createSqlGuestReview} from '../service-integration-v1/guest-review.mjs';

const flags=Object.freeze({fixtureEvidenceOnly:true,guestAccessEnabled:false,codesAllowed:false,
 channelConnectedVerified:false,humanConsentVerified:false,operationalApproval:false,betaDecision:'NO-GO'});
const denied=Object.freeze({state:'HELD',currentSqlReviewMatched:false,phoneAuthorityReviewMatched:false,...flags});
const deny=()=>{throw Error('GUEST_PHONE_AUTHORITY_DENIED');};
const authFields=['principal','userId','sessionId','sessionActive','sessionNotAfterMs','banned','phoneConfirmedAtMs',
 'phoneGeneration','phoneChangePending'];
const bindingFields=['userId','sessionId','invitationId','accountId','propertyId','stayId','stayMemberId',
 'guestIdentityId','identityGeneration','reservationRevision','phoneGeneration','consentRecorded','revoked'];
const scopeBinding=bindingFields.filter(k=>!['phoneGeneration','consentRecorded','revoked'].includes(k));
const counter=n=>Number.isSafeInteger(n)&&n>0;
const timestamp=n=>Number.isSafeInteger(n)&&n>=0;

function currentGuestSnapshot(input, request, now) {
 const result=record(input,['authority','binding','scope','window']);
 const auth=record(result.authority,authFields);
 const binding=record(result.binding,bindingFields);
 const scope=result.scope;
 const window=record(result.window,['stayId','checkInMs','accessFromMs','checkoutMs','accessUntilMs','completed']);
 const start=Math.max(window.checkInMs,window.accessFromMs);
 const end=Math.min(window.checkoutMs,window.accessUntilMs);
 if(window.stayId!==request.stayId||![window.checkInMs,window.accessFromMs,window.checkoutMs,window.accessUntilMs].every(timestamp)
    ||window.completed!==false||start>=end||now>=end)deny();
 const state=now<start?'PREARRIVAL_REVIEWED':'ACTIVE_CONTRACT_REVIEWED';
 if(Object.getOwnPropertyDescriptor(scope,'state')?.value!==state)deny();
 if(auth.principal!=='guest'||auth.userId!==request.userId||auth.sessionId!==request.sessionId
    ||auth.sessionActive!==true||auth.banned!==false||auth.phoneChangePending!==false
    ||!timestamp(auth.phoneConfirmedAtMs)||auth.phoneConfirmedAtMs>now||!counter(auth.phoneGeneration)
    ||(auth.sessionNotAfterMs!==null&&(!timestamp(auth.sessionNotAfterMs)||auth.sessionNotAfterMs<=now)))deny();
 if(binding.userId!==request.userId||binding.sessionId!==request.sessionId||binding.invitationId!==request.invitationId
    ||binding.stayId!==request.stayId||binding.revoked!==false||binding.consentRecorded!==true
    ||binding.phoneGeneration!==auth.phoneGeneration||!counter(binding.identityGeneration)||!counter(binding.reservationRevision))deny();
 // Scope is further validated by the existing service reviewer. Read binding
 // fields by descriptor so no untrusted getter can run before that check.
 for(const field of scopeBinding){
  if(!['identityGeneration','reservationRevision'].includes(field)&&!isUuid(binding[field]))deny();
  if(Object.getOwnPropertyDescriptor(scope,field)?.value!==binding[field])deny();
 }
 return {scope,auth,binding,window};
}

export function createGuestPhoneReview({getClaims,readAuthority,held=()=>true,now=Date.now,
 newId,deadlineMs=2000}={}) {
 if([getClaims,readAuthority,held,now].some(f=>typeof f!=='function')
    ||!Number.isSafeInteger(deadlineMs)||deadlineMs<1||deadlineMs>3000)deny();
 return Object.freeze({async review(token, input, signal=new AbortController().signal){
  if(!(signal instanceof AbortSignal))return denied;
  const expires=performance.now()+deadlineMs;
  const check=()=>{
   if(signal.aborted||performance.now()>=expires||held()!==false)deny();
  };
  let previous;
  try{
   check();
   const service=createSqlGuestReview({getClaims:async value=>{
     check();
     const result=await getClaims(value);
     check();
     return result;
    },held:()=>{check();return false;},now,newId,deadlineMs,
    readScope:async request=>{
     check();
     const current=await readAuthority(request);
     check();
     const at=now();
     if(!timestamp(at))deny();
     const observed=currentGuestSnapshot(current,request,at);
     if(previous&&(authFields.some(k=>previous.auth[k]!==observed.auth[k])
        ||bindingFields.some(k=>previous.binding[k]!==observed.binding[k])
        ||Object.keys(observed.window).some(k=>previous.window[k]!==observed.window[k])))deny();
     previous=observed;
     return observed.scope;
    }});
   const result=await service.review(token,input,signal);
   check();
   return result.currentSqlReviewMatched===true
    ?Object.freeze({...result,phoneAuthorityReviewMatched:true})
    :denied;
  }catch{return denied;}
 }});
}
