// Composition of existing held ports; no new gateway or operational build hook.
import {createFunctionalHeldCandidate} from '../functional-night-20261112-v1/work-items.mjs';
import {createProtectedDomainPorts,createDomainAbiReview} from './evidence-binding.mjs';
import {createProtectedPropertyCapture} from './property-capture-adapter.mjs';
import {createProtectedPublicCatalogProducer} from './public-catalog-producer.mjs';
export function createContractsCandidate(){
 const existing=createFunctionalHeldCandidate(),domain=createProtectedDomainPorts();
 return Object.freeze({property:domain.property,propertyCapture:createProtectedPropertyCapture(),stay:domain.stay,catalog:createProtectedPublicCatalogProducer(),incident:existing.incident,request:existing.request,reconcile:existing.reconcile,reconcileIncident:existing.reconcileIncident});
}
// Opt-in model review is a separate explicit entry, never the protected ports.
export const createOfflineContractReview=createDomainAbiReview;
