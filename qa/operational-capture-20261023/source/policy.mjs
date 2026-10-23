// Owner authorization of 2026-10-23. This is NOT a portable CI permission.
export const DEV='tyvwgsdzqipusodxtydv';
export const AUTHORIZATION='CHEVENI-DEV-ONE-CAPTURE-20261023';
export const POLICY=Object.freeze({release:'CHEVENI_ASUS_ONE_CAPTURE_V1',devEnabled:true,
 realDataApproved:true,allowSends:false,allowInstall:false,maximumCaptures:1});
let armed=false;
export function validateExecutionContext(c){
 if(c.platform!=='win32'||!c.inputTTY||!c.outputTTY||c.ci||c.remoteSession||
 !/ASUS|ASUSTeK/i.test(c.manufacturer)||!/^[a-f0-9]{64}$/.test(c.machineBinding)||
 c.authorization!==AUTHORIZATION||c.project!==DEV)throw Error('ASUS_LOCAL_OWNER_SESSION_REQUIRED');
 return true;
}
export function armLocalSession(context){
 validateExecutionContext(context);
 if(process.platform!=='win32'||!process.stdin.isTTY||!process.stdout.isTTY||
 ['CI','GITHUB_ACTIONS','CODESPACES','SSH_CONNECTION','SSH_CLIENT','SSH_TTY','CODEX_APPS_MCP_URL'].some(k=>process.env[k])||
 /^RDP-/i.test(process.env.SESSIONNAME??''))throw Error('ASUS_LOCAL_OWNER_SESSION_REQUIRED');
 armed=true;
}
export function requireRealAuthorization(){if(!armed)throw Error('REAL_OPERATION_LOCKED__LOCAL_ASUS_SESSION_REQUIRED');}
