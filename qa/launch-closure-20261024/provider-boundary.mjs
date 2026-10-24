// QA candidate only. No URL, credentials, fetch, live provider or production import.
// Structured catalog requests only. Never attempt to infer/redact arbitrary PII.
const catalogs=Object.freeze({CABA:Object.freeze({PALERMO:Object.freeze(['PARK_01','CAFE_01']),RECOLETA:Object.freeze(['MUSEUM_01'])})});
const plain=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const exact=(x,keys)=>plain(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const fail=code=>Object.freeze({ok:false,code,remoteOutcome:'UNKNOWN',retryAllowed:false,operationalApproval:false});
export function createQaProviderBoundary({transport,timeoutMs=50}){
 if(typeof transport!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<5||timeoutMs>1000)throw Error('QA_BOUNDARY_CONFIGURATION_DENIED');
 return async function request(input){
  let request,allowed;
  try{
   if(!exact(input,['provider','city','area','category'])||!['OPENAI','PLACES'].includes(input.provider)||input.city!=='CABA'||!Object.hasOwn(catalogs.CABA,input.area)||!['CULTURE','FOOD'].includes(input.category))return fail('QA_EGRESS_DENIED');
   allowed=catalogs.CABA[input.area];
   // No source message, prompt override, contact, account/stay, address or links.
   request=Object.freeze({provider:input.provider,purpose:'PUBLIC_CATALOG_ONLY',city:'CABA',area:input.area,category:input.category,referenceIds:allowed});
  }catch{return fail('QA_EGRESS_DENIED');}
  const controller=new AbortController();let timer;
  try{
   const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('QA_TIMEOUT'));},timeoutMs);});
   const raw=await Promise.race([Promise.resolve().then(()=>transport(request,{signal:controller.signal})),timeout]);
   if(!exact(raw,['resultCode','referenceIds'])||raw.resultCode!=='CATALOG_READY'||!Array.isArray(raw.referenceIds)||raw.referenceIds.length>allowed.length||new Set(raw.referenceIds).size!==raw.referenceIds.length||raw.referenceIds.some(x=>!allowed.includes(x)))return fail('QA_PROVIDER_RESPONSE_DENIED');
   return Object.freeze({ok:true,code:'QA_CATALOG_READY',referenceIds:Object.freeze([...raw.referenceIds]),operationalApproval:false});
  }catch{return fail('QA_PROVIDER_UNAVAILABLE');}
  finally{clearTimeout(timer);}
 };
}
