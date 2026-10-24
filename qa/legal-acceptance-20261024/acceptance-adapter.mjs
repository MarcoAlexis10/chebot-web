// QA integration only. Not imported by production handlers and no remote transport.
import {createHash} from 'node:crypto';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const keys=(o,want)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join(',')===want.sort().join(',');
const reply=(status,code,extra={})=>Object.freeze({status,headers:Object.freeze({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}),body:Object.freeze({ok:status===200,code,...extra,managerActivated:false,guestAccess:false,trialStarted:false,operationalApproval:false})});
export function createQaAcceptanceAdapter({exchange}={}){
 if(typeof exchange!=='function')throw Error('QA_EXCHANGE_REQUIRED');
 return async req=>{
  // Exact lab origin, explicit bearer credential; no cookie-based CSRF authority.
  if(req?.method!=='POST'||req.headers?.origin!=='https://qa.invalid'||req.headers?.['content-type']!=='application/json')return reply(400,'LEGAL_INVALID_REQUEST');
  const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers?.authorization??'')?.[1];
  if(!token)return reply(403,'LEGAL_EVIDENCE_DENIED');
  let op,delivery=null;
  if(req.path==='/qa/legal/delivery'&&keys(req.body,[]))op='deliver';
  else if(req.path==='/qa/legal/confirm'&&keys(req.body,['deliveryId'])&&UUID.test(req.body.deliveryId)){op='confirm';delivery=req.body.deliveryId;}
  else return reply(400,'LEGAL_INVALID_REQUEST');
  try{
   const result=await exchange(op,createHash('sha256').update(token).digest('hex'),delivery);
   if(result?.ok!==true)return reply(403,'LEGAL_EVIDENCE_DENIED');
   if(op==='deliver'&&result.code==='QA_DOCUMENTS_DELIVERED'&&UUID.test(result.deliveryId)&&Array.isArray(result.documents)&&result.documents.length===2){
    return reply(200,result.code,{deliveryId:result.deliveryId,documents:result.documents});
   }
   if(op==='confirm'&&result.code==='QA_CANDIDATE_PENDING_ONLY'&&UUID.test(result.candidateId)&&typeof result.idempotent==='boolean')return reply(200,result.code,{candidateId:result.candidateId,idempotent:result.idempotent});
   return reply(503,'LEGAL_STORE_UNAVAILABLE');
  }catch{return reply(503,'LEGAL_STORE_UNAVAILABLE');} // Never return/log SQL, credentials, errors or provider detail.
 };
}
