import type {HistoricalIncidentCommand} from '../domain-security-successor-20261111-v1/incident-successor.mjs';
import type {ResolutionOptions,HeldResult} from './current-resolution.mjs';
export interface AttemptBinding {userId:string;intentId:string;attemptId:string;sessionId:string;tokenExpiresAt:number;authorityVersion:number;restrictionVersion:number;dispatchId:string}
/** KNOWN fields identify original history; they never rebind the new attempt. */
export interface Admission extends AttemptBinding {state:'NEW'|'KNOWN'|'DISPATCH_CLAIMED';originalRef:string}
export interface OriginalSnapshot {originalRef:string;userId:string;intentId:string;operation:'concierge_manager_set_incident_state';accountId:string;memberId:string;propertyId:string;stayId:string;arguments:HistoricalIncidentCommand['p_arguments']}
export interface SqlReviewRequest {text:string;values:readonly unknown[];readOnly:boolean}
export interface DurableReviewOptions {
 mode:'OFFLINE_FIXTURE';resolutionOptions:ResolutionOptions;clock?:()=>number;budgetMs?:number;
 intents:{admit(request:Readonly<AttemptBinding>):Promise<Admission>;loadOriginal(request:Readonly<{userId:string;intentId:string;originalRef:string}>):Promise<OriginalSnapshot>;claimDispatch(request:Readonly<AttemptBinding&{originalRef:string}>):Promise<Admission>};
 writer:{principal:'cheveni_incident_writer_backend_v1';dispatch(request:SqlReviewRequest):Promise<{dispatchId:string;transaction:'COMMIT'}>};
 reader:{principal:'cheveni_incident_readback_backend_v1';readOnly:true;readback(request:SqlReviewRequest):Promise<AttemptBinding&{state:'EFFECT_OBSERVED';originalRef:string;incidentId:string;resultingStatus:string;recoveryEpoch:number;observedAtMs:number;expiresAtMs:number}>};
}
export const WRITER_LOGIN:'cheveni_incident_writer_backend_v1';export const READER_LOGIN:'cheveni_incident_readback_backend_v1';
export const WRITE_SQL:string;export const READ_SQL:string;
export function createHeldIncidentAuthorityCandidate(options?:unknown):{execute(...args:unknown[]):Promise<unknown>;reconcile(...args:unknown[]):Promise<unknown>};
export function createDurableIncidentReview(options:DurableReviewOptions):{execute(token:string,command:HistoricalIncidentCommand):Promise<HeldResult>;reconcile(token:string,intentId:string):Promise<HeldResult>};
