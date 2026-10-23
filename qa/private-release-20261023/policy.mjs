// Build policy, not user configuration. No environment variable or CLI override.
export const POLICY=Object.freeze({release:'CHEVENI_PRIVATE_PREPARED_V1',devEnabled:false,realDataApproved:false,allowSends:false,allowInstall:false});
export function requireRealAuthorization(){throw Error('REAL_OPERATION_LOCKED__SPECIFIC_OWNER_AUTHORIZATION_AND_REVIEWED_RELEASE_REQUIRED');}
