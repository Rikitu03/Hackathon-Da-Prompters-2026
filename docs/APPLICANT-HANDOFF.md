# Applicant frontend — Member 1

Member 1 owns the public homepage at `/` and the applicant workspace. This implementation replaces the emerald landing placeholder at `src/app/page.tsx`; preserve that route when integrating into staging. Admin and backend code remain owned by Members 2–4.

**Merged-checkout update, 13 November 2026:** this frontend is now merged from staging into `feat/lumen-rag`. OCR and local chat/RAG routes are implemented. The backend contract in [API_CONTRACTS.md](API_CONTRACTS.md) and the gap list in [STATUS.md](STATUS.md) take precedence over the original integration assumptions below. This handoff describes frontend behavior, not proof that the combined live flow has passed.

## Routes and design

`/` → `/onboarding` → `/dashboard` → `/my-checklist` → `/requirements/[id]` → `/summary`. Discovery uses `/scholarships` and `/scholarships/[id]`. Support tools are `/assistant` and `/document-review`.

The blue/white visual world follows the supplied Pasig student reference. Instrument Sans is bundled under its OFL license. The original generated illustration and its provenance are in `public/illustrations`. Lucide supplies interface icons. Motion is limited to the homepage entrance and respects reduced motion. Applicant CSS is scoped to `.applicant-ui`; admin globals were not changed.

## Published data

The typed browser adapter in `src/lib/applicant/api.ts` consumes the existing public scholarship and requirement endpoints. Only published programs/cycles appear. The current list response does not include education/classification/source metadata; filters are available only for metadata actually supplied. Full detail views display source references and review dates when provided. No eligibility rules, dates, or offerings are invented. The illustrative walkthrough is an explicit user choice, labeled throughout; it is never silently substituted for a failed API request.

## Guest persistence

No applicant authentication exists. Preferences use `gabayiskolar:preferences:v1`; preparation uses `gabayiskolar:preparation:v1:<cycleId>:<requirementId>`. Only preferences and self-managed statuses are stored. A signature of each requirement and its sources detects changed guidance and moves the item to Needs review until the student explicitly updates it. Removed requirements do not count in progress. Storage failures show a warning. There is no cross-device sync.

## Member 4 integration

Chat posts `{cycleId, requirementId?, message}` to `/api/ai/chat`, with a shared 500-character limit and a 55-second client timeout. Grounded responses render inline numbered citations and matching source chips. Fixed server notices retain their text and safe HTTPS `officialUrl`, and appear as system notes with no Gabay attribution. A grounded response without sources becomes the fixed no-evidence notice. A stale requirement link falls back to the whole guide. Closed cycles disable the composer using Manila calendar dates. Chat privacy copy explains that Lumen stores messages; history remains in memory in this app.

OCR posts multipart `file` and `consent=true` to `/api/ai/ocr`, only after explicit consent. The browser accepts JPG, PNG and PDF up to exactly 4 MiB; the server also supports WebP/TIFF and checks file bytes. The client timeout is 70 seconds. Review retains `rawText`, editable fields, `needsReview`, `originalText`, per-field and document warnings, and the response disclaimer. Consent explicitly states that Lumen keeps an organization-visible copy with no delete option, and permits sample or fictional documents only. Retrying extraction requires a user action and uploads again. Client validation is usability guidance, not a security boundary.

The implemented endpoints return 503 when configuration or a kill switch prevents use; they are no longer 501 stubs. The frontend retains legacy 501 handling as well as HTTP/network/cancellation/timeout recovery. Simulated examples remain explicit user choices.

### Connected preparation journey

The five stages share their names across the landing page and workspace rail: Choose a guide → Prepare your checklist → Check a document → Ask Gabay → Take the official step. The rail shows checklist counts and memory-only document/question activity. Onboarding offers elementary Grades 4–6, junior high Grades 7–10, senior high Grades 11–12 and college/university, with new/renewing choices. These preferences do not establish eligibility or filter absent published metadata.

A requirement launches document review and Ask Gabay with the same context. OCR confirmation counts a review for the visit without changing preparation status; students choose statuses themselves. Visit activity resets on cycle change or refresh. Unpublished saved guides explain how to select another guide. The summary uses the selected cycle's safe HTTPS destination, with the general Pasig portal as a secondary link when different.

Uploaded files, object URLs, extracted fields, corrections, and conversation history are not persisted. Object URLs are revoked on replacement/unmount. OCR confirmation records only the student's review for the current visit; it never approves a document or automatically marks a checklist item prepared.

## Team boundaries

The alignment changes applicant screens, shared limits/calendar helpers, and AI citation normalization. No admin routes/components, Supabase migrations, authentication or Lumen wire-format adapters are changed. The official handoff opens the selected cycle's HTTPS `officialUrl` in a separate tab, falling back to `https://scholars.pasigcity.gov.ph/`. GabayIskolar does not submit applications or decide eligibility.

## Validation

Run `npm install`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test:applicant`. The test runner uses native TypeScript stripping (Node 22.18+ or Node 24 recommended). Browser verification results and known limits are recorded in the PR. The 16 model and adapter tests exercise persistence reconciliation, source updates, cycle isolation, progress, file validation, citation URLs, pagination, no-evidence behavior, malformed provider responses, multipart consent, and HTTP error recovery.

Executed locally on Node 24.22.1: npm install, typecheck, lint, build, and all 16 applicant tests passed. Lint/build retain one pre-existing admin warning in `auto-textarea.tsx` about the `resize` dependency. No admin code was changed to suppress it. npm reported 9 dependency audit findings (7 moderate, 2 high); dependency upgrades were kept outside this applicant change.

Browser checks used 1440×1000, 820×1024, and 320×740 viewports. Verified public and workspace mobile menus, Escape dismissal/focus restoration, guest onboarding, first-visit empty state, search/no-results/reset/metadata filters, guide navigation, requirement FAQ, four checklist statuses and refresh restoration, summary counts, requirement-to-chat context, live chat/OCR 503 recovery, invalid-file rejection, preview/consent gating, simulated OCR correction/confirmation/reset, and inaccessible-cycle messaging. All applicant routes were checked at 320px with no horizontal overflow. Key captures are in `docs/screenshots`.

Live published-content success and live provider extraction/answers could not be exercised because Supabase and AI/OCR services are not configured in this checkout. Adapter responses and failures were tested with explicit mocks; screenshots use the clearly labeled illustrative guide. No live eligibility or document-verification result is claimed.
