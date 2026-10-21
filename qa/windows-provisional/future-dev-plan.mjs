// Pure contract only. This package has no enabled remote connection/capture path.
export const DEV='tyvwgsdzqipusodxtydv';
export function validateFutureSource(p){
 if(!p||p.project!==DEV||p.database!=='postgres'||p.port!==5432)throw Error('DEV_PLAN_INVALID');
 const direct=p.host==='db.'+DEV+'.supabase.co'&&p.user==='postgres';
 const pool=/^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(p.host??'')&&p.user==='postgres.'+DEV;
 if(!direct&&!pool)throw Error('DEV_PLAN_INVALID');
 if(p.sslMode!=='verify-full')throw Error('TLS_VERIFY_FULL_REQUIRED');
 return {shapeValid:true,caVerificationPending:true,networkContacted:false,captureAllowed:false};
}
export function realCapture(){throw Error('REAL_CAPTURE_NOT_AUTHORIZED_IN_THIS_PACKAGE');}
export function preparationPlan(){return {mode:'ONLINE_PROVISIONAL',project:DEV,remoteConnectionEnabled:false,realCaptureApproved:false,integralRecoveryVerified:false,writersClosed:false,
  scope:'ONE_PG_DUMP_CUSTOM_STREAM',futureTls:'verify-full with privately verified CA',roles:'NOT_CAPTURED',vaultRoot:'NOT_CAPTURED',storageBytes:'NOT_CAPTURED',revocations:'NOT_CAPTURED',
  pending:['private source adapter and informed authorization','existing credentials entered locally without logs','CA verification and DEV anchoring','size/timeout and Windows Docker Desktop check','both encrypted files on ASUS and restricted Drive; phrase on paper']};}
