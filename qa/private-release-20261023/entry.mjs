import path from 'node:path';import {fileURLToPath} from 'node:url';
import {verifyPreparedBundle} from './integrity.mjs';import {POLICY,requireRealAuthorization} from './policy.mjs';
export async function main(args=process.argv.slice(2)){
 const verified=await verifyPreparedBundle(path.dirname(fileURLToPath(import.meta.url)));
 if(args.length===0)return {result:'PRIVATE_RELEASE_PREPARED_LOCKED',...verified,remoteConnectionEnabled:false,realCaptureExecuted:false,integralRecoveryVerified:false};
 if(!['capture','restore','verify-copy'].includes(args[0])||args.length!==2)throw Error('PRIVATE_RELEASE_COMMAND_REJECTED');
 requireRealAuthorization(); // Before config file, credential or Docker access.
 const r=await import('./runtime.mjs');
 const result=args[0]==='capture'?await r.executeRealCapture(args[1]):args[0]==='restore'?await r.executeRealRestore(args[1]):await r.executeRealCopyVerification(args[1]);
 // Never print raw results, paths, rows, provider text or credentials.
 return {result:'AUTHORIZED_PRIVATE_OPERATION_COMPLETED',integralRecoveryVerified:false,operationalApproval:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().then(r=>process.stdout.write(JSON.stringify(r)+'\n')).catch(e=>{process.stderr.write(/^(REAL_OPERATION_LOCKED|RELEASE_|PRIVATE_RELEASE_)/.test(e.message)?e.message+'\n':'PRIVATE_OPERATION_FAILED__DETAILS_REDACTED\n');process.exitCode=1;});
}
