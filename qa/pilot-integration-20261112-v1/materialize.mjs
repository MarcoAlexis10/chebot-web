// Compose the latest retained property/journey views with the fixed ORIGINAL
// manager consumers. Emit only changed assets: no duplicate application.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {build as previous} from '../property-bootstrap-20261112-v1/materialize.mjs';
import composer from './compose.cjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const assets=['manager-auth.js','manager-requests.js','manager-incidents.js','manager-knowledge.js','manager-invite.js'];
export function build(){const r=previous(),fixed=composer.build();for(const asset of assets)r.generated['manager/'+asset]=fixed.generated['manager/'+asset];return r;}
export function materialize(){
 const merged=build().generated,base=previous().generated,files=[];
 for(const asset of assets){const name='manager/'+asset,content=merged[name],file=path.join(here,'overlays',name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);files.push({path:'overlays/'+name,bytes:Buffer.byteLength(content),sha256:createHash('sha256').update(content).digest('hex'),baseSha256:createHash('sha256').update(base[name]).digest('hex')});}
 const manifest={classification:'RETAINED_QA_OVERLAY_NOT_OPERATIONAL_BUILD',basePackage:'qa/property-bootstrap-20261112-v1/materialize.mjs',webSource:'bca48ca6d32bbca15a1357114db46cf2fa0c23fa',backendSource:'9beb837a621f9a8f06601043afa64b3bba317cb5',files,mergedFiles:Object.keys(merged).length,networkAllowed:false,formsInert:true,actualAuthVerified:false,browserExecuted:false,sqlExecuted:false,dispatchPerformed:false,betaDecision:'NO-GO'};
 fs.writeFileSync(path.join(here,'OVERLAY-MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify({overlayFiles:materialize().files.length,servicesStarted:0,betaDecision:'NO-GO'}));
