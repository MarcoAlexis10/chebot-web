// Offline compilation of the real-source client profile. No process, secret,
// network or filesystem input: use the existing private CA checker separately.
import {prepareProvisional} from '../technical-closure-20261022/approved/prepare-provisional.mjs';
import {IMAGE} from '../technical-closure-20261022/qa/pg-fixture.mjs';
const PROBE="begin read only;select json_build_object('database',current_database(),'user',current_user,'version',current_setting('server_version'),'readOnly',current_setting('transaction_read_only')='on','tls',(select ssl from pg_stat_ssl where pid=pg_backend_pid()));rollback;";
const INVENTORY="begin read only;select json_build_object('schemas',(select json_agg(nspname order by nspname) from pg_namespace where nspname !~ '^pg_' and nspname<>'information_schema'),'tables',(select json_agg(json_build_object('schema',n.nspname,'name',c.relname,'rls',c.relrowsecurity,'forcedRls',c.relforcerowsecurity,'kind',c.relkind) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname !~ '^pg_' and n.nspname<>'information_schema' and c.relkind in ('r','p','f','v','m')),'extensions',(select json_agg(json_build_object('name',extname,'version',extversion) order by extname) from pg_extension));rollback;";
export function compilePrivateDevReleasePlan(input){
 const base=prepareProvisional(input);
 const profile={
  format:'CHEVENI_PRIVATE_RELEASE_PREPARATION_V3',source:base.source,clientImage:IMAGE,
  credentialPolicy:{input:'FUTURE_HIDDEN_LOCAL_INPUT_ONLY',channel:'STDIN_TO_TMPFS_PGPASSFILE',fileMode:'0600',directoryMode:'0700',argv:false,environment:false,hostPlaintextFile:false,logs:false},
  clientPolicy:{localDockerOnly:true,readOnlyRoot:true,hostBinds:false,publishedPorts:false,persistentClientVolumes:false,dropAllCapabilities:true,noNewPrivileges:true,imagePullAtCapture:false,automaticRetries:0},
  connection:{host:base.source.host,port:5432,database:'postgres',user:base.source.user,sslMode:'verify-full',rootCaSha256:base.source.caSha256,channelBinding:'require',gssEncryption:'disable',connectTimeoutSeconds:3},
  plannedCommands:{probe:{program:'psql',args:['-X','-qAt','--no-password','--set','ON_ERROR_STOP=1','--command',PROBE]},privateInventory:{program:'psql',args:['-X','-qAt','--no-password','--set','ON_ERROR_STOP=1','--command',INVENTORY]},dump:{program:'pg_dump',args:['--format=custom','--no-password','--lock-wait-timeout=2s','--dbname=postgres']}},
  bounds:base.bounds,formatSeparation:'CVP3/CVK5; rejects CVP1/CVP2/integral formats',
  inventorySnapshotRelationship:'SEPARATE_READONLY_TRANSACTION__NOT_THE_DUMP_SNAPSHOT',
  privateInventoryRequired:true,archiveTocAndActualRestoreCoverageRequired:true,
  executionExposed:false,remoteConnectionEnabled:false,ownerAuthorizationRequired:true,
  realCaptureExecuted:false,integralRecoveryVerified:false,canOpenGuestAccess:false,
  pending:['private CA trust and server identity','authorized release and local private form','private capture and closed restore','custody and current independent revocations','Drive private roundtrip'],
 };
 return Object.freeze(profile);
}
