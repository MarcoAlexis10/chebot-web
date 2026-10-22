// Offline preparation only. No network, child process, credential or capture adapter.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export const DEV = 'tyvwgsdzqipusodxtydv';
const fields = ['project','database','host','port','user','sslMode','caSha256'];
const fail = () => { throw new Error('SOURCE_PLAN_REJECTED'); };
export function prepareProvisional(source) {
  if (!source || Object.getPrototypeOf(source) !== Object.prototype ||
      Object.keys(source).sort().join('|') !== [...fields].sort().join('|')) fail();
  const {project,database,host,port,user,sslMode,caSha256} = source;
  if (project !== DEV || database !== 'postgres' || port !== 5432 ||
      typeof host !== 'string' || typeof user !== 'string' || sslMode !== 'verify-full' ||
      typeof caSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(caSha256) || /^0+$/.test(caSha256)) fail();
  const direct = host === `db.${DEV}.supabase.co` && user === 'postgres';
  const pool = /^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(host) && user === `postgres.${DEV}`;
  if (!direct && !pool) fail();
  // A shape/hash check is not server identity, CA trust or credential verification.
  return {
    format:'CHEVENI_ONLINE_PROVISIONAL_PREPARATION_V1',
    source:{project,database,host,port,user,sslMode,caSha256},
    clientVersion:'17.11',
    futureInvocation:{executable:'pg_dump',shell:false,
      args:['--format=custom','--no-password','--lock-wait-timeout=2s','--dbname=postgres'],
      environment:{PGHOST:host,PGPORT:'5432',PGUSER:user,PGSSLMODE:'verify-full',
        PGOPTIONS:'-c default_transaction_read_only=on -c statement_timeout=30000 -c lock_timeout=2000'},
      privateRuntimeInputs:['PGSSLROOTCERT: validated private file matching caSha256','PGPASSFILE: owner-only temporary file; never argv/stdout'],
      inheritedEnvironment:'DENY_BY_DEFAULT',
      stdout:'private bounded stream into separate provisional encryption envelope',
      stderr:'private memory only; public report uses fixed failure codes'},
    bounds:{maxPlaintextBytes:67108864,totalTimeoutMs:35000,automaticRetries:0},
    exclusions:['GLOBAL_ROLES','VAULT_ROOT','STORAGE_BYTES','EXTERNAL_CONFIGURATION','CURRENT_INDEPENDENT_REVOCATIONS'],
    coverage:'PG_DUMP_SUCCESS_AND_PRIVATE_INVENTORY_REQUIRED__NOT_YET_OBSERVED',
    remoteConnectionEnabled:false,realCaptureApproved:false,captureExecuted:false,
    integralRecoveryVerified:false,operationalApproval:false,writersClosed:false,
    pending:['reviewed private source adapter','specific owner authorization',
      'CA trust and DEV identity verification','private real dump/isolated restore and Drive roundtrip']
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) fail();
    const input = readFileSync(process.argv[2]);
    if(input.length > 4096) fail();
    console.log(JSON.stringify(prepareProvisional(JSON.parse(input)),null,2));
  } catch { console.error('SOURCE_PLAN_REJECTED'); process.exitCode=1; }
}
