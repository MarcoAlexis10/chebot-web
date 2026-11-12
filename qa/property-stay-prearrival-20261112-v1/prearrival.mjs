// Constrained public-text vectors ONLY. No source callback, loader or guest route.
import {record,array,isUuid} from '../private-writer-composition-20261111-v1/vendor/qa/contract-v1/codec.mjs';
const flags={fixtureOnly:true,held:true,guestAccessEnabled:false,codesAllowed:false,sourceApprovalAccredited:false,actualAuthVerified:false,actualSqlVerified:false,operationalApproval:false,betaDecision:'NO-GO'};
// Reuses the public guide copy of the existing presentation contract. There is
// no arbitrary per-property welcome text, address, link, phone, frame or secret.
const catalog=Object.freeze({public_guide:'Prepará tu llegada con la guía pública de CABA.',free_guide:'Guía pública de CABA'});
const held=()=>Object.freeze({screen:'PREARRIVAL_HELD',...flags});
const positive=x=>Number.isSafeInteger(x)&&x>0;
export function previewPrearrivalVector(input){
 try{
  const v=record(input,['mode','nowMs','request','binding','source']),q=record(v.request,['userId','sessionId','accountId','propertyId','stayId','stayMemberId','invitationId']);
  if(v.mode!=='OFFLINE_VECTOR'||!Number.isSafeInteger(v.nowMs)||v.nowMs<0||!Object.values(q).every(isUuid))throw Error();
  const b=record(v.binding,[...Object.keys(q),'identityGeneration','reservationRevision','verifiedAtMs','expiresAtMs','checkInMs','checkoutMs','revoked']);
  if(Object.keys(q).some(k=>q[k]!==b[k])||!positive(b.identityGeneration)||!positive(b.reservationRevision)||b.revoked!==false||!['verifiedAtMs','expiresAtMs','checkInMs','checkoutMs'].every(k=>Number.isSafeInteger(b[k])&&b[k]>=0)||b.verifiedAtMs>v.nowMs||b.expiresAtMs<=v.nowMs||b.checkInMs>=b.checkoutMs||v.nowMs>=b.checkoutMs)throw Error();
  const s=record(v.source,['accountId','propertyId','stayId','identityGeneration','reservationRevision','templateKeys']);
  if(['accountId','propertyId','stayId','identityGeneration','reservationRevision'].some(k=>s[k]!==b[k]))throw Error();
  const keys=array(s.templateKeys,2);if(keys.length!==1||keys[0]!=='public_guide')throw Error();
  // This preview can NEVER serve private access during the stay. Another port
  // still needs current authority, restrictions, consent, SQL and legal guards.
  if(v.nowMs>=b.checkInMs)return Object.freeze({screen:'PRIVATE_WINDOW_PORT_HELD',...flags});
  return Object.freeze({screen:'PREARRIVAL_PUBLIC_TEXT_REVIEW_ONLY',copy:catalog.public_guide,...flags});
 }catch{return held();}
}
export function freeGuidePreview(){return Object.freeze({screen:'CHE_VENI_FREE',copy:catalog.free_guide,...flags});}
