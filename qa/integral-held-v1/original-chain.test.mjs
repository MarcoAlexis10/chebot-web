// Full-checkout QA integration. Run ONLY via run-isolated.py --loopback.
// Imports actual backend modules, executes the actual built frontend in Chromium.
// Local vercel.json route interpretation is NOT the Vercel platform runtime.
import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, realpathSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createServer, request} from 'node:https';
import {createRequire} from 'node:module';
import {resolve, dirname, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';

const here=dirname(fileURLToPath(import.meta.url));
const web=realpathSync(resolve(here,'../..'));
const backend=realpathSync(resolve(web,'../backend'));
const pins=JSON.parse(readFileSync(resolve(here,'SOURCE-PINS.json')));
const digest=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
for(const [base,entries] of [[backend,pins.backend],[web,pins.web]])
 for(const [path,sha] of Object.entries(entries))
  assert.equal(digest(readFileSync(resolve(base,path))),sha,'original source changed: '+path);
// Refuse routed environments before importing application modules. The launcher
// separately proves a fresh kernel namespace and ENETUNREACH to an external IP.
assert.equal(readFileSync('/proc/net/route','utf8').split('\n').slice(1).some(line=>line.trim()),false,'routed environment refused');
const apiHost='fictional-api.example.invalid', webHost='fictional-manager.example.invalid';
const apiOrigin='https://'+apiHost, webOrigin='https://'+webHost;
const canonicalSignupOrigin='https://chebot-web-git-concierge-manager-web-v1-chebot.vercel.app';
const stableIntent='00000000-0000-4000-8000-000000000001';
const routes=['session','properties','stays','invites/send','incidents','requests','knowledge','incidents/state','requests/decision'];
const requests=[], providers=[];
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{providers.push('UNEXPECTED_PROVIDER_TRANSPORT');throw Error('QA_PROVIDER_TRANSPORT_FORBIDDEN');};
// No credentials or approval flags are installed. Preview only selects the
// original signup's CLOSED preview branch, never overrides the immutable gate.
process.env.MANAGER_WEB_ORIGIN=webOrigin;
process.env.VERCEL_ENV='preview';
const config=JSON.parse(readFileSync(resolve(backend,'vercel.json')));
assert.equal(config.git.deploymentEnabled,false);
const destinations=new Set(routes.map(name=>{
 const path='/api/concierge/manager/'+name;
 return config.routes.find(r=>new RegExp('^'+r.src+'$').test(path)).dest;
}));
destinations.add('index.js');
const handlers=new Map();
for(const dest of destinations){
 assert.ok(Object.hasOwn(pins.backend,dest),'unreviewed route destination');
 handlers.set(dest,(await import(pathToFileURL(resolve(backend,dest)))).default);
 assert.equal(typeof handlers.get(dest),'function');
}
const {managerAuthResponse,managerMutationResponse}=await import(pathToFileURL(resolve(backend,'concierge-manager-auth-session.js')));
const temporary=mkdtempSync(resolve(tmpdir(),'cheveni-local-tls-'));
let server,browser;
const snapshots={sourceClosureBackendFiles:Object.keys(pins.backend).length,
 sourceWebFiles:Object.keys(pins.web).length,indexImported:true,
 vercelPlatformExecuted:false,releaseHeld:true,browserCases:[]};

function localRequest(path,{method='GET',origin=webOrigin,headers={},body}={}){
 return new Promise((resolveResult,reject)=>{
  const req=request({hostname:'127.0.0.1',port:443,path,method,rejectUnauthorized:false,
   agent:false,headers:{Host:apiHost,Origin:origin,...headers}},res=>{
    let text='';res.setEncoding('utf8');res.on('data',part=>text+=part);
    res.on('end',()=>{let body=null;try{body=JSON.parse(text)}catch{}
     resolveResult({status:res.statusCode,headers:res.headers,body});});
   });
  req.on('error',reject);req.end(body);
 });
}

before(async()=>{
 const cert=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1',
  '-subj','/CN=fictional-manager.example.invalid','-keyout',resolve(temporary,'key.pem'),
  '-out',resolve(temporary,'cert.pem')],{encoding:'utf8'});
 assert.equal(cert.status,0,'ephemeral local TLS fixture generation');
 server=createServer({key:readFileSync(resolve(temporary,'key.pem')),cert:readFileSync(resolve(temporary,'cert.pem'))},async(req,res)=>{
  const host=req.headers.host,pathname=new URL(req.url,'https://local.invalid').pathname;
  if(host===apiHost){
   if(!pathname.startsWith('/api/concierge/manager/')){res.writeHead(404).end();return;}
   const route=config.routes.find(r=>new RegExp('^'+r.src+'$').test(pathname));
   const handler=route&&handlers.get(route.dest);
   if(!handler){res.writeHead(404).end();return;}
   const receipt={path:pathname,method:req.method,destination:route.dest,
    authHeaderPresent:Boolean(req.headers.authorization),
    stableIntentPresent:req.headers['idempotency-key']===stableIntent,bodyReads:0};
   requests.push(receipt);
   Object.defineProperty(req,'body',{get(){receipt.bodyReads++;throw Error('HELD_HANDLER_READ_BODY');}});
   res.status=code=>{res.statusCode=code;return res;};
   res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));return res;};
   res.on('finish',()=>{receipt.status=res.statusCode;
    receipt.corsOrigin=res.getHeader('Access-Control-Allow-Origin')||null;});
   try{await handler(req,res);}catch(error){receipt.exception=String(error);res.statusCode=500;res.end('QA_HANDLER_FAILED');}
   return;
  }
  if(host!==webHost){res.writeHead(403).end();return;}
  let file=resolve(web,'dist','.'+pathname);
  if(pathname.endsWith('/'))file=resolve(file,'index.html');
  if(!file.startsWith(resolve(web,'dist')+sep)||!existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');
  res.setHeader('Cache-Control','no-store');res.end(readFileSync(file));
 });
 await new Promise((done,reject)=>{server.once('error',reject);server.listen(443,'127.0.0.1',done);});
 const require=createRequire(import.meta.url);
 const {chromium}=require('/opt/codex/cua_node/lib/node_modules/playwright');
 try { browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:[
  '--no-sandbox','--disable-dev-shm-usage','--no-proxy-server','--disable-background-networking',
  '--host-resolver-rules=MAP '+webHost+' 127.0.0.1, MAP '+apiHost+' 127.0.0.1']});
 snapshots.chromium=browser.version();snapshots.browserStatus='STARTED';
 } catch(error) {
  snapshots.browserStatus='BLOCKED_BEFORE_BROWSER_START';
  snapshots.browserError=String(error);
 }
});
after(async()=>{
 if(browser)await browser.close();
 if(server)await new Promise(done=>server.close(done));
 snapshots.requests=requests;snapshots.providerAttempts=providers;
 writeFileSync(resolve(here,'OBSERVATIONS.json'),JSON.stringify(snapshots,null,2)+'\n');
 globalThis.fetch=originalFetch;delete process.env.MANAGER_WEB_ORIGIN;delete process.env.VERCEL_ENV;
 rmSync(temporary,{recursive:true,force:true});
});

test('all nine API URLs occur in the actual generated frontend and select built original handlers',()=>{
 const outputs=['manager-auth.js','manager-incidents.js','manager-requests.js','manager-knowledge.js','manager-invite.js']
  .map(p=>readFileSync(resolve(web,'dist/manager',p),'utf8')).join('\n');
 for(const name of routes){
  assert.ok(outputs.includes(apiOrigin+'/api/concierge/manager/'+name),name);
  const dest=config.routes.find(r=>new RegExp('^'+r.src+'$').test('/api/concierge/manager/'+name)).dest;
  assert.ok(config.builds.some(x=>x.src===dest),dest+' not built');
 }
});
for(const name of routes)test('original routed HTTP '+name+': method precedence, CORS, auth and intent remain HELD',async()=>{
 for(const method of ['GET','POST','OPTIONS','PUT','DELETE','HEAD']){
  const result=await localRequest('/api/concierge/manager/'+name,{method,
   headers:{Authorization:'Bearer FICTIONAL_NOT_A_JWT','Idempotency-Key':stableIntent,
    'Content-Type':'application/json'},body:method==='POST'?'{}':undefined});
  if(name==='invites/send'){
   assert.equal(result.status,method==='OPTIONS'?204:method==='POST'?503:405);
   assert.equal(result.headers['access-control-allow-origin'],webOrigin);
   if(method==='POST')assert.equal(result.body.error,'GUEST_INVITE_PRIVACY_HOLD');
  }else{
   assert.equal(result.status,503);
   assert.equal(result.headers['access-control-allow-origin'],undefined);
   assert.equal(result.headers['cache-control'],'no-store');
   if(method!=='HEAD')assert.deepEqual(result.body,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED'});
  }
 }
});
test('actual index.js dispatches canonical signup-request through the original closed handler',async()=>{
 const path='/api/concierge/manager/signup-request';
 for(const method of ['POST','GET','PUT']){
  const result=await localRequest(path,{method,origin:canonicalSignupOrigin});
  assert.equal(result.status,503);
  assert.equal(result.body.code,'MANAGER_BETA_VERIFIED_LEGAL_ADMISSION_NOT_CONNECTED');
  assert.equal(result.headers['access-control-allow-origin'],canonicalSignupOrigin);
 }
 const allowed=await localRequest(path,{method:'OPTIONS',origin:canonicalSignupOrigin});
 assert.equal(allowed.status,204);
 const denied=await localRequest(path,{method:'OPTIONS'});
 assert.equal(denied.status,403);assert.equal(denied.body.code,'ORIGIN_NOT_ALLOWED');
 assert.equal(requests.filter(x=>x.path===path).every(x=>x.destination==='index.js'),true);
});
test('actual index.js signup-admin rejects auth and both missing/malformed/stable intents before body',async()=>{
 for(const headers of [{},{'Idempotency-Key':'bad'},
  {'Idempotency-Key':stableIntent,Authorization:'Bearer FICTIONAL_NOT_A_JWT'}]){
  const result=await localRequest('/api/concierge/manager/signup-admin',{method:'POST',headers,body:'{}'});
  assert.equal(result.status,503);
  assert.deepEqual(result.body,{ok:false,error:'MANAGER_OPERATIONS_NOT_RELEASED'});
 }
});
test('real auth verifier and write binding refuse unverified credentials without provider traffic',async()=>{
 const auth=await managerAuthResponse('https://example.invalid/auth/v1/user',{},'FICTIONAL');
 assert.equal(auth.status,503);
 assert.equal((await auth.json()).error,'MANAGER_OPERATIONS_NOT_RELEASED');
 const write=await managerMutationResponse(new Response('{}'), 'concierge_fake',{}, {intentId:stableIntent});
 assert.equal(write.status,503);
 assert.equal(providers.length,0);
});

// DOM stand-ins run the complete inline script from the real build. The
// transport reaches real HTTPS/original handlers, but Node does NOT enforce
// browser CORS. Synthetic submit events exercise an otherwise concealed form;
// they do not grant access or turn off backend/legal guards.
async function originalAdminVm({losePostReceipt=false}={}){
 const html=readFileSync(resolve(web,'dist/manager/altas/index.html'),'utf8');
 const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const storage=new Map([['chebot_manager_preview_access_token','FICTIONAL_NOT_A_JWT']]);
 const nodes=new Map(),calls=[];
 let completeRead;const initialRead=new Promise(done=>completeRead=done);
 const makeNode=()=>({hidden:false,disabled:false,checked:false,value:'',textContent:'',children:[],listeners:{},
  addEventListener(k,fn){this.listeners[k]=fn;},appendChild(item){this.children.push(item);},
  replaceChildren(...items){this.children=items;},reportValidity(){return true;},reset(){}});
 const node=id=>{if(!nodes.has(id)){const item=makeNode();
  if(['editor','review','refresh','result'].includes(id))item.hidden=true;
  nodes.set(id,item);}return nodes.get(id);};
 const context={Date,URL,AbortController,setTimeout,clearTimeout,
  sessionStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  window:{crypto:{randomUUID:()=>stableIntent},confirm:()=>false,alert(){},addEventListener(){}},
  document:{getElementById:node,createElement:makeNode,querySelectorAll:()=>[node('issue-button'),node('refresh'),node('copy-link')]},
  fetch:async(url,options)=>{
   assert.equal(url,apiOrigin+'/api/concierge/manager/signup-admin');
   calls.push(options.method);
   if(options.method==='POST'){
    assert.equal(storage.get('cheveni_manager_signup_admin_review_v1'),'1');
    assert.equal(JSON.parse(storage.get('cheveni_manager_signup_admin_review_v1:durable-intent-v2')).intentId,stableIntent);
    assert.equal(options.headers['Idempotency-Key'],stableIntent);
   }
   const result=await localRequest('/api/concierge/manager/signup-admin',{
    method:options.method,headers:options.headers,body:options.body});
   if(options.method==='GET')completeRead();
   if(options.method==='POST'&&losePostReceipt)throw Error('QA_ACK_DROPPED_AFTER_ORIGINAL_RESPONSE');
   return new Response(JSON.stringify(result.body),{status:result.status});
  }};
 vm.runInNewContext(source,context,{timeout:1000});
 await initialRead;await new Promise(done=>setImmediate(done));
 return {node,storage,calls,submit:()=>node('issue-form').listeners.submit({preventDefault(){}})};
}
test('generated admin JavaScript consumes the original index.js 503 and conceals private data (Node transport)',async()=>{
 const ui=await originalAdminVm();
 assert.equal(ui.node('editor').hidden,true);assert.equal(ui.node('review').hidden,true);
 assert.match(ui.node('access-status').textContent,/invitaciones siguen cerradas/);
 assert.deepEqual(ui.calls,['GET']);
 snapshots.adminVmTransport='NODE_HTTPS_WITHOUT_BROWSER_CORS';
});
test('generated admin synthetic submit persists stable intent before original HTTP, then clears exact HELD receipt',async()=>{
 const ui=await originalAdminVm();
 ui.node('invite-email').value='fictional-manager@example.invalid';ui.node('issue-confirm').checked=true;
 await ui.submit();
 assert.deepEqual(ui.calls,['GET','POST']);
 assert.equal(ui.storage.has('cheveni_manager_signup_admin_review_v1'),false);
 assert.equal(ui.storage.has('cheveni_manager_signup_admin_review_v1:durable-intent-v2'),false);
 assert.equal(ui.node('editor').hidden,true);
 assert.match(ui.node('issue-status').textContent,/Altas cerradas/);
});
test('dropped original HTTP acknowledgement preserves generated admin durable intent and blocks retransmission',async()=>{
 const ui=await originalAdminVm({losePostReceipt:true});
 await ui.submit();await ui.submit();
 assert.deepEqual(ui.calls,['GET','POST']);
 assert.equal(ui.storage.get('cheveni_manager_signup_admin_review_v1'),'1');
 assert.equal(JSON.parse(ui.storage.get('cheveni_manager_signup_admin_review_v1:durable-intent-v2')).intentId,stableIntent);
 assert.equal(ui.node('editor').hidden,true);assert.equal(ui.node('issue-button').disabled,true);
});

async function contextWithToken(token=true){
 const context=await browser.newContext({ignoreHTTPSErrors:true});
 await context.route('**/*',route=>{
  const host=new URL(route.request().url()).hostname;
  if(![apiHost,webHost].includes(host)){providers.push('BLOCKED_BROWSER_HOST:'+host);return route.abort();}
  return route.continue();
 });
 if(token)await context.addInitScript(()=>sessionStorage.setItem('chebot_manager_preview_access_token','FICTIONAL_NOT_A_JWT'));
 return context;
}
test('Chromium: actual administrative frontend stays concealed when original backend preflight is held',async(t)=>{
 if(!browser){t.skip('Chromium launch blocked by environment; no browser assertions executed');return;}
 const context=await contextWithToken();try{
  const page=await context.newPage();
  const failed=page.waitForEvent('requestfailed',r=>r.url().endsWith('/signup-admin'));
  await page.goto(webOrigin+'/manager/altas/');await failed;
  await page.waitForFunction(()=>document.getElementById('access-status').textContent.includes('No se pudo verificar'));
  assert.equal(await page.locator('#editor').isHidden(),true);
  assert.equal(await page.locator('#review').isHidden(),true);
  assert.equal(await page.locator('#applications').textContent(),'');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('cheveni_manager_signup_admin_review_v1')),null);
  snapshots.browserCases.push({case:'original-admin-ui',privateViewHidden:true,preflightBlocked:true});
 }finally{await context.close();}
});
test('Chromium: browser enforces real CORS for every original route; no response rewriting',async(t)=>{
 if(!browser){t.skip('Chromium launch blocked by environment; no browser assertions executed');return;}
 const context=await contextWithToken(false);try{
  const page=await context.newPage();await page.goto(webOrigin+'/manager/altas/');
  const observed=await page.evaluate(async({routes,apiOrigin,stableIntent})=>{
   const results=[];
   for(const name of routes){
    const method=['invites/send','incidents/state','requests/decision'].includes(name)?'POST':'GET';
    const headers={Authorization:'Bearer FICTIONAL_NOT_A_JWT'};
    if(method==='POST')headers['Content-Type']='application/json';
    // inv/send uses the original frontend's no-key, server-durable dispatch contract.
    if(['incidents/state','requests/decision'].includes(name))headers['Idempotency-Key']=stableIntent;
    try{const result=await fetch(apiOrigin+'/api/concierge/manager/'+name,{method,headers,
     mode:'cors',credentials:'omit',body:method==='POST'?'{}':undefined});
     results.push({name,status:result.status,body:await result.json()});}
    catch(error){results.push({name,corsBlocked:true,error:error.name});}
   }
   return results;
  },{routes,apiOrigin,stableIntent});
  for(const row of observed){
   if(row.name==='invites/send'){assert.equal(row.status,503);assert.equal(row.body.error,'GUEST_INVITE_PRIVACY_HOLD');}
   else{assert.equal(row.corsBlocked,true,row.name);assert.equal(row.error,'TypeError');}
  }
  snapshots.browserCases.push({case:'nine-route-cors',observed});
 }finally{await context.close();}
});
test('Chromium: actual dashboard cannot open a private session from a fictional token',async(t)=>{
 if(!browser){t.skip('Chromium launch blocked by environment; no browser assertions executed');return;}
 const context=await contextWithToken();try{
  const page=await context.newPage();
  const failed=page.waitForEvent('requestfailed',r=>r.url().endsWith('/session'));
  await page.goto(webOrigin+'/manager/');await failed;
  assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('manager-auth-pending')),true);
  assert.equal(await page.locator('#manager-auth').isVisible(),true);
  snapshots.browserCases.push({case:'original-dashboard',authenticatedPanelOpened:false});
 }finally{await context.close();}
});
test('Chromium: original signup build keeps legal form concealed and emits no signup POST',async(t)=>{
 if(!browser){t.skip('Chromium launch blocked by environment; no browser assertions executed');return;}
 const context=await contextWithToken(false);try{
  const page=await context.newPage();let post=0;
  page.on('request',req=>{if(req.method()==='POST'&&req.url().endsWith('/signup-request'))post++;});
  await page.goto(webOrigin+'/manager/activar/#invite='+'F'.repeat(43));
  assert.equal(await page.locator('#legal-pending').isVisible(),true);
  assert.equal(await page.locator('#invite-form').isHidden(),true);
  assert.equal(post,0);
  snapshots.browserCases.push({case:'original-signup',legalPending:true,signupPosts:post});
 }finally{await context.close();}
});
test('no provider, private payload read or successful admission occurred in the complete chain',()=>{
 assert.equal(providers.length,0);
 assert.ok(requests.length>60);
 assert.equal(requests.some(x=>x.bodyReads!==0||x.exception),false);
 assert.equal(requests.some(x=>x.status>=200&&x.status<300&&x.method!=='OPTIONS'),false);
});
