// Exact restricted business mapping to an existing unapplied private capture.
// Only the original parser runs; no original positive-ACK adapter is created.
import fs from 'node:fs';import vm from 'node:vm';
import {record,isUuid,isHex} from '../private-writer-composition-20261111-v1/vendor/qa/contract-v1/codec.mjs';
import {out} from '../functional-night-20261112-v1/core.mjs';import {createDomainAbiReview} from './evidence-binding.mjs';
const original=fs.readFileSync(new URL('./property-review.original.source.txt',import.meta.url),'utf8');
const script=original.replace(/^import[^\n]+\n/m,'').replace(/^export /gm,'')+'\nparsePrivatePropertyCapture;';
const parse=vm.runInNewContext(script,{record,isUuid,isHex},{timeout:1000,filename:'PINNED_NATIVE_PROPERTY_PARSER_ONLY'});
export function reviewPropertyCapture(input){
 try{
  const v=record(input,['mode','boundInput','privateCapture']);if(v.mode!=='OFFLINE_VECTOR'||v.boundInput.domain!=='property'||v.boundInput.request.command.operation!=='property.draft.create')throw Error();
  const r=createDomainAbiReview(),cap=r.compile(v.boundInput);if(!cap.handle)throw Error();r.release(cap.handle);
  const raw=structuredClone(parse(v.privateCapture)),q=v.boundInput.request.command,p=q.payload.configuration,a=raw.privateAddress;
  if(raw.input.intentId!==q.intentId||q.payload.buildingId!==null)throw Error('CAPTURE_TARGET');
  const nativeAddress=a.street+' '+a.number,nativeUnit=a.floor===null&&a.unit===null?null:[a.floor===null?null:'Piso '+a.floor,a.unit===null?null:'Unidad '+a.unit].filter(Boolean).join(' / ');
  const missing=[];for(const [k,value]of Object.entries({internalName:'Primera propiedad',propertyType:'apartment',address:nativeAddress,floorOrUnit:nativeUnit,cityLabel:'CABA',language:'es',defaultCheckIn:'15:00',defaultCheckOut:'10:00'}))if(p[k]!==value)missing.push(k);
  if(missing.length)return out('PROPERTY_CAPTURE_CONFIGURATION_NOT_REPRESENTABLE',{unrepresentedConfigurationFields:Object.freeze(missing),rawAddressReturned:false,dispatchPlan:null});
  return out('PROPERTY_CAPTURE_BUSINESS_SUBSET_REVIEWED_HELD',{primitiveExistsInSource:true,nativeOperation:'property_create',sourceVersion:raw.input.contract,preservedConfigurationFields:Object.freeze(Object.keys(p)),privateAddressReturned:false,sourceDefaultsRequireCatalogProof:true,sourceAtomicSlotRequiresNativeProof:true,protectedProducerPresent:false,mutationKeyCustodyPresent:false,requiredAuditAndEntityVersionStillMissing:true,sourceAddressCaptureRetentionAccredited:false,readerPrincipalReadOnlyAccredited:false,externalCommitVerified:false,dispatchPlan:null});
 }catch{return out('PROPERTY_CAPTURE_BINDING_INCOMPATIBLE_HELD',{rawAddressReturned:false,dispatchPlan:null});}
}
export function createProtectedPropertyCapture(){return Object.freeze({write:async()=>out('PROPERTY_CAPTURE_PROTECTED_PRODUCER_MISSING',{receipt:null,dispatchPlan:null}),read:async()=>out('UNKNOWN',{reconciliationRequired:true,externalCommitVerified:false})});}
