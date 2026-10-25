import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,copyFileSync,rmSync} from 'node:fs';import path from 'node:path';import {tmpdir} from 'node:os';import {pathToFileURL} from 'node:url';
import {readPinnedModel} from './pinned-models.mjs';
test('new adapter resolves the same pinned SQL and bootstrap imports in private and public QA layouts without SQL or Docker',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'cv-d01-layout-'));const helper=readFileSync(new URL('./pinned-models.mjs',import.meta.url));const boot=readFileSync(new URL('./owned-bootstrap.mjs',import.meta.url));
 try{for(const layout of ['private','public']){
  const base=path.join(root,layout),qa=path.join(base,layout==='private'?'ops/recovery/d01-postcommit-20261024/qa':'qa/d01-recovery-20261024/qa');mkdirSync(qa,{recursive:true});writeFileSync(path.join(qa,'pinned-models.mjs'),helper);writeFileSync(path.join(qa,'owned-bootstrap.mjs'),boot);
  const paths=layout==='private'?['ops/legal/acceptance-transaction-20261024/LEGAL-ACCEPTANCE-FICTIONAL-DO-NOT-INSTALL.sql','ops/release/launch-closure-20261024/LIFECYCLE-FICTIONAL-DO-NOT-INSTALL.sql']:['qa/legal-acceptance-20261024/LEGAL-ACCEPTANCE-FICTIONAL-DO-NOT-INSTALL.sql','qa/launch-closure-20261024/LIFECYCLE-FICTIONAL-DO-NOT-INSTALL.sql'];
  for(const [i,name] of ['legal','lifecycle'].entries()){const f=path.join(base,paths[i]);mkdirSync(path.dirname(f),{recursive:true});writeFileSync(f,readPinnedModel(name));}
  const tech=path.join(base,layout==='private'?'ops/recovery/technical-closure-20261022':'qa/technical-closure-20261022');
  for(const f of ['qa/pg-fixture.mjs','approved/private-host.mjs','approved/docker-fictional.mjs','approved/provisional-crypto.mjs','approved/package-io.mjs']){const to=path.join(tech,f);mkdirSync(path.dirname(to),{recursive:true});copyFileSync(new URL('../../technical-closure-20261022/'+f,import.meta.url),to);}
  const mod=await import(pathToFileURL(path.join(qa,'pinned-models.mjs')));assert.equal(mod.readPinnedModel('legal'),readPinnedModel('legal'));assert.equal(mod.readPinnedModel('lifecycle'),readPinnedModel('lifecycle'));
  assert.equal(typeof(await import(pathToFileURL(path.join(qa,'owned-bootstrap.mjs')))).bootstrapOwned,'function');
 }}finally{rmSync(root,{recursive:true,force:true});}
});
