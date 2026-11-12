import type {HistoricalIncidentCommand,CurrentResolution,IncidentPlan} from '../domain-security-successor-20261111-v1/incident-successor.mjs';
export type UUID=string;
export interface ReviewFlags {held:true;fixtureOnly:true;actualProviderVerified:false;actualSqlVerified:false;actualJournalVerified:false;operationalApproval:false;betaDecision:'NO-GO'}
export interface HeldResult extends ReviewFlags {state:string}
declare const capabilityBrand:unique symbol;
/** Instance-bound WeakMap handle, not an Auth/SQL attestation. */
export interface ResolutionReviewCapability extends ReviewFlags {kind:'OFFLINE_CURRENT_RESOLUTION_REVIEW';readonly [capabilityBrand]:never}
export interface SourceProjection {
 userId:UUID;sessionId:UUID;sessionUserId:UUID;sessionLive:boolean;emailConfirmed:boolean;
 accountId:UUID;accountStatus:string;identityMemberId:UUID;identityAccountId:UUID;identityStatus:string;identityRevokedAt:number|null;
 memberId:UUID;memberAccountId:UUID;memberRole:string;memberStatus:string;
 propertyId:UUID;propertyAccountId:UUID;propertyStatus:string;city:string;
 stayId:UUID;stayAccountId:UUID;stayPropertyId:UUID;incidentId:UUID;incidentAccountId:UUID;incidentPropertyId:UUID;incidentStayId:UUID;incidentStatus:string;canManageIncidents:boolean;
}
export interface SourceRequest {requestId:UUID;userId:UUID;sessionId:UUID;tokenExpiresAt:string;incidentId:UUID}
export interface ScopeRequest extends SourceRequest {accountId:UUID;memberId:UUID;propertyId:UUID;stayId:UUID}
export interface RevisionObservation {
 requestId:UUID;userId:UUID;sessionId:UUID;accountId:UUID;memberId:UUID;propertyId:UUID;stayId:UUID;incidentId:UUID;
 authorityVersion:number;restrictionVersion:number;datasetId:string;recoveryEpoch:number;inventoryDigest:string;restrictionJournalId:string;restrictionDigest:string;
 observedAtMs:number;expiresAtMs:number;
}
export interface ResolutionOptions {
 mode:'OFFLINE_FIXTURE';getClaims:(token:string)=>Promise<unknown>;
 observeRows:(request:Readonly<SourceRequest>)=>Promise<{requestId:UUID;rows:SourceProjection[];observedAtMs:number;expiresAtMs:number}>;
 readRevisions:(request:Readonly<ScopeRequest>)=>Promise<RevisionObservation>;
 readCurrentFloor:(request:Readonly<ScopeRequest>)=>Promise<RevisionObservation>;
 clock?:()=>number;budgetMs?:number;newRequestId?:()=>UUID;
}
export function createProtectedCurrentResolution(...ignored:unknown[]):{resolve(...ignored:unknown[]):Promise<HeldResult>};
export function createCurrentResolutionReview(options:ResolutionOptions):{
 resolve(token:string,command:HistoricalIncidentCommand):Promise<ResolutionReviewCapability|HeldResult>;
 inspect(capability:ResolutionReviewCapability,token:string,command:HistoricalIncidentCommand):Readonly<{plan:IncidentPlan;resolution:CurrentResolution;revision:RevisionObservation}>;
};
