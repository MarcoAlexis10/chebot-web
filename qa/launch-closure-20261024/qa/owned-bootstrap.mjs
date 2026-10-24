// Test harness only. Bounded SQLSTATE diagnostic; never raw stderr or SQL text.
import {execFileSync} from 'node:child_process';
import {assertFixture,cmd} from '../../technical-closure-20261022/qa/pg-fixture.mjs';
import {safeEnv} from '../../technical-closure-20261022/approved/private-host.mjs';
export function bootstrapOwned(id,script){
 const n=assertFixture(id);if(typeof script!=='string'||!script.startsWith("begin;set local cheveni.qa_mode='FICTIONAL_ONLY';"))throw Error('QA_BOOTSTRAP_SCRIPT_REQUIRED');
 const state=JSON.parse(cmd(['inspect',n.container]))[0];if(state.HostConfig.NetworkMode!=='none')throw Error('CLOSED_QA_TARGET_REQUIRED');
 const endpoint=JSON.parse(cmd(['context','inspect']))[0].Endpoints.docker.Host;
 try{return execFileSync('docker',['--host',endpoint,'exec','-i',n.container,'psql','-X','-qAt','--username=postgres','--dbname=postgres','--set','ON_ERROR_STOP=1','--set','VERBOSITY=sqlstate'],{input:Buffer.from(script),env:safeEnv(),timeout:30000,stdio:['pipe','pipe','pipe']}).toString();}
 catch(e){const code=String(e.stderr??'').match(/ERROR:\s+([0-9A-Z]{5})(?:\s|$)/)?.[1];throw Error('QA_BOOTSTRAP_SQLSTATE_'+(code??'UNKNOWN'));}
}
