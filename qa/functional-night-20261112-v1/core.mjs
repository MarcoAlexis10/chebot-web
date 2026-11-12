// QA review helpers, sharing the existing strict descriptor-based codec.
export {record,array,isUuid} from '../private-writer-composition-20261111-v1/vendor/qa/contract-v1/codec.mjs';
export const positive=x=>Number.isSafeInteger(x)&&x>0;
export const instant=x=>typeof x==='string'&&/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
export const flags=Object.freeze({held:true,fixtureOnly:true,actualAuthVerified:false,authorityAccredited:false,sqlExecuted:false,operationalApproval:false,dispatchPerformed:false,automaticRetryAllowed:false,betaDecision:'NO-GO'});
export const out=(state,extra={})=>Object.freeze({state,...extra,...flags});
