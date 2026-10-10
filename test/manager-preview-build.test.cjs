// Offline Manager Preview build QA. All credentials are fake public fixtures.
// Never send email, call Supabase, invoke WhatsApp, or access real manager JWTs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const file = (name) => fs.readFileSync(path.join(root, 'dist', 'manager', name), 'utf8');

test('built login exposes accessible self-service recovery without losing sign-in', () => {
  const html = file('index.html');
  assert.match(html, /id="manager-forgot"[^>]*>¿Olvidaste tu contraseña\?/);
  assert.match(html, /id="manager-recovery-form"/);
  assert.match(html, /id="manager-login-form"/);
  assert.match(html, /id="manager-recovery-email"/);
  assert.match(html, /<script src="\/manager\/manager-auth\.js" defer><\/script>/);
  assert.match(html, /autocomplete="email"/);
});

test('recovery request stays in DEV and cannot enumerate whether email exists', () => {
  const js = file('manager-auth.js');
  assert.match(js, /tyvwgsdzqipusodxtydv\.supabase\.co/);
  assert.match(js, /\/auth\/v1\/recover\?redirect_to=/);
  assert.match(js, /Si el correo corresponde a un manager registrado/);
  assert.match(js, /response\.status === 429/);
  assert.match(js, /manager\/reset-password\//);
});

test('password recovery page consumes bearer only from URL fragment', () => {
  const html = file('reset-password/index.html');
  assert.match(html, /Restablecer tu contraseña/);
  assert.match(html, /hash\.get\('access_token'\)/);
  assert.doesNotMatch(html, /query\.get\('access_token'\)/);
  assert.match(html, /window\.history\.replaceState\(null, '', window\.location\.pathname\)/);
  assert.match(html, /tyvwgsdzqipusodxtydv\.supabase\.co/);
  assert.match(html, /minlength="16"/);
});


test('password eye toggles exist on login and each reset field independently', () => {
  const login = file('index.html');
  const loginJs = file('manager-auth.js');
  const loginCss = file('manager-auth.css');
  const reset = file('reset-password/index.html');

  assert.match(login, /id="manager-password"[^>]*type="password"/);
  assert.match(login, /id="manager-password-visibility"[^>]*type="button"|type="button" id="manager-password-visibility"/);
  assert.match(login, /aria-controls="manager-password" aria-label="Mostrar contraseña" aria-pressed="false"/);
  assert.match(loginJs, /passwordVisibility\.addEventListener\('click'/);
  assert.match(loginJs, /password\.type = visible \? 'text' : 'password'/);
  assert.match(loginJs, /concealManagerPassword\(\)/);
  assert.match(loginCss, /manager-auth-visibility:focus-visible/);
  for (const id of ['password', 'confirm']) {
    assert.match(reset, new RegExp('id="' + id + '" type="password"'));
    assert.match(reset, new RegExp('type="button" class="password-visibility" data-password-target="' + id + '"'));
    assert.match(reset, new RegExp('aria-controls="' + id + '"'));
  }
  assert.match(reset, /document\.querySelectorAll\('\[data-password-target\]'\)/);
  assert.match(reset, /field\.type = reveal \? 'text' : 'password'/);
  assert.match(reset, /\.password-visibility:focus-visible/);
  const inline = reset.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(inline, 'Password reset inline script is present');
  new (require('node:vm').Script)(inline[1]);
});

test('expired stays are labeled and cannot initiate guest invites', () => {
  const js = file('manager-auth.js');
  assert.match(js, /function effectiveStayStatus\(stay\)/);
  assert.match(js, /checkout <= Date\.now\(\)/);
  assert.match(js, /expired: 'Vencida'/);
  assert.match(js, /row\.dataset\.stayStatus = String\(effectiveStayStatus\(stay\)\)/);
  assert.match(file('manager-invite.js'), /invitables\.has\(stayStatus\)/);
});

test('generated browser scripts contain valid JavaScript', () => {
  const rootDir=path.join(root,'dist','manager');
  const names=fs.readdirSync(rootDir).filter(x=>x.endsWith('.js'));
  assert.ok(names.length>=4);
  for(const name of names) {
    execFileSync(process.execPath,['--check',path.join(rootDir,name)],{stdio:'pipe'});
  }
});
