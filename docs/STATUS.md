# Current integration status and next steps

Updated **13 November 2026, Asia/Manila**, in `feat/backend-db`, after the latest staging integration.

Staging PR #9 (`d0b1f7b`) is integrated locally. Admin V3 charts, conditional
pagination, shared branding, source import, and applicant preview are preserved
alongside the backend cookie session, atomic saves, source review, and server
publication checks. The admin console conflict is resolved. This branch is ready
for a pull request; merging into staging requires explicit user confirmation.

The current local changes connect the final admin screens to the backend and add
account-free applicant references and local private drafts. The database migration
is applied; code changes still need review, merge, and deployment. Lumen
implementation was left unchanged. Earlier provider audit notes below are historical.

## Current backend verification

- Admin UI login establishes the API cookie session; role checks and logout work.
- Program/cycle/requirement/FAQ/source saves use protected APIs and atomic database
  updates. Source text review and real readiness checks drive publish/unpublish.
- Anonymous readers cannot access draft guides. Published catalogue pagination
  excludes parents without a visible cycle.
- Applicants need no account. Signed browser references expire in seven days;
  private drafts save to IndexedDB with export/delete controls. See
  [Applicant privacy](APPLICANT_PRIVACY.md) for setup and remaining scope.
- Live Chrome verification passed admin creation, source review, publish/unpublish,
  logout, local draft persistence, separate browser isolation, export, reset, and
  deletion. Network requests contained no draft personal fields; synthetic guide
  fixtures were removed afterward.
- `npm test`: 134 passed; `npm run test:applicant`: 24 passed. Typecheck and
  production build passed. Lint passes without warnings; staging fixed the
  earlier `auto-textarea.tsx` warning.
- All three rollback SQL suites passed against the shared development database:
  role permissions, guide workflow, and atomic admin edits/guest privacy.
- Production-build desktop/mobile browser suites: **78 passed, 2 intentionally
  skipped** (viewport-specific cases), including draft privacy and a new import
  regression test covering program save plus preservation of staged cycle fields.
- Existing Supabase Auth leaked-password protection remains disabled; see
  [Supabase's setting](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Proceed in this order

1. **M1 + M4: accept the aligned applicant journey.** The local implementation now shares upload/question limits and Manila dates, preserves notices/OCR evidence, discloses provider storage, and connects the five preparation stages. Review the local changes and the acceptance evidence below before merging. A live published-content/provider journey remains separate acceptance.
2. **M2 + M3, with M4 reviewing retrieval text: prepare one PSCS guide.** Use the [requirements reference](scholarships/pscs/requirements.md), selecting one level, classification and cycle. Begin with two or three well-supported requirement journeys for the integration demonstration. Label a partial guide clearly; do not imply the rest of the requirements are unnecessary. Review official dates, application destination and source text before publishing.
3. **Exercise the entire path on that guide.** Through `/backend-lab`, use a publisher account to save reviewed source text and publish; select the same guide in the applicant UI; review one fictional OCR document; ask one source-supported question and one unsupported question. Record actual results and citations. Then verify the same flow on the intended deployment.

The preferred first dataset is elementary CORE renewal **E26-NOV**, provided its dates and official handoff are confirmed. Chat refuses cycles whose end date has passed in Manila. Keep that behavior; never extend an official deadline to obtain a demonstration answer. Historical or fictional test cycles must be explicitly isolated and labeled.

Keep city/residence-duration extraction and the other [OCR profiles](scholarships/pscs/ocr-extraction.md) as later work until this first complete flow succeeds.

## What is already present

| Area | Current evidence | Remaining acceptance |
|---|---|---|
| Applicant UI | Homepage, onboarding, dashboard, catalogue, requirement journeys, checklist, summary, assistant and OCR review routes are merged | Live guide/provider success through the combined UI |
| Guest checklist | Browser-local statuses, source/instruction-change review, cycle/requirement isolation | Cross-browser/manual UAT; no cloud syncing is implemented |
| Admin UI | Persistent layout/session across sidebar navigation; draft editors and reference registration | Publication integration and source-text review in final screens |
| Backend | Cookie-authenticated APIs, atomic `save_guide`, publisher publication RPC, anonymous published reads and RLS | Final admin screens need to consume the same workflow |
| OCR | Real provider adapter/route, byte checks, 4 MiB limit, consent, rate limiting and six editable fields | Applicant contract alignment and combined UI verification |
| Chat/RAG | Local work implements anonymous cycle-scoped FTS, closed/no-evidence fallbacks, prompt, Lumen session/message calls and citation mapping | Commit/review this work and obtain a cited route answer using suitable reviewed content |
| PSCS research | Requirements, demo data, extraction guide and JSON are under `scholarships/pscs/` | Research files are not automatically imported, approved, published or used as parser configuration |

Provider integration evidence recorded earlier is in [LUMEN_CONTRACT.md](LUMEN_CONTRACT.md). A successful adapter probe, a mocked unit test, and a successful applicant-to-provider flow are different evidence levels.

## Verified gaps and owners

| Priority | Gap in the current checkout | Action / owner |
|---|---|---|
| Resolved locally | Browser/server upload size differed | Both use **4 MiB**, with exact-boundary tests. Browser copy lists JPG/PNG/PDF; the backend additionally supports WebP/TIFF. |
| Resolved locally | Assistant/server question limits differed | Composer, counter, adapter tests and server validation share **500 characters**. |
| Resolved locally | Browser timeouts undercut route budgets | Chat **55 s**, OCR **70 s**; cancellation retained; retries require a user action. |
| Resolved locally | Ungrounded notices and `officialUrl` were lost | Fixed server text renders as a system note with a safe HTTPS destination. Numbered inline answer citations match the returned source list. |
| Resolved locally | OCR evidence and uncertainty were stripped | `originalText`, field warnings and the disclaimer are retained and displayed beside editable values. |
| Resolved locally | Provider storage/visibility consent was missing | Consent names Lumen's retained, organization-visible copy and sample-only use. Chat warns against names, addresses and IDs and explains stored transcripts. |
| P0 | Public DB inspection found **one synthetic guide, one approved source, one public chunk**, with no residency keyword content | M2/M3: publish a separate reviewed PSCS guide; source URLs alone do not supply retrieval text. Do not rewrite shared examples without coordinating. |
| Resolved locally | Final admin UI source review and publication gate | Source text, explicit publisher approval, atomic saves, server readiness, publish and unpublish are integrated and passed live browser verification. |
| Resolved locally | Admin browser/API session mismatch | Admin login now establishes the HTTP-only API cookie; workspace reads and all writes use protected backend endpoints. |
| P1 | Level, new/renewal and semester are absent from the guide save schema | M2/M3/M1: use separately named guides and explicit content scope for the first demonstration, or agree a schema/API change. Do not send unsupported JSON fields. Metadata filters cannot be fully populated by the current API. |
| P1 | `save_guide` generates chunks without `requirement_id`; retrieval only prioritizes it when present | M3/M4: do not describe retrieval as strictly requirement-scoped. Current isolation is by cycle; full-text relevance is not ranked with SQL `ts_rank`. Evaluate bilingual search and add a reviewed mapping/ranking strategy if needed. |
| P1 | Chat accepts an optional UUID but does not separately verify that requirement belongs to the selected cycle | M3/M4: validate context ownership; cycle filtering already limits the retrieved source set. |
| P1 | Rate limits are per server instance; `/api/health` does not test Lumen grants, instance, balance, or paid output | M3/M4: distinguish configuration/readiness from provider verification. A health 200 is not end-to-end AI evidence. |
| P1 | Merged branch and local work are not proof of an updated deployment | M3: review/commit Member 4 work, merge through the team's normal process, deploy the intended environment and record the resulting URL/commit. |
| Resolved locally | Earlier development-server navigation timeouts | Production-build browser checks passed 78 cases with two intentional viewport skips, including both earlier navigation cases. |
| P2 | OCR still extracts six general fields; profile JSON is a design reference | M4: add document-specific extraction only after the basic shared flow is accepted. No school-year/income/eligibility comparison is currently promised. |

Code evidence: [applicant adapter](../src/lib/applicant/api.ts), [file validator](../src/lib/applicant/model.ts), [assistant](../src/components/applicant/assistant.tsx), [document review](../src/components/applicant/document-review.tsx), [admin console](../src/components/admin/console.tsx), [chat route](../src/app/api/ai/chat/route.ts), [OCR route](../src/app/api/ai/ocr/route.ts), [retrieval](../src/lib/rag/retrieve.ts), [guide save/publication SQL](../supabase/migrations/20261112163314_guide_workflow.sql).

## Content and provider evidence

The read-only public database check returned `DEMO — Published test scholarship`, cycle `DEMO 2026–2027`, ending `2026-12-31`, with one approved source. Of the one public chunk inspected, none had a requirement association or residency keywords. This is a dated anonymous snapshot, not an assertion about private drafts or future database state.

The earlier chat-route check in the Lumen contract retrieved a synthetic disclaimer chunk, then received three scope-gated provider replies. A direct grounded probe with realistic scholarship passages had succeeded. **Insufficiently useful source content is a likely cause of those gated replies, not a proven universal classifier rule.** The next meaningful provider test needs reviewed requirement text tied to official sources. The fictional OCR samples and extraction profiles are not scholarship policy.

No Lumen calls or shared-database mutations were made during this staging/doc audit. The read-only database checks verified public-table access and denial of anonymous administrator-profile access; they did not rerun the full authenticated RLS matrix.

## Historical staging-merge verification

- Staging merge completed; both `test` and `test:applicant` scripts retained after the sole conflict in `package.json`.
- All 13 pre-existing modified/untracked files matched their pre-merge hashes immediately after the merge. A temporary backup was retained outside the repo; later documentation corrections intentionally update some of those documents.
- `npm test`: **114 passed**, 14 test files; providers mocked where applicable.
- `npm run test:applicant`: **16 passed**, model/adapter tests using mocks.
- `npm run typecheck`: passed.
- `npm run lint`: passed with one existing hook-dependency warning in `src/components/admin/auto-textarea.tsx`.
- `npm run build`: passed, including generation of 30 static pages. Same existing lint warning; no new build errors.
- Mocked admin browser suite on isolated port 46137: **23 passed, 1 skipped, 2 failed by timeout**, desktop/mobile Chromium with two workers and the development server. The mobile five-view layout case exceeded the 30-second test budget; desktop authenticated navigation timed out waiting for `/admin/programs` after clicking Scholarships. The required Chromium binary was installed after an initial launch-only setup failure. Test artifacts/logs are retained in the temporary audit directory, not committed.
- These browser checks used a reserved mock Supabase origin and disabled both Lumen routes. They did not exercise live applicant/provider output. The repository CI uses a production server; repeat the two timed-out [admin cases](../tests/admin-ui.spec.ts) in that configuration before treating them as product regressions or accepting browser readiness.

Follow [API_CONTRACTS.md](API_CONTRACTS.md) for the backend contract. The applicant handoff records the current frontend differences; this page tracks what the team must close.
