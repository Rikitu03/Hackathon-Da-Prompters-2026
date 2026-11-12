# Member 1 — Applicant Frontend / UX Sprint Guide

**Branch:** `feat/applicant-ui`  
**Owner:** Applicant portal and shared design system  
**Primary files:** `src/app/(applicant)/`, `src/components/applicant/`, UI primitives coordinated with M2  
**Unblockers:** M3 (read APIs), M4 (AI contracts), M2 (verified content)

## Deliverable and acceptance

An applicant can discover a published scholarship cycle, understand requirements through a step-by-step journey, mark items prepared, review extracted OCR fields, ask a grounded question and navigate to the official application portal. This is **preparation**, not official submission or approval.

## Sprint 0 — Contracts & design foundation (Nov 12 11:25 PM–12:15 AM)

- [ ] **M1-00:** Agree on public response schema with M3: program, cycle, requirement, steps, FAQs, source URL/review date, statuses.
- [ ] **M1-01 / P0-02:** Initialize shared shadcn/ui once; coordinate dependencies, `components.json`, CSS tokens and primitives with M2. Do not let both UI developers initialize separately.
- [ ] **M1-02:** Define design tokens (type scale, spacing, focus, mobile navigation, status colors) and UI copy rules. No official government logos/seals.
- [ ] **M1-03:** Receive M4's draft Chat/OCR request-response shapes and create clearly named fixture data for UI development.
- [ ] **M1-04:** Verify `npm run build` still works after UI setup; send PR and status to team.

**Gate G0 handoff:** Shared components import cleanly; routes and API shapes agreed.

## Sprint 1 — Applicant vertical slice (12:15–2:00 AM)

- [ ] **M1-10:** `/scholarships` discovery with published cards and educational level/applicant-type filters.
- [ ] **M1-11:** Program/cycle overview with review date, source and explicit independent-prototype disclaimer.
- [ ] **M1-12 / P0-07:** Checklist builder driven by selected cycle and conditional requirements. Do not hardcode unverifiable scholarship dates.
- [ ] **M1-13:** Local storage progress with statuses Not started / In progress / Needs review / Prepared; restore on refresh.
- [ ] **M1-14:** `/requirements/[id]` guide with numbered acquisition journey, FAQ accordion and trusted citation links.
- [ ] **M1-15:** Loading / no programs / wrong cycle / API error / refreshed requirements states.

**Can work independently:** Render all views using frozen typed fixtures. **Blocked-by:** M3 for live read API, M2 for accurate text. **Gate G1:** swap fixture adapter for GET API with no UI rewrite.

## Sprint 2 — OCR & chat experience (2:00–4:00 AM)

- [ ] **M1-20:** Chat composer with requirement/cycle context and source-reference chips, accessible keyboard behavior, pending/error/no-evidence messages.
- [ ] **M1-21:** Consent gate and upload UI (file type/size guidance) using fictional documents for demo.
- [ ] **M1-22:** OCR field-review screen: original preview, extracted text, editable fields, review warnings and user-confirm button.
- [ ] **M1-23:** Document mismatch state must say 'Possible mismatch—verify', not 'Rejected' or 'Approved'.
- [ ] **M1-24:** Integrate with M4's confirmed Chat/OCR routes; handle 400, 413, 429, 500, 501 and 503 gracefully.
- [ ] **M1-25:** Final 'Ready to prepare/submit' summary with correct `scholars.pasigcity.gov.ph` handoff.

**Blocked-by:** M4 for live AI endpoint and M3 for current cycle data. **Fallback:** typed fixture with developer-only label; never claim fake AI is live. **Gate G2:** live question and correction flow demonstrated.

## Sprint 3 — Integration & acceptance (8:30–11:30 AM)

- [ ] **M1-30:** Test publication from M2/M3 actually changes public checklist without redeploy.
- [ ] **M1-31:** End-to-end at 320px+ and standard desktop; test with keyboard, focus states, readable labels and color contrast.
- [ ] **M1-32:** Test browser refresh and cleared storage; do not claim progress synced across devices.
- [ ] **M1-33:** Ensure any Chat/OCR API outage still allows static sourced checklist journey.
- [ ] **M1-34:** Respect reduced-motion preferences; avoid unnecessary animations before fixing functionality.
- [ ] **M1-35:** Record demonstration evidence and cross-check state wording with M2.

**Gate G3:** student flow works on actual deployed URL with one verified guide.

## Sprint 4 — Hardening / handoff (11:30 AM–1:30 PM)

- [ ] **M1-40:** Fix only P0 UI bugs (broken CTA, inaccurate status, inaccessible controls, integration regressions).
- [ ] **M1-41:** Supply 2–3 screenshots and brief applicant journey notes for pitch/README.
- [ ] **M1-42:** Rehearse 60–90 second student-side demonstration; ensure no personal documents appear.
- [ ] **M1-43:** Confirm code merged, clean build and no unreviewed last-minute UI dependency additions.

## Acceptance scenarios

1. Select a published Pasig scholarship cycle; view matching requirements only.
2. Open a requirement and locate verified acquisition steps and source.
3. Mark prepared; refresh; progress remains locally with accurate disclaimer.
4. Upload fictional file; correct an OCR field; review a non-authoritative warning.
5. Ask a contextual question; see actual source chip or honest no-source fallback.
6. Follow official application link. No account or eligibility promises.

## Handoff obligations and what to ask others

| Need | Ask | Proof / acceptance |
|---|---|---|
| Published schema & API | **M3** | GET routes with source IDs and stable field names |
| Current requirement copy | **M2** | Reviewed cycle, FAQs, acquisition steps with URLs |
| Live AI endpoint | **M4** | Chat/OCR contract and real provider response, error semantics |
| UI integration | **M2** | Shared tokens reviewed before changes to common components |

**Escalate:** a real API contract mismatch immediately; do not silently rename fields to “make it work.”  
**Out of scope:** applicant accounts, official uploads/submissions, document authenticity verdict, motion polish before P0.
