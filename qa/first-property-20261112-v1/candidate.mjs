// Narrow composition of the existing held journey and first-property boundary.
import {createContractsCandidate} from '../functional-contracts-20261112-v1/candidate.mjs';
import {out} from '../functional-night-20261112-v1/core.mjs';
import {createProtectedFirstProperty} from './capture-contract.mjs';
import {createProtectedCaptureReader} from './reconciliation.mjs';
export function createFirstPropertyCandidate(){const prior=createContractsCandidate();return Object.freeze({
 ...prior,propertyCapture:createProtectedFirstProperty(),captureReader:createProtectedCaptureReader(),
 prepareConfiguration:async()=>out('PROPERTY_CONFIGURATION_PREPARATION_HELD',{propertyId:null,receipt:null,entityRevisionAvailable:false,externalCommitVerified:false}),
});}
