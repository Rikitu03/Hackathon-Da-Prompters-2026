---
name: gabay-deploy-verify
description: Deploy GabayIskolar to Vercel with Supabase and Lumen configured, and verify the deployment end-to-end — env var setup, secret hygiene, /api/health, AI endpoint smoke tests, client-bundle secret scan, and demo-readiness checks before code freeze. Use this whenever the user mentions deploying, Vercel, production/preview URLs, environment variables in Vercel, "is it live", demo prep, code freeze, a failing build on Vercel, or checking that no secrets leaked to the browser.
---

# Deploy & verify (Member 4)

Reference: `docs/DEPLOYMENT.md` (the step list) and `docs/ARCHITECTURE.md` (milestone 5). This skill adds the checks that turn "it deployed" into "it works and is safe to demo".

## Before deploying
1. Local gates: `npm run typecheck && npm run lint && npm run build`. Fix these locally — Vercel build logs are slower to iterate on.
2. Scan the built client bundle for secrets (run after `npm run build`, from repo root):
   ```bash
   node .claude/skills/gabay-deploy-verify/scripts/scan-client-bundle.mjs
   ```
   It searches `.next/static` for the actual values of `LUMEN_API_KEY`, `LUMEN_API_SECRET`, and any `SUPABASE_SERVICE_ROLE_KEY` from your env files, and for those variable names. Any hit = a server-only module got imported into a client component; trace it (usually a missing `import "server-only"`).
3. `git status` — make sure `.env.local` is not tracked, and `.env.example` has no values.

## Vercel configuration
Set in Project → Settings → Environment Variables (Production and Preview):

| Variable | Exposure | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | anon/publishable key only |
| `LUMEN_API_KEY`, `LUMEN_API_SECRET` | server | never `NEXT_PUBLIC_` |
| `LUMEN_CHAT_URL`, `LUMEN_OCR_URL` | server | `{origin}/ai_chat` and `{origin}/ocr`, from `docs/LUMEN_CONTRACT.md` (staging/test gateway only; these paths don't exist on live) |
| `LUMEN_CHAT_INSTANCE_ID` | server | our AI Chat instance id (see contract) |

The chat route needs `maxDuration` ≥ 35 s, because Lumen chat replies can take up to 25 s. Vercel Hobby allows this, but check the current plan limits.

Do not add a Supabase service-role key unless a server-only feature truly needs it and the team agrees — the chat retrieval deliberately uses the anon client (see `gabay-grounded-chat`).

Env changes only apply to new deployments: redeploy after editing. Tell the user to set these in the dashboard themselves (or via `vercel env add` if they ask you to run it) — don't paste secret values into chat, commits, or PR descriptions.

## Verify the live deployment
Run the bundled smoke test against the deployed URL:
```bash
node .claude/skills/gabay-deploy-verify/scripts/verify-deploy.mjs https://<project>.vercel.app [--cycle=<published-cycle-uuid>]
```
It checks:
- `/api/health` → 200 with `configured.supabase` and `configured.lumen` true
- `/api/ai/chat` invalid JSON → 400; empty message → 400
- `/api/ai/ocr` non-multipart → 415
- with `--cycle`: one real chat question → 200 with `{answer, sources, grounded}` (or a clearly reported 501/503 if not implemented/configured)

Then do by hand (from docs/DEPLOYMENT.md step 7–8), and note results:
- Public guide navigation works with demo data.
- `/admin` is not usable without an admin account; a normal signed-in user can't write.
- Grounded answer with a citation; an off-topic question gets the no-source fallback; an OCR upload of a sample image shows editable fields; a bad file gets a recoverable error.

## Reporting
Give the user a short pass/fail list with the actual status codes and anything skipped. If Lumen calls fail because credits/credentials expired, say so plainly — the app should show 503 gracefully, and that's acceptable to demo as long as it's disclosed. Never stub a fake AI response to make the demo look complete.

## Demo readiness (code freeze)
- README states it's an independent prototype using demo data.
- Only sample documents on the demo machine.
- Vercel Hobby is for non-commercial use; free-tier quotas apply — warm up the deployment before presenting (first request after idle is slow).
