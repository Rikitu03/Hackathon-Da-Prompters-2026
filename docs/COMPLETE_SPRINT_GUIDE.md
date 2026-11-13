<!-- Mirrors the verified Google Doc as of November 12, 2026. Member checklists in docs/sprints expand tasks for the four owners. -->

> **Canonical Google Doc:** [GabayIskolar — Complete Sprint Execution & Integration Guide](https://docs.google.com/document/d/1sOvB8EGy4gJJ7iS6tg5pV_ER56g4Om-INA3V9wil5uk/edit)  
> **Project:** GabayIskolar / OVERCLOCK 2026 · **Branch:** `guide/complete-sprint-guide`  
> **Important:** This is a plan, not proof that tickets or integrations are implemented. All sample scholarship requirements must be checked against official publications.

# GabayIskolar — 4-Member Sprint Execution & Integration Guide

*The Prompters | OVERCLOCK 2026 | Operational plan | November 12–13, 2026 (Asia/Manila)*

## 1. Mission, scope and non-negotiable delivery

Mission: Deliver a verifiable Pasig City scholarship preparation prototype by the November 13, 2026, 2:00 PM code-freeze deadline. One admin can publish source-backed requirements; one applicant can see them as guided checklist journeys; Lumen AI Chat returns a grounded answer; Lumen OCR extracts and allows correction of a fictional sample document. We do not build official scholarship submission, approval, payments, broad document support, or a separate FastAPI backend.

Definition of minimum success: public deployed URL, functioning admin-to-applicant publish/read, one approved scholarship cycle with two or three documented requirements, one working live Lumen integration (both OCR and Chat preferred), reviewer-correctable extraction, source-linked RAG, readable README and a presentation of at most 10 slides. Provider failure must be disclosed; never present a mock call as a live integration.

Technology baseline: Next.js App Router + TypeScript + Tailwind CSS + shared shadcn/ui + Next.js Route Handlers; Supabase PostgreSQL/Auth with RLS; PostgreSQL full-text retrieval; event-provided Lumen OCR/AI Chat; Vercel Hobby for eligible noncommercial demo. Software is free/open source or has constrained free tiers; Lumen is funded by temporary hackathon credits, not permanently free. No LangChain/vector DB/Python backend for MVP.

## 2. Team roles, ownership, and dependencies

### Member 1 — Applicant UX/UI Lead

Owns src/app/(applicant), src/components/applicant, shared design-system initialization with Member 2. Builds discovery, detail, onboarding questions, checklist, requirement journey, OCR review UI, chat UI, responsive/accessibility states. Depends on M3 for read APIs, M4 for OCR/Chat contracts, M2 for trusted content. Can progress with approved fixtures and frozen types. Handoff: clickable student journey and documented props/API requirements.

### Member 2 — Admin UX/Content Lead

Owns src/app/admin, src/components/admin, verified scholarship seed content, FAQ and journey authoring, product copy and presentation coordination. Depends on M3 for auth/CRUD/publishing and M4 for source ingestion contract. Can progress with locally mocked form responses, source references and preview. Handoff: signed-off content package plus functional draft/publish UI.

### Member 3 — Backend/Data/Deployment Lead

Owns Supabase project, migrations, RLS, admin auth roles, CRUD/read APIs, publication and schema, initial Vercel project/environment, and database security testing. Defines contracts with team before building. Depends on M2 for content fields and M4 for knowledge metadata. Handoff: tested database and live read/write endpoints; deployed URL and environment variable ownership. Critical path: unblocks M1, M2 and M4.

### Member 4 — Lumen/RAG Lead

Owns Lumen sandbox connectivity, OCR adapter, retriever, grounded Lumen AI Chat adapter, request schemas, document review logic and AI test corpus. Depends on M3 for published knowledge schema and M2 for vetted sources. Can test provider against approved text fixtures immediately. Handoff: one live OCR extraction, one live grounded chat result with actual source reference, robust no-source/error response. Critical path: mandatory AI deliverable.

## 3. Hard blockers and mitigation

BLOCK-01 M3→M1: scholarship APIs unfinished. Mitigation: M1 uses a shared typed fixture and empty/loading/error states. Exit: GET published program/cycle/requirements returns agreed JSON.

BLOCK-02 M3→M2: no auth/CRUD/publish. Mitigation: M2 builds validated forms and preview on fixtures. Exit: authenticated admin can write a draft and publish only with server/RLS authorization.

BLOCK-03 M3→M4: knowledge index unavailable. Mitigation: M4 tests retrieval against an in-memory verified chunk fixture. Exit: published-only database retrieval with cycle and requirement filters.

BLOCK-04 M2→M4: no verified content. Mitigation: M2 supplies one approved sample cycle and at least 2 requirements with authoritative source URLs first; M4 must not make up official rules. Exit: signed-off content record/seed.

BLOCK-05 Lumen provider→M4: authentication/endpoint uncertainty. Mitigation: isolated connectivity spike as first task; verify HTTP method/headers/body and error conditions using official sandbox docs. Exit: real successful call captured in a safe test log with credentials redacted.

BLOCK-06 M4→M1: no OCR/Chat response schema. Mitigation: freeze response examples before implementation; mock only in clearly labeled development fixtures. Exit: live API response validates with shared Zod schema.

BLOCK-07 Deployment→ALL: no deployed environment. Mitigation: M3 deploys blank app early, configures public and private variables separately, tests /api/health. Exit: stable preview URL and secret-safe logs.

## 4. Interface and data contract freeze

Freeze schemas immediately: ScholarshipProgram {id,title,description,status}; ApplicationCycle {id,programId,academicYear,applicantType,startDate,endDate,status,sourceUrl}; Requirement {id,cycleId,title,description,required,position,sourceId}; JourneyStep {id,requirementId,position,instruction}; KnowledgeSource {id,cycleId,title,url,reviewedAt,approved,version}; ChatRequest {cycleId,requirementId?,message}; ChatResponse {answer,sources:[{sourceId,title,url?}],grounded}; OCRReviewResponse {rawText,fields:[{key,label,value,needsReview}],warnings:[]}. These are app contracts, NOT native Lumen formats. Use UUID strings in the actual database and conversion adapters as required.

Public endpoints: GET /api/scholarships, GET /api/scholarships/[id], GET /api/requirements/[id]. Protected endpoints: POST /api/admin/programs, PATCH /api/admin/programs/[id], POST /api/admin/publish. AI endpoints: POST /api/ai/chat JSON, POST /api/ai/ocr multipart with consent. M3 owns API persistence/authorization; M4 owns AI request orchestration. Shared types and Zod schemas should be reviewed jointly; avoid independent contract changes after freeze.

Publish invariant: never serve drafts, unapproved source text, archived or outdated chunks as current knowledge. Source review and program-cycle publication must be checked together. Publishing a program without published cycle/requirements is not a complete visible guide. Do not allow editor-only accounts to publish without publisher role checks on both server and RLS.

## 5. Sprint schedule — timeboxed plan

Planning baseline: November 12 at about 11:23 PM to November 13 at 2:00 PM Philippine time. Adjust exact checkpoints based on live progress. Registration and event activities may limit uninterrupted work; reserve noncoding/rest time and work in small validated slices. This is a proposed execution schedule, not a report of work already done.

### Sprint 0 — Contract and platform stabilization (Nov 12, 11:25 PM–12:15 AM)

ALL: 15-minute kickoff. Confirm repo owner, branch, selected scholarship cycle, MVP definition, component setup, APIs, demo script, reviewers and no-real-data policy. M1 initializes shadcn/ui + shared tokens in a small PR. M2 delivers verified source list and two sample journeys (marked illustrative until checked). M3 verifies npm install/build, initializes Supabase and schema, protects admin. M4 inspects Lumen docs and verifies Chat/OCR calls. Milestone G0: main builds and the external API connectivity risks are known. If not, log explicit blockers and proceed with independent fixture work.

### Sprint 1 — Core vertical slice (12:15–2:00 AM)

M1: discovery/detail/checklist views using frozen fixtures; persist progress locally. M2: program/cycle form, requirement and FAQ editor, source provenance; seed approved content. M3: database migrations, RLS, published read endpoints, draft/publish endpoint with role validation. M4: implement isolated provider adapters, basic retrieval filtering, output schema. Milestone G1: administrator publishes one guide and applicant reads same persisted data, OR show exactly which backend piece remains missing.

### Sprint 2 — AI feature integration (2:00–4:00 AM)

M1: chat drawer, document upload/review, correction states and source chips. M2: populate accurate FAQ and source sections; QA program text. M3: secure document request validation, environment and deployment readiness, API integration support. M4: published-only retrieval + Lumen Chat and OCR, test normal answer and unsupported answer. Milestone G2: live grounded chat plus OCR/correction on fictional document. Do not add more programs until G2.

### Recovery and event transition (4:00–8:30 AM)

Allow rest, backup and travel/registration, subject to actual team logistics; do not count this as guaranteed uninterrupted coding time. Preserve a stable deployable main branch and record remaining blockers. Event opening precedes official polish/testing period. Avoid unsafe rushed changes to security controls.

### Sprint 3 — Event-day integration and QA (8:30–11:30 AM)

All: merge small PRs with smoke tests, inspect actual deployed environment, verify published content gating and user flows. M1 mobile/accessibility polish; M2 content accuracy and presentation narrative; M3 API/RLS tests and Vercel environment; M4 live provider testing and citations/no-source behavior. Gate G3 at 11:30 AM: full demonstration walk-through on deployed URL or a contingency plan that accurately labels unavailable features.

### Sprint 4 — Submission hardening (11:30 AM–1:30 PM)

Lunch and any organizer schedule obligations take precedence. Restrict scope to P0 defects, errors, secret scanning, README, screenshots and ≤10-slide deck. Prepare a preconfigured fictional applicant/document and a backup screen recording only as backup evidence (not fake live service). Gate G4: repo public, commits present, deploy stable, credits/credentials secured, full demo timed, presentation and official submission details complete.

### Code freeze buffer (1:30–2:00 PM)

No new features. One designated owner checks repository state, final commit SHA, release/deployment health, presentation and submission instructions. Submit before 2:00 PM; if organizer rules require submission by a different exact process, follow their authoritative notice. Do not claim submission is complete unless actually confirmed.

## 6. Ticket backlog with owners, dependencies and acceptance

P0-01 Project builds; owner M3 with M1; dependency npm/package consistency; acceptance: npm install, npm run typecheck, npm run lint and npm run build exit successfully.

P0-02 Initialize shadcn/ui and visual tokens; owner M1 with M2; dependency stable Next app; acceptance: shared Button/Card/Input components render without duplicated installs or CSS regressions.

P0-03 Approve sample cycle/source package; owner M2; dependency official publications; acceptance: source URL, reviewed date, applicability, requirements and two or three journeys recorded.

P0-04 Supabase schema and admin RLS; owner M3; dependency project keys kept secret; acceptance: anon cannot write/read drafts; editor drafts only; publisher may publish; approved content only public.

P0-05 Public scholarship read endpoint; owner M3; dependency schema and seeded published guide; acceptance: returns cycle-specific requirements and safe 404/empty behavior.

P0-06 Admin draft/editor/publish UI; owner M2 with M3; dependency API contract; acceptance: user can create/modify, save, preview and publish verified guide, persistence confirmed after refresh.

P0-07 Student checklist/journey; owner M1 with M2; dependency public endpoint/content; acceptance: responsive journey, working progress and error/empty states.

P0-08 Lumen live connectivity verification; owner M4; dependency temporary sandbox credentials and docs; acceptance: authenticated success, response parsed safely, secrets absent from logs and Git.

P0-09 Retrieval + Lumen grounded Chat; owner M4 with M3; dependency knowledge indexed and published; acceptance: answer references approved source; unsupported/expired question refuses unsupported claim.

P0-10 Lumen OCR + corrections; owner M4 with M1; dependency provider endpoint and upload interface; acceptance: fictional document processed, field editable, mismatch warned not rejected, provider errors graceful.

P0-11 Deployed integration and smoke test; owner M3, all review; dependency G1/G2; acceptance: public URL, live critical flows, env secrets private, deployment stable.

P0-12 README + pitch deck; owner M2 with all; dependency product truth; acceptance: problem, solution, Lumen use, local run commands, ethical constraints and ≤10 slides, submitted on time.

P1-01 bilingual chat copy and curated synonym variants (M1/M4); P1-02 version change notice (M2/M3); P1-03 polished microinteraction (M1); P1-04 additional sample requirement (M2). P2: vector embeddings, applicant auth, analytics, bulk admin upload, full applicant submission. Stop P1/P2 when any P0 risk is unresolved.

## 7. Integration rules and repository workflow

Feature branches: feat/applicant-ui (M1), feat/admin-portal (M2), feat/backend-db (M3), feat/lumen-rag (M4). The repository currently has starter scaffold files; these are NOT proof that auth, CRUD, RAG or Lumen integrations work. Keep main deployable. Pull the latest main before PR; never force-push shared main. Make small commits and merge contract-compatible changes frequently.

Every PR must identify owner, impacted API/schema, screenshots when UI-related, test evidence, secret/security assessment and rollback note. Require one peer reviewer when practical. M3 owns integration/deployment sequence; M4 validates AI endpoints; M2 signs off content; M1 signs off student usability. Use one clearly designated integration coordinator to resolve contract conflicts.

Resolve disagreements: API shape—M3 decides after M1/M2/M4 review; knowledge grounding and response safety—M4 decides with M2 source approval; design tokens—M1 decides with M2; content authority—M2 decides by source evidence; deploy/production secrets—M3 decides. Escalate blockers immediately rather than waiting for a scheduled meeting.

## 8. Test matrix and quality gates

SEC-01 anonymous user cannot create/edit/publish; SEC-02 admin role cannot self-elevate; SEC-03 drafts/unapproved knowledge invisible via public API and RAG; SEC-04 Lumen credentials never exposed or logged. DATA-01 published admin change reaches student; DATA-02 version update invalidates old source chunks; DATA-03 invalid dates and missing sources block publish. AI-01 answer cites current relevant source; AI-02 unknown question expresses uncertainty; AI-03 malicious uploaded text does not override instructions; AI-04 OCR error shows retry and original file remains under user control. UX-01 full applicant journey on small phone; UX-02 keyboard focus, input labels and reduced motion; UX-03 self-prepared never labeled officially approved. OPS-01 deployed URL loads; OPS-02 API health endpoint responds; OPS-03 all tests pass in same environment as demo.

Definition of Done (per ticket): code merged into main; TypeScript typecheck and production build pass; user-facing states include loading/empty/error; schema/auth is correct; reviewed against frozen contract; relevant UAT scenario demonstrated; no secrets or real personal docs in repository; owner hands over a 30-second explanation of what they built.

## 9. Blocker register, triage and scope fallback

Record each blocker as: ID, time discovered, owner, dependency, impact on P0, workaround, next check, status. Severity Critical = stops required feature or breaches privacy; High = blocks one vertical slice; Medium = cosmetic or deferred. For a critical blocker, raise it to M3 integration coordinator and involved owner immediately; use a mock only for UI testing and label it clearly.

If Supabase is delayed: M1/M2 continue typed fixtures; M3 fixes schema/auth; do not publicly pretend mock publishing is persistent. If OCR is delayed: prioritize live Chat, transparently mark OCR feature unavailable; but continue efforts because both are integral to our pitch. If Chat is delayed: prioritize real OCR and ensure guide functions without AI. If no trusted documents: do not invent requirements; use an explicitly illustrative prototype dataset and official portal redirect. If Vercel fails: retain locally working app, diagnose deployment with M3, but disclose undeployed state.

Scope triage order: preserve security/privacy → preserve one real Lumen tool integration → preserve admin publish/read and checklist → preserve source-grounded Chat → preserve OCR/correction → content expansion → visual polish. Do not trade real data protection for a more impressive demo.

## 10. Communication, reporting and demo ownership

Each work checkpoint: every member reports DONE (commit/PR link), NEXT (one short deliverable), BLOCKED BY (member/tool/dependency), ETA if known and exact proof needed. Unresolved interface changes require an explicit written contract revision. The team should perform a short cross-functional demo after each gate rather than waiting for final merge.

Suggested demo roles: M2 introduces Pasig student problem, program and SDG 4; M3 shows publishing and backend guardrails; M1 demonstrates student checklist/journey; M4 explains real OCR, retrieval and grounded Lumen Chat; everyone answers questions about the full architecture. Demonstration order: admin edit → publish → applicant loads guide → OCR review → grounded AI question → official portal handoff.

README requirements: problem/target user; independently developed prototype disclaimer; architecture; env.example instructions; database migration; Lumen integration and limitations; run/build/test instructions; security/privacy; deployment URL; acknowledgements and team contributions. Presentation ≤10 slides. Never include Lumen keys, applicant records or unverified government endorsement.

## 11. Source and deployment references

Repository: https://github.com/Rikitu03/Hackathon-Da-Prompters-2026 . Official application link: https://scholars.pasigcity.gov.ph/ . Source of event constraints: organizer email supplied to the team. This guide is a plan, not evidence that its milestones have been achieved. The team should validate the official scholarship requirements for the selected active cycle and verify current provider/free-tier limits before final deployment.


---

## Per-member execution checklists (expanded handoffs)

- [Member 1 — Applicant UI](./sprints/MEMBER_1_APPLICANT_UI.md)
- [Member 2 — Admin & Content](./sprints/MEMBER_2_ADMIN_CONTENT.md)
- [Member 3 — Backend, Security & Deployment](./sprints/MEMBER_3_BACKEND_DEPLOYMENT.md)
- [Member 4 — Lumen & RAG](./sprints/MEMBER_4_LUMEN_RAG.md)
- [Team Handoff Matrix](./sprints/README.md)
