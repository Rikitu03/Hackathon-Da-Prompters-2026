# Admin Portal V2 — Quality-of-Life + Applicant Alignment

**Implementation branch:** \`feat/admin-portal\` (fast-forwarded from latest \`staging\`).
**Integration policy:** Do not edit, force-push, or merge into \`staging\` or \`main\` as part of this work. Member 2 performs manual QA before any integration.

## User-facing changes

- The Admin UI reuses Member 1's **same book-and-wave logo component**, Instrument Sans font and navy/blue/river-blue brand tokens.
- Persistent authenticated Admin shell from PR #6 remains intact, with background data refresh and Supabase roles unchanged.
- Sidebar now identifies everyday jobs: Dashboard, Scholarship guides, Requirements & FAQs, Knowledge & sources, Review & publish.
- An authoring step navigation bar explains the workflow (details → documents/FAQs → sources → review) rather than requiring knowledge of the database schema.
- Dashboard KPI cards, content distribution chart, source approval chart and Needs Attention list all use current, RLS-visible Supabase rows. The read-only demo uses visibly fictional \`demoData\`, never masquerading as live activity.
- Missing document lists, missing official links and unapproved sources link directly to the relevant editing section.
- Review & publish presents a student-oriented draft rendition of scholarship title, description, dates, portal link, ordered document steps, FAQ details, and sources with approval state. Failed checklist checks point to the relevant editor when possible.
- Charts are not student-submission or personal-activity tracking; the current Applicant application is a guest preparation companion.

## Backend and data boundaries

- The Applicant \`/scholarships\` list endpoint currently omits \`education_level\` and \`applicant_type\`. Do not claim those filters match verified eligibility or invent schema fields. Member 3 must add and validate supported metadata before enabling such claims.
- Checklist preparation progress and onboarding preferences stay in the student's own browser; they are not admin-visible.
- GabayIskolar does not accept/submit official applications. Do not report fictional submission or applicant counts.
- Source approval and RAG indexing belong to authorized server-side reviewer services; do not bypass the publish gate.
- Published cycle editing still requires a versioned workflow. Draft requirement-step and FAQ writes must be made transactional by Member 3 before production.
- Source previews based on saved drafts are **renditions**, not live public preview. Verify the real Applicant pages after publication.
- AI/OCR service health and aggregate applicant usage charts are deferred until privacy-safe telemetry exists.

## Manual QA for Member 2

1. Pull \`feat/admin-portal\` in Codespaces, preserve \`.env.local\`; run \`npm ci\` and \`npm run dev\`.
2. Confirm shared logo, font, navy sidebar and blue action colors on admin login, all five sections and 320px mobile.
3. Confirm \`/admin/demo\` charts show fictional records with the demo banner, and live \`/admin\` charts exactly match Supabase-visible records, including zero-record cases.
4. Follow Details → Requirements & FAQs → Knowledge & sources → Review & publish from the authoring step navigation.
5. Create a draft program, cycle, requirement, ordered steps and FAQs. Reload and verify persistence and the draft preview. Do not use the shared development database for destructive QA without coordination.
6. Confirm unapproved sources remain marked pending; publisher-only actions remain blocked without verified indexing/backend readiness.
7. Compare one genuinely **published** cycle in Applicant Explorer, Requirement Detail and Checklist with the Admin saved records; confirm title, dates, order, FAQ and links.
8. Verify side-navigation stays mounted (no repeated \`Checking access securely…\`), keyboard focus, screen-reader names and actual mobile Chrome/Safari.
9. Run \`npm run typecheck\`, \`npm run lint\`, \`npm run build\`, \`npm run test:e2e\`, \`npm run test:applicant\`. Automated tests mock Supabase and do not verify real login/write/read behavior.
