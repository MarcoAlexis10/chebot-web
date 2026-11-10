'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {createHash} = require('node:crypto');
const {managerNineRouteQaReviewConfig,ALL_PATHS,ACTION_PATHS} = require('./qa-manager-nine-route-review.cjs');
const fake=()=>({
  CHEVENI_RELEASE_TARGET:'qa-isolated-review-only',
  MANAGER_API_ORIGIN:'https://backend.review.example',
  MANAGER_WEB_ORIGIN:'https://web.review.example',
  SUPABASE_URL:'https://tjdgrzzeuuihhqnzvaox.supabase.co',
  SUPABASE_PUBLISHABLE_KEY:'sb_publishable_FAKE_REVIEW_ONLY'
});
const path='qa-manager-review.cjs';
test('imports the exact published original 7-route fixture',()=>{
  const bytes=readFileSync(new URL('./'+path,`file://${__filename}`));
  const git=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(git,'a814d9f3bd2c226b1e8eddf18178809d6a4cbe81');
});
test('nine route keys include both real manager mutation action endpoints',()=>{
  const config=managerNineRouteQaReviewConfig(fake());
  assert.equal(ALL_PATHS.length,9); assert.equal(Object.keys(config.endpoints).length,9);
  assert.deepEqual(ACTION_PATHS,['incidents/state','requests/decision']);
  assert.equal(config.endpoints['incidents/state'],
    'https://backend.review.example/api/concierge/manager/incidents/state');
  assert.equal(config.endpoints['requests/decision'],
    'https://backend.review.example/api/concierge/manager/requests/decision');
  assert.equal(new Set(ALL_PATHS).size,9);
});
test('original seven URLs remain byte-identical semantically',()=>{
  const {managerQaReviewConfig} = require('./qa-manager-review.cjs');
  const old=managerQaReviewConfig(fake()),next=managerNineRouteQaReviewConfig(fake());
  for(const route of Object.keys(old.endpoints)) assert.equal(next.endpoints[route],old.endpoints[route]);
});
test('route DTO is immutable and all operations stay HELD',()=>{
  const config=managerNineRouteQaReviewConfig(fake());
  for(const key of ['actualPublicKeyVerified','buildWired','backendConnected',
    'authVerified','mayDeploy','mayInviteRealGuest','mayEnableManager','mayWrite','releaseApproved']) {
    assert.equal(config[key],false,key);
  }
  assert.equal(config.status,'HELD');assert.equal(config.mode,'qa-isolated-review-only');
  for(const value of [config,config.endpoints,config.routes,config.actionRoutes]){
    assert.equal(Object.isFrozen(value),true);
  }
});
test('no live backend or frontend hostname accepted in QA fixture',()=>{
  for(const field of ['MANAGER_API_ORIGIN','MANAGER_WEB_ORIGIN']){
    for(const value of ['https://example.org','https://backend.company.com','https://tjdgrzzeuuihhqnzvaox.supabase.co']){
      assert.throws(()=>managerNineRouteQaReviewConfig({...fake(),[field]:value}),/QA_FIXTURE_ORIGIN_REQUIRED/);
    }
  }
});
test('DEV, unrelated project and non-HTTPS provider origin rejected',()=>{
  for(const value of ['https://tyvwgsdzqipusodxtydv.supabase.co',
    'https://other.supabase.co','http://tjdgrzzeuuihhqnzvaox.supabase.co']){
    assert.throws(()=>managerNineRouteQaReviewConfig({...fake(),SUPABASE_URL:value}));
  }
});
test('service keys, automation context and release flags are denied even when empty or false',()=>{
  for(const key of ['SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY','META_APP_SECRET',
   'DATABASE_URL','GITHUB_ACTIONS','VERCEL_ENV','CHEVENI_CAN_DEPLOY',
   'CHEVENI_OPERATIONAL_APPROVAL']) {
    assert.throws(()=>managerNineRouteQaReviewConfig({...fake(),[key]:''}),/QA_REVIEW_CONTEXT_HELD/);
    assert.throws(()=>managerNineRouteQaReviewConfig({...fake(),[key]:false}),/QA_REVIEW_CONTEXT_HELD/);
  }
});
test('real-looking keys and incorrect selector rejected by original QA guard',()=>{
  for(const key of ['sb_publishable_PRODUCTIONLIKE','sb_secret_PRIVATE',null]){
    assert.throws(()=>managerNineRouteQaReviewConfig({...fake(),SUPABASE_PUBLISHABLE_KEY:key}));
  }
  assert.throws(()=>managerNineRouteQaReviewConfig({...fake(),CHEVENI_RELEASE_TARGET:'production'}));
});
test('malformed hosts and origins are rejected',()=>{
  for(const value of ['http://backend.review.example','https://u:p@backend.review.example',
   'https://backend.review.example/path','https://backend.review.example:8443',
   'https://backend.review.example?x=1']){
     assert.throws(()=>managerNineRouteQaReviewConfig({...fake(),MANAGER_API_ORIGIN:value}));
  }
});
test('no input cannot inadvertently create an active QA contract',()=>{
  for(const value of [null,[],false,undefined,{}])assert.throws(()=>managerNineRouteQaReviewConfig(value));
});
