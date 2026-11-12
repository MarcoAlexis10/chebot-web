'use strict';
// Static integrity/source verification; no test count, Auth, SQL or browser.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const web=path.resolve(__dirname,'../..'),parent=path.dirname(web);
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const pins=require('./SOURCE-PINS.json');let sources=0,oldScripts=0;
for(const p of pins.sources){const root=p.repo==='web'?web:path.join(parent,'backend');const b=fs.readFileSync(path.join(root,p.path));if(digest(b)!==p.sha256)throw Error('SOURCE_CHANGED '+p.path);sources++;}
const manifest=require('./GENERATED-MANIFEST.json');
for(const f of manifest.files){const b=fs.readFileSync(path.join(__dirname,f.path));if(b.length!==f.bytes||digest(b)!==f.sha256)throw Error('GENERATED_DRIFT '+f.path);
 if(f.path.endsWith('.html')){const s=b.toString();if(!s.includes("connect-src 'none'")||!s.includes("form-action 'none'")||/<form(?! inert)/.test(s))throw Error('INERT_POLICY_MISSING '+f.path);}
 const old=path.join(web,'qa/founder-journey-20261112-v1',f.path);
 if(/\.(js|css)$/.test(f.path)&&fs.existsSync(old)){if(!b.equals(fs.readFileSync(old)))throw Error('SHARED_SCRIPT_CHANGED '+f.path);oldScripts++;}
}
if(manifest.legalPublication.approved!==false||manifest.actualAuthVerified!==false||manifest.browserExecuted!==false||manifest.sqlExecuted!==false||manifest.operationalApproval!==false)throw Error('RETAINED_FLAGS_CHANGED');
console.log(JSON.stringify({classification:'STATIC_BYTES_AND_HTML_POLICY_ONLY',sourcesMatched:sources,generatedFilesMatched:manifest.files.length,unchangedPriorScriptsAndStyles:oldScripts,legalPublicationApproved:false,browserExecuted:false,sqlExecuted:false,actualAuthVerified:false,operationalApproval:false,betaDecision:'NO-GO'}));
