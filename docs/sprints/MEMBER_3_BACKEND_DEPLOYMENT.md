# Member 3 — Backend, Database, Security & Deployment Sprint Guide

**Branch:** `feat/backend-db`  
**Owner:** Core system contracts, Supabase, API security, Vercel and integration coordination  
**Primary files:** `supabase/migrations/`, `src/lib/supabase/`, `src/app/api/admin/`, public scholarship read APIs, environment/deploy docs  
**Blocking impact:** M1 cannot use real data; M2 cannot publish; M4 cannot retrieve published KB until core contracts/data exist.

## Deliverable and acceptance

A secure persistent program/cycle/requirement data layer with authenticated admin operations and published-only public reads, plus a working Vercel deployment. Cross-module integration happens before feature polish.

## Sprint 0 — Build and schema contract (Nov 12 11:25 PM–12:15 AM)

- [ ] **M3-00 / P0-01:** Pull main, `npm install`, `npm run typecheck`, `npm run lint`, `npm run build`. Record any initial scaffold error; do not assume untested repo is build-ready.
- [ ] **M3-01:** Create Supabase free project; apply migrations from repository; confirm schema on hosted DB.
- [ ] **M3-02:** Freeze program, cycle, requirement, step, FAQ, source and chunk model in agreement with M1/M2/M4.
- [ ] **M3-03:** Write sample public/admin JSON contract (including error envelope, 400/401/403/404/409/500 behavior).
- [ ] **M3-04 / P0-04:** Audit RLS and authorization. **Known risk in initial scaffold:** migration grants broad admin writes; ensure **only publisher role can change published state**, enforce in BOTH RLS/SQL and server routes.
- [ ] **M3-05:** Provision admin identities through trusted tooling; never expose service-role key in client, and do not allow anonymous signups to become admins.

**Gate G0:** schema applies, build strategy known, roles/contracts frozen. If migration fails, report exact failure and path to recovery immediately.

## Sprint 1 — CRUD and first real vertical slice (12:15–2:00 AM)

- [ ] **M3-10:** Implement published GET `/api/scholarships` and `/api/scholarships/[id]`. Only published cycle within published program visible.
- [ ] **M3-11:** Implement `/api/requirements/[id]` with approved steps/FAQs and safe 404 for inaccessible drafts.
- [ ] **M3-12:** Implement admin create/update draft endpoints with authenticated roles, Zod validation and bounded input.
- [ ] **M3-13:** Implement explicit publisher-only publish operation; validate ready content and source provenance before transaction/atomic status change.
- [ ] **M3-14:** Prepare cycle-specific fixture seed from M2; do not include real student identities or private documents.
- [ ] **M3-15:** Pair with M2 and M1 on real publish → anonymous read in one complete test.

**Gate G1:** persisted admin edit publishes to public portal without code changes; draft data remains inaccessible to anon.

## Sprint 2 — RAG retrieval + deployment support (2:00–4:00 AM)

- [ ] **M3-20:** Provide M4 a safe published knowledge retrieval method scoped to active cycle/requirement, preserving source ID/version and review date.
- [ ] **M3-21:** Confirm FTS indexes and non-approved chunks cannot leak through public or AI APIs.
- [ ] **M3-22:** Add server-side request validation/rate limiting where feasible; define small upload constraints for OCR.
- [ ] **M3-23 / P0-11:** Import repo to Vercel and configure environment variables (`NEXT_PUBLIC_*` only for safe public credentials, Lumen API secrets server-only).
- [ ] **M3-24:** Confirm `/api/health` and basic anonymous/public vs protected/admin behavior on deployed URL.
- [ ] **M3-25:** Provide rollback deployment/commit procedure and keep a known-good deployment.

**Gate G2:** real public DB and Lumen connections coexist in deployed environment; no keys in browser or repo.

## Sprint 3 — Integration/security QA (8:30–11:30 AM)

- [ ] **M3-30:** Run authorization matrix: anonymous, editor, publisher; prevent self-elevation and unauthorized publish.
- [ ] **M3-31:** Verify change publication invalidates stale RAG retrieval; old versions not presented as current.
- [ ] **M3-32:** Validate 404/400/503 branches and production logs; redact personal data and secrets.
- [ ] **M3-33:** Ensure build/lint/typecheck, database migrations, and deployed URL succeed after merges.
- [ ] **M3-34:** Test full sequence together: admin → public requirement → AI retrieval → OCR + correction.
- [ ] **M3-35:** Verify GitHub main is stable, feature PRs reviewed and no repository surprises.

**Gate G3:** deploy passes core e2e and security smoke tests. Critical failed auth/secret tests block release.

## Sprint 4 — Freeze and release (11:30 AM–1:30 PM)

- [ ] **M3-40:** Freeze backend schema/APIs; fix only P0 integration or security failures.
- [ ] **M3-41:** Record deployment URL, final verified branch and main commit SHA for submission team.
- [ ] **M3-42:** Support README environment and migration/run instructions; do not include private values.
- [ ] **M3-43:** Confirm demo data and provider configuration can be reset if a rehearsal damages state.
- [ ] **M3-44:** Final successful build + smoke test before 1:30 PM.

## Critical security requirements

- No public INSERT/UPDATE/DELETE to scholarship tables.
- A role of editor may maintain drafts; ONLY designated publisher role can publish.
- Draft/archived guides and unapproved source chunks are not visible to anonymous retrieval.
- All admin authorization occurs on server + DB/RLS, not merely hidden controls.
- Never put Lumen secret or Supabase service-role key in `NEXT_PUBLIC_*`.
- OCR file limits, explicit consent and transient handling; no user documents persisted for demo.

## Handoff matrix

| Consumer | Provide | Acceptance |
|---|---|---|
| **M1** | Published GETs and JSON samples | Applicant checklist renders real data |
| **M2** | Authenticated CRUD/save/publish APIs | Admin persists and publishes verified guide |
| **M4** | Scoped published knowledge + source/version | Grounded retrieval excludes drafts |
| **All** | Vercel URL and integration checklist | Live demo operable end-to-end |

**Escalation:** If schema or permissions change, notify all three owners before merging. Never make a late destructive schema change without testing rollback.  
**Out of scope:** FastAPI, container orchestration, applicant identity/official submission backend, heavy ML.
