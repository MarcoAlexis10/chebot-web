/** QA proposal only. No installed SQL/HTTP ABI, provider verification or receipts. */
export type UUID = string;
export type PropertyState='draft'|'ready_for_review'|'active'|'paused'|'archived';
export type StayState='draft'|'scheduled'|'active'|'completed'|'cancelled'|'revoked';
export type Held = Readonly<{held:true;fixtureOnly:true;actualAuthVerified:false;authorityAccredited:false;sqlExecuted:false;operationalApproval:false;dispatchPerformed:false;automaticRetryAllowed:false;betaDecision:'NO-GO';state:string}>;
export interface PropertyConfiguration {internalName:string;propertyType:'apartment'|'house'|'room'|'studio'|'other';address:string;floorOrUnit:string|null;cityLabel:'CABA';language:'es'|'en'|'it'|'pt';defaultCheckIn:string;defaultCheckOut:string}
export interface Windows {checkInLocal:string;checkOutLocal:string;accessFromLocal:string;accessUntilLocal:string}
export interface VectorContext {accountId:UUID;memberId:UUID;sessionId:UUID;sessionRevision:number;role:'owner'|'manager'|'co_manager';status:'active';authorityRevision:number;restrictionsRevision:number;verifiedAtMs:number;expiresAtMs:number;revoked:false;propertyId:UUID|null;jurisdiction:'CABA_ATTESTATION_REQUIRED';cohortCount:number;inventoryRevision:number;propertyPermissions:{viewProperty:boolean;manageStays:boolean;manageIncidents:boolean;approveRequests:boolean;manageKnowledge:boolean}}
export interface PropertySnapshot {propertyId:UUID;accountId:UUID;buildingId:UUID|null;buildingAccountId:UUID|null;status:PropertyState;revision:number;activatedAt:string|null}
export interface StaySnapshot {stayId:UUID;accountId:UUID;propertyId:UUID;revision:number;status:StayState;guestBindingRef:UUID|null;checkInAt:string;checkOutAt:string;accessFrom:string;accessUntil:string}
type BaseCommand={intentId:UUID;attemptId:UUID;expectedAuthorityRevision:number;expectedRestrictionsRevision:number};
type PropertyTarget={propertyId:UUID;expectedRevision:number};
export type PropertyCommand=BaseCommand & {abi:'property-lifecycle-review/1'} & (
 {operation:'property.draft.create';propertyId:null;expectedRevision:null;payload:{configuration:PropertyConfiguration;buildingId:UUID|null}} |
 (PropertyTarget & ({operation:'property.configure';payload:{configuration:PropertyConfiguration;buildingId:UUID|null}}|{operation:'property.read'|'property.submit'|'property.pause'|'property.archive';payload:Record<string,never>}|{operation:'property.decision';payload:{decision:'approve'|'return_to_draft';reviewRef:UUID;reviewedRevision:number}})));
export type StayCommand=BaseCommand & {abi:'stay-lifecycle-review/1';propertyId:UUID;expectedInventoryRevision:number} & (
 {operation:'stay.draft.create';stayId:null;expectedRevision:null;payload:Windows} |
 {stayId:UUID;expectedRevision:number} & ({operation:'stay.dates.change';payload:Windows}|{operation:'stay.guest.bind';payload:{protectedGuestBindingRef:UUID}}|{operation:'stay.confirm'|'stay.cancel'|'stay.checkout'|'stay.history.read';payload:Record<string,never>}));
export type PropertyReviewInput={mode:'OFFLINE_VECTOR';nowMs:number;command:PropertyCommand;context:VectorContext;snapshot:PropertySnapshot|null};
export type StayReviewInput={mode:'OFFLINE_VECTOR';nowMs:number;command:StayCommand;context:VectorContext;snapshot:StaySnapshot|null;inventory:StaySnapshot[]};
export type ReviewResult=Held & {receipt:null;proposalOnly?:true;from?:PropertyState|StayState|null;to?:PropertyState|StayState|null};
/** A review result is neither this evidence nor an authorization to dispatch. No constructor is provided. */
export interface RequiredExternalEvidence {intentId:UUID;attemptId:UUID;operation:string;accountId:UUID;propertyId:UUID;stayId:UUID|null;userId:UUID;sessionId:UUID;originalProtectedRef:UUID;authorityRevision:number;restrictionsRevision:number;expectedRevision:number|null;effectRevision:number;dispatchId:UUID;externalCommitRef:UUID;independentReadbackRef:UUID;journalRef:UUID;witnessRef:UUID}
