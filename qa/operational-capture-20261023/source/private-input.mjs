// Prepared LOCAL-only hidden console input. No CLI, file, network, clipboard or log.
import {StringDecoder} from 'node:string_decoder';
const prompts=Object.freeze({databasePassword:'Credencial existente de la base (entrada oculta): ',recoveryPhrase:'Frase nueva de recuperación, anotada en papel (entrada oculta): ',confirmRecoveryPhrase:'Repetí la frase de recuperación (entrada oculta): '});
export function readHidden(kind,{input=process.stdin,output=process.stdout,timeoutMs=120000}={}){
 if(!Object.hasOwn(prompts,kind)||!input.isTTY||!output.isTTY||typeof input.setRawMode!=='function'||input.listenerCount('data')||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>120000)throw Error('EXCLUSIVE_LOCAL_TTY_REQUIRED');
 return new Promise((resolve,reject)=>{
  const decoder=new StringDecoder('utf8');let value='',finished=false;const wasRaw=Boolean(input.isRaw),wasFlowing=input.readableFlowing;
  function done(error){if(finished)return;finished=true;clearTimeout(timer);input.removeListener('data',data);input.removeListener('end',ended);input.removeListener('error',ended);input.setRawMode(wasRaw);if(!wasFlowing)input.pause();output.write('\n');const result=value;value='';if(error)reject(Error(error));else resolve(result);}
  function ended(){done('PRIVATE_INPUT_INTERRUPTED');}
  function data(bytes){
   const text=decoder.write(bytes);
   for(let i=0;i<text.length;i++){
    const c=text[i];if(c==='\x03'||c==='\x04'){done('PRIVATE_INPUT_INTERRUPTED');return;}
    if(c==='\r'||c==='\n'){
     if(text.slice(i+1).replaceAll('\r','').replaceAll('\n','')!==''){done('PRIVATE_MULTILINE_INPUT_REJECTED');return;}
     if(!value.length){done('PRIVATE_INPUT_REQUIRED');return;}done();return;
    }
    if(c==='\b'||c==='\x7f'){value=Array.from(value).slice(0,-1).join('');continue;}
    if(c<' '){done('PRIVATE_CONTROL_INPUT_REJECTED');return;}
    value+=c;if(value.length>1024){done('PRIVATE_INPUT_TOO_LONG');return;}
   }
  }
  const timer=setTimeout(()=>done('PRIVATE_INPUT_TIMEOUT'),timeoutMs);
  try{input.setRawMode(true);input.on('data',data);input.once('end',ended);input.once('error',ended);output.write(prompts[kind]);input.resume();}
  catch{done('PRIVATE_INPUT_UNAVAILABLE');}
 });
}
export async function collectPrivateInputs(io){
 const password=await readHidden('databasePassword',io),passphrase=await readHidden('recoveryPhrase',io),confirm=await readHidden('confirmRecoveryPhrase',io);
 if(passphrase.length<20||passphrase!==confirm)throw Error('PRIVATE_RECOVERY_PHRASE_CONFIRMATION_FAILED');
 return {password,passphrase};
}
