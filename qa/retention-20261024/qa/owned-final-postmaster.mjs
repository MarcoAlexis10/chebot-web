// Avoid using the image's temporary init server. Only process-owned closed fixtures.
import {assertFixture,cmd} from '../../technical-closure-20261022/qa/pg-fixture.mjs';
export async function awaitFinalPostmaster(id){
 const n=assertFixture(id);if(JSON.parse(cmd(['inspect',n.container]))[0].HostConfig.NetworkMode!=='none')throw Error('CLOSED_FIXTURE_REQUIRED');
 for(let k=0;k<80;k++){assertFixture(id);try{if(cmd(['exec',n.container,'cat','/proc/1/comm']).toString().trim()==='postgres')return;}catch{}
 await new Promise(r=>setTimeout(r,100));}
 throw Error('FINAL_FICTIONAL_POSTMASTER_REQUIRED');
}
