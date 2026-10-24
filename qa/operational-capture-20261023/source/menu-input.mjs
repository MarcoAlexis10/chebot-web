// Metadata only; secrets continue to use the unchanged private-input module.
import {createInterface} from 'node:readline/promises';
export async function askMetadata(text,{input=process.stdin,output=process.stdout}={}){
 if(!input.isTTY||!output.isTTY||typeof input.setRawMode!=='function'||input.listenerCount('data'))throw Error('EXCLUSIVE_LOCAL_TTY_REQUIRED');
 // Keep the actual Windows console in cooked mode for public menu lines.
 // terminal:false disables readline's keypress/ANSI editor, NOT the TTY checks
 // above. Thus emitKeypressEvents never installs its persistent onData handler.
 const r=createInterface({input,output,terminal:false,historySize:0,crlfDelay:Infinity});
 try{return (await r.question(text)).trim();}finally{r.close();}
 // close removes this interface's own listeners. Never remove foreign listeners.
}
