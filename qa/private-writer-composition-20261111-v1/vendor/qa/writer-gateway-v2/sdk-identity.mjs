// Trusted SDK boundary. No getSession, REST gateway, decoding-only trust or network default.
import {createHash} from 'node:crypto';import {PROJECT,isUuid} from '../contract-v1/codec.mjs';
const proofs=new WeakMap(),fail=()=>{throw Error('VERIFIED_SDK_IDENTITY_REQUIRED');};
const own=(o,k)=>{if(!o||typeof o!=='object')fail();const d=Object.getOwnPropertyDescriptor(o,k);if(!d||!Object.hasOwn(d,'value'))fail();return d.value;};
const hash=x=>createHash('sha256').update(x).digest('hex');
export function createSdkIdentityBoundary({getClaims}={}){
 if(typeof getClaims!=='function')fail();
 return Object.freeze({async verify(token,{now}={}){
  if(typeof token!=='string'||token.length>8000||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)||!Number.isSafeInteger(now))fail();
  // Configuration supplies the trusted SDK method: client.auth.getClaims(token).
  // It verifies this EXACT JWT; the candidate never implements JWT algorithms.
  const result=await getClaims(token);if(own(result,'error')!==null)fail();const claims=own(own(result,'data'),'claims');
  const sub=own(claims,'sub'),session=own(claims,'session_id'),exp=own(claims,'exp'),iat=own(claims,'iat');
  const aud=own(claims,'aud');let audience=aud==='authenticated';
  if(Array.isArray(aud)&&Object.getPrototypeOf(aud)===Array.prototype&&Reflect.ownKeys(aud).length===2&&Object.getOwnPropertyDescriptor(aud,'length')?.value===1&&Object.getOwnPropertyDescriptor(aud,'0')?.value==='authenticated')audience=true;
  const nbf=Object.getOwnPropertyDescriptor(claims,'nbf');if(nbf&&!Object.hasOwn(nbf,'value'))fail();
  if(!isUuid(sub)||!isUuid(session)||own(claims,'iss')!==`https://${PROJECT}.supabase.co/auth/v1`||own(claims,'role')!=='authenticated'||own(claims,'is_anonymous')!==false||!audience
   ||!Number.isSafeInteger(exp)||!Number.isSafeInteger(iat)||iat<0||iat>Math.floor(now/1000)||exp<=Math.floor(now/1000)||exp<=iat||exp>253402300799||(nbf&&(!Number.isSafeInteger(nbf.value)||nbf.value>Math.floor(now/1000))))fail();
  const proof=Object.freeze({userId:sub,sessionId:session,tokenExpiresAt:String(exp)});proofs.set(proof,{tokenDigest:hash(token),expiresAt:exp*1000});return proof;
 }});
}
export function verifiedIdentity(proof,token,now){const p=proofs.get(proof);if(!p||typeof token!=='string'||p.tokenDigest!==hash(token)||!Number.isSafeInteger(now)||now>=p.expiresAt)fail();return proof;}
