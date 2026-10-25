// Disposable, offline manager-only generation. Never executes browser fetches.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),owned=fs.mkdtempSync(path.join(os.tmpdir(),'cheveni-manager-held-'));
const files=['manager-v1.js','manager-build-config.cjs','manager-legal-publication-gate-v1.cjs','manager-auth-v1.js','manager-knowledge-v1.js','manager-requests-v1.js','manager-incidents-v1.js','manager-request-actions-v1.js','manager-incident-actions-v1.js','manager-invite-v1.js','manager-password-recovery-v1.js','manager-signup-v1.js','manager-signup-admin-v1.js'];
let result;
try{
 for(const file of files)fs.copyFileSync(path.join(root,file),path.join(owned,file));
 const env={PATH:'/usr/bin:/bin',MANAGER_API_ORIGIN:'https://fictional-api.example.invalid',MANAGER_WEB_ORIGIN:'https://fictional-manager.example.invalid',SUPABASE_URL:'https://tyvwgsdzqipusodxtydv.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_FICTIONAL_LOCAL_ONLY'};
 const commands=[['-e',"require('./manager-v1.js')({out:require('node:path').join(process.cwd(),'dist')})"],...files.filter(n=>n.endsWith('.js')&&n!=='manager-v1.js').map(n=>[n])];
 for(const args of commands){const r=cp.spawnSync(process.execPath,args,{cwd:owned,env,encoding:'utf8',timeout:10000});assert.equal(r.status,0,'GENERATOR_FAILED '+args.join(' ')+' '+r.stderr);}
 const generated=[];let compiled=0;
 function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,ent.name);if(ent.isDirectory())walk(f);else{
  const b=fs.readFileSync(f),rel=path.relative(path.join(owned,'dist'),f);generated.push({path:rel,sha256:crypto.createHash('sha256').update(b).digest('hex')});
  if(f.endsWith('.js')){new vm.Script(b.toString(),{filename:rel});compiled++;}
  if(f.endsWith('.html'))for(const m of b.toString().matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){if(m[1].trim()){new vm.Script(m[1],{filename:rel+':inline'});compiled++;}}
 }}}
 walk(path.join(owned,'dist'));
 const signup=fs.readFileSync(path.join(owned,'dist/manager/activar/index.html'),'utf8');
 assert.ok(signup.includes('primera estadía real verificada'));assert.ok(signup.includes('un manager y una propiedad en CABA'));
 assert.ok(signup.includes('No hay facturación ni conversión a pago automáticas'));assert.match(signup,/CONCIERGE_SIGNUP_LEGAL_PUBLICATION_APPROVED = false/);
 assert.equal(fs.existsSync(path.join(owned,'manager-concierge-legal-publication-approval.json')),false);
 result={status:'offline_manager_generation_verified_held',generatorsExecuted:commands.length,generatedFiles:generated.length,scriptsCompiled:compiled,generated,serviceConnections:0,browserScriptsExecuted:false,realSignupEnabled:false,operationalApproval:false,decision:'NO-GO'};
}finally{fs.rmSync(owned,{recursive:true,force:true});assert.equal(fs.existsSync(owned),false);if(result)result.cleanupVerified=true;}
console.log(JSON.stringify(result,null,2));
