// Offline preparation, not proof of capture, provider configuration or permission.
export const dependencies=Object.freeze({
 PRIVATE_CAPTURE:['ownerSpecificAuthorization','localPrivateInput','exactDevIdentity','caTrust','privateDumpExitZero','authenticatedPair','privateDriveRoundtrip'],
 DATA_RECOVERY:['PRIVATE_CAPTURE','closedPrivateRestore','requiredDataCoverage','measuredRpoRto','dependencyCustody','currentIndependentJournal'],
 A2_INSTALL:['DATA_RECOVERY','rollbackForActualChange','devOnlyApplicationWriterIsolation','pinnedA2Candidate','ownerInstallAuthorization'],
 AUTH_MAIL:['A2_INSTALL','existingSmtpProvider','exactAuthRedirects','ownerControlledSendAuthorization','connectedLoginResetExpiry'],
 PRIVACY:['approvedNoticeAndRetention','independentEvidenceProvider','atomicGuardsInstalled','suppressionReconciliation'],
 WHATSAPP:['A2_INSTALL','PRIVACY','channelCustody','connectedSignatureAndUncertainSendReconciliation','ownerControlledSendAuthorization'],
 BETA:['AUTH_MAIL','WHATSAPP','PRIVACY','firstVerifiedStayClock','oneManagerOnePropertyBA','ownerActivationAuthorization']
});
export function preparationStatus(){return {qaPrepared:true,remoteConnectionEnabled:false,
 realCaptureApproved:false,installApproved:false,sendApproved:false,betaApproved:false,
 closedOperationalControls:[],pending:dependencies};}
