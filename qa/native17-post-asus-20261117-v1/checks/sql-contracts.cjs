'use strict';
// TEXT/ASCII-regex contract review executed in Node. NOT PostgreSQL parsing.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),old=path.resolve(root,'../protected-property-engineering-20261116-v1');
const {review}=require(path.join(old,'artifact-review.cjs'));
const files={};
for(const name of fs.readdirSync(path.join(root,'sql'))) files[name]=fs.readFileSync(path.join(root,'sql',name),'utf8');
files['PORTS-AND-ROLES.json']=fs.readFileSync(path.join(old,'PORTS-AND-ROLES.json'),'utf8');
const pins=JSON.parse(fs.readFileSync(path.join(old,'SOURCE-PINS.json'),'utf8'));
const writer=fs.readFileSync(process.argv.find(x=>x.startsWith('--writer='))?.slice(9)||path.resolve(root,'../../../qa-lab/qa/cheveni-beta-release-candidate-v1/writer-integration/private-mutations-UNAPPLIED.sql'),'utf8');
let sql=files['01-bootstrap-DO-NOT-APPLY.sql'];
if(process.argv.includes('--baseline')) sql=fs.readFileSync(path.join(old,'01-bootstrap-DO-NOT-APPLY.sql'),'utf8');
const pattern=/c\.restriction_journal !~ '([^']+)'/.exec(sql)?.[1];assert.ok(pattern,'journal pattern missing');
const candidate=new RegExp(pattern),backend=/^[a-z0-9_-]{1,64}$/;
const expected=['qa_floor_17','qa_revocation-a','qa_'+ 'a'.repeat(61)];
for(const id of expected){assert.equal(backend.test(id),true);assert.equal(candidate.test(id),true,'backend-compatible QA journal rejected: '+id);}
for(const id of ['qa_'+ 'a'.repeat(62),'dev_floor','qa_A','qa_','qa_token\nsecret','qa_💡'])assert.equal(candidate.test(id),false,'invalid journal accepted');
console.log(JSON.stringify({case:'journal-shape-compatibility',result:'PASS',classification:'ASCII_REGEX_MODEL_ONLY',postgresRegexExecuted:false}));
const result=review(files,writer,pins.reader26Arguments);
// Historical reviewer hardcoded nodeExecuted:false. Its return describes its
// historical source, not this invocation. Do not promote it to SQL compilation.
delete result.nodeExecuted;
console.log(JSON.stringify({...result,case:'affected-four-SQL-structure-and-ABI-regression',nodeProcessExecuted:true}));
