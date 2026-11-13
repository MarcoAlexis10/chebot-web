# Pilot integration · retained QA

Extends the original generator chain through functional-night. This is UI consistency code; synthetic DTOs never verify Auth or current authority. No operational file or backend entry is changed.

Checkpoint 1: require properties/stays response `session` to match the panel's account/member/role; clear private rows on mismatch. Carry the actual 403 status from requests/incidents/knowledge to the existing Auth listener without labeling it expiry/revocation. 401 and unreadable transport remain distinct. Existing UNKNOWN mutation markers are untouched.

Run from checkout root (web + read-only sibling backend):

`python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/pilot-integration-20261112-v1/context.test.cjs web/qa/pilot-integration-20261112-v1/auth-affected.regression.cjs`

Add `--conditions=baseline` before `--test` for the new assertions against the preceding candidate. Expected initial baseline: three failures, one pass. Never connect this code to the operational build. Beta remains NO-GO.
