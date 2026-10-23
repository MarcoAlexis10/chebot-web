import test from 'node:test';import assert from 'node:assert/strict';
import {supportsServer17} from '../source/source-version.mjs';
test('new conservative pg_dump 17.11 source compatibility; older 17 minors allowed, future or other majors rejected',()=>{
 for(const v of ['17.0','17.6','17.11','17.6 (Debian fictional)','17.11 (fictional)'])assert.equal(supportsServer17(v),true);
 for(const v of ['16.11','18.0','17.12','17.999','17.011','17.11evil','PostgreSQL 17.11','17.11.1','',null,{},17.11])assert.equal(supportsServer17(v),false);
});
