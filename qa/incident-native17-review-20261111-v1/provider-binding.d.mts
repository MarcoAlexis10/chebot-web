import type {HistoricalIncidentCommand} from '../domain-security-successor-20261111-v1/incident-successor.mjs';
import type {ResolutionOptions,HeldResult} from '../incident-authority-closure-20261111-v1/current-resolution.mjs';
export interface BindingContext {
 requestId:string;userId:string;sessionId:string;tokenExpiresAt:number;intentId:string;attemptId:string;dispatchId:string;originalRef:string;
 authorityVersion:number;restrictionVersion:number;datasetId:string;recoveryEpoch:number;inventoryDigest:string;restrictionJournalId:string;restrictionDigest:string;
}
export interface BindingResponse extends BindingContext {providerBindingRef:string;observedAtMs:number;expiresAtMs:number}
declare const brand:unique symbol;
export interface BindingCapability {readonly [brand]:never;kind:'OFFLINE_PROVIDER_BINDING_REVIEW';held:true;fixtureOnly:true;actualProviderVerified:false;actualSqlVerified:false;operationalApproval:false}
export interface BoundClaim {state:'REVIEW_BOUND_CLAIM';context:Readonly<BindingContext>;providerBindingRef:string;held:true;fixtureOnly:true;actualProviderVerified:false;actualSqlVerified:false;actualJournalVerified:false;operationalApproval:false;betaDecision:'NO-GO'}
export interface Options {
 mode:'OFFLINE_FIXTURE';getClaims:(token:string)=>Promise<unknown>;
 resolver:ReturnType<typeof import('../incident-authority-closure-20261111-v1/current-resolution.mjs').createCurrentResolutionReview>;
 attestor:{
  originalReference(request:Readonly<{requestId:string;userId:string;intentId:string}>):Promise<{requestId:string;userId:string;intentId:string;originalRef:string}>;
  register(request:Readonly<BindingContext>,proof:Readonly<{useVerifiedIdentity():Readonly<{userId:string;sessionId:string;tokenExpiresAt:string}>}>):Promise<BindingResponse>;
  claim(request:Readonly<BindingContext&{providerBindingRef:string}>):Promise<BindingResponse>;
 };
 clock?:()=>number;budgetMs?:number;newRequestId?:()=>string;
}
export const BOUND_WRITE_SQL:string;export const BOUND_READ_SQL:string;
export function createProviderDispatchBinding(...ignored:unknown[]):{prepare(...ignored:unknown[]):Promise<HeldResult>;claim(...ignored:unknown[]):Promise<HeldResult>;transport(...ignored:unknown[]):Promise<HeldResult>};
export function createProviderBindingReview(options:Options):{
 prepare(token:string,input:HistoricalIncidentCommand):Promise<BindingCapability|HeldResult>;
 claim(capability:BindingCapability,token:string,input:HistoricalIncidentCommand):Promise<BoundClaim|HeldResult>;
 transport(claim:BoundClaim,token:string,input:HistoricalIncidentCommand,request:{text:string;values:unknown[];readOnly:boolean}):Promise<Readonly<{state:'REVIEW_BOUND_SQL_REQUEST';text:string;values:readonly unknown[];readOnly:boolean;held:true;fixtureOnly:true;actualProviderVerified:false;actualSqlVerified:false;actualJournalVerified:false;operationalApproval:false}>|HeldResult>;
};
