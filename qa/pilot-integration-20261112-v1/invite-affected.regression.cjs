'use strict';
// Select only the two prior invitation assertions affected by BFCache changes.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const original=path.resolve(__dirname,'../founder-journey-20261112-v1/experience.test.cjs'),base=createRequire(original),candidate=require('./compose.cjs');
vm.runInNewContext(fs.readFileSync(original,'utf8'),{require:n=>n==='./compose.cjs'?{compose:()=>candidate.build()}:n==='node:test'?{test:(name,fn)=>name.includes('invitation')?base(n).test(name,fn):undefined}:base(n),process,console},{filename:original,timeout:2000});
