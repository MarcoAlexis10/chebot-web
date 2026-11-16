import test from 'node:test';import assert from 'node:assert/strict';
import {matrix,validate,plan,cli,verifySources} from './acceptance.mjs';
test('acceptance registry binds runnable cases to pinned Node inputs and permits no arbitrary command',()=>{
 assert.equal(validate(),true);assert.ok(verifySources()>57);
 for(const id of ['OFF-REQUEST-DTO','OFF-INCIDENT-DTO','OFF-PROPERTY-DTO','OFF-STAY-DTO']){const p=plan(id);assert.equal(p.program,'python');assert.equal(p.args[1],'--');assert.equal(p.args[2],'node');assert.ok(p.args.at(-1).endsWith(id==='OFF-PROPERTY-DTO'||id==='OFF-STAY-DTO'?'/property-stay-consumers.test.cjs':'/projector-consumers.test.cjs'));}
 assert.throws(()=>cli(['--run','OFF-REQUEST-DTO','--command','curl']),/USAGE/);assert.throws(()=>cli(['--all']),/USAGE/);assert.throws(()=>plan('../native.sql'),/UNKNOWN_CASE/);
});
test('external and human acceptance rows cannot execute even with a supplied repeat justification',()=>{
 for(const row of matrix.cases.filter(x=>x.layer!=='OFFLINE_NODE')){const p=plan(row.id,{repeatReason:'SYNTHETIC_JUSTIFICATION'});assert.equal(p.executionAllowed,false);assert.equal('program'in p,false);assert.equal(cli(['--run',row.id]).code,3);}
 assert.throws(()=>cli(['--run','EX-NATIVE','--authorize']),/USAGE/);
});
test('previous twelve assertions stay selectable but cannot be repeated by default',()=>{
 for(const id of ['REG-PANEL-CONTEXT','REG-SECTION-CONTEXT','REG-UNKNOWN','REG-INVITE']){assert.throws(()=>plan(id),/DIRECT_IMPACT_REASON_REQUIRED/);const p=plan(id,{repeatReason:'SYNTHETIC_DECLARED_DIRECT_IMPACT'});assert.equal(p.historical,true);assert.equal(p.status,'PLAN_ONLY');}
});
