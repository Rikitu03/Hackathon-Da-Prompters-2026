# Member 2 — Administrator Portal & Verified Content Sprint Guide

**Branch:** `feat/admin-portal`  
**Owner:** Admin UX, authoritative content collection and pitch coordination  
**Primary files:** `src/app/admin/`, `src/components/admin/`, sample content package agreed with M3/M4  
**Unblockers:** M3 (authenticated CRUD), M4 (knowledge intake), M1 (shared UI tokens)

## Deliverable and acceptance

An authorized **prototype** content administrator creates a scholarship, configures an application cycle and documented requirements, saves a draft, previews the applicant journey, and publishes a verified guide. No implication of Pasig City endorsement.

## Sprint 0 — Verified source package and admin contract (Nov 12 11:25 PM–12:15 AM)

- [ ] **M2-00 / P0-03:** Confirm ONE specific scholarship cycle from reliable current Pasig City publications. Capture exact title, applicant classification, academic year, source URL, review date, and whether application dates are verified.
- [ ] **M2-01:** Prepare 2–3 detailed requirements: title, issuing office, actionable steps, documents to bring *if verified*, FAQs and source reference.
- [ ] **M2-02:** Flag any missing/unverified policy content as 'Confirm with scholarship office'; never invent fees, deadlines, exemptions or accepted alternatives.
- [ ] **M2-03:** Freeze program/cycle/requirement/FAQ/source metadata fields with M3 and M4.
- [ ] **M2-04:** Coordinate form components/shadcn UI with M1 and add admin navigation sketch.

**Gate G0 handoff to M3/M4:** One source-backed seed dataset plus source URLs; gaps and assumptions clearly labeled.

## Sprint 1 — Admin builder (12:15–2:00 AM)

- [ ] **M2-10:** Admin list/dashboard: Draft/Published/Archived states, program cards, add program CTA.
- [ ] **M2-11 / P0-06:** Program editor: name, description, applicant type, education level, official links and application cycle fields.
- [ ] **M2-12:** Requirements editor: ordering, required/conditional toggle, acquisition steps, FAQ add/edit/remove.
- [ ] **M2-13:** Source/verification UI: URL, reviewer date, source status; distinguish OCR extracted draft from approved source.
- [ ] **M2-14:** Proper form validation, save/loading/error toast, editing state; preview same applicant contract.
- [ ] **M2-15:** Connect to M3's authenticated save/publish routes once available; never represent mock save as persistent.

**Blocked-by:** M3 auth/CRUD. **Fallback:** functional form state and typed mock data with a visible fixture indicator. **Gate G1:** saved admin guide is visible publicly *only after* actual publication.

## Sprint 2 — Knowledge review, AI QA and content finishing (2:00–4:00 AM)

- [ ] **M2-20:** Send final verified source chunks or reviewed documents to M4 for indexing; record approval and review date.
- [ ] **M2-21:** Review the language of AI FAQ examples for source accuracy and uncertainty; ask M4 to test unsupported questions.
- [ ] **M2-22:** Verify that outdated/archived/anonymous draft content cannot appear in applicant responses.
- [ ] **M2-23:** Build publication checklist: source reviewed, instructions complete, dates supported, applicant preview correct, publisher permission verified.
- [ ] **M2-24:** Finish 3 realistic fictional demo questions, including one which MUST return uncertainty.

**Gate G2 handoff:** M4 can retrieve approved source passages; applicant FAQ and AI agree on meaning.

## Sprint 3 — Published content verification and rehearsal (8:30–11:30 AM)

- [ ] **M2-30:** End-to-end admin create/edit/preview/publish against real database and RLS.
- [ ] **M2-31:** Confirm changes appear in M1's live applicant journey; no draft leaks.
- [ ] **M2-32:** Verify title, dates, source link and applicability against official source one last time.
- [ ] **M2-33:** Audit accessible form labels, confirmation dialogs and insufficient-permission messages.
- [ ] **M2-34:** Practice publish segment of live demo; document any missing feature truthfully.

**Gate G3:** two vetted requirements flow from admin publishing into applicant UI and RAG.

## Sprint 4 — Readme and submission presentation (11:30 AM–1:30 PM)

- [ ] **M2-40 / P0-12:** Coordinate README: problem, target user, architecture, Lumen use, how to run, privacy, known limitations and official handoff.
- [ ] **M2-41:** Prepare ≤10 slides: problem, personas, solution, architecture, Lumen demonstration, RAG grounding, SDG 4, evidence, next steps, team.
- [ ] **M2-42:** State project is independent/not official; do not claim an agency partnership unless actually established.
- [ ] **M2-43:** Prepare one clear demo script per teammate, with verified data and slides consistent with deployed build.
- [ ] **M2-44:** Validate final sources and no sensitive data/organizer keys in slides/screenshots.

## Content sign-off checklist

- [ ] Application cycle is real and title verified.
- [ ] Every requirement has accurate applicability and a source citation.
- [ ] Dates are verified or explicitly omitted/marked unconfirmed.
- [ ] All acquisition instructions are grounded in trusted published guidance.
- [ ] Any model-generated/source-OCR draft receives human review before publish.
- [ ] Current cycle only is shown as current; old versions not silently cited.
- [ ] Partner named as **potential** unless formally confirmed.

## Handoff obligations

| Need | Counterpart | Acceptance |
|---|---|---|
| Save, authorization, publication | **M3** | Real authenticated CRUD, publisher-only action, persistent refresh |
| Approved knowledge package | **M4** | Source IDs, cycle, exact passages, approval/version |
| Shared UI patterns | **M1** | Tokens, accessible buttons/form fields; no independent duplicate init |
| Demo integration | **All** | Consistent terminology: prepared ≠ verified ≠ approved |

**Escalate:** unverifiable or contradictory official requirement immediately; omit that claim rather than invent it.  
**Out of scope:** official staff accounts, scholarship approval decisions, applicant document collection dashboards.
