// Server-only review adapters over the existing SDK and manager/guest reviewers.
// No SDK client, network, database, bearer cache or identity source default.
import {createSdkIdentityBoundary,verifiedIdentity} from '../../writer-gateway-v2/sdk-identity.mjs';
import {createManagerFenceAuthority} from '../fencing/authority.mjs';
import {record,isUuid} from '../../contract-v1/codec.mjs';
import {createGuestJourneyReview} from '../../concierge-guest-journey-review-v2/guest-journey.mjs';
const flags=Object.freeze({operationalApproval:false,actualProviderVerified:false,
 actualFenceVerified:false,guestAccessEnabled:false,codesAllowed:false,betaDecision:'NO-GO'});
const held=Object.freeze({state:'HELD',scope:null,...flags});
const guestHeld=Object.freeze({screen:'CONCIERGE_HELD',...flags});
const deny=()=>{throw Error('CURRENT_AUTHORITY_REVIEW_HELD');};

export function createClosedAuthorityReview({mode,getClaims,readManagerSource,readGuestObservation,
 newRequestId,wall=Date.now,monotonic=()=>performance.now(),deadlineMs=2000}={}){
 if(mode!=='OFFLINE_FIXTURE')return Object.freeze({manager:async()=>held,guest:async()=>guestHeld});
 if(typeof getClaims!=='function'||typeof newRequestId!=='function'||!Number.isSafeInteger(deadlineMs)
  ||deadlineMs<1||deadlineMs>3000)deny();
 const sdk=createSdkIdentityBoundary({getClaims});
 async function run(signal,work,fallback){
  if(signal!==undefined&&!(signal instanceof AbortSignal))return fallback;
  const controller=new AbortController();let timer,onAbort;
  const begin=monotonic();let last=begin,lastWall=-1;
  const checkedWall=()=>{const n=wall();if(!Number.isSafeInteger(n)||n<lastWall||n<0)deny();lastWall=n;return n;};
  const check=()=>{const now=monotonic();if(!Number.isFinite(now)||!Number.isFinite(begin)
   ||now<last||now-begin>=deadlineMs||controller.signal.aborted)deny();last=now;};
  const step=async fn=>{check();const value=await fn();check();return value;};
  try{
   const timeout=new Promise((_,reject)=>{
    onAbort=()=>{controller.abort();reject(Error('AUTHORITY_CANCELLED_OR_EXPIRED'));};
    signal?.addEventListener('abort',onAbort,{once:true});timer=setTimeout(onAbort,deadlineMs);if(signal?.aborted)onAbort();
   });
   const pending=Promise.resolve().then(()=>{check();return work({signal:controller.signal,step,check,now:checkedWall});});
   const result=await Promise.race([timeout,pending]);check();return result;
  }catch{return fallback;}
  finally{clearTimeout(timer);if(onAbort)signal?.removeEventListener('abort',onAbort);controller.abort();}
 }
 return Object.freeze({
  manager(token,input,signal){
   return run(signal,async timing=>{
    const {propertyId,operation}=record(input,['propertyId','operation']);
    if(!['property_create','stay_create','companion_prepare','invite_receipt','invite_dispatch'].includes(operation)
      ||(operation==='property_create'?propertyId!==null:!isUuid(propertyId))||typeof readManagerSource!=='function')deny();
    const proof=await timing.step(()=>sdk.verify(token,{now:timing.now()}));
    const auth=verifiedIdentity(proof,token,timing.now());
    const authority=createManagerFenceAuthority({newRequestId,wall:timing.now,
     readSnapshot:request=>timing.step(()=>readManagerSource(Object.freeze({...request,signal:timing.signal})))});
    const observe=auth=>operation==='invite_dispatch'
     ?authority.dispatch({auth,propertyId,signal:timing.signal}):authority.mutation({auth,propertyId,operation,signal:timing.signal});
    const permits=scope=>operation==='property_create'?scope.role==='owner'&&scope.propertyId===null
     :operation==='invite_receipt'?scope.readInviteReceipts===true
     :operation==='invite_dispatch'?scope.dispatchInvites===true:scope.manageStays===true;
    const before=await timing.step(()=>observe(auth));if(!permits(before))deny();
    const fresh=await timing.step(()=>sdk.verify(token,{now:timing.now()}));
    const current=verifiedIdentity(fresh,token,timing.now());
    if(Object.keys(auth).some(key=>auth[key]!==current[key]))deny();
    const after=await timing.step(()=>observe(current));if(!permits(after))deny();
    if(Object.keys(before).some(key=>before[key]!==after[key]))deny();
    verifiedIdentity(proof,token,timing.now());
    return Object.freeze({state:'CURRENT_MANAGER_REVIEW_MATCHED',operation,scope:after,...flags});
   },held);
  },
  guest(token,selection,{action='overview',locale='es',signal}={}){
   return run(signal,async timing=>{
    if(typeof readGuestObservation!=='function')deny();
    const reviewer=createGuestJourneyReview({getClaims:token=>timing.step(()=>getClaims(token)),
     newId:newRequestId,now:timing.now,deadlineMs,held:()=>{try{timing.check();return false;}catch{return true;}},
     readObservation:request=>timing.step(()=>readGuestObservation(Object.freeze({...request,
      signal:AbortSignal.any([timing.signal,request.signal])})))});
    const result=await timing.step(()=>reviewer.view(token,selection,{action,locale,signal:timing.signal}));
    // Existing guest review returns only public presentation, never resource IDs.
    return Object.freeze({...result,...flags});
   },guestHeld);
  }
 });
}
