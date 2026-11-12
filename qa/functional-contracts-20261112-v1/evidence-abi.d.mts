/** Uninstalled QA successor ABI. All observations are synthetic, never attestations. */
import type {PropertyReviewInput,StayReviewInput,Held,UUID} from '../functional-night-20261112-v1/lifecycle-abi.d.mts';
export interface Fresh {observedAtMs:number;expiresAtMs:number}
export interface ProviderVector extends Fresh {issuer:string;userId:UUID;sessionId:UUID;sessionRevision:number;revoked:false}
export interface MembershipVector extends Fresh {userId:UUID;sessionId:UUID;accountId:UUID;memberId:UUID;role:'owner'|'manager'|'co_manager';accountStatus:'active'|'testing';memberStatus:'active';identityStatus:'active';authorityRevision:number;restrictionsRevision:number}
export interface RevisionVector extends Fresh {accountId:UUID;propertyId:UUID|null;authorityRevision:number;restrictionsRevision:number;datasetId:UUID;recoveryEpoch:number;inventoryRevision:number}
export interface JurisdictionVector extends Fresh {accountId:UUID;propertyId:UUID|null;designation:'CABA';revision:number}
export interface QuotaVector extends Fresh {accountId:UUID;allocatedCount:number;inventoryRevision:number;revision:number}
export interface BuildingVector extends Fresh {buildingId:UUID;accountId:UUID;status:'active';revision:number}
export interface DecisionVector extends Fresh {reviewRef:UUID;accountId:UUID;propertyId:UUID;reviewedRevision:number;decision:'approve'|'return_to_draft';authorityRevision:number;reviewerMemberId:UUID}
export interface GuestBindingVector extends Fresh {ref:UUID;accountId:UUID;propertyId:UUID;stayId:UUID;identityGeneration:number;status:'current'}
export interface Observations {provider:ProviderVector;memberships:MembershipVector[];restrictions:RevisionVector&{blocked:false};floor:RevisionVector;jurisdiction:JurisdictionVector;quota:QuotaVector;building:BuildingVector|null;decision:DecisionVector|null;guestBinding:GuestBindingVector|null}
export type Input={mode:'OFFLINE_VECTOR';domain:'property';request:PropertyReviewInput;observations:Observations}|{mode:'OFFLINE_VECTOR';domain:'stay';request:StayReviewInput;observations:Observations};
declare const localReview:unique symbol;
/** Instance-local weak handle. It is not a JWT/authority/dispatch capability. */
export interface ReviewHandle {kind:'OFFLINE_DOMAIN_ABI_REVIEW_HANDLE';readonly [localReview]:never}
export interface UntrustedReceipt {intentId:UUID;attemptId:UUID;operation:string;userId:UUID;sessionId:UUID;sessionRevision:number;accountId:UUID;memberId:UUID;propertyId:UUID|null;authorityRevision:number;restrictionsRevision:number;entityRevision:number|null;originalRef:UUID;dispatchRef:UUID;commitRef:UUID;readbackRef:UUID;journalRef:UUID;witnessRef:UUID}
export function createDomainAbiReview():{compile(input:Input):Held&{handle:ReviewHandle|null;protectedProducerPresent:false;originalTrusted:false};describe(handle:ReviewHandle):Held;compareArguments(handle:ReviewHandle,input:Input):Held;revalidate(handle:ReviewHandle,observations:Observations,nowMs:number):Held;inspectReceipt(handle:ReviewHandle,receipt:UntrustedReceipt):Held&{state:'UNKNOWN';externalCommitVerified:false};release(handle:ReviewHandle):Held};
export function createProtectedDomainPorts():{property(...ignored:unknown[]):Promise<Held&{receipt:null}>;stay(...ignored:unknown[]):Promise<Held&{receipt:null}>;reconcile(...ignored:unknown[]):Promise<Held&{state:'UNKNOWN'}>};
