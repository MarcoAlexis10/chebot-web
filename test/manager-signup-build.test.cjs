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
test('preview manager form never substitutes the generic tourism privacy policy',()=>{
  assert.doesNotMatch(html,/href="https:\/\/www\.chebot\.chat\/privacidad"/);
  assert.match(html,/href="\/manager\/privacidad-concierge\/"/);
  assert.match(html,/href="\/manager\/condiciones-concierge\/"/);
  assert.match(html,/Leí y acepto las <a href="\/manager\/condiciones-concierge\/"/);
  assert.match(html,/conforme al <a href="\/manager\/privacidad-concierge\/"/);
  assert.doesNotMatch(html,/Leí y acepto las condiciones de la Beta privada indicadas arriba/);

  assert.match(html,/id="legal-pending"[^>]*hidden/);
  assert.match(html,/var CONCIERGE_SIGNUP_LEGAL_PUBLICATION_APPROVED = false/);
  assert.match(html,/if \(!CONCIERGE_SIGNUP_LEGAL_PUBLICATION_APPROVED\)/);
});
test('valid invite stays closed before legal approval, without personal-data submission',()=>{
  const match=html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match);
  const elements={
    'invite-form':{hidden:true,addEventListener:()=>{throw Error('Form must remain unbound')}},
    'no-invite':{hidden:true},
    'legal-pending':{hidden:true}
  };
  let removedFragment=false, networkCalls=0;
  vm.runInNewContext(match[1],{
    URLSearchParams,
    window:{
      location:{hash:'#invite='+ 'A'.repeat(43),pathname:'/manager/activar/'},
      history:{replaceState:()=>{removedFragment=true}}
    },
    document:{getElementById(id){if(!(id in elements))throw Error('Unexpected '+id);return elements[id];}},
    fetch(){networkCalls++;throw Error('Network must not be used');}
  });
  assert.equal(removedFragment,true);
  assert.equal(elements['legal-pending'].hidden,false);
  assert.equal(elements['invite-form'].hidden,true);
  assert.equal(networkCalls,0);
});
test('inlined browser behavior is valid JavaScript',()=>{
  const inline=html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(inline,'script expected');
  new vm.Script(inline[1]);
});
