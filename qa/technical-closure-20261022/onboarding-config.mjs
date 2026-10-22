// Offline configuration contract, not an SMTP connection or legal approval.
const DEV='https://tyvwgsdzqipusodxtydv.supabase.co';
const fail=()=>{throw Error('ONBOARDING_CONFIGURATION_REJECTED');};
function origin(v){try{const u=new URL(v);if(u.protocol!=='https:'||u.origin!==v||u.username||u.password||u.port||u.hostname.endsWith('.supabase.co'))fail();return u.origin;}catch{fail();}}
export function reviewOnboardingConfiguration(c){
 if(!c||Object.getPrototypeOf(c)!==Object.prototype||Object.keys(c).sort().join('|')!==['webOrigin','apiOrigin','supabaseOrigin','redirect','providerReference','smtpHost','smtpPort','tlsMode','sender','hourlyLimit'].sort().join('|'))fail();
 const web=origin(c.webOrigin),api=origin(c.apiOrigin);
 if(web===api||c.supabaseOrigin!==DEV||c.redirect!==web+'/manager/reset-password/'||!/^existing-provider:[a-z0-9-]{1,60}$/.test(c.providerReference)||!/^([a-z0-9]+[a-z0-9-]*\.)+[a-z]{2,}$/.test(c.smtpHost)||!/^\S+@[^@\s]+\.[^@\s]+$/.test(c.sender)||!Number.isSafeInteger(c.hourlyLimit)||c.hourlyLimit<1||!((c.smtpPort===465&&c.tlsMode==='IMPLICIT_TLS')||(c.smtpPort===587&&c.tlsMode==='REQUIRED_STARTTLS')))fail();
 return {offlineShapeValid:true,sendAuthorized:false,deliveryVerified:false,legalApproved:false,configurationInstalled:false,
  pending:['owner-existing-provider/sender verification','DNS where applicable','TLS and quota evidence','private custody','exact managed Auth/site/redirect configuration','authorized controlled delivery and reset test']};
}
