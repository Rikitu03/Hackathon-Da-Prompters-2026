# Product help implementation and rollout

Ask Gabay has two explicit contexts. Product help is the default and needs no selected cycle. Scholarship guide retains published-cycle evidence, closed-cycle checks, and contextual requirement actions. A visible transcript is visit-only UI state, not provider conversation memory.

## Knowledge and control prompt

`PRODUCT_HELP.md` is the sole public knowledge source. It is reviewed against the accepted product, not automatically imported from internal plans or provider probes. Keep the distinction between three-document preparation and the complete official checklist.

Run `npm run kb:build` after editing the guide and commit its generated JSON together with the Markdown. `npm run kb:check`, production builds, and CI reject stale knowledge. Generation is deterministic, handles LF/CRLF, uses stable heading IDs, and bounds passages to 900 characters. Runtime imports only the generated server-side index.

Retrieval ranks normalized English/Filipino heading/tag/body overlap and selects at most three passages. The product control prompt and question fit the existing conservative 4,000-byte UTF-8 budget. Lumen receives a fresh session per question, numbered evidence, and no transcript. Only returned citations to supplied passages are rendered. No evidence, an uncited answer, and a provider scope refusal yield a fixed notice, not a fabricated answer.

## Apply before deploying either chat route

The database owner must verify migration history and apply outstanding staging migrations, including `20261113120000_requirement_locations.sql`, before dependent guide queries are deployed. Then apply `20261113133000_gabay_chat_rate_limit.sql` using the existing provisioned `APPLICANT_SESSION_SECRET`. Do not generate a different secret or use a service-role key.

Both `/api/ai/help` and `/api/ai/chat` share 10 Lumen-bound attempts per ten-minute database window. Their stateless server clients call a narrow HMAC-authorized RPC. Database time, a private counter, and an atomic upsert enforce admission across replicas. The proof uses `chat-limit|bucket|issuedAt`, expires after 90 seconds, and accepts no client-provided limit. Buckets contain trusted hashed addresses, or one shared fallback on local/untrusted hosts. No questions/transcripts are stored. Counters older than one hour are removed hourly.

Missing secret, missing RPC, a denied proof, or a database failure returns 503 without a provider call; no local-memory fallback exists. Quota exhaustion returns 429 and `Retry-After`. Provider attempts count even if the provider later fails.

The owner can run `supabase/tests/gabay_chat_rate_limit.sql` for rollback-only window, proof, and direct-access checks. After migration, run `node --env-file=.env scripts/check-chat-limit.mjs` from a privately configured checkout. It makes 20 concurrent requests through separate anonymous database clients, expects exactly ten admissions, and checks invalid/expired proofs. Its random synthetic counter expires automatically. It never calls Lumen.

## Enable and acceptance

Keep `LUMEN_PRODUCT_HELP_ENABLED=false` until the migration, reviewed corpus, and automated checks pass. Existing `LUMEN_CHAT_ENABLED=false` also disables product help. Credentials stay server-only. Turning the product flag on requires a server restart/redeployment; it is not a browser-side switch.

Automated browser tests use reserved mock database values and disable both Lumen services. They exercise source rendering, cancellation, separate mode state, cycle resets, manual retry, mobile keyboard sizing, themes, and verification-modal layering. Unit and applicant suites validate contracts and the evidence gate.

Live provider acceptance is separate and requires explicit approval: make one product question using a new Lumen session (approximately seven credits). Record a cited answer or the honest scope fallback, latency, URL, and commit. A mocked test, configuration check, or health 200 is not live acceptance. No production deployment is part of this implementation task.

## Integration evidence

The feature is developed in an isolated worktree. Final verification checkpoint, staging merge, test totals, and remaining acceptance results are recorded here after integration.
