// Persistent psql ONLY inside a process-owned, network=none fixture. No remote API.
import {spawn} from 'node:child_process';import {randomBytes} from 'node:crypto';
import {assertFixture,cmd} from '../../technical-closure-20261022/qa/pg-fixture.mjs';
import {safeEnv} from '../../technical-closure-20261022/approved/private-host.mjs';
export function bindTrustedArrays(sql,values=[]){
 if(!Array.isArray(values)||values.some(v=>!Array.isArray(v)||v.some(s=>typeof s!=='string'||!/^[_a-z][_a-z0-9]*$/.test(s))))throw Error('QA_QUERY_PARAMETERS_REJECTED');
 return sql.replace(/\$([1-9][0-9]*)/g,(_,n)=>{const v=values[Number(n)-1];if(!v)throw Error('QA_QUERY_PARAMETERS_REJECTED');return 'ARRAY['+v.map(s=>"'"+s+"'").join(',')+']::text[]';});
}
export async function openOwnedSession(id){
 const n=assertFixture(id),c=JSON.parse(cmd(['inspect',n.container]))[0];if(c.HostConfig.NetworkMode!=='none')throw Error('CLOSED_QA_TARGET_REQUIRED');
 const endpoint=JSON.parse(cmd(['context','inspect']))[0].Endpoints.docker.Host;
 const child=spawn('docker',['--host',endpoint,'exec','-i',n.container,'psql','-X','-qAt','--username=postgres','--dbname=postgres','--set','ON_ERROR_STOP=1'],{env:safeEnv(),stdio:['pipe','pipe','pipe']});
 child.stdin.on('error',()=>{});child.stderr.on('data',()=>{});let pending=null,buffer='',dead=false;
 const closed=new Promise(resolve=>{child.once('error',()=>{dead=true;pending?.reject(Error('QA_SESSION_FAILED'));resolve(-1);});child.once('close',code=>{dead=true;pending?.reject(Error('QA_SESSION_CLOSED'));resolve(code);});});
 child.stdout.on('data',b=>{buffer+=b.toString();if(buffer.length>8*1024*1024){pending?.reject(Error('QA_RESULT_BOUND'));child.kill();return;}
  let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i).replace(/\r$/,'');buffer=buffer.slice(i+1);if(!pending)continue;if(line===pending.marker){const p=pending;pending=null;clearTimeout(p.timer);p.resolve(p.lines);}else pending.lines.push(line);}
 });
 async function exec(sql){
  if(dead||pending||typeof sql!=='string')throw Error('QA_SESSION_NOT_AVAILABLE');assertFixture(id);
  const marker='CV_QA_FRAME_'+randomBytes(12).toString('hex');
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending=null;reject(Error('QA_SESSION_TIMEOUT'));child.kill();},30000);
   pending={marker,lines:[],timer,resolve,reject:e=>{clearTimeout(timer);pending=null;reject(e);}};
   child.stdin.write(sql+'\n\\echo '+marker+'\n');
  });
 }
 const session={exec,async query(sql,values=[]){const text=bindTrustedArrays(sql,values).trim().replace(/;$/,'');const lines=await exec('select row_to_json(qa_row) from ('+text+') qa_row;');return {rows:lines.filter(Boolean).map(x=>JSON.parse(x))};},async close(){if(!dead)child.stdin.end();await closed;},async abort(){child.kill();await closed;}};
 const pid=(await session.query('select pg_backend_pid() as pid')).rows[0].pid;return Object.freeze({...session,pid});
}
