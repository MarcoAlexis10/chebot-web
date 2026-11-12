'use strict';
// A retained offline artifact, never a server/build hook. Writes this QA folder only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {compose}=require('./compose.cjs');
const csp="default-src 'none'; base-uri 'none'; object-src 'none'; connect-src 'none'; form-action 'none'; img-src 'none'; font-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
function materialize(){
 const result=compose(),target=path.join(__dirname,'generated'),files=[];
 for(const [relative,original] of Object.entries(result.generated)){
  if(!/^manager\/[a-z0-9/.-]+$/.test(relative)||relative.includes('..'))throw Error('QA_PATH_HELD');
  let content=original;
  if(relative.endsWith('.html')){
   content=content.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/g,'');
   content=content.replace(/<link\b[^>]*href="https?:[^>]*>/gi,'');
   content=content.replace(/<head>/,`<head><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${csp}">`);
   content=content.replace(/<form\b/g,'<form inert data-qa-held="true"');
   content=content.replace(/(<body[^>]*>)/,'$1<p role="status" style="padding:16px;background:#fff6dc;color:#16302d">QA offline retenida. No ingreses datos reales. Sin acceso a servicios; Beta V1 NO-GO.</p>');
  }
  const file=path.join(target,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);
  files.push({path:'generated/'+relative,bytes:Buffer.byteLength(content),sha256:crypto.createHash('sha256').update(content).digest('hex')});
 }
 const manifest={sourceWeb:'426eae627154f5bff011335d1c5e688e32ca7d59',sourceBackend:'9beb837a621f9a8f06601043afa64b3bba317cb5',generators:result.pins,files,
  legalPublication:result.legalPublication,networkPolicy:"connect-src 'none'",allFormsInert:true,configuredOrigins:'FICTIONAL .invalid ONLY',
  actualAuthVerified:false,backendAuthorizationSimulated:false,browserExecuted:false,sqlExecuted:false,nativeAuthorization:false,operationalApproval:false,betaDecision:'NO-GO'};
 fs.writeFileSync(path.join(__dirname,'GENERATED-MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if(require.main===module)console.log(JSON.stringify({files:materialize().files.length,servicesStarted:0,browserExecuted:false,betaDecision:'NO-GO'}));
module.exports={materialize};
