// Fixed local process fixture, never accepts a host, SQL, credential or executable.
const modes=new Set(['ok','late-nonzero','stderr','hang','large','stdout-closed-hang']);
const mode=process.argv[2];if(!modes.has(mode))process.exit(61);
process.stdout.write(Buffer.from('PGDMP_FICTIONAL_PROCESS_FIXTURE'));
if(mode==='late-nonzero'){setTimeout(()=>process.exit(9),80);}
if(mode==='stderr'){process.stderr.write('FICTIONAL_SECRET_MUST_NOT_BE_LOGGED');}
if(mode==='hang'){setTimeout(()=>process.exit(0),10000);}
if(mode==='large'){process.stdout.write(Buffer.alloc(1024*1024,7));}
if(mode==='stdout-closed-hang'){process.stdout.end();setTimeout(()=>process.exit(0),2000);}
