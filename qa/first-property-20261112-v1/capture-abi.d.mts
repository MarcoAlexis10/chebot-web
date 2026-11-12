/** QA only. It does not provide verified identity, original custody or dispatch. */
import type {PrivateCaptureVector} from '../functional-contracts-20261112-v1/evidence-abi.d.mts';
export interface AuthorityRequest {userId:string;sessionId:string;tokenExpiresAtSeconds:string;propertyId:null;operation:'property_create'}
export interface NativeAuthorityRow {account_id:string;member_id:string;member_role:'owner';authority_revision:number}
export interface FounderObservation {userId:string;sessionId:string;memberId:string;accountId:string;state:'CANDIDATE_NOT_AUTHORIZED';scopeRevision:number;quotaRevision:number;jurisdictionRevision:number;datasetId:string;recoveryEpoch:number;observedAtMs:number;expiresAtMs:number}
export interface ProviderTokenObservation {kind:'SYNTHETIC_NOT_VERIFIED';issuer:string;userId:string;sessionId:string;sessionRevision:number;issuedAtSeconds:string;expiresAtSeconds:string}
export interface FirstPropertyVector {providerToken:ProviderTokenObservation;mode:'OFFLINE_VECTOR';captureVector:PrivateCaptureVector;authorityRequest:AuthorityRequest;authorityRows:NativeAuthorityRow[];founder:FounderObservation;mutationKey:string}
export interface Held {state:string;held:true;fixtureOnly:true;actualAuthVerified:false;operationalApproval:false;automaticRetryAllowed:false;betaDecision:'NO-GO'}
export function reviewFirstProperty(input:FirstPropertyVector):Held;
export function compareIntentReview(original:FirstPropertyVector,candidate:FirstPropertyVector):Held;
export function createProtectedFirstProperty():{prepare(...ignored:unknown[]):Promise<Held>;write(...ignored:unknown[]):Promise<Held>;read(...ignored:unknown[]):Promise<Held&{state:'UNKNOWN'}>};
