// Complete dormant local orchestration. These entry points refuse BEFORE input
// until a separately authorized, reviewed build replaces the locked policy.
import {readFile} from 'node:fs/promises';import path from 'node:path';import {createPublicKey} from 'node:crypto';
import {requireRealAuthorization} from './policy.mjs';import {createDevSource} from './source.mjs';
import {collectPrivateInputs,readHidden} from '../private-adapter-20261023/private-input.mjs';
import {preparePrivateWindowsSource} from '../technical-closure-20261022/prepare-windows-source.mjs';
import {verifyNode} from '../technical-closure-20261022/approved/private-host.mjs';
import {createCustody,openCustody,privateRegular} from './custody.mjs';
import {captureToCustody,restoreCustodialCopy,verifyCustodialCopy,readPrivateReceipt} from './operation.mjs';
import {freshChallenge} from '../technical-closure-20261022/journal.mjs';
async function json(file,max=65536){const stat=await privateRegular(file);if(stat.size>max)throw Error('PRIVATE_CONFIG_TOO_LARGE');const s=await readFile(file);if(s.length>max)throw Error('PRIVATE_CONFIG_TOO_LARGE');return JSON.parse(s);}
function keys(v,list){if(!v||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).sort().join('|')!==list.sort().join('|'))throw Error('PRIVATE_CONFIG_FIELDS_REJECTED');}
export async function loadIndependentWitness({witnessFile,trustFile,challenge,captureFinishedAt,custodyRoot}){
 if(typeof custodyRoot!=='string'||!path.isAbsolute(custodyRoot))throw Error('INDEPENDENT_TRUST_LOCATION_REQUIRED');
 for(const file of [witnessFile,trustFile]){if(typeof file!=='string'||!path.isAbsolute(file))throw Error('INDEPENDENT_TRUST_LOCATION_REQUIRED');const rel=path.relative(path.resolve(custodyRoot),path.resolve(file));if(rel===''||(!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel)))throw Error('INDEPENDENT_TRUST_LOCATION_REQUIRED');}
 const p=await json(witnessFile),trust=await json(trustFile);keys(p,['journal','head','signature']);keys(trust,['publicKeyPem','minimumHead']);
 // Trust path/key/floor must be selected OUTSIDE the capture directory by the
 // custodian. The loader checks the signature later; it cannot prove provenance.
 return {captureFinishedAt,now:Date.now(),minimumHead:trust.minimumHead,witness:{...p,publicKey:createPublicKey(trust.publicKeyPem),challenge}};
}
export async function executeRealCapture(configFile){
 requireRealAuthorization();
 verifyNode();const c=await json(configFile);keys(c,['sourcePlan','caFile','custodyBase','captureName']);
 await preparePrivateWindowsSource({source:c.sourcePlan,caFile:c.caFile});
 const credentials=await collectPrivateInputs();const custody=await createCustody(c.custodyBase);
 let source;
 try{source=await createDevSource({...c,password:credentials.password});return await captureToCustody({custody,source,passphrase:credentials.passphrase,name:c.captureName});}
 finally{await source?.dispose();credentials.password='';credentials.passphrase='';}
}
export async function executeRealCopyVerification(configFile){
 requireRealAuthorization();verifyNode();const c=await json(configFile);keys(c,['custodyRoot','captureName','downloadedDataFile','downloadedKeyFile']);
 const custody=await openCustody(c.custodyRoot),pair={dataFile:path.join(c.custodyRoot,'data',c.captureName+'.cva'),keyFile:path.join(c.custodyRoot,'keys',c.captureName+'.cclave')};
 if(!/^[a-z0-9-]{1,40}$/.test(c.captureName))throw Error('SAFE_CAPTURE_NAME_REQUIRED');
 const passphrase=await readHidden('recoveryPhrase');return verifyCustodialCopy({custody,original:pair,downloaded:{dataFile:c.downloadedDataFile,keyFile:c.downloadedKeyFile},passphrase});
}
export async function executeRealRestore(configFile){
 requireRealAuthorization();verifyNode();const c=await json(configFile);keys(c,['custodyRoot','captureName','witnessFile','trustFile','challenge']);
 if(!/^[a-z0-9-]{1,40}$/.test(c.captureName))throw Error('SAFE_CAPTURE_NAME_REQUIRED');
 const custody=await openCustody(c.custodyRoot),receipt=await readPrivateReceipt(path.join(c.custodyRoot,'receipts',c.captureName+'.json'));
 const pair={dataFile:path.join(c.custodyRoot,'data',c.captureName+'.cva'),keyFile:path.join(c.custodyRoot,'keys',c.captureName+'.cclave')};
 const frontier=await loadIndependentWitness({...c,captureFinishedAt:receipt.captureFinishedAt}),passphrase=await readHidden('recoveryPhrase');
 return restoreCustodialCopy({custody,pair,receipt,passphrase,frontier});
}
export function prepareRecoveryChallenge(){requireRealAuthorization();return freshChallenge();}
