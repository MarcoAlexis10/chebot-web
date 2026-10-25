// Same immutable SQL dependencies in the canonical private repo and public fake lab.
import {existsSync,readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
export function readPinnedModel(name){
 const spec={
  legal:{paths:['../../legal-acceptance-20261024/LEGAL-ACCEPTANCE-FICTIONAL-DO-NOT-INSTALL.sql','../../../legal/acceptance-transaction-20261024/LEGAL-ACCEPTANCE-FICTIONAL-DO-NOT-INSTALL.sql'],gitBlob:'db818110a5272f57c2f6867b5243a0a857a6e06f'},
  lifecycle:{paths:['../../launch-closure-20261024/LIFECYCLE-FICTIONAL-DO-NOT-INSTALL.sql','../../../release/launch-closure-20261024/LIFECYCLE-FICTIONAL-DO-NOT-INSTALL.sql'],gitBlob:'bf7a3d3f2c5ae959bd62cff1db60f81342aef26c'}
 }[name];
 if(!spec)throw Error('PINNED_QA_MODEL_REQUIRED');
 for(const p of spec.paths){const url=new URL(p,import.meta.url);if(!existsSync(url))continue;const b=readFileSync(url);const h=createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');if(h!==spec.gitBlob)throw Error('QA_MODEL_CONTENT_MISMATCH');return b.toString('utf8');}
 throw Error('PINNED_QA_MODEL_NOT_FOUND');
}
