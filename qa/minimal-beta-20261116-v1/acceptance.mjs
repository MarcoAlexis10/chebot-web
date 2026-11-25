// Selection and execution of existing Node-only acceptance cases. No native,
// browser, Auth-provider, HTTP-server or restore executor exists here.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
export const matrix=JSON.parse(fs.readFileSync(path.join(here,'ACCEPTANCE-MATRIX.json'),'utf8'));
const targets=Object.freeze({
 'OFF-PRODUCT-STAYS':{file:'../beta-product-experience-20261124-v1/product-experience.test.cjs',pattern:'^product (stays|late stay)'},
 'OFF-PRODUCT-MESSAGES':{file:'../beta-product-experience-20261124-v1/product-experience.test.cjs',pattern:'^product (QA|work items|planning)'},
 'OFF-PRODUCT-MARKUP':{file:'../beta-product-experience-20261124-v1/product-experience.test.cjs',pattern:'^product (pages|mobile)'},
 'OFF-PROPERTY-DTO':{file:'property-stay-consumers.test.cjs',pattern:'^minimum pilot: original property receipt'},
 'OFF-STAY-DTO':{file:'property-stay-consumers.test.cjs',pattern:'^minimum pilot: original stay DTO'},
 'OFF-REQUEST-DTO':{file:'projector-consumers.test.cjs',pattern:'^minimum pilot: original requests projector'},
 'OFF-INCIDENT-DTO':{file:'projector-consumers.test.cjs',pattern:'^minimum pilot: original incidents projector'},
 'REG-PANEL-CONTEXT':{file:'../pilot-integration-20261112-v1/context.test.cjs',historical:true},
 'REG-SECTION-CONTEXT':{file:'../pilot-integration-20261112-v1/section-context.test.cjs',historical:true},
 'REG-UNKNOWN':{file:'../pilot-integration-20261112-v1/knowledge-deadline.test.cjs',historical:true},
 'REG-INVITE':{file:'../pilot-integration-20261112-v1/invite-bfcache.test.cjs',historical:true}
});
export function validate(){
 const ids=new Set();for(const row of matrix.cases){
  if(!row||typeof row.id!=='string'||ids.has(row.id)||!Array.isArray(row.preconditions)||!row.expected||!row.evidence||!['OFFLINE_NODE','EXTERNAL','HUMAN'].includes(row.layer))throw Error('MATRIX_INVALID');ids.add(row.id);
  if((row.layer==='OFFLINE_NODE')!==Object.hasOwn(targets,row.id))throw Error('MATRIX_EXECUTOR_MISMATCH');
 }
 for(const id of Object.keys(targets))if(!ids.has(id))throw Error('MATRIX_EXECUTOR_UNLISTED');
 return true;
}
export function plan(id,{repeatReason=''}={}){
 validate();const row=matrix.cases.find(r=>r.id===id);if(!row)throw Error('UNKNOWN_CASE');
 if(row.layer!=='OFFLINE_NODE')return {id,status:'BLOCKED_EXTERNAL_OR_HUMAN',executionAllowed:false,expected:row.expected,preconditions:row.preconditions};
 const target=targets[id];if(target.historical&&(!repeatReason.trim()||repeatReason.length>300))throw Error('DIRECT_IMPACT_REASON_REQUIRED');
 const file=path.resolve(here,target.file);
 return {id,status:'PLAN_ONLY',executionAllowed:true,classification:row.verificationKind==='SOURCE_ONLY'?'NODE_SOURCE_CHECK_NOT_BROWSER':'NODE_DOM_SYNTHETIC_NOT_OPERATIONAL',program:'python',
  args:[path.join(root,'web/qa/integral-held-v1/run-isolated.py'),'--','node','--test','--test-reporter=tap',...(target.pattern?['--test-name-pattern='+target.pattern]:[]),file],cwd:root,historical:target.historical===true};
}
export function verifySources(){
 const pins=JSON.parse(fs.readFileSync(path.join(here,'SOURCE-PINS.json'),'utf8'));
 for(const item of pins.sources){const base=path.join(root,item.repository==='chebot-web'?'web':item.repository==='chebot-backend'?'backend':'INVALID');if(base.endsWith('INVALID'))throw Error('SOURCE_REPOSITORY');
  const file=path.resolve(base,item.path);if(!file.startsWith(base+path.sep))throw Error('SOURCE_PATH');
  if(createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==item.sha256)throw Error('SOURCE_DRIFT '+item.path);
 }return pins.sources.length;
}
export function cli(args){
 if(args.length===0||args.length===1&&args[0]==='--list'){validate();return {code:0,output:matrix};}
 if(!['--plan','--run'].includes(args[0])||!args[1]||![2,4].includes(args.length)||args.length===4&&args[2]!=='--repeat-reason')throw Error('USAGE_LIST_PLAN_RUN_ONE_CASE_ONLY');
 const selected=plan(args[1],{repeatReason:args[3]||''});if(!selected.executionAllowed)return {code:3,output:selected};
 if(args[0]==='--plan')return {code:0,output:selected};
 verifySources();
 const result=spawnSync(selected.program,selected.args,{cwd:selected.cwd,encoding:'utf8',timeout:60000,maxBuffer:1024*1024,shell:false});
 // Only fixed test commands and synthetic fixture output, never a supplied
 // command, endpoint, SQL path, authorization flag or free-form reason.
 if(result.stdout)process.stdout.write(result.stdout);if(result.stderr)process.stderr.write(result.stderr);
 return {code:result.status??1,output:{id:selected.id,status:result.status===0?'NODE_CHECK_PASS':'NODE_CHECK_FAIL',classification:selected.classification,operationalApproval:false}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{const r=cli(process.argv.slice(2));console.log(JSON.stringify(r.output));process.exitCode=r.code;}
 catch(error){console.error(JSON.stringify({status:'BLOCKED',error:error.message,operationalApproval:false}));process.exitCode=2;}
}
