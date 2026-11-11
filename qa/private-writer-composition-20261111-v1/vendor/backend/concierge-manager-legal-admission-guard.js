// CHE VENI BETA — release safety guard, QA branch only.
// This is intentionally hard-coded CLOSED: no verified server-side admission +
// legal acceptance transaction is installed. No env flag may bypass the guard.
// Replace with a real transactional authority only under a separately reviewed
// and authorized release; never change to true without that integration.
export function managerLegalAdmissionReady() {
  return false;
}
