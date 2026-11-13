'use strict';
// Execute the three prior Auth assertions against THIS candidate's generated
// script, not the old composer. No duplicate assertion implementations.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const original=path.resolve(__dirname,'../functional-night-20261112-v1/auth-ui.test.cjs');
const originalRequire=createRequire(original),candidate=require('./compose.cjs');
vm.runInNewContext(fs.readFileSync(original,'utf8'),{require:n=>n==='./compose.cjs'?candidate:originalRequire(n),process,console},{filename:original,timeout:2000});
