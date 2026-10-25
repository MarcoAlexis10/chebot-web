// Offline regression of the actual generated panel script. All URLs/data fake.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'manager-auth-v1.js'), 'utf8');
let browser;
vm.runInNewContext(source.slice(0, source.indexOf("let html = fs.readFileSync")), {
  __dirname: '/fictional', console: {log() {}},
  require(name) {
    if (name === 'fs') return {existsSync: () => true, writeFileSync(file, content) {
      if (file.endsWith('/manager-auth.js')) browser = content;
    }};
    if (name === 'path') return path;
    if (name === './manager-build-config.cjs') return {managerBuildConfig: () => ({
      supabaseUrl: 'https://fictional-auth.example.invalid', publishableKey: 'FICTIONAL_PUBLIC',
      apiUrl: name => 'https://fictional-api.example.invalid/' + name,
      recoveryUrl: 'https://fictional-web.example.invalid/manager/reset-password/'
    })};
    throw Error('UNEXPECTED_IMPORT');
  }
});
const TOKEN = 'chebot_manager_preview_access_token';
const response = body => ({ok: true, json: async () => body});
const settle = async () => {for (let i = 0; i < 12; i++) await Promise.resolve();};
function harness({token = null, fetcher} = {}) {
  const nodes = new Map(), classes = new Set(['manager-auth-pending']);
  const storage = new Map(token ? [[TOKEN, token]] : []);
  const timers = new Map(), calls = []; let timerId = 0;
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {value: '', hidden: false, disabled: false, textContent: '',
      listeners: {}, addEventListener(type, listener) {this.listeners[type] = listener;},
      setAttribute() {}, focus() {}, checkValidity() {return true;}});
    return nodes.get(id);
  }
  const lists = new Map(['#propiedades .list', '#estadias .list', '#manager-knowledge-list',
    '#manager-requests-list', '#manager-incidents-list'].map(s => [s, {cleared: 0, replaceChildren() {this.cleared++;}, appendChild() {}}]));
  vm.runInNewContext(browser, {
    window: {addEventListener() {}},
    AbortController, console: {log() {throw Error('NO_LOGGING');}},
    document: {getElementById: node, body: {classList: {
      add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x)}},
      querySelector: x => lists.get(x) || null, querySelectorAll: () => [], createElement: () => ({append() {}})},
    sessionStorage: {getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k)},
    setTimeout(fn, ms) {const id = ++timerId; timers.set(id, {fn, ms}); return id;},
    clearTimeout: id => timers.delete(id),
    fetch(url, options) {
      assert.ok(url.startsWith('https://fictional-'), 'No real service URL permitted');
      calls.push({url, options});
      if (fetcher) return fetcher(url, options);
      return Promise.resolve(response({ok: true, session: {role: 'manager'}, properties: [], stays: []}));
    }
  });
  return {node, storage, classes, calls, timers, lists,
    click: () => node('manager-logout').listeners.click(),
    login: () => node('manager-login-form').listeners.submit({preventDefault() {}})};
}

test('logout clears local credentials and all panel lists before remote ACK; local scope only', async () => {
  let ack; const h = harness({token: 'FICTIONAL_ACCESS', fetcher: url => url.includes('/logout?')
    ? new Promise(resolve => {ack = resolve;}) : Promise.resolve(response({ok:true, session:{}}))});
  await settle();
  const pending = h.click();
  assert.equal(h.storage.has(TOKEN), false); assert.ok(h.classes.has('manager-auth-pending'));
  assert.ok([...h.lists.values()].every(x => x.cleared > 0));
  const call = h.calls.find(x => x.url.includes('/logout?'));
  assert.equal(call.url, 'https://fictional-auth.example.invalid/auth/v1/logout?scope=local');
  assert.equal(call.options.method, 'POST'); assert.equal(call.options.cache, 'no-store');
  assert.equal(call.options.referrerPolicy, 'no-referrer');
  assert.equal(call.options.headers.Authorization, 'Bearer FICTIONAL_ACCESS');
  assert.equal(call.options.headers.apikey, 'FICTIONAL_PUBLIC');
  ack({ok: true}); await pending; assert.equal(h.node('manager-login-submit').disabled, false);
});
test('missing bearer performs no remote logout and clears stale status', async () => {
  const h = harness(); h.node('manager-auth-status').textContent = 'stale'; await h.click();
  assert.equal(h.calls.length, 0); assert.equal(h.node('manager-auth-status').textContent, '');
});
test('remote rejection leaves panel closed and reports unconfirmed remote logout', async () => {
  const h = harness({token: 'FICTIONAL_ACCESS', fetcher: async url => url.includes('/logout?')
    ? {ok: false} : response({ok:true, session:{}})}); await settle(); await h.click();
  assert.equal(h.storage.has(TOKEN), false); assert.ok(h.classes.has('manager-auth-pending'));
  assert.match(h.node('manager-auth-status').textContent, /No pudimos confirmar/);
});
test('network error cannot retain credentials or expose a raw provider error', async () => {
  const h = harness({token: 'FICTIONAL_ACCESS', fetcher: async () => {throw Error('PRIVATE_PROVIDER_DETAIL');}});
  // Sign out before the outstanding restore error can clear the token.
  await h.click(); await settle(); assert.equal(h.storage.has(TOKEN), false);
  assert.ok(h.classes.has('manager-auth-pending'));
  assert.doesNotMatch(h.node('manager-auth-status').textContent, /PRIVATE_PROVIDER_DETAIL/);
});
test('stalled logout aborts after bounded timeout; no retry and form unlocks', async () => {
  const h = harness({token: 'FICTIONAL_ACCESS', fetcher: (url, options) => url.includes('/logout?')
    ? new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(Error('aborted'))))
    : Promise.resolve(response({ok:true, session:{}}))}); await settle();
  const pending = h.click(); const timer = [...h.timers.values()].find(x => x.ms === 8000);
  assert.ok(timer); timer.fn(); await pending;
  assert.equal(h.node('manager-login-submit').disabled, false);
  assert.equal(h.calls.filter(x => x.url.includes('/logout?')).length, 1);
});
test('late successful restore cannot resurrect panel after logout', async () => {
  let restore; const h = harness({token: 'FICTIONAL_ACCESS', fetcher: url => url.endsWith('/session')
    ? new Promise(resolve => {restore = resolve;}) : Promise.resolve({ok:true})});
  await h.click(); restore(response({ok:true, session:{role:'manager'}})); await settle();
  assert.ok(h.classes.has('manager-auth-pending')); assert.equal(h.storage.has(TOKEN), false);
  assert.equal(h.calls.filter(x => /properties|stays/.test(x.url)).length, 0);
});
test('late restore failure cannot overwrite logout result', async () => {
  let fail; const h = harness({token: 'FICTIONAL_ACCESS', fetcher: url => url.endsWith('/session')
    ? new Promise((_, reject) => {fail = reject;}) : Promise.resolve({ok:true})});
  await h.click(); fail(Error('late')); await settle();
  assert.equal(h.node('manager-auth-status').textContent, '');
});
test('duplicate logout and login while logout is pending send no extra requests', async () => {
  let ack; const h = harness({token: 'FICTIONAL_ACCESS', fetcher: url => url.includes('/logout?')
    ? new Promise(resolve => {ack = resolve;}) : Promise.resolve(response({ok:true, session:{}}))}); await settle();
  const pending = h.click(); await h.click(); await h.login();
  assert.equal(h.calls.filter(x => x.url.includes('/logout?')).length, 1);
  assert.equal(h.calls.filter(x => x.url.includes('/token?')).length, 0);
  ack({ok:true}); await pending;
});
test('late login admission cannot persist bearer or reopen panel after logout', async () => {
  let admit; const h = harness({fetcher: url => url.includes('/token?')
    ? Promise.resolve(response({access_token:'FICTIONAL_ACCESS'}))
    : url.includes('/logout?') ? Promise.resolve({ok:true}) : new Promise(resolve => {admit = resolve;})});
  const login = h.login(); await settle(); assert.ok(admit);
  await h.click(); admit(response({ok:true, session:{role:'manager'}})); await login;
  assert.equal(h.storage.has(TOKEN), false); assert.ok(h.classes.has('manager-auth-pending'));
  assert.equal(h.calls.filter(x => x.url.includes('/logout?')).length, 1);
});
test('rejected manager admission requests revocation of the newly minted Auth session', async () => {
  const h = harness({fetcher: url => Promise.resolve(url.includes('/token?')
    ? response({access_token:'FICTIONAL_ACCESS'}) : url.endsWith('/session')
    ? {ok:false, json:async () => ({error:'MANAGER_MEMBER_NOT_ACTIVE'})} : {ok:true})});
  await h.login(); assert.equal(h.storage.has(TOKEN), false);
  assert.ok(h.classes.has('manager-auth-pending'));
  assert.equal(h.calls.filter(x => x.url.includes('/logout?')).length, 1);
  assert.match(h.node('manager-auth-status').textContent, /no está activo/);
});
test('late sign-in token after cancellation is revoked without attempting manager admission', async () => {
  let issue; const h = harness({fetcher: url => url.includes('/token?')
    ? new Promise(resolve => {issue = resolve;}) : Promise.resolve({ok:true})});
  const pending = h.login(); await h.click(); issue(response({access_token:'FICTIONAL_ACCESS'})); await pending;
  assert.equal(h.storage.has(TOKEN), false); assert.ok(h.classes.has('manager-auth-pending'));
  assert.equal(h.calls.filter(x => x.url.includes('/logout?')).length, 1);
  assert.equal(h.calls.filter(x => x.url.endsWith('/session')).length, 0);
});
test('affected regression: successful admission persists bearer and loads authorized panel', async () => {
  const h = harness({fetcher: async url => url.includes('/token?')
    ? response({access_token:'FICTIONAL_ACCESS'}) : response({ok:true, session:{role:'manager'}, properties:[], stays:[]})});
  await h.login(); await settle(); assert.equal(h.storage.get(TOKEN), 'FICTIONAL_ACCESS');
  assert.equal(h.classes.has('manager-auth-pending'), false);
  assert.equal(h.calls.filter(x => /properties|stays/.test(x.url)).length, 2);
  assert.equal(h.node('manager-login-submit').disabled, false);
});
test('an older login completion cannot unlock a newer pending login', async () => {
  const issued = []; const h = harness({fetcher: url => url.includes('/token?')
    ? new Promise(resolve => issued.push(resolve)) : Promise.resolve({ok:true})});
  const first = h.login(); await h.click(); const second = h.login();
  issued[0](response({access_token:'FICTIONAL_OLD'})); await first;
  assert.equal(h.node('manager-login-submit').disabled, true);
  await h.login(); assert.equal(issued.length, 2);
  issued[1]({ok:false, json:async () => ({})}); await second;
  assert.equal(h.node('manager-login-submit').disabled, false);
});
