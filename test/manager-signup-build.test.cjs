// Offline Beta signup page test. No credentials, network, or registration calls.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','dist','manager','activar','index.html'),'utf8');
test('private form is not a public sign-up or existing Manager login replacement',()=>{
  assert.match(html,/noindex,nofollow,noarchive/);
  assert.match(html,/id="no-invite"[^>]*hidden/);
  assert.match(html,/id="invite-form"[^>]*hidden/);
  assert.match(html,/window\.location\.hash\.slice\(1\)/);
  assert.match(html,/window\.history\.replaceState\(null, '', window\.location\.pathname\)/);
  assert.match(html,/\^\[A-Za-z0-9_-\]\{43\}\$/);
  assert.match(html,/href="\/manager\/"/);
});
test('data submitted only to preview backend, no Supabase browser signup or passwords',()=>{
  assert.match(html,/chebot-backend-git-concierge-v3-design-chebot\.vercel\.app\/api\/concierge\/manager\/signup-request/);
  assert.match(html,/credentials:'omit'/);
  assert.match(html,/acceptBeta:true,acceptPrivacy:true/);
  assert.doesNotMatch(html,/auth\/v1\/signup|service_role|input[^>]*type=["']password/);
  assert.match(html,/id="terms" type="checkbox" required/);
  assert.match(html,/id="privacy" type="checkbox" required/);
});
test('page explains single property, no auto charges, manual exceptions and pending review',()=>{
  assert.match(html,/30 días gratuitos desde la primera estadía real/);
  assert.match(html,/No hay facturación ni conversión a pago automáticas/);
  assert.match(html,/únicamente huéspedes principales verificados/);
  assert.match(html,/Tu cuenta todavía no está activa/);
});
test('inlined browser behavior is valid JavaScript',()=>{
  const inline=html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(inline,'script expected');
  new vm.Script(inline[1]);
});
