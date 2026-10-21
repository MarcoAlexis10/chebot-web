import {packageLab} from './package-lab.mjs';
try{console.log(JSON.stringify(await packageLab()));console.log('PACKAGE_SMOKE_CLEANUP_OK');}
catch(e){console.error(JSON.stringify({ok:false,code:e.message,integralRecoveryVerified:false}));process.exitCode=1;}
