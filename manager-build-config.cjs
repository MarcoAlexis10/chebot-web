'use strict';

// Build-time public configuration only. Never infer a deployment from a branch
// alias: that alias may still serve a backend incompatible with the SQL package.
function httpsOrigin(value, name) {
  if (typeof value !== 'string' || !value || !/^[\x21-\x7e]+$/.test(value)) throw new Error(name + ' requires an explicit HTTPS origin');
  let url;
  try { url = new URL(value); } catch { throw new Error(name + ' requires an explicit HTTPS origin'); }
  const dnsHost = url.hostname.includes('.') && url.hostname.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
  if (!dnsHost || url.protocol !== 'https:' || url.username || url.password || url.port ||
      url.pathname !== '/' || url.search || url.hash || url.origin !== value.replace(/\/$/, '')) {
    throw new Error(name + ' requires an explicit HTTPS origin');
  }
  return url.origin;
}

function managerBuildConfig(env = process.env) {
  const apiOrigin = httpsOrigin(env.MANAGER_API_ORIGIN, 'MANAGER_API_ORIGIN');
  const webOrigin = httpsOrigin(env.MANAGER_WEB_ORIGIN, 'MANAGER_WEB_ORIGIN');
  const supabaseUrl = httpsOrigin(env.SUPABASE_URL, 'SUPABASE_URL');
  if (supabaseUrl !== 'https://tyvwgsdzqipusodxtydv.supabase.co') throw new Error('Manager build requires the reviewed Supabase DEV project');
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY;
  let publicKey = typeof publishableKey === 'string' && /^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey);
  if (!publicKey && typeof publishableKey === 'string' && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(publishableKey)) {
    try {
      const payload = JSON.parse(Buffer.from(publishableKey.split('.')[1], 'base64url').toString('utf8'));
      publicKey = payload.role === 'anon' && payload.ref === 'tyvwgsdzqipusodxtydv';
    } catch { publicKey = false; }
  }
  if (!publicKey) throw new Error('SUPABASE_PUBLISHABLE_KEY must be a public DEV key');
  return Object.freeze({apiOrigin, webOrigin, supabaseUrl, publishableKey,
    apiUrl: route => apiOrigin + '/api/concierge/manager/' + route,
    recoveryUrl: webOrigin + '/manager/reset-password/'});
}

module.exports = {managerBuildConfig};
