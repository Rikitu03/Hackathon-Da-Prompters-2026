# Admin Portal V2 — Quality-of-Life + Applicant Alignment

**Implementation branch:** `feat/admin-portal` (initially fast-forwarded from `staging` at `fa5059a`). Newer staging commits require a separate reviewed integration; the branch is not automatically rebased.
**Integration policy:** Do not edit, force-push, or merge into `staging` or `main` as part of this work. Member 2 performs manual QA before any integration.

## User-facing changes

- The Admin UI reuses Member 1's **same book-and-wave logo component**, Instrument Sans font and navy/blue/river-blue brand tokens.
- Persistent authenticated Admin shell from PR #6 remains intact, with background data refresh and Supabase roles unchanged.
- Sidebar now identifies everyday jobs: Dashboard, Scholarship guides, Requirements & FAQs, Knowledge & sources, Review & publish.
- An authoring step navigation bar explains the workflow (details → documents/FAQs → sources → review) rather than requiring knowledge of the database schema.
- Dashboard KPI cards, content distribution chart, source approval chart and Needs Attention list all use current, RLS-visible Supabase rows. The read-only demo uses visibly fictional `demoData`, never masquerading as live activity.
- Missing document lists, missing official links and unapproved sources link directly to the relevant editing section.
- Review & publish presents a student-oriented draft rendition of scholarship title, description, dates, portal link, ordered document steps, FAQ details, and sources with approval state. Failed checklist checks point to the relevant editor when possible.
- Charts are not student-submission or personal-activity tracking; the current Applicant application is a guest preparation companion.

## Backend and data boundaries

- The Applicant `/scholarships` list endpoint currently omits `education_level` and `applicant_type`. Do not claim those filters match verified eligibility or invent schema fields. Member 3 must add and validate supported metadata before enabling such claims.
- Checklist preparation progress and onboarding preferences stay in the student's own browser; they are not admin-visible.
- GabayIskolar does not accept/submit official applications. Do not report fictional submission or applicant counts.
- Source approval and RAG indexing belong to authorized server-side reviewer services; do not bypass the publish gate.
- Published cycle editing still requires a versioned workflow. Draft requirement-step and FAQ writes must be made transactional by Member 3 before production.
- Source previews based on saved drafts are **renditions**, not live public preview. Verify the real Applicant pages after publication.
- AI/OCR service health and aggregate applicant usage charts are deferred until privacy-safe telemetry exists.


## Context import: implemented UI versus pending integration

- The **Scholarship guides** page now includes a mobile-responsive, keyboard-accessible file dropzone, file chooser, and downloadable Markdown template.
- Basic local checks: filename extension (PDF/DOC/DOCX/MD/TXT), nonempty file, maximum 8 MB; local text preview is capped at 256 KB.
- The validation feedback has a clear problem and recovery action. Codes 413/415/422 in this interface are **local equivalencies**, not real server HTTP responses. Security validation must always be repeated on the server when upload APIs exist.
- Markdown/TXT with labeled scholarship fields can be parsed **locally**, without AI and without uploading the file. The extracted values remain editable until the administrator chooses **Apply to draft form**; this fills existing scholarship fields and stages cycle values until program draft creation.
- PDF/DOC/DOCX can be selected and basic-checked but **cannot be AI-extracted yet**. The interface explicitly explains the unavailable Lumen integration and does not claim an upload, OCR result, or successful processing.
- Requirement/acquisition instructions, official office locations/hours, and map links are **not yet imported automatically**. Their database contract and source verification need coordination with Member 3 and Member 4.
- Import does not auto-save or publish. Existing admin roles, content review, and publication safeguards remain unchanged.
- UI feedback is visible without relying solely on motion; disclosure uses brief reduced-motion-aware transitions and an accessible Browse files fallback for mobile.

### Import-specific manual QA

1. In `/admin/demo?view=programs`, inspect the navy intro card, file dropzone, typography, button contrast, focus rings, and 320px mobile layout.
2. Download the Markdown template, fill in at least name and description, and upload it. Confirm the labels are detected; edit a value and apply it to the draft form.
3. Verify that **Create draft** still reports unsaved demo status, rather than pretending to write to Supabase.
4. Try `.exe`, an empty `.md`, an oversized file, and a PDF; check the relevant user-friendly rejection/limitation text and absence of fake AI output.
5. Use drag-and-drop on desktop and Browse files on mobile. Confirm keyboard focus and reduced-motion behavior.
6. Live admin write QA must be done only with an authorized development account; avoid uploading student documents or private material to shared test environments.

## Manual QA for Member 2

1. Pull `feat/admin-portal` in Codespaces, preserve `.env.local`; run `npm ci` and `npm run dev`.
2. Confirm shared logo, font, navy sidebar and blue action colors on admin login, all five sections and 320px mobile.
3. Confirm `/admin/demo` charts show fictional records with the demo banner, and live `/admin` charts exactly match Supabase-visible records, including zero-record cases.
4. Follow Details → Requirements & FAQs → Knowledge & sources → Review & publish from the authoring step navigation.
5. Create a draft program, cycle, requirement, ordered steps and FAQs. Reload and verify persistence and the draft preview. Do not use the shared development database for destructive QA without coordination.
6. Confirm unapproved sources remain marked pending; publisher-only actions remain blocked without verified indexing/backend readiness.
7. Compare one genuinely **published** cycle in Applicant Explorer, Requirement Detail and Checklist with the Admin saved records; confirm title, dates, order, FAQ and links.
8. Verify side-navigation stays mounted (no repeated `Checking access securely…`), keyboard focus, screen-reader names and actual mobile Chrome/Safari.
9. Run `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`, `npm run test:applicant`. Automated tests mock Supabase and do not verify real login/write/read behavior.
