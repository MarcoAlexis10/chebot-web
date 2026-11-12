/** QA review only. These interfaces attest no provider, PostgreSQL or signature. */
export type UUID = string;
export type IncidentState = 'resolving'|'waiting_guest'|'escalated'|'waiting_manager'|'learning_pending'|'closed';
export interface HistoricalIncidentCommand {
 p_auth_user_id: UUID; p_session_id: UUID; p_request_id: UUID; p_intent_id: UUID;
 p_operation: 'concierge_manager_set_incident_state'; p_token_expires_at: number;
 p_arguments: {p_incident_id:UUID;p_account_member_id:UUID;p_new_status:IncidentState;p_event_summary:string};
}
export interface CurrentResolution {
 issuer:string;userId:UUID;sessionId:UUID;accountId:UUID;memberId:UUID;memberRole:'owner'|'manager'|'co_manager';
 propertyId:UUID;stayId:UUID;incidentId:UUID;incidentStatus:string;active:true;manageIncidents:true;
 authorityVersion:number;restrictionVersion:number;observedAtMs:number;expiresAtMs:number;
}
export interface IncidentPlan {
 operation:HistoricalIncidentCommand['p_operation'];intentId:UUID;attemptId:UUID;nativeCommandId:UUID;
 userId:UUID;sessionId:UUID;authorityVersion:number;restrictionVersion:number;argsFingerprint:string;
 sql:string;parameters:readonly [UUID,UUID,number,UUID,UUID,UUID,'incident_state',Readonly<{incidentId:UUID;status:IncidentState;summary:string}>];
 sourceAbi:'Native17 manager_action@ce5c747c';requiredEvidenceAbi:'INCIDENT_EVIDENCE_SUCCESSOR_NOT_INSTALLED';
 effect:Readonly<{incident_id:UUID;resulting_status:IncidentState}>;
}
export interface ModelEvidence {
 status:'COMMITTED';intentId:UUID;attemptId:UUID;userId:UUID;sessionId:UUID;operation:string;
 argsFingerprint:string;authorityVersion:number;restrictionVersion:number;dispatchId:UUID;commitId:UUID;
 journalRecordId:UUID;witnessRecordId:UUID;observedAtMs:number;expiresAtMs:number;
 effect:{incident_id:UUID;resulting_status:IncidentState};
}
export interface ReviewResult {
 status:'HELD'|'UNKNOWN'|'CONFLICT'|'REVIEW_MATCHED';reason:string;held:true;fixtureOnly:true;
 actualProviderVerified:false;actualSqlVerified:false;actualJournalVerified:false;operationalApproval:false;betaDecision:'NO-GO';
}
export interface ReviewOptions {
 mode:'OFFLINE_FIXTURE';getClaims:(token:string)=>Promise<unknown>;
 resolveCurrent:(identity:unknown,incidentId:UUID)=>Promise<CurrentResolution>;
 writer:{principal:'cheveni_service_manager_backend_v2';dispatch:(plan:IncidentPlan)=>Promise<{nativeCommandId:UUID;attemptId:UUID;dispatchId:UUID;transaction:'COMMIT'}>};
 reader:{principal:'cheveni_incident_readback_backend_v1';readOnly:true;readback:(plan:IncidentPlan)=>Promise<ModelEvidence>};
 clock?:()=>number;budgetMs?:number;
}
export const OP: 'concierge_manager_set_incident_state';
export const SERVICE_SQL: string;
export const QA_ISSUER: string;
export function record<T extends Record<string,unknown>>(input:unknown,keys:readonly string[]):T;
export function snapshot(input:unknown):Readonly<HistoricalIncidentCommand>;
export function prepareIncidentServicePlan(token:string,input:unknown,proof:unknown,current:CurrentResolution,now:number):Readonly<IncidentPlan>;
export function createHeldIncidentCandidate(options?:unknown):{execute(...args:unknown[]):Promise<ReviewResult>;reconcile(...args:unknown[]):Promise<ReviewResult>};
export function createIncidentContractReview(options:ReviewOptions):{execute(token:string,command:HistoricalIncidentCommand):Promise<ReviewResult>;reconcile(token:string,intentId:UUID):Promise<ReviewResult>};
