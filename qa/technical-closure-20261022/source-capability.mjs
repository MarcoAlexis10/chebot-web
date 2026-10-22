import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {safeEnv} from './approved/private-host.mjs';
const sources=new WeakSet();
const register=source=>{Object.freeze(source);sources.add(source);return source;};
export const isFictionalSource=s=>sources.has(s);
export function processFixture(mode='ok',probeOverride={}){
 if(!['ok','late-nonzero','stderr','hang','large','stdout-closed-hang'].includes(mode))throw Error('FIXTURE_MODE_INVALID');
 const id='FICTIONAL_PROCESS_NO_DATABASE';
 return register({id,assertIsolated:async()=>{},probe:async()=>({database:'fixture_source',marker:id,version:'17.11',readOnly:true,tls:true,...probeOverride}),
  dump:()=>spawn(process.execPath,[fileURLToPath(new URL('./fixture-child.mjs',import.meta.url)),mode],{env:safeEnv(),stdio:['ignore','pipe','pipe'],windowsHide:true}),cancel:async()=>{}});
}
// The only PostgreSQL transport factory is an owned internal Docker fixture.
// An arbitrary callback or host object cannot be registered by callers.
export async function pgFixtureSource(id,options={}){
 const {makePgSource}=await import('./qa/pg-fixture.mjs');
 const s=await makePgSource(id,options);return register(s);
}
