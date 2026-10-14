// QA243 — Offline static-host feasibility of Concierge Manager Web.
// Tests built files only. No provider account, network call, guest account or deploy.
// Passing is evidence of portable *static assets*, NOT a migrated backend.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const read = name => fs.readFileSync(path.join(dist, name), 'utf8');

// Both Netlify/Cloudflare Pages have directory-index serving for static paths;
// this test deliberately avoids network/provider claims and SPA catch-all.
const routes = [
  ['/', 'index.html'],
  ['/manager/', 'manager/index.html'],
  ['/manager/reset-password/', 'manager/reset-password/index.html'],
  ['/manager/activar/', 'manager/activar/index.html'],
  ['/manager/altas/', 'manager/altas/index.html']
];

test('key routes have their own built HTML and need no SPA catch-all', () => {
  for (const [route, file] of routes) {
    assert.ok(fs.existsSync(path.join(dist, file)), route+' missing '+file);
    const html=read(file);
    assert.match(html, /<!doctype html>/i, route);
    assert.match(html, /<html\b/i, route);
    assert.match(html, /<title\b/i, route);
  }
});

test('Manager Web includes its local assets without Vercel-specific rewrite paths', () => {
  const files=['manager/manager-auth.js','manager/manager-auth.css',
    'manager/manager-invite.js','manager/manager-knowledge.js'];
  for (const file of files) assert.ok(fs.existsSync(path.join(dist,file)),file);
  const login=read('manager/index.html');
  assert.match(login, /src="\/manager\/manager-auth\.js"/);
  assert.match(login, /href="\/manager\/manager-auth\.css"/);
  const signup=read('manager/activar/index.html');
  assert.match(signup,/href="\/manager\/condiciones-concierge\/"/);
  assert.match(signup,/href="\/manager\/privacidad-concierge\/"/);
});

test('legal documents stay absent and private signup stays closed in any static copy', () => {
  assert.equal(fs.existsSync(path.join(root,'manager-concierge-legal-publication-approval.json')),false);
  for (const page of ['manager/privacidad-concierge/index.html',
                      'manager/condiciones-concierge/index.html']) {
    assert.equal(fs.existsSync(path.join(dist,page)),false,
      page+' must not appear before legal/owner approval');
  }
  assert.match(read('manager/activar/index.html'),
    /var CONCIERGE_SIGNUP_LEGAL_PUBLICATION_APPROVED = false/);
  assert.match(read('manager/activar/index.html'),/id="invite-form" hidden/);
});

test('static hosting alone does NOT migrate the backend: dependency detected', () => {
  // A deliberate non-portability signal. This test must not report GO.
  const signup=read('manager/activar/index.html');
  const login=read('manager/manager-auth.js');
  const operator=read('manager/altas/index.html');
  const backend='chebot-backend-git-concierge-v3-design-chebot.vercel.app';
  assert.ok(signup.includes(backend),'signup backend dependency must be documented');
  assert.ok(login.includes(backend),'login backend dependency must be documented');
  assert.ok(operator.includes(backend),'admin backend dependency must be documented');
  // A commercial website hosted elsewhere still uses the existing Vercel backend.
});

test('private HTML does not embed server-side credentials or public signup', () => {
  for (const file of ['manager/index.html','manager/activar/index.html',
                       'manager/altas/index.html']) {
    const html=read(file);
    assert.doesNotMatch(html,/SUPABASE_SERVICE_ROLE_KEY|sb_secret_[A-Za-z0-9]/);
  }
  assert.match(read('manager/activar/index.html'),/noindex,nofollow,noarchive/);
});
