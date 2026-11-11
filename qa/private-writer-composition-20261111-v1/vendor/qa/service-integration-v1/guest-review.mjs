// Review-only bridge to the existing SDK identity boundary and private SQL scope.
// No channel attestation, invitation consumption, secret delivery or write dispatch.
import {randomUUID} from 'node:crypto';
import {createSdkIdentityBoundary,verifiedIdentity} from '../writer-gateway-v2/sdk-identity.mjs';
import {record,isUuid} from '../contract-v1/codec.mjs';
const flags={guestAccessEnabled:false,codesAllowed:false,channelConnectedVerified:false,humanConsentVerified:false,operationalApproval:false,betaDecision:'NO-GO'};
const fields=['state','userId','sessionId','requestId','checkedAtMs','invitationId','accountId','propertyId','stayId','stayMemberId','guestIdentityId','identityGeneration','reservationRevision','openIncidentId','channelConnectedVerified','fixtureEvidenceOnly','guestAccessEnabled','codesAllowed','operationalApproval','betaDecision'];
export function createSqlGuestReview({getClaims,readScope,held=()=>true,now=Date.now,newId=randomUUID,deadlineMs=2000}={}){
 if(typeof getClaims!=='function'||typeof readScope!=='function'||typeof held!=='function'||!Number.isSafeInteger(deadlineMs)||deadlineMs<1||deadlineMs>3000)throw Error('SERVICE_REVIEW_CONFIG');
 const sdk=createSdkIdentityBoundary({getClaims});let floor=-1;
 const tick=()=>{const n=now();if(!Number.isSafeInteger(n)||n<floor)throw Error('SERVICE_REVIEW_CLOCK');floor=n;return n;};
 return Object.freeze({async review(token,input,signal=new AbortController().signal){
  const ac=new AbortController();let timer,abort;try{
   if(!(signal instanceof AbortSignal)||signal.aborted||held()!==false)throw Error('SERVICE_REVIEW_HELD');
   const deadline=new Promise((_,reject)=>{abort=()=>{ac.abort();reject(Error('SERVICE_REVIEW_TIMEOUT'));};signal.addEventListener('abort',abort,{once:true});timer=setTimeout(abort,deadlineMs);});
   const work=(async()=>{
    const p=record(input,['invitationId','stayId']);if(!isUuid(p.invitationId)||!isUuid(p.stayId))throw Error('SERVICE_REVIEW_INPUT');
    const auth=await sdk.verify(token,{now:tick()});verifiedIdentity(auth,token,tick());
    const scopes=[];
    for(let n=0;n<2;n++){
     if(ac.signal.aborted||held()!==false)throw Error('SERVICE_REVIEW_HELD');
     const since=tick(),requestId=newId();if(!isUuid(requestId))throw Error('SERVICE_REVIEW_ID');
     const s=record(await readScope(Object.freeze({...auth,...p,requestId,signal:ac.signal})),fields),at=tick();
     if(ac.signal.aborted||held()!==false||s.userId!==auth.userId||s.sessionId!==auth.sessionId||s.invitationId!==p.invitationId||s.stayId!==p.stayId||s.requestId!==requestId||!Number.isSafeInteger(s.checkedAtMs)||s.checkedAtMs<since||s.checkedAtMs>at||s.fixtureEvidenceOnly!==true||Object.keys(flags).filter(k=>k in s).some(k=>s[k]!==flags[k])||!['accountId','propertyId','stayMemberId','guestIdentityId'].every(k=>isUuid(s[k]))||!Number.isSafeInteger(s.identityGeneration)||s.identityGeneration<1||!Number.isSafeInteger(s.reservationRevision)||s.reservationRevision<1||!['PREARRIVAL_REVIEWED','ACTIVE_CONTRACT_REVIEWED','INCIDENT_ONLY_REVIEWED'].includes(s.state)||(s.openIncidentId!==null&&!isUuid(s.openIncidentId)))throw Error('SERVICE_REVIEW_SCOPE');
     verifiedIdentity(auth,token,at);scopes.push(s);
     if(n===0){const fresh=await sdk.verify(token,{now:tick()});verifiedIdentity(fresh,token,tick());if(Object.keys(auth).some(k=>fresh[k]!==auth[k]))throw Error('SERVICE_REVIEW_IDENTITY_CHANGED');}
    }
    for(const k of fields)if(!['requestId','checkedAtMs'].includes(k)&&scopes[0][k]!==scopes[1][k])throw Error('SERVICE_REVIEW_CHANGED');
    if(ac.signal.aborted||held()!==false)throw Error('SERVICE_REVIEW_HELD');verifiedIdentity(auth,token,tick());
    // No identifiers or case content are returned to a guest by this review adapter.
    return Object.freeze({state:scopes[1].state,currentSqlReviewMatched:true,fixtureEvidenceOnly:true,...flags});
   })();
   return await Promise.race([work,deadline]);
  }catch{return Object.freeze({state:'HELD',currentSqlReviewMatched:false,fixtureEvidenceOnly:true,...flags});}
  finally{clearTimeout(timer);if(abort)signal.removeEventListener('abort',abort);ac.abort();}
 }});
}
