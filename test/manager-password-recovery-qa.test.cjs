// New offline cases only. Execute the actual builder output with fictional fetch/storage.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'manager-password-recovery-v1.js'), 'utf8');
let html;
vm.runInNewContext(source, {
  __dirname: '/fictional', console: {log() {}},
  require(name) {
    if (name === 'node:fs') return {mkdirSync() {}, writeFileSync(_, data) {html = data;}};
    if (name === 'node:path') return path;
    if (name === './manager-build-config.cjs') return {managerBuildConfig: () => ({
      supabaseUrl: 'https://fictional-auth.example.invalid', publishableKey: 'FICTIONAL_PUBLIC'
    })};
    throw Error('UNEXPECTED_IMPORT');
  }
});
const browser = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const TOKEN = 'chebot_manager_preview_access_token';
const PW = 'FICTIONAL-PASSWORD-24';
const ok = {ok: true, status: 200, json: async () => ({id:'11111111-1111-4111-8111-111111111111',is_anonymous:false})};
const settle = async () => {for (let n = 0; n < 20; n++) await Promise.resolve();};
function deferred() {let resolve, reject; const promise = new Promise((a,b) => {resolve=a;reject=b;});return {promise,resolve,reject};}
function harness({fetcher, hash = '#access_token=FICTIONAL_RECOVERY', search = '', storageFails = false} = {}) {
  const calls = [], nodes = new Map(), events = {}, timers = new Map();
  const storage = new Map([[TOKEN, 'FICTIONAL_OLD_MANAGER'], ['unrelated', 'KEEP']]);
  let timerId = 0, reloads = 0, replaced;
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {id, value: '', type: 'password', hidden: id === 'recovery',
      disabled: false, textContent: '', attributes: {}, listeners: {},
      setAttribute(k,v) {this.attributes[k]=v;}, addEventListener(k,v) {this.listeners[k]=v;}});
    return nodes.get(id);
  }
  const toggles = ['password','confirm'].map(target => ({
    dataset: {passwordTarget: target}, attributes: {}, listeners: {},
    setAttribute(k,v) {this.attributes[k]=v;}, addEventListener(k,v) {this.listeners[k]=v;}
  }));
  const location = {hash, search, pathname: '/manager/reset-password/', reload() {reloads++;}};
  vm.runInNewContext(browser, {
    URLSearchParams, AbortController, Set,
    console: {log() {throw Error('NO_LOGGING');}, error() {throw Error('NO_LOGGING');}},
    document: {getElementById: node, querySelectorAll: () => toggles},
    window: {location, history: {replaceState(_,__,p) {replaced=p;}},
      addEventListener(k,v) {events[k]=v;}},
    sessionStorage: {removeItem(key) {if(storageFails)throw Error('PRIVATE_STORAGE_ERROR');storage.delete(key);}},
    setTimeout(fn, ms) {const id=++timerId;timers.set(id,{fn,ms});return id;},
    clearTimeout(id) {timers.delete(id);},
    fetch(url, options) {
      assert.ok(url.startsWith('https://fictional-auth.example.invalid/'), 'ONLY_FICTIONAL_AUTH');
      calls.push({url, options});
      return fetcher ? fetcher(url, options) : Promise.resolve(ok);
    }
  });
  return {calls, node, storage, timers, events, toggles, location,
    get reloads() {return reloads;}, get replaced() {return replaced;},
    fill(value=PW, second=value) {node('password').value=value;node('confirm').value=second;},
    submit: () => node('recovery').listeners.submit?.({preventDefault() {}}),
    puts: () => calls.filter(c => c.options.method === 'PUT'),
    logouts: () => calls.filter(c => c.url.includes('/logout?'))};
}
test('recovery clears only the residual manager token and strips returned credentials before validation', async () => {
  const h=harness();assert.equal(h.storage.has(TOKEN),false);assert.equal(h.storage.get('unrelated'),'KEEP');
  assert.equal(h.replaced,'/manager/reset-password/');await settle();
  assert.equal(h.node('recovery').hidden,false);assert.equal(h.node('save').disabled,false);
});
test('submission before validation is denied even if the hidden form is dispatched', async () => {
  const pending=deferred(),h=harness({fetcher: () => pending.promise});
  h.fill();await h.submit();assert.equal(h.puts().length,0);
  pending.resolve(ok);await settle();assert.equal(h.node('recovery').hidden,false);
});
test('duplicate submissions and visibility toggles cannot dispatch a second update', async () => {
  const put=deferred(),h=harness({fetcher: (_,o) => o.method==='PUT'?put.promise:Promise.resolve(ok)});
  await settle();h.fill();const first=h.submit();await h.submit();
  h.toggles[0].listeners.click();assert.equal(h.node('password').type,'password');
  assert.equal(h.puts().length,1);assert.equal(h.node('password').disabled,true);
  put.resolve(ok);await first;assert.equal(h.logouts().length,1);assert.equal(h.node('recovery').hidden,true);
});
test('confirmed reset clears new residual local storage, fields and only the recovery provider session', async () => {
  const h=harness();await settle();h.storage.set(TOKEN,'FICTIONAL_LATE_MANAGER');h.fill();
  await h.submit();assert.equal(h.storage.has(TOKEN),false);
  assert.equal(h.node('password').value,'');assert.equal(h.node('confirm').value,'');
  assert.equal(h.node('save').disabled,true);
  const call=h.logouts()[0];assert.equal(call.url,'https://fictional-auth.example.invalid/auth/v1/logout?scope=local');
  assert.equal(call.options.headers.Authorization,'Bearer FICTIONAL_RECOVERY');
  assert.equal(call.options.cache,'no-store');assert.equal(call.options.referrerPolicy,'no-referrer');
  assert.match(h.node('status').textContent,/Contraseña actualizada/);
});
test('local password validation sends no update', async () => {
  const h=harness();await settle();h.fill('short');await h.submit();h.fill(PW,'OTHER_FICTIONAL_PASSWORD');await h.submit();
  assert.equal(h.puts().length,0);assert.equal(h.node('recovery').hidden,false);
});
test('explicit password policy rejection permits a deliberate corrected submission with fields cleared', async () => {
  let puts=0;const h=harness({fetcher: async (_,o) => o.method==='PUT'&&++puts===1?{ok:false,status:422}:ok});
  await settle();h.fill();await h.submit();assert.equal(h.node('password').value,'');
  assert.equal(h.node('save').disabled,false);assert.equal(h.node('recovery').hidden,false);
  h.fill();await h.submit();assert.equal(h.puts().length,2);assert.equal(h.logouts().length,1);
});
test('network failure after update dispatch is terminal and cannot automatically or manually replay', async () => {
  const h=harness({fetcher: async (_,o) => {if(o.method==='PUT')throw Error('PRIVATE_PROVIDER_DETAIL');return ok;}});
  await settle();h.fill();await h.submit();h.fill();await h.submit();
  assert.equal(h.puts().length,1);assert.equal(h.node('recovery').hidden,true);
  assert.equal(h.node('password').value,PW); // programmatic fill is inert after terminal outcome
  assert.match(h.node('status').textContent,/No pudimos confirmar si la contraseña cambió/);
  assert.doesNotMatch(h.node('status').textContent,/PRIVATE_PROVIDER_DETAIL/);
});
test('server error is uncertain rather than a claimed password rejection or a retry', async () => {
  const h=harness({fetcher: async (_,o) => o.method==='PUT'?{ok:false,status:503}:ok});
  await settle();h.fill();await h.submit();await h.submit();
  assert.equal(h.puts().length,1);assert.equal(h.logouts().length,1);
  assert.match(h.node('status').textContent,/No repitas este envío/);
});
test('timed out update aborts once, remains unconfirmed and never retries PUT', async () => {
  const h=harness({fetcher: (_,o) => o.method==='PUT'?new Promise((_,reject) => o.signal.addEventListener('abort',() => reject(Error('timeout')))):Promise.resolve(ok)});
  await settle();h.fill();const pending=h.submit();
  const timer=[...h.timers.values()].find(x=>x.ms===8000);assert.ok(timer);timer.fn();await pending;
  assert.equal(h.puts().length,1);assert.equal(h.node('save').disabled,true);
  assert.match(h.node('status').textContent,/No pudimos confirmar/);
});
test('logout failure preserves confirmed reset while explicitly withholding provider closure confirmation', async () => {
  const h=harness({fetcher: async url => url.includes('/logout?')?{ok:false,status:500}:ok});
  await settle();h.fill();await h.submit();assert.equal(h.storage.has(TOKEN),false);
  assert.match(h.node('status').textContent,/Contraseña actualizada/);
  assert.match(h.node('status').textContent,/No pudimos confirmar el cierre/);
  assert.doesNotMatch(h.node('status').textContent,/todas.*sesiones|invalidad/);
});
test('logout timeout cannot reopen the form or lose the confirmed password result', async () => {
  const h=harness({fetcher: (url,o) => url.includes('/logout?')?new Promise((_,reject) => o.signal.addEventListener('abort',() => reject(Error('timeout')))):Promise.resolve(ok)});
  await settle();h.fill();const pending=h.submit();await settle();
  const timer=[...h.timers.values()].find(x=>x.ms===8000);assert.ok(timer);timer.fn();await pending;
  assert.match(h.node('status').textContent,/Contraseña actualizada/);assert.equal(h.node('save').disabled,true);
});
test('pagehide invalidates a late validation result and removes sensitive form state', async () => {
  const validation=deferred(),h=harness({fetcher: () => validation.promise});
  h.fill();h.events.pagehide();validation.resolve(ok);await settle();
  assert.equal(h.node('recovery').hidden,true);assert.equal(h.node('password').value,'');assert.equal(h.puts().length,0);
});
test('new recovery fragment discards the old update result before reload', async () => {
  const update=deferred(),h=harness({fetcher: (_,o) => o.method==='PUT'?update.promise:Promise.resolve(ok)});
  await settle();h.fill();const pending=h.submit();h.location.hash='#access_token=FICTIONAL_SECOND';
  h.events.hashchange();assert.equal(h.reloads,1);update.resolve(ok);await pending;
  assert.equal(h.logouts().length,0);assert.equal(h.node('recovery').hidden,true);assert.equal(h.node('password').value,'');
  assert.doesNotMatch(h.node('status').textContent,/Contraseña actualizada/);
});
test('query-only credentials never authorize recovery or dispatch a provider call', async () => {
  const h=harness({hash:'',search:'?access_token=FICTIONAL_QUERY'});await settle();h.fill();await h.submit();
  assert.equal(h.calls.length,0);assert.equal(h.node('recovery').hidden,true);assert.equal(h.storage.has(TOKEN),false);
});
test('failure to clear residual local credentials prevents all provider calls', async () => {
  const h=harness({storageFails:true});await settle();assert.equal(h.calls.length,0);
  assert.equal(h.node('recovery').hidden,true);assert.match(h.node('status').textContent,/No pudimos limpiar/);
});
test('invalid validation response locks the form without exposing raw details', async () => {
  const h=harness({fetcher: async () => ({ok:false,status:401})});await settle();h.fill();await h.submit();
  assert.equal(h.puts().length,0);assert.equal(h.node('recovery').hidden,true);assert.equal(h.node('save').disabled,true);
});

