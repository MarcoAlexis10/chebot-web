'use strict';
// Executes pinned ORIGINAL generators against a virtual filesystem and .invalid
// public config. No build.js, server, fetch, environment credentials or SQL.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..');
const generators=['manager-v1.js','manager-auth-v1.js','manager-knowledge-v1.js','manager-requests-v1.js','manager-incidents-v1.js','manager-request-actions-v1.js','manager-incident-actions-v1.js','manager-invite-v1.js','manager-password-recovery-v1.js','manager-signup-v1.js','manager-signup-admin-v1.js'];
const config=Object.freeze({supabaseUrl:'https://fictional-auth.example.invalid',publishableKey:'sb_publishable_FICTIONAL_ONLY',apiOrigin:'https://fictional-api.example.invalid',webOrigin:'https://fictional-web.example.invalid',apiUrl:n=>'https://fictional-api.example.invalid/api/concierge/manager/'+n,recoveryUrl:'https://fictional-web.example.invalid/manager/reset-password/'});
const replace=(source,before,after)=>{if(source.split(before).length!==2)throw Error('SOURCE_DRIFT');return source.replace(before,after)};
function patch(name,source){
 if(['manager-auth-v1.js','manager-requests-v1.js','manager-incidents-v1.js'].includes(name)){
  const before='La sesión sigue activa. Reintentá recargando la página.';
  if(source.split(before).length!==(name==='manager-auth-v1.js'?3:2))throw Error('ERROR_COPY_SOURCE_DRIFT');
  source=source.split(before).join('No pudimos comprobar esta sección. Volvé a verificar el acceso antes de continuar.');
 }
 if(name==='manager-auth-v1.js'){
  source=replace(source,'    return body.session;',`    const session = body.session;
    const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
    if (typeof session !== 'object' || Array.isArray(session) || Object.keys(session).sort().join('|') !== 'account_id|member_id|role' ||
        !uuid(session.account_id) || !uuid(session.member_id) || !['owner','manager','co_manager'].includes(session.role)) {
      const error = new Error('MANAGER_SESSION_RESPONSE_INVALID'); error.code = error.message; throw error;
    }
    // DTO compatibility only; permission/current-authority verification remains on the server.
    return session;`);
  source=replace(source,`      const e = new Error('LOGIN_INVALID');
      e.code = 'LOGIN_INVALID';`, `      const code = response.status === 429 ? 'LOGIN_RATE_LIMITED' : [400,401].includes(response.status) ? 'LOGIN_INVALID' : 'LOGIN_UNCONFIRMED';
      const e = new Error(code);
      e.code = code;`);
  source=replace(source,`        setStatus('Email o contraseña incorrectos.', 'error');`,`        setStatus('No pudimos validar el ingreso. Revisá el correo, la contraseña y el estado de tu cuenta.', 'error');
      } else if (error && error.code === 'LOGIN_RATE_LIMITED') {
        setStatus('Se alcanzó el límite temporal de intentos. Esperá antes de volver a ingresar.', 'error');`);
 }
 if(name==='manager-invite-v1.js'){
  source=replace(source,`      }).then(async response => ({response, body:await response.json()}));`, `      }).then(async response => {
        // Deny the CURRENT session at headers, without waiting for JSON. This
        // never resolves a previous mutation or clears its pending marker.
        if (response.status === 401 && current()) window.dispatchEvent(new Event('cheveni-manager-session-denied'));
        return {response, body:await response.json()};
      });`);
 }
 return source;
}
function compose({baseline=false}={}){
 const files=new Map(),pins=[],logs=[];
 const vfs={mkdirSync(){},existsSync:p=>files.has(p),readFileSync:p=>{if(!files.has(p))throw Error('MISSING_VIRTUAL_FILE '+p);return files.get(p)},writeFileSync:(p,s)=>files.set(p,String(s))};
 const gate=require(path.join(ROOT,'manager-legal-publication-gate-v1.cjs')).legalPublicationGate(ROOT);
 if(gate.approved!==false)throw Error('LEGAL_GATE_MUST_REMAIN_HELD');
 for(const name of generators){
  const original=fs.readFileSync(path.join(ROOT,name),'utf8');pins.push({path:name,sha256:crypto.createHash('sha256').update(original).digest('hex')});
  const code=baseline?original:patch(name,original),module={exports:{}};
  vm.runInNewContext(code,{__dirname:'/qa-source',module,exports:module.exports,console:{log:s=>logs.push(String(s))},require:n=>{
   if(['fs','node:fs'].includes(n))return vfs;if(['path','node:path'].includes(n))return path;
   if(n==='./manager-build-config.cjs')return {managerBuildConfig:()=>config};
   if(n==='./manager-legal-publication-gate-v1.cjs')return {legalPublicationGate:()=>gate};
   throw Error('UNREVIEWED_GENERATOR_IMPORT '+n);
  }},{timeout:2000,filename:name});
  if(name==='manager-v1.js')module.exports({out:'/qa-source/dist'});
 }
 const generated=Object.fromEntries([...files].map(([p,s])=>[p.replace('/qa-source/dist/',''),s]));
 return {generated,pins,logs,legalPublication:gate,actualAuthVerified:false,backendAuthorizationSimulated:false,operationalApproval:false};
}
module.exports={compose,patch,config};
