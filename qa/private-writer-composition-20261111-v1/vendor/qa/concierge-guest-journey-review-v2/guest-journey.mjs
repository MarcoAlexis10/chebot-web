// Composition-only guest views. No sender, network client, case read or mutation.
import {record} from '../contract-v1/codec.mjs';
import {createGuestPresentationReview} from '../concierge-guest-presentation-review-v1/presentation.mjs';

const flags=Object.freeze({fixtureOnly:true,guestAccessEnabled:false,codesAllowed:false,
 channelConnectedVerified:false,humanConsentVerified:false,operationalApproval:false,betaDecision:'NO-GO'});
const actions=new Set(['overview','assistance','incident','manager_request']);
const copy={
 es:{overview:'Revisión de estadía',assistance:'Consultá las indicaciones aprobadas de tu estadía.',
  incident:'La atención humana debe revisar el incidente.',manager_request:'La solicitud debe revisarse con el manager.'},
 en:{overview:'Stay review',assistance:'Check the approved guidance for your stay.',
  incident:'Human support needs to review the incident.',manager_request:'The manager needs to review the request.'}
};

export function createGuestJourneyReview({readObservation,...options}={}) {
 if(typeof readObservation!=='function')throw Error('GUEST_OBSERVATION_PORT_REQUIRED');
 const presentation=createGuestPresentationReview({...options,async readAuthority(request){
  const row=record(await readObservation(request),['phone','consumption']);
  const current=record(row.consumption,['invitationId','stayId','stayMemberId','sessionId',
   'reservationRevision','invitationConsumed','memberActive','revocationPending','stayStatus']);
  const phone=record(row.phone,['authority','binding','scope','window']);
  const binding=phone.binding;
  if(current.invitationId!==request.invitationId||current.stayId!==request.stayId
     ||current.sessionId!==request.sessionId||current.invitationConsumed!==true
     ||current.memberActive!==true||current.revocationPending!==false
     ||!['scheduled','active'].includes(current.stayStatus)
     ||current.stayMemberId!==Object.getOwnPropertyDescriptor(binding,'stayMemberId')?.value
     ||current.reservationRevision!==Object.getOwnPropertyDescriptor(binding,'reservationRevision')?.value)
   throw Error('GUEST_STAY_OBSERVATION_HELD');
  return phone;
 }});
 return Object.freeze({
  async view(token,selection,{action='overview',locale='es',signal}={}){
   if(!actions.has(action)||!Object.hasOwn(copy,locale))return Object.freeze({screen:'CONCIERGE_HELD',...flags});
   const view=await presentation.stay(token,selection,signal);
   if(view.screen==='CONCIERGE_HELD'||action==='overview')return view;
   if(view.screen==='PREARRIVAL')return view;
   return Object.freeze({screen:'ACTIVE_REVIEW',copy:copy[locale][action],
    actionState:action==='assistance'?'APPROVED_PUBLIC_GUIDANCE':'HUMAN_REVIEW_REQUIRED',...flags});
  },
  free(){return presentation.free();}
 });
}
