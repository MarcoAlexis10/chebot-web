// Execute PINNED reviewed function bodies in a VM whose imports are all fake or
// explicitly memory-only. No Docker binary, filesystem writes or socket imports.
import vm from 'node:vm';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const pins=JSON.parse(await readFile(new URL('./approved-pins.json',import.meta.url)));
export async function approvedCode(name){
 if(!Object.hasOwn(pins,name))throw Error('APPROVED_NAME_REJECTED');
 const text=(await readFile(new URL('../../operational-capture-20261023/source/'+name,import.meta.url),'utf8')).replaceAll('\r\n','\n');
 if(createHash('sha256').update(text).digest('hex')!==pins[name])throw Error('APPROVED_BYTES_CHANGED');return text;
}
export async function loadApproved(name,bindings,{suffix='',rewrite=x=>x}={}){
 const text=await approvedCode(name),context=vm.createContext({Buffer,setTimeout,clearTimeout,performance});
 const module=new vm.SourceTextModule(rewrite(text)+suffix,{context,identifier:'APPROVED_QA_ONLY/'+name});
 await module.link(async specifier=>{
  if(!Object.hasOwn(bindings,specifier))throw Error('QA_IMPORT_REJECTED');
  const exports=bindings[specifier];return new vm.SyntheticModule(Object.keys(exports),function(){for(const [k,v]of Object.entries(exports))this.setExport(k,v);},{context});
 });await module.evaluate();return module.namespace;
}
