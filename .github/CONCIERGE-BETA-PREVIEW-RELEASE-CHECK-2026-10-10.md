# Chebot Concierge — Manager Web Preview release check

Date: 2026-10-10. This file is a **documentation-only** update on the
`concierge-manager-web-v1` Preview branch following the GitHub↔Vercel
installation reconnection (GitHub 403 removed in Vercel Settings → Git).

Before releasing the first pilot manager:
- The Manager Web Preview must deploy the exact branch HEAD with state READY.
- Verify `/manager/` shows a password recovery link and the recovery page.
- Verify password recovery E2E in Supabase DEV without sharing credentials.
- Verify the two Manager Auth accounts stay isolated via real HTTP sessions.
- Keep all guest phone replacement and manager WhatsApp learning flags OFF.
- Do not merge to `main` or publish to Production; no real managers invited.

Local CI on branch HEAD `b1383a4675e29fda247beb1d3410df985c360ae6`
passed the Manager Preview build-only suite. This doc-only commit requests the
normal Git-connected *Preview* pipeline after reconnection, not a manual
production redeploy. It does not mark the release GO.
