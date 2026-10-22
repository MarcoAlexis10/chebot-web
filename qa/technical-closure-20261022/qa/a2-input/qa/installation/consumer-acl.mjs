import {readFileSync} from 'node:fs';

export const consumerContract = JSON.parse(readFileSync(new URL('./consumer-contract.json',import.meta.url),'utf8'));

// Catalog-only verification of the reviewed RPC consumers. No function is
// invoked, no connection is opened and no deployment/installation is approved.
export async function auditConsumerRpcAcl(client) {
  const names = [...consumerContract.serviceRpcs,...consumerContract.verifierRpcs,'concierge_manager_create_stay'];
  const sql = `select p.proname as name,
    pg_catalog.has_schema_privilege('service_role',n.oid,'USAGE') as service_schema,
    pg_catalog.has_schema_privilege('cheveni_evidence_verifier',n.oid,'USAGE') as verifier_schema,
    pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE') as service,
    pg_catalog.has_function_privilege('cheveni_evidence_verifier',p.oid,'EXECUTE') as verifier,
    pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE') as anon,
    pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated,
    exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE') as public_execute
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any($1::text[])`;
  const result = {status:'blocked',operationalApproval:false,issues:[],serviceRpcs:consumerContract.serviceRpcs.length,verifierRpcs:consumerContract.verifierRpcs.length};
  try {
    const {rows} = await client.query(sql,[names]);
    for (const name of names) {
      const found = rows.filter(r => r.name === name);
      if (found.length !== 1) {result.issues.push({name,code:'RPC_MISSING_OR_OVERLOADED'});continue;}
      const row = found[0], independent = consumerContract.verifierRpcs.includes(name), legacy = name === 'concierge_manager_create_stay';
      if (row.public_execute || row.anon || row.authenticated) result.issues.push({name,code:'RPC_BROWSER_EXPOSED'});
      if (row.service !== (!independent && !legacy) || row.verifier !== independent ||
          (!legacy && (independent ? !row.verifier_schema : !row.service_schema))) result.issues.push({name,code:'RPC_CONSUMER_CAPABILITY_MISMATCH'});
    }
    if (!result.issues.length) result.status = 'consumer_rpc_acl_verified';
  } catch {result.issues.push({code:'CONSUMER_RPC_AUDIT_UNAVAILABLE'});}
  return result;
}
