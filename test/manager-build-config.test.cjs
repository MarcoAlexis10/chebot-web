const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {managerBuildConfig} = require('../manager-build-config.cjs');
const base = {MANAGER_API_ORIGIN:'https://fictional-api.example.invalid',
  MANAGER_WEB_ORIGIN:'https://fictional-manager.example.invalid',
  SUPABASE_URL:'https://tyvwgsdzqipusodxtydv.supabase.co',
  SUPABASE_PUBLISHABLE_KEY:'sb_publishable_FICTIONAL_LOCAL_ONLY'};
const jwt = payload => 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.FICTIONAL';

test('explicit origins bind all routes and recovery to the selected environment', () => {
  const c = managerBuildConfig({...base,MANAGER_API_ORIGIN:'https://candidate-api.example.invalid/',MANAGER_WEB_ORIGIN:'https://candidate-web.example.invalid/'});
  assert.equal(c.apiUrl('requests/decision'),'https://candidate-api.example.invalid/api/concierge/manager/requests/decision');
  assert.equal(c.recoveryUrl,'https://candidate-web.example.invalid/manager/reset-password/');
  assert.ok(Object.isFrozen(c));
});

for (const field of ['MANAGER_API_ORIGIN','MANAGER_WEB_ORIGIN','SUPABASE_URL']) {
  test(field + ' rejects missing, non-HTTPS, credentials, paths and injection', () => {
    for (const value of [undefined,'','http://example.invalid','https://a:b@example.invalid',
      'https://example.invalid/path','https://example.invalid?x=1','https://example.invalid/#hash',
      'https://example.invalid:444','https://example.invalid/\n','https://example.invalid/</script>']) {
      assert.throws(() => managerBuildConfig({...base,[field]:value}),/requires an explicit HTTPS origin/);
    }
  });
}

test('different Supabase projects cannot produce a manager build', () => {
  assert.throws(() => managerBuildConfig({...base,SUPABASE_URL:'https://other.supabase.co'}),/reviewed Supabase DEV/);
});

test('private service keys and malformed public configuration never reach output', () => {
  for (const key of [undefined,'','sb_secret_FICTIONAL_PRIVATE',
    jwt({role:'service_role',ref:'tyvwgsdzqipusodxtydv'}),jwt({role:'authenticated',ref:'tyvwgsdzqipusodxtydv'}),
    jwt({role:'anon',ref:'other'}),'sb_publishable_</script>','not.a.jwt']) {
    assert.throws(() => managerBuildConfig({...base,SUPABASE_PUBLISHABLE_KEY:key}),/must be a public DEV key/);
  }
  assert.equal(managerBuildConfig({...base,SUPABASE_PUBLISHABLE_KEY:jwt({role:'anon',ref:'tyvwgsdzqipusodxtydv'})}).supabaseUrl,base.SUPABASE_URL);
});

test('built consumers share the selected API origin and no browser calls database tables', () => {
  const dir = path.join(__dirname,'../dist/manager');
  const files = ['manager-auth.js','manager-knowledge.js','manager-requests.js','manager-incidents.js','manager-invite.js','activar/index.html','altas/index.html'];
  for (const name of files) {
    const s = fs.readFileSync(path.join(dir,name),'utf8');
    assert.ok(s.includes(base.MANAGER_API_ORIGIN),name);
    assert.ok(!s.includes('chebot-backend-git-concierge-v3-design'),name + ' retains legacy backend');
    assert.doesNotMatch(s,/\/rest\/v1\//,name + ' bypasses backend');
  }
  const login = fs.readFileSync(path.join(dir,'manager-auth.js'),'utf8');
  assert.ok(login.includes(base.MANAGER_WEB_ORIGIN + '/manager/reset-password/'));
});
