# Applicant frontend — Member 1

Member 1 owns the public homepage at `/` and the applicant workspace. This implementation replaces the emerald landing placeholder at `src/app/page.tsx`; preserve that route when integrating into staging. Admin and backend code remain owned by Members 2–4.

## Routes and design

`/` → `/onboarding` → `/dashboard` → `/my-checklist` → `/requirements/[id]` → `/summary`. Discovery uses `/scholarships` and `/scholarships/[id]`. Support tools are `/assistant` and `/document-review`.

The blue/white visual world follows the supplied Pasig student reference. Instrument Sans is bundled under its OFL license. The original generated illustration and its provenance are in `public/illustrations`. Lucide supplies interface icons. Motion is limited to the homepage entrance and respects reduced motion. Applicant CSS is scoped to `.applicant-ui`; admin globals were not changed.

## Published data

The typed browser adapter in `src/lib/applicant/api.ts` consumes the existing public scholarship and requirement endpoints. Only published programs/cycles appear. The current list response does not include education/classification/source metadata; filters are available only for metadata actually supplied. Full detail views display source references and review dates when provided. No eligibility rules, dates, or offerings are invented. The illustrative walkthrough is an explicit user choice, labeled throughout; it is never silently substituted for a failed API request.

## Guest persistence

No applicant authentication exists. Preferences use `gabayiskolar:preferences:v1`; preparation uses `gabayiskolar:preparation:v1:<cycleId>:<requirementId>`. Only preferences and self-managed statuses are stored. A signature of each requirement and its sources detects changed guidance and moves the item to Needs review until the student explicitly updates it. Removed requirements do not count in progress. Storage failures show a warning. There is no cross-device sync.

## Member 4 integration

Chat posts `{cycleId, requirementId?, message}` to `/api/ai/chat`. Expected response: `{answer: string, grounded: boolean, sources: [{sourceId: string, title: string, url?: string}]}`. Ungrounded answers or empty citations get a conservative no-evidence fallback. Source links permit HTTPS only. Chat history is session-only. Live requests time out after 30 seconds.

OCR posts multipart `file` and `consent=true` to `/api/ai/ocr`, only after explicit consent. Expected response: `{rawText: string, fields: [{key: string, label: string, value: string, needsReview?: boolean}], warnings: string[]}`. The proposed browser cap is 10 MB; Member 4 must confirm provider limits and validate bytes/types/server limits. Processing times out after 45 seconds. Client validation is usability guidance, not a security boundary.

The current endpoints return 503 without service configuration and 501 while pipelines are unimplemented. UI handles 400/415, 413, 429, 500, 501, 503, malformed responses, network failure, cancellation, and timeout. Simulated examples are clearly labeled and require explicit selection. They never appear as live provider results.

Uploaded files, object URLs, extracted fields, corrections, and conversation history are not persisted. Object URLs are revoked on replacement/unmount. OCR confirmation records only the student's review for the current visit; it never approves a document or automatically marks a checklist item prepared.

## Team boundaries

No admin routes/components, Supabase migrations, API handlers, authentication, Lumen provider, or RAG logic are modified. The official handoff opens `https://scholars.pasigcity.gov.ph/` in a separate tab. GabayIskolar does not submit applications or decide eligibility.

## Validation

Run `npm install`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test:applicant`. The test runner uses native TypeScript stripping (Node 22.18+ or Node 24 recommended). Browser verification results and known limits are recorded in the PR. The 16 model and adapter tests exercise persistence reconciliation, source updates, cycle isolation, progress, file validation, citation URLs, pagination, no-evidence behavior, malformed provider responses, multipart consent, and HTTP error recovery.

Executed locally on Node 24.22.1: npm install, typecheck, lint, build, and all 16 applicant tests passed. Lint/build retain one pre-existing admin warning in `auto-textarea.tsx` about the `resize` dependency. No admin code was changed to suppress it. npm reported 9 dependency audit findings (7 moderate, 2 high); dependency upgrades were kept outside this applicant change.

Browser checks used 1440×1000, 820×1024, and 320×740 viewports. Verified public and workspace mobile menus, Escape dismissal/focus restoration, guest onboarding, first-visit empty state, search/no-results/reset/metadata filters, guide navigation, requirement FAQ, four checklist statuses and refresh restoration, summary counts, requirement-to-chat context, live chat/OCR 503 recovery, invalid-file rejection, preview/consent gating, simulated OCR correction/confirmation/reset, and inaccessible-cycle messaging. All applicant routes were checked at 320px with no horizontal overflow. Key captures are in `docs/screenshots`.

Live published-content success and live provider extraction/answers could not be exercised because Supabase and AI/OCR services are not configured in this checkout. Adapter responses and failures were tested with explicit mocks; screenshots use the clearly labeled illustrative guide. No live eligibility or document-verification result is claimed.
