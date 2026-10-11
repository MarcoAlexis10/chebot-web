// Fail-closed, BUILD-TIME gate for Concierge manager invitation signup.
// No external requests, no accounts, no invitations, no authentication.
// The absent approval manifest is deliberate. DO NOT fabricate one for QA.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const APPROVAL_FILE = 'manager-concierge-legal-publication-approval.json';
const EXPECTED = Object.freeze({
  privacy: {
    version: 'concierge-privacy-beta-v1-2026-10-11',
    output: 'manager/privacidad-concierge/index.html'
  },
  terms: {
    version: 'beta-v1-2026-10-11',
    output: 'manager/condiciones-concierge/index.html'
  }
});
const CHECKSUM = /^[a-f0-9]{64}$/;
const APPROVED_AT = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/;

function legalPublicationGate(root = __dirname) {
  const manifestPath = path.join(root, APPROVAL_FILE);
  if (!fs.existsSync(manifestPath)) {
    return {approved:false, reason:'NO_OWNER_LEGAL_PUBLICATION_APPROVAL'};
  }
  let approval;
  try {
    approval = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return {approved:false, reason:'INVALID_APPROVAL_MANIFEST'};
  }
  if (!approval || approval.schema !== 'chebot-concierge-legal-release-v1' ||
      approval.ownerApproved !== true ||
      approval.legalContentApproved !== true ||
      approval.commercialHostingApproved !== true ||
      typeof approval.approvedBy !== 'string' ||
      approval.approvedBy.trim().length < 3 ||
      typeof approval.approvedAt !== 'string' ||
      !APPROVED_AT.test(approval.approvedAt) ||
      !Number.isFinite(Date.parse(approval.approvedAt))) {
    return {approved:false, reason:'INCOMPLETE_OWNER_LEGAL_OR_HOSTING_APPROVAL'};
  }
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const document = approval.documents?.[name];
    if (!document || document.version !== expected.version ||
        typeof document.sha256 !== 'string' || !CHECKSUM.test(document.sha256)) {
      return {approved:false, reason:'UNAPPROVED_OR_MISMATCHED_'+name.toUpperCase()};
    }
    const file = path.join(root, 'dist', expected.output);
    if (!fs.existsSync(file)) {
      return {approved:false, reason:'UNPUBLISHED_'+name.toUpperCase()+'_PAGE'};
    }
    const bytes = fs.readFileSync(file);
    const actual = crypto.createHash('sha256').update(bytes).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(document.sha256,'hex'))) {
      return {approved:false, reason:'MODIFIED_'+name.toUpperCase()+'_PAGE'};
    }
    const html = bytes.toString('utf8');
    // The approved pages must be real pages with a visible version label.
    if (html.length < 1200 || !/<html\b/i.test(html) ||
        !/<title\b/i.test(html) ||
        !html.includes('data-chebot-legal-version="'+expected.version+'"') ||
        /\[(?:PENDIENTE|TODO|COMPLETAR)[^\]]*\]|\bBORRADOR\b|\bNO APROBADO\b/i.test(html)) {
      return {approved:false, reason:'INVALID_'+name.toUpperCase()+'_LEGAL_DOCUMENT'};
    }
  }
  return {approved:true,reason:'APPROVED_DOCUMENTS_MATCH_PUBLICATION'};
}
module.exports = {legalPublicationGate, APPROVAL_FILE, EXPECTED};
