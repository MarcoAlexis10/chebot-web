'use strict';
// Isolated QA *contract fixture* for Che Vení; not part of the web build.
// No real Supabase key, network operation, deploy, Auth or guest invitation.
const QA_REF = 'tjdgrzzeuuihhqnzvaox';
const MODE = 'qa-isolated-review-only';
const FIXTURE_KEY = 'sb_publishable_FAKE_REVIEW_ONLY';
const MANAGER_PATHS = Object.freeze([
  'session', 'properties', 'stays', 'invites/send',
  'incidents', 'requests', 'knowledge'
]);
function origin(raw, field) {
  if (typeof raw !== 'string' || !/^[\x21-\x7e]+$/.test(raw)) throw Error(field + '_INVALID_ORIGIN');
  let url;
  try { url = new URL(raw); } catch { throw Error(field + '_INVALID_ORIGIN'); }
  const host = url.hostname.includes('.') && url.hostname.split('.').every(
    label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
  if (!host || url.protocol !== 'https:' || url.username || url.password || url.port ||
      url.pathname !== '/' || url.search || url.hash ||
      url.origin !== raw.replace(/\/$/, '')) throw Error(field + '_INVALID_ORIGIN');
  return url.origin;
}
function managerQaReviewConfig(env = {}) {
  if (!env || typeof env !== 'object' || Array.isArray(env) ||
      env.CHEVENI_RELEASE_TARGET !== MODE ||
      env.CHEVENI_OPERATIONAL_APPROVAL !== undefined ||
      env.CHEVENI_CAN_DEPLOY !== undefined ||
      env.CHEVENI_ENABLE_LIVE !== undefined) throw Error('QA_REVIEW_ONLY_HELD');
  const apiOrigin = origin(env.MANAGER_API_ORIGIN, 'MANAGER_API_ORIGIN');
  const webOrigin = origin(env.MANAGER_WEB_ORIGIN, 'MANAGER_WEB_ORIGIN');
  const supabaseUrl = origin(env.SUPABASE_URL, 'SUPABASE_URL');
  if (supabaseUrl !== `https://${QA_REF}.supabase.co`) throw Error('NOT_ISOLATED_QA_PROJECT');
  // Deliberately *reject* even syntactically valid real credentials.
  // The placeholder never permits a browser build or provider connection.
  if (env.SUPABASE_PUBLISHABLE_KEY !== FIXTURE_KEY) throw Error('NO_REAL_KEYS_IN_REVIEW');
  const endpoints = Object.freeze(Object.fromEntries(MANAGER_PATHS.map(
    route => [route, `${apiOrigin}/api/concierge/manager/${route}`])));
  return Object.freeze({
    mode: MODE, status: 'HELD', apiOrigin, webOrigin, supabaseUrl,
    endpoints, recoveryUrl: `${webOrigin}/manager/reset-password/`,
    publicKeyFixture: FIXTURE_KEY,
    actualPublicKeyVerified: false, buildWired: false,
    backendConnected: false, authVerified: false,
    mayDeploy: false, mayInviteRealGuest: false,
    mayEnableManager: false, releaseApproved: false
  });
}
module.exports = { managerQaReviewConfig, MANAGER_PATHS };
