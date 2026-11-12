// Pure offline policy comparison, not a revision producer or a SQL race test.
import policy from './revision-policy.json' with {type:'json'};
import {result} from '../incident-authority-closure-20261111-v1/current-resolution.mjs';
export function requiresRevision(table,event,oldRows=[],newRows=[]){
 if(!Object.hasOwn(policy,table)||!['INSERT','UPDATE','DELETE','TRUNCATE'].includes(event))throw Error('UNREVIEWED_REVOCATION_SOURCE');
 if(event!=='UPDATE'||policy[table]===null)return true;
 const keys=policy[table],project=rows=>rows.map(row=>JSON.stringify(keys.map(k=>{if(!Object.hasOwn(row,k))throw Error('CRITICAL_COLUMN_MISSING');return row[k];}))).sort();
 return JSON.stringify(project(oldRows))!==JSON.stringify(project(newRows));
}
export function reviewRevisionCut(counter,witness){
 const positive=n=>Number.isSafeInteger(n)&&n>0,hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
 if(!counter||!witness||!positive(counter.authorityVersion)||!positive(counter.recoveryEpoch)||!positive(witness.restrictionVersion)||!hash(counter.datasetId)||!hash(witness.inventoryDigest)||!hash(witness.restrictionDigest)||!['datasetId','recoveryEpoch','authorityVersion'].every(k=>counter[k]===witness[k]))return result('HELD_NO_CURRENT_INDEPENDENT_CUT');
 // Equality is deliberate: >= would accept a restored stale counter/head.
 return result('REVIEW_CUT_MATCHED');
}
