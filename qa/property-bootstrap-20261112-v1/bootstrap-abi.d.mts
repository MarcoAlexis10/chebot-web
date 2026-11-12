import type {FirstPropertyVector} from '../first-property-20261112-v1/capture-abi.d.mts';
export interface BootstrapFacts {account_id:string;member_id:string;member_role:'owner';account_status:'active'|'testing';founding_manager:boolean;beta_started_at:string|null;beta_ends_at:string|null;property_count:number|string;slot_count:number|string;nonrevoked_owner_count:number|string}
export interface SyntheticAdmission {kind:'SYNTHETIC_ADMISSION_NOT_DURABLE';requestId:string;originalRef:string;intentId:string;attemptId:string;mutationKey:string}
export interface BootstrapSources {kind:'SYNTHETIC_BOOTSTRAP_SOURCES_NOT_VERIFIED';requestId:string;originalRef:string;intentId:string;attemptId:string;userId:string;sessionId:string;sessionRevision:number;accountId:string;memberId:string;role:'owner';authorityRevision:number;restrictionsRevision:number;inventoryRevision:number;founderRevision:number;quotaRevision:number;jurisdictionRevision:number;datasetId:string;recoveryEpoch:number;tokenExpiresAtSeconds:string;observedAtMs:number;expiresAtMs:number}
export interface BootstrapReview {mode:'OFFLINE_VECTOR';capture:FirstPropertyVector;factRows:BootstrapFacts[];admission:SyntheticAdmission;guard:BootstrapSources}
export interface Held {state:string;held:true;fixtureOnly:true;authorityAccredited:false;actualAuthVerified:false;sqlExecuted:false;operationalApproval:false;automaticRetryAllowed:false;betaDecision:'NO-GO'}
export declare function reviewBootstrapCapture(raw:BootstrapReview|unknown):Readonly<Held>;
export declare function createProtectedBootstrap():Readonly<{resolve(raw?:unknown):Promise<Held>;admit(raw?:unknown):Promise<Held>;write(raw?:unknown):Promise<Held>}>;
export interface ReadArgumentMetadata {position:number;name:string;type:'uuid'|'text'|'bigint'|'bytea';origin:string;bytes?:32}
export declare function reviewReadBinding(raw:unknown):Readonly<Held&{arguments:ReadonlyArray<ReadArgumentMetadata>|null;statement:null;propertyId:null}>;
