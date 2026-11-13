# Pilot integration · retained QA

Extends the original generator chain through functional-night. This is UI consistency code; synthetic DTOs never verify Auth or current authority. No operational file or backend entry is changed.

Checkpoint 1: require properties/stays response `session` to match the panel's account/member/role; clear private rows on mismatch. Carry the actual 403 status from requests/incidents/knowledge to the existing Auth listener without labeling it expiry/revocation. 401 and unreadable transport remain distinct. Existing UNKNOWN mutation markers are untouched.

Run from checkout root (web + read-only sibling backend):

`python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/pilot-integration-20261112-v1/context.test.cjs web/qa/pilot-integration-20261112-v1/auth-affected.regression.cjs`

Add `--conditions=baseline` before `--test` for the new assertions against the preceding candidate. Expected initial baseline: three failures, one pass. Never connect this code to the operational build. Beta remains NO-GO.

Checkpoint 2: all five manager list DTOs (including incident knowledge enrichment) must match the panel context. `window.cheveniManagerPanelContextMatches` is a UI consistency predicate, never server authority or an Auth verifier. A missing consumer fails closed. Stale reads cannot invalidate a newer view. Knowledge decisions now bound headers and JSON even if transport ignores AbortSignal: UNKNOWN survives, without resend. BFCache restore invalidates old invite bindings while permitting controls supplied by a subsequent panel reload. Browser behavior is NOT accredited by DOM doubles.

Focused reproduction adds `section-context.test.cjs`, `knowledge-deadline.test.cjs`, `invite-bfcache.test.cjs` and `invite-affected.regression.cjs` to the command above. `checkpoint2.tap`: 11 unique new assertions and five selected prior regressions, all PASS; repeated passes are not additional cases. Intermediate patch drift and enrichment-assertion corrections remain in evidence.
