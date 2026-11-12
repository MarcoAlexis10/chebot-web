const {test}=require('node:test'),assert=require('node:assert/strict');
const {localToIso}=require('./time-review.cjs');
test('impossible local dates are not normalized into a different reservation date by the existing converter',()=>{
 const baseline=process.execArgv.includes('--conditions=baseline');
 for(const s of ['2027-02-29T15:00','2026-02-31T15:00','2026-04-31T10:00'])assert.equal(localToIso(s,{baseline}),null);
 assert.equal(localToIso('2028-02-29T15:00'),'2028-02-29T18:00:00.000Z');
});
