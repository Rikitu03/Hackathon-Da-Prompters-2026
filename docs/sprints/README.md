# GabayIskolar — Member Sprint Guides & Integration Handoffs

Source of truth for the overall schedule: [Complete Sprint Execution Guide](../COMPLETE_SPRINT_GUIDE.md). The following are **task-oriented supplements** to the original Google Doc; they do not replace or amend official hackathon rules.

| Member | Role | Branch | Detailed guide |
|---|---|---|---|
| M1 | Applicant Frontend / UI | `feat/applicant-ui` | [Member 1](./MEMBER_1_APPLICANT_UI.md) |
| M2 | Admin Frontend / Verified Content | `feat/admin-portal` | [Member 2](./MEMBER_2_ADMIN_CONTENT.md) |
| M3 | Backend / Database / Deployment | `feat/backend-db` | [Member 3](./MEMBER_3_BACKEND_DEPLOYMENT.md) |
| M4 | Lumen OCR / AI Chat / RAG | `feat/lumen-rag` | [Member 4](./MEMBER_4_LUMEN_RAG.md) |

## Sprint windows (Asia/Manila)

| Sprint | Target window | Gate |
|---|---|---|
| 0: Contract + stabilization | Nov 12, 11:25 PM–Nov 13, 12:15 AM | G0: agreed contracts, platform viable, provider risk identified |
| 1: Core vertical slice | Nov 13, 12:15–2:00 AM | G1: admin publishes; applicant sees same persisted guide |
| 2: AI integration | 2:00–4:00 AM | G2: live grounded Chat + OCR correction on fictional sample |
| Recovery / event transition | 4:00–8:30 AM | Rest, backups, registration/opening; *not* guaranteed coding time |
| 3: Integration + QA | 8:30–11:30 AM | G3: deployed end-to-end demo rehearsed |
| 4: Hardening + pitch | 11:30 AM–1:30 PM | G4: deploy, docs, slides, evidence complete |
| Freeze buffer | 1:30–2:00 PM | Submit before 2:00 PM; no new features |

## Who blocks whom?

| Producer | Consumer | Contract / artifact | Fallback while waiting | Exit / acceptance |
|---|---|---|---|---|
| **M3** | M1 | Published program/cycle/requirement GET APIs + schema | Typed scholarship fixtures | Real data loads; no draft leaks |
| **M3** | M2 | Admin auth, CRUD, publish permissions | Mock form saves *labeled as fixtures* | Admin can save draft and publish through real API |
| **M3** | M4 | Knowledge index and published-only read path | Approved in-memory chunks | Scoped retrieval returns reviewed source IDs |
| **M2** | M4 | Verified source pack, requirements, FAQs | Synthetic test fixtures, never labeled official | Current cycle has reviewed source links |
| **M4** | M1 | Chat + OCR JSON shapes, provider behavior | Typed mock responses for UI tests | Live endpoints produce schema-valid response |
| **M1** | M2 | Shared tokens/shadcn components | Use agreed simple Tailwind primitives | UI library PR merged without conflicts |
| **M3** | All | Working deployment, DB configuration | Run local app; diagnose deployed environment | Public URL and API smoke tests pass |
| **M4** | All | Mandatory Lumen integration | Continue non-AI work, openly disclose outage | Provider-backed OCR or Chat successful |

## Interface freeze: before parallel implementation

- [ ] Confirm canonical repository, `main` build and owner of each feature branch.
- [ ] Agree on `ScholarshipProgram`, `ApplicationCycle`, `Requirement`, `RequirementStep`, `KnowledgeSource`, `ChatRequest`, `ChatResponse`, `OCRReviewResponse`.
- [ ] Freeze exact public/admin/AI route names; write mock fixtures with identical shapes.
- [ ] Agree on `draft`, `published`, `archived` visibility, approval, and source versions.
- [ ] Confirm sample Pasig scholarship cycle from official published materials; no invented dates or requirements.
- [ ] Verify how to authenticate to Lumen; keep keys server-only and outside Git.
- [ ] Agree that 'Prepared' means student-marked preparation; never 'Approved by government'.

## Definition of Done for every ticket

- [ ] Implemented on owner branch and reviewed.
- [ ] Follows agreed schema and does not silently change API contract.
- [ ] TypeScript check, lint and production build pass where available.
- [ ] Covers loading, empty, error and unauthorized states as applicable.
- [ ] Meets admin RLS, privacy and source-grounding expectations.
- [ ] Demo evidence exists (screenshot/test log/PR), with credentials redacted.
- [ ] Integrated into `main` when appropriate; no forced push to shared branch.

## Integration cadence and escalation

Use the short handoff format: **Done / Next / Blocked by / Required artifact or endpoint / Evidence (commit or PR)**. Escalate a **critical** blocker immediately to M3 (integration owner), except model grounding and source quality issues jointly owned by M4 and M2. Never wait until all four modules are finished to merge.

**Suggested integration order:** skeleton compiles → one source-backed cycle seeded → admin publish/read → applicant checklist → Chat retrieval → OCR corrections → deployed QA → freeze and pitch.

**GitHub repo:** https://github.com/Rikitu03/Hackathon-Da-Prompters-2026  
**Google Doc:** https://docs.google.com/document/d/1sOvB8EGy4gJJ7iS6tg5pV_ER56g4Om-INA3V9wil5uk/edit
