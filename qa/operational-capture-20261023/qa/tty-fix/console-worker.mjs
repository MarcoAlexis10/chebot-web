// Synthetic Windows console regression ONLY. No capture/source/Docker imports.
import {createInterface} from 'node:readline/promises';
import {askMetadata} from '../../source/menu-input.mjs';
import {readHidden,collectPrivateInputs} from '../../source/private-input.mjs';
const mode=process.argv[2],snapshot=()=>({inputTTY:Boolean(process.stdin.isTTY),outputTTY:Boolean(process.stdout.isTTY),setRawMode:typeof process.stdin.setRawMode,data:process.stdin.listenerCount('data'),dataNames:process.stdin.listeners('data').map(f=>f.name||'anonymous'),keypress:process.stdin.listenerCount('keypress'),raw:Boolean(process.stdin.isRaw)});
const report=r=>console.log('\nCV_TTY_RESULT:'+JSON.stringify({nodeVersion:process.versions.node,...r}));
// Exact previous menu function from incident source/entry.mjs at 5b033d2.
async function legacyAsk(text){const r=createInterface({input:process.stdin,output:process.stdout,terminal:true,historySize:0});try{return (await r.question(text)).trim();}finally{r.close();}}
try{
 const before=snapshot();
 if(mode==='non-tty'){
  let code;try{await askMetadata('Menu: ');}catch(e){code=e.message;}
  report({mode,before,code,sourceConnected:false});
 }else{
  const ask=mode==='legacy'?legacyAsk:askMetadata,menus=mode==='legacy'?2:6;
  for(let i=0;i<menus;i++){process.stdout.write('CV_MENU_'+i+': ');const v=await ask('metadata> ');if(v!=='FICTIONAL_MENU')throw Error('FICTIONAL_MENU_MISMATCH');}
  const afterMenus=snapshot();
  let code='NONE',credentialsMatched=false,foreignPreserved=false;
  if(mode==='foreign'){
   const foreign=()=>{};process.stdin.on('data',foreign);
   try{await readHidden('databasePassword');}catch(e){code=e.message;}
   foreignPreserved=process.stdin.listeners('data').includes(foreign);
   process.stdin.removeListener('data',foreign); // ONLY the fixture-owned listener.
  }else if(mode==='cancel'||mode==='timeout'){
   try{await readHidden('databasePassword',{timeoutMs:mode==='timeout'?300:10000});}catch(e){code=e.message;}
  }else{
   try{const c=await collectPrivateInputs();credentialsMatched=c.password==='FICTIONAL_PASSWORD_TTY_20261024'&&c.passphrase==='FICTIONAL_RECOVERY_PHRASE_ONLY_20261024';c.password='';c.passphrase='';}catch(e){code=e.message;}
  }
  report({mode,before,afterMenus,afterHidden:snapshot(),code,credentialsMatched,foreignPreserved,sourceConnected:false});
 }
}catch{report({mode,fixtureFailed:true,sourceConnected:false});process.exitCode=1;}
