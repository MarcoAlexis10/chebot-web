// Successor over the PINNED original SQL port. No connection/client/default IO.
import {record} from './vendor/qa/contract-v1/codec.mjs';
import {backendPin} from './vendor/qa/cheveni-beta-release-candidate-v1/gateway-journal-v1/transport-identity.mjs';
import {createWriterSqlPorts} from './vendor/qa/cheveni-beta-release-candidate-v1/gateway-journal-v1/sql-ports.mjs';

export function createIndependentWriterPorts(input){
 const {writer,reader}=record(input,['writer','reader']);
 const keys=['transact','newRequestId','expectedBackend','remainingMs'];
 const w=record(writer,keys),r=record(reader,keys);
 const wb=backendPin(w.expectedBackend),rb=backendPin(r.expectedBackend);
 // This is the exact client named by the existing private contract, NOT the
 // DEFINER owner or a new grant/role. Native17 may still refuse its profile.
 if(!wb||!rb||[wb,rb].some(b=>b.sessionUser!=='cheveni_writer_client_v1'||b.currentUser!=='cheveni_writer_client_v1')
  ||wb.database!==rb.database||wb.pid===rb.pid||w.transact===r.transact
  ||[w,r].some(p=>['transact','newRequestId','remainingMs'].some(k=>typeof p[k]!=='function')))
  throw Error('INDEPENDENT_MINIMUM_PRIVILEGE_CONNECTIONS_REQUIRED');
 const writes=createWriterSqlPorts({...w,expectedBackend:wb});
 const reads=createWriterSqlPorts({...r,expectedBackend:rb});
 // Each original port verifies its OWN native-backend tuple and COMMIT/IDLE
 // envelope. Different configured PIDs are a contract, not host attestation.
 return Object.freeze({inspect:request=>reads.inspect(request),
  write:request=>writes.write(request),readback:request=>reads.readback(request)});
}
