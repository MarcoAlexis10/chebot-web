// Versioned wire codec, not JWT verification, permission or dispatch authority.
import {createHash,verify} from 'node:crypto';import schema from './schema.json' with {type:'json'};
export const PROJECT=schema.projectRef;
const fail=()=>{throw Error('CONTRACT_V1_INVALID');};
export const isHex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export const isUuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(x);
export function record(input,keys){if(!input||Object.getPrototypeOf(input)!==Object.prototype||Reflect.ownKeys(input).length!==keys.length)fail();const out={};for(const k of keys){const d=Object.getOwnPropertyDescriptor(input,k);if(!d||!Object.hasOwn(d,'value'))fail();out[k]=d.value;}return Object.freeze(out);}
export function array(input,max=10000){if(!Array.isArray(input)||Object.getPrototypeOf(input)!==Array.prototype)fail();const n=Object.getOwnPropertyDescriptor(input,'length')?.value;if(!Number.isSafeInteger(n)||n<0||n>max||Reflect.ownKeys(input).length!==n+1)fail();const out=[];for(let i=0;i<n;i++){const d=Object.getOwnPropertyDescriptor(input,String(i));if(!d||!Object.hasOwn(d,'value'))fail();out.push(d.value);}return Object.freeze(out);}
export const fields=kind=>{if(typeof kind!=='string'||!Object.hasOwn(schema.kinds,kind))fail();return Object.freeze(schema.kinds[kind].map(x=>x[0]));};
function valid(type,v){if(type.endsWith('?')&&v===null)return true;type=type.replace(/\?$/,'');if(typeof v!=='string'||!v.isWellFormed()||v.includes('\0')||Buffer.byteLength(v)>4096)return false;
 switch(type){case 'project':return v===PROJECT;case 'uuid':return isUuid(v);case 'hash':return isHex(v);case 'uint':return /^(0|[1-9][0-9]{0,15})$/.test(v)&&BigInt(v)<=9007199254740991n;case 'tag':return /^[a-z0-9_]{1,64}$/.test(v);case 'name':return [...v].length>=1&&[...v].length<=160&&!v.startsWith(' ')&&!v.endsWith(' ')&&!/[\u0000-\u001f\u007f-\u009f]/.test(v);case 'stamp':return /^20[0-9]{2}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
 default:return ({attemptMode:['DISPATCH','READBACK'],operation:['concierge_manager_create_stay'],role:['owner','manager','co_manager'],language:['es','en','it','pt'],outcome:['COMMITTED','DENIED'],state:['PREPARED','DISPATCH_CLAIMED','COMMITTED','DENIED'],mode:['NEW','KNOWN'],subjectKind:['AUTH_USER','AUTH_SESSION','ACCOUNT','MEMBER','PROPERTY','STAY','GUEST','LEASE'],purpose:['guest_service']})[type]?.includes(v)===true;}
}
export function snapshot(kind,input){fields(kind);const specs=schema.kinds[kind];const r=record(input,fields(kind));for(const [k,t] of specs)if(!valid(t,r[k]))fail();
 if(kind==='intent'&&!(r.checkOutAt>r.checkInAt&&r.accessUntil>r.accessFrom&&r.accessFrom<r.checkOutAt&&r.accessUntil>r.checkInAt))fail();
 if(kind==='effect'&&!['stayId','stayMemberId','guestIdentityId','inviteId'].every(k=>r.state==='COMMITTED'?r[k]!==null:r[k]===null))fail();
 if(kind==='receipt'&&!((r.state==='PREPARED'&&r.revision==='1'&&r.effectDigest===null)||(r.state==='DISPATCH_CLAIMED'&&r.revision==='2'&&r.effectDigest===null)||(['COMMITTED','DENIED'].includes(r.state)&&r.revision==='3'&&isHex(r.effectDigest))))fail();
 if(kind==='checkpoint'&&!((r.mode==='NEW'&&r.revision==='0'&&r.headDigest===null)||(r.mode==='KNOWN'&&['1','2','3'].includes(r.revision)&&isHex(r.headDigest))))fail();
 if(['receipt','checkpoint'].includes(kind)&&!(BigInt(r.expiresAtMs)>BigInt(r.observedAtMs)&&BigInt(r.expiresAtMs)-BigInt(r.observedAtMs)<=300000n))fail();
 if(kind==='guest'&&!(BigInt(r.accessUntilMs)>BigInt(r.accessFromMs)&&BigInt(r.checkoutAtMs)>BigInt(r.accessFromMs)&&r.identityGeneration!=='0'))fail();return r;
}
export function frame(kind,input){const r=snapshot(kind,input),keys=fields(kind),parts=[Buffer.from('CHEVENI/FRAME/1\n'+kind+'\n','ascii')],count=Buffer.alloc(4);count.writeInt32BE(keys.length);parts.push(count);for(const k of keys){const b=r[k]===null?null:Buffer.from(r[k],'utf8'),length=Buffer.alloc(4);length.writeInt32BE(b===null?-1:b.length);parts.push(length);if(b)parts.push(b);}const b=Buffer.concat(parts);if(b.length>65536)fail();return b;}
export function parse(kind,input){if(!(input instanceof Uint8Array))fail();const keys=fields(kind),b=Buffer.from(input),prefix=Buffer.from('CHEVENI/FRAME/1\n'+kind+'\n','ascii');let p=prefix.length;if(b.length>65536||b.length<p+4||!b.subarray(0,p).equals(prefix)||b.readInt32BE(p)!==keys.length)fail();p+=4;const r={};for(const k of keys){if(p+4>b.length)fail();const n=b.readInt32BE(p);p+=4;if(n===-1){r[k]=null;continue;}if(n<0||n>4096||p+n>b.length)fail();r[k]=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b.subarray(p,p+n));p+=n;}if(p!==b.length)fail();const frozen=snapshot(kind,r);if(!frame(kind,frozen).equals(b))fail();return frozen;}
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const digestOf=(kind,input)=>digest(frame(kind,input));
export function receiptHead(input){const r=snapshot('receipt',input);return digest(frame('receipt',{...r,challenge:'0'.repeat(64),observedAtMs:'0',expiresAtMs:'1'}));}
export function verifySignature(kind,input,signature,key){if(key?.type!=='public'||key.asymmetricKeyType!=='ed25519'||typeof signature!=='string')fail();const sig=Buffer.from(signature,'base64');if(sig.length!==64||sig.toString('base64')!==signature||!verify(null,frame(kind,input),key,sig))fail();return snapshot(kind,input);}
export function subject(kind,id){return digestOf('subject',{projectRef:PROJECT,kind,id});}
