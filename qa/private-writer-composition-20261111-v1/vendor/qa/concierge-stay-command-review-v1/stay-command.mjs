// Unregistered, server-side projection for the private writer candidate.
import {isUuid,record} from '../contract-v1/codec.mjs';
import {createWriterGateway} from '../writer-gateway-v2/gateway.mjs';

const outcomeKeys=['state','code','effect','automaticRetryAllowed','reconciliationRequired','operationalApproval','betaDecision'];
const base=Object.freeze({automaticRetryAllowed:false,operationalApproval:false,betaDecision:'NO-GO'});
const held=Object.freeze({httpStatus:503,state:'UNKNOWN',reconciliationRequired:true,...base});
const invalid=Object.freeze({httpStatus:400,state:'DENIED_BEFORE_DISPATCH',reconciliationRequired:false,...base});

// A typed receipt from the server-owned gateway is the input to this mapper.
// Browser payloads never enter this path.
export function projectStayReceipt(raw) {
 try {
  const result=record(raw,outcomeKeys);
  if(result.operationalApproval!==false||result.automaticRetryAllowed!==false||result.betaDecision!=='NO-GO')return held;
  if(result.state==='DENIED'&&result.code==='CONFIRMED_DENIED'&&result.effect===null
     &&result.reconciliationRequired===false)
   return Object.freeze({httpStatus:409,state:'DENIED',reconciliationRequired:false,...base});
  if(result.state!=='CONFIRMED'||result.code!=='FRESH_READBACK_AND_JOURNAL_MATCH'
     ||result.reconciliationRequired!==false)return held;
  const effect=record(result.effect,['stayId','stayMemberId','inviteId']);
  if(!Object.values(effect).every(isUuid))return held;
  // The manager view needs only the stay identifier. Member and invite IDs
  // remain in the private receipt; delivery requires its own authorization.
  return Object.freeze({httpStatus:200,state:'COMMITTED',stayId:effect.stayId,
   reconciliationRequired:false,...base});
 }catch{return held;}
}

export function createStayCommandReview(gatewayOptions) {
 const gateway=createWriterGateway(gatewayOptions);
 return Object.freeze({
  async create(token,serverDraft){
   let input;
   try{
    input=record(serverDraft,['intentId','propertyId','arguments']);
    if(!isUuid(input.intentId)||!isUuid(input.propertyId))return invalid;
   }catch{return invalid;}
   try{return projectStayReceipt(await gateway.execute(token,input));}
   catch{return held;}
  },
  async reconcile(token,serverResolvedIntent){
   // The server must resolve the original intent frame from a trusted store.
   // There is no implicit resubmit or client-facing route.
   try{return projectStayReceipt(await gateway.reconcile(token,serverResolvedIntent));}
   catch{return held;}
  }
 });
}
