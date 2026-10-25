const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../../..');
for(const [file,suffix] of [['manager-knowledge-v1.js','Knowledge'],['manager-requests-v1.js','Requests'],['manager-incidents-v1.js','Incidents']])test(suffix+' ignores an old page response and reloads on back-cache restoration',async()=>{
 const source=fs.readFileSync(path.join(root,file),'utf8'),start=source.indexOf('  let lastLoadedToken = null;'),end=source.indexOf('\n})();',start);
 assert.ok(start>0&&end>start);const helperStart=source.indexOf('  function readSectionToken()'),helperEnd=source.indexOf('  async function loadManager'+suffix,helperStart);
 assert.ok(helperStart>0&&helperEnd>helperStart);
 const script=source.slice(helperStart,helperEnd)+source.slice(start,end),events=new Map(),pending=[],rendered=[];
 const context={TOKEN_KEY:'token',authScreen:null,document:{body:{classList:{contains:()=>false}}},sessionStorage:{getItem:()=> 'FICTIONAL_SAME_SESSION'},window:{addEventListener:(k,f)=>events.set(k,f)},MutationObserver:class{observe(){}},
  ['loadManager'+suffix]:()=>new Promise(r=>pending.push(r)),['render'+suffix]:items=>rendered.push(items),['render'+suffix+'Error']:()=>assert.fail('unexpected failure')};
 vm.compileFunction(script,Object.keys(context))(...Object.values(context));assert.equal(pending.length,1);
 assert.ok(events.has('pagehide'),'pagehide must invalidate synchronously, without a MutationObserver callback');events.get('pagehide')();
 events.get('pageshow')();assert.equal(pending.length,2);
 pending[0](['FICTIONAL_OLD']);for(let n=0;n<8;n++)await Promise.resolve();assert.equal(rendered.length,0);
 pending[1](['FICTIONAL_FRESH']);for(let n=0;n<8;n++)await Promise.resolve();assert.equal(rendered.length,1);assert.equal(rendered[0][0],'FICTIONAL_FRESH');
});
