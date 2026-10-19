# Fictional portable recovery laboratory

This directory is a generic, public test fixture. It contains no hosted-project
credentials, private application implementation, or real user data. Do not put
real backups, root keys, passwords, or provider settings here or in Actions.

The branch-only workflow runs on a standard GitHub-hosted Ubuntu runner in a
public repository (free compute). It does not upload artifacts, enable caches,
deploy a website, create a cloud project, or consume private-repository minutes.
Git deployments remain disabled in the repository's existing `vercel.json`.

To reproduce on an existing private workstation with Docker, Node 24 and the
checksum-verified Supabase CLI 2.121.0:

```sh
npm ci --prefix qa/portable-recovery --ignore-scripts --no-audit --no-fund
node --test qa/portable-recovery/portable.test.mjs
RUNNER_TEMP="/absolute/private/empty-lab-directory" \
PORTABLE_RECOVERY_MODE=fictional-local-only \
node qa/portable-recovery/lab.mjs
```

The script requires the exact API loopback port 54321 and PostgreSQL loopback
port 54322. It creates a Docker network and a Supabase project under RUNNER_TEMP.
Those ports and the `portable-recovery-only` network must be unused. Never point
RUNNER_TEMP at an existing Supabase project. The process destroys all source and
target test containers/volumes with `supabase stop --no-backup`. Its workflow has
an unconditional cleanup step too. It never links, logs into or resets a hosted
project. Local administrator actions must not be copied to a managed database.

The new scenario destroys a source cluster and its volumes, bootstraps a fresh
compatible stack and restores explicit application/Auth/Vault/Storage data.
It tests encrypted archives, tamper/wrong-key rejection, a stale independent
revocation guard, role attributes and grantors, RLS, a foreign key and identity
sequence, real Auth login/revoked refresh, and private Storage binary downloads.
Vault ciphertext must fail under a fresh root and decrypt only after recovering
the separately retained fictional root. Storage data uses the local file backend
volume plus DB metadata; it is not an S3 restoration test. External configuration
is a fictional file, not recreated cloud services.

The scenario does **not** prove that a particular hosted project was backed up,
that the root export API can be accessed for that account, that production role
graphs/default ACLs are covered, or that cloud provider settings can be restored.
It does not rotate cloud credentials or send email. A passing lab is not approval
to install, restore or open any real environment.
