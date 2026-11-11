// A configured identity pin is a contract, not independent attestation.
import {record} from '../../contract-v1/codec.mjs';
const keys=['sessionUser','currentUser','database','pid','startedAt','serverVersion'];
const general=new Set(['postgres','service_role','anon','authenticated','supabase_admin']);
export function backendPin(raw){
 if(raw===undefined)return null;
 const p=record(raw,keys);
 if(!['sessionUser','currentUser','database'].every(k=>typeof p[k]==='string'&&/^[a-z_][a-z0-9_]{0,62}$/.test(p[k]))
  ||general.has(p.sessionUser)||general.has(p.currentUser)||!Number.isSafeInteger(p.pid)||p.pid<1
  ||typeof p.startedAt!=='string'||new Date(p.startedAt).toISOString()!==p.startedAt||p.serverVersion!==170011)
  throw Error('TRANSPORT_IDENTITY_UNVERIFIED');
 return p;
}
export function sameBackend(expected,raw){
 if(expected===null)return false;
 const actual=record(raw,keys);
 return keys.every(k=>actual[k]===expected[k]);
}
