'use strict';
// Che Vení: non-installable nine-route QA review successor. Never used by npm build.
// The previously published seven-route fixture is hash-pinned and unchanged.
const {readFileSync} = require('node:fs');
const {createHash} = require('node:crypto');
const {resolve} = require('node:path');
const original = resolve(__dirname,'qa-manager-review.cjs');
const content = readFileSync(original);
const sha = createHash('sha1').update('blob '+content.length+'\0').update(content).digest('hex');
if (sha !== 'a814d9f3bd2c226b1e8eddf18178809d6a4cbe81') {
  throw Error('ORIGINAL_QA_WEB_CONTRACT_SOURCE_DRIFT');
}
const {managerQaReviewConfig, MANAGER_PATHS} = require('./qa-manager-review.cjs');
const EXPECTED_BASE = Object.freeze([
  'session','properties','stays','invites/send','incidents','requests','knowledge'
]);
const ACTION_PATHS = Object.freeze(['incidents/state','requests/decision']);
const ALL_PATHS = Object.freeze([...EXPECTED_BASE,...ACTION_PATHS]);
const DENIED_INPUT_KEYS = Object.freeze([
  'SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY','META_APP_SECRET','META_ACCESS_TOKEN',
  'DATABASE_URL','GITHUB_ACTIONS','VERCEL','VERCEL_ENV',
  'CHEVENI_ENABLE_LIVE','CHEVENI_CAN_DEPLOY','CHEVENI_OPERATIONAL_APPROVAL'
]);
function managerNineRouteQaReviewConfig(env = {}) {
  if (!env || typeof env !== 'object' || Array.isArray(env) ||
      DENIED_INPUT_KEYS.some(key => Object.hasOwn(env,key))) throw Error('QA_REVIEW_CONTEXT_HELD');
  if (MANAGER_PATHS.length !== EXPECTED_BASE.length ||
      !MANAGER_PATHS.every((route,index)=>route===EXPECTED_BASE[index])) {
    throw Error('ORIGINAL_SEVEN_ROUTE_CONTRACT_DRIFT');
  }
  const base = managerQaReviewConfig(env);
  // Both sides must be inert reserved .example hosts, not actual backend URLs.
  for (const url of [base.apiOrigin,base.webOrigin]) {
    if (!new URL(url).hostname.endsWith('.example')) throw Error('QA_FIXTURE_ORIGIN_REQUIRED');
  }
  if (base.mode !== 'qa-isolated-review-only' || base.status !== 'HELD' ||
      base.actualPublicKeyVerified !== false || base.backendConnected !== false ||
      base.buildWired !== false || base.authVerified !== false || base.mayDeploy !== false ||
      base.mayInviteRealGuest !== false || base.mayEnableManager !== false ||
      base.releaseApproved !== false) throw Error('ORIGINAL_HOLD_POLICY_DRIFT');
  const endpoints = Object.freeze(Object.fromEntries(ALL_PATHS.map(path =>
    [path, `${base.apiOrigin}/api/concierge/manager/${path}`])));
  for (const path of EXPECTED_BASE) {
    if (base.endpoints[path] !== endpoints[path]) throw Error('ORIGINAL_SEVEN_ROUTE_ENDPOINT_DRIFT');
  }
  return Object.freeze({
    mode:base.mode,status:'HELD',apiOrigin:base.apiOrigin,webOrigin:base.webOrigin,
    supabaseUrl:base.supabaseUrl,recoveryUrl:base.recoveryUrl,
    routes:ALL_PATHS,actionRoutes:ACTION_PATHS,endpoints,
    // No exposed live credentials or server-side provider custody in this DTO.
    publicKeyFixture:base.publicKeyFixture,
    actualPublicKeyVerified:false,buildWired:false,backendConnected:false,
    authVerified:false,mayDeploy:false,mayInviteRealGuest:false,
    mayEnableManager:false,mayWrite:false,releaseApproved:false
  });
}
module.exports = {managerNineRouteQaReviewConfig, ALL_PATHS,ACTION_PATHS};
