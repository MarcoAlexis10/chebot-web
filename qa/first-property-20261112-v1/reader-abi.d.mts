export type CaptureBinding={userId:string;sessionId:string;accountId:string;memberId:string;role:'owner';operation:'property_create';intentId:string;attemptId:string;originalRef:string;mutationKey:string;authorityRevision:number;founderRevision:number;quotaRevision:number;jurisdictionRevision:number;datasetId:string;recoveryEpoch:number;restrictionsRevision:number;inventoryRevision:number;inventoryDigest:string;restrictionDigest:string;restrictionJournalId:string;bootstrapProvenanceRef:string;authorityCommitRef:string};
export type ReconciliationUnknown=Readonly<{state:'UNKNOWN';propertyId:null;configurationReady:false;externalCommitVerified:false;protectedOriginalAvailable:false;privateResultExposed:false;automaticRetryAllowed:false;betaDecision:'NO-GO';reason:string}>;
export type FunctionReceipt={version:'CHEVENI_PROPERTY_CAPTURE_1';key:string;intentId:string;accountId:string;state:'COMMITTED'|'UNKNOWN'|'HELD'|'DENIED_NO_EFFECT';propertyId:string|null};
export declare const READER_ABI:'property-capture-independent-read/2';
export declare const proposedReaderProfile:Readonly<Record<string,unknown>>;
export declare function reviewFunctionReceipt(raw:unknown):ReconciliationUnknown;
export declare function reviewReconciliation(raw:unknown):ReconciliationUnknown;
export declare function createProtectedCaptureReader():Readonly<{read(raw?:unknown):Promise<ReconciliationUnknown>}>;
