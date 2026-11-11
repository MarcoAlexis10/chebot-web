// QA DTOs. There is no sender, property data input, route or commercial authority.
import {createGuestPhoneReview} from '../guest-phone-authority-review-v1/guest-phone.mjs';

const flags={fixtureOnly:true,guestAccessEnabled:false,codesAllowed:false,
 channelConnectedVerified:false,humanConsentVerified:false,operationalApproval:false,betaDecision:'NO-GO'};
const dto=(screen, copy)=>Object.freeze({screen,copy,...flags});
const beforeArrival=dto('PREARRIVAL','Prepará tu llegada con la guía pública de CABA.');
const duringStay=dto('ACTIVE_REVIEW','La ventana ficticia permite revisar los controles de estadía.');
const held=dto('CONCIERGE_HELD','No hay acceso de estadía verificado. Si necesitás ayuda, consultá a la atención humana.');
const free=dto('CHE_VENI_FREE','Guía pública de CABA');

export function createGuestPresentationReview(options) {
 const reviewer=createGuestPhoneReview(options);
 return Object.freeze({
  async stay(presentedToken, selection, signal) {
   const result=await reviewer.review(presentedToken,selection,signal);
   if(result.phoneAuthorityReviewMatched!==true||result.currentSqlReviewMatched!==true) return held;
   switch(result.state){
    case 'PREARRIVAL_REVIEWED':return beforeArrival;
    case 'ACTIVE_CONTRACT_REVIEWED':return duringStay;
    default:return held;
   }
  },
  free(){return free;}
 });
}
