'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {createHash} = require('node:crypto');
const {resolve} = require('node:path');
const {managerQaReviewConfig, MANAGER_PATHS} = require('./qa-manager-review.cjs');
const fake = () => ({
  CHEVENI_RELEASE_TARGET: 'qa-isolated-review-only',
  MANAGER_API_ORIGIN: 'https://backend.review.example',
  MANAGER_WEB_ORIGIN: 'https://web.review.example',
  SUPABASE_URL: 'https://tjdgrzzeuuihhqnzvaox.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_FAKE_REVIEW_ONLY'
});
const held = result => {
  for(const flag of ['mayDeploy', 'mayInviteRealGuest', 'mayEnableManager', 'releaseApproved',
                     'actualPublicKeyVerified', 'backendConnected', 'authVerified', 'buildWired'])
    assert.equal(result[flag], false, flag);
  assert.equal(result.status, 'HELD');
};
test('fictitious isolated QA config maps seven manager paths and remains held', () => {
  const r = managerQaReviewConfig(fake());
  held(r); assert.equal(MANAGER_PATHS.length, 7);
  assert.equal(Object.keys(r.endpoints).length, 7);
  assert.equal(r.endpoints['invites/send'], 'https://backend.review.example/api/concierge/manager/invites/send');
  assert.equal(r.recoveryUrl, 'https://web.review.example/manager/reset-password/');
  assert.equal(Object.isFrozen(r), true);
  assert.equal(Object.isFrozen(r.endpoints), true);
});
test('DEV Supabase project is never a QA build target', () => {
  assert.throws(()=>managerQaReviewConfig({...fake(), SUPABASE_URL:'https://tyvwgsdzqipusodxtydv.supabase.co'}), /NOT_ISOLATED_QA_PROJECT/);
});
test('unrelated Supabase project is rejected', () => {
  assert.throws(()=>managerQaReviewConfig({...fake(), SUPABASE_URL:'https://another.supabase.co'}), /NOT_ISOLATED_QA_PROJECT/);
});
test('non-HTTPS origins rejected', () => {
  for(const origin of ['http://backend.review.example', 'ftp://backend.review.example'])
    assert.throws(()=>managerQaReviewConfig({...fake(), MANAGER_API_ORIGIN:origin}), /INVALID_ORIGIN/);
});
test('credentials, ports, paths, query and fragments rejected', () => {
  for(const origin of ['https://u:p@backend.review.example','https://backend.review.example:8080',
                       'https://backend.review.example/private','https://backend.review.example/?x=1',
                       'https://backend.review.example/#anchor'])
    assert.throws(()=>managerQaReviewConfig({...fake(),MANAGER_API_ORIGIN:origin}), /INVALID_ORIGIN/);
});
test('real-looking publishable keys rejected in fixture-only review', () => {
  for(const key of ['sb_publishable_REALLOOKING', 'sb_secret_ABC', 'eyJabc.def.ghi', '', null])
    assert.throws(()=>managerQaReviewConfig({...fake(), SUPABASE_PUBLISHABLE_KEY:key}), /NO_REAL_KEYS_IN_REVIEW/);
});
test('release flags cannot be supplied even as false', () => {
  for(const name of ['CHEVENI_OPERATIONAL_APPROVAL','CHEVENI_CAN_DEPLOY','CHEVENI_ENABLE_LIVE'])
    assert.throws(()=>managerQaReviewConfig({...fake(),[name]:false}), /QA_REVIEW_ONLY_HELD/);
});
test('wrong target selector rejected', () => {
  for(const target of ['production','DEV','qa','',undefined])
    assert.throws(()=>managerQaReviewConfig({...fake(), CHEVENI_RELEASE_TARGET:target}), /QA_REVIEW_ONLY_HELD/);
});
test('non-object and missing environments fail closed', () => {
  for(const input of [null,[],false,17,{}]) assert.throws(()=>managerQaReviewConfig(input));
});
test('route list is frozen and avoids query/control characters', () => {
  assert.equal(Object.isFrozen(MANAGER_PATHS),true);
  assert.ok(MANAGER_PATHS.every(x=>/^[a-z][a-z0-9/-]*$/.test(x)&&!x.includes('//')));
});
// This test runs only in a full checkout. For isolated local validation, set
// CHEVENI_QA_REVIEW_SKIP_PIN=1 and record that only the 10 fixture tests ran.
test('existing production build/config and deployment controls remain unchanged', () => {
  if(process.env.CHEVENI_QA_REVIEW_SKIP_PIN==='1') return;
  const root=resolve(__dirname,'../..');
  const pin=(p,expected)=>{
    const bytes=readFileSync(resolve(root,p));
    const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    assert.equal(blob,expected,`original changed: ${p}`);
  };
  pin('manager-build-config.cjs','7ca9a62658bce114967e2ae82b0217121bd27adc');
  pin('vercel.json','620ee85530ae3a417ee925e0f81e347a1dbec399');
  const vercel=JSON.parse(readFileSync(resolve(root,'vercel.json'),'utf8'));
  assert.equal(vercel.git.deploymentEnabled,false);
  const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
  assert.match(pkg.scripts.build,/manager-build-config\.cjs/);
  assert.doesNotMatch(pkg.scripts.build,/qa-manager-review\.cjs/);
});
