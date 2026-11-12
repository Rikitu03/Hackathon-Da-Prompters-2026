# Applicant journey acceptance — 13 November 2026

Implementation of the [Applicant Journey Alignment plan](../superpowers/plans/2026-11-13-applicant-journey-alignment.md) on `feat/lumen-rag`. Changes remain in the working tree alongside the pre-existing documentation edits; no commit hash or deployed release is claimed.

## Behavior delivered

- Shared 500-character chat and 4 MiB upload limits; client timeouts of 55/70 seconds and Manila calendar dates.
- Numbered citations match the returned source list. Server notices retain their text and safe official link and are displayed without AI attribution.
- OCR retains evidence snippets, field/document warnings and disclaimers. Consent explains Lumen's retained organization-visible copy; files must be fictional or samples.
- The five-stage river rail connects guide selection, checklist preparation, document review, Ask Gabay and the official step. It shows real checklist counts and memory-only visit activity.
- A requirement opens OCR and chat with the same context. Confirming OCR leaves the preparation status under the student's control. Refresh resets visit activity while restoring saved statuses.
- Onboarding offers the PSCS education levels and new/renewing choices. Closed cycles stay readable and disable questions. Stale requirement links use whole-guide chat; unpublished saved guides explain how to recover.
- Summary handoff uses the selected cycle's HTTPS destination, with the general Pasig portal as a secondary destination when different.

## Verification

| Check | Result |
|---|---|
| `npm test -- --silent` | 120 tests passed across 16 files; providers mocked |
| `npm run test:applicant` | 24 passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with the existing `auto-textarea.tsx` hook-dependency warning |
| Production build | Passed, 30 static pages generated |
| Full desktop/mobile Playwright suite | Final run pending |
| Screenshot capture | 20 captures at 1440, 768, 390 and 320 px; no horizontal overflow |

The browser suite uses fictional guide/OCR/chat fixtures and disables live AI routes. It covers the full journey, retained context, editable OCR warnings, unchanged status on OCR confirmation, refresh persistence, citations/notices, closed cycles, stale guide/requirement links, 500-character pastes, exact upload-size boundaries (model tests), explicit retry after non-JSON platform timeouts, and same-visit checklist counts. Desktop skips the two checks that apply only to mobile.

Commands for an isolated acceptance build in PowerShell:

```powershell
$env:GABAY_BUILD_DIR = '.next-acceptance'
$env:NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.test'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_e2e_mock_key'
$env:LUMEN_CHAT_ENABLED = 'false'
$env:LUMEN_OCR_ENABLED = 'false'
npm.cmd run build
$env:CI = '1'
npx.cmd playwright test --workers=2 --retries=0 --reporter=list
node --experimental-strip-types scripts/capture-applicant.mjs
```

The first `.next` build passed and served the initial browser run, but a subsequent start failed in the generated webpack runtime before tests began. A separate `.next-acceptance` build served the suite successfully. This supports isolating generated output from other local work; it does not establish the source of the original corruption. `GABAY_BUILD_DIR` is optional; normal development/deployment keeps `.next`. Generated output is excluded from Git and ESLint, and Playwright collects only `*.spec.ts` rather than executing the native Node test modules during discovery.

No live Lumen calls, credit spending, shared-database writes or deployment were performed. The documented public dataset contained only synthetic disclaimer content. The plan's live step remains deferred until reviewed PSCS guidance is published; mocked browser acceptance does not establish live retrieval/provider success.

## Design record and screenshot critique

This is component integration within the existing visual system, not a redesign. The plan fixes Instrument Sans, the blue/navy/river palette and the yellow current-stage marker. No direction was redrawn and no random seed was used. Existing illustration/font assets were retained; no pictures, clips, fonts or dependencies were added. Test guide titles, dates, example.org links, fictional OCR fields and mocked answers are acceptance fixtures, not launch content.

Product inventory: the Pasig river; the book/waves brand mark; five preparation stages; published application cycles; four self-managed statuses; guest browser storage; editable OCR evidence; source-numbered answers; provider retention consent; the official application destination. The idea is: **Pasig's river becomes the continuous track connecting a student's preparation decisions.** The working interaction is the requirement → document correction → contextual question → official handoff flow.

Each screen answers a concrete question: dashboard, what next; requirement, how to prepare this item; document review, what did the reader extract and what needs correction; assistant, what does published guidance support; summary, what remains and where to continue officially.

App-screen critique, round 2:

1. The rail and screen title establish the current job; preparation and review controls remain explicit.
2. Main panels share the canvas edges. The tablet upload overflow was traced to the hidden file input inheriting a full-width input rule and was fixed at that selector.
3. The existing brand palette is retained. A solid clipped river segment replaced a dashed SVG rendering artifact. The current mobile marker now retains yellow even after the stage is complete.
4. Counts are computed from current requirements. OCR confirmation changes visit activity, never checklist status. Summary counts reset after a full page reload as documented.
5. Zero requirements prepared appears as zero; no approval or eligibility measure is invented.
6. This flow has no analytical charts. Citation numbers agree with source chips, and notices have a distinct river surface and heading.
7. Mobile navigation folds, the rail becomes five segments, controls remain usable and all captured widths fit the page. OCR is a long stacked review at narrow widths; the original preview and evidence remain available.

Subjective assessment: design 7.5/10, usability 8/10, creativity 7/10, content clarity 8/10. Remaining limits: inherited small secondary text and a relatively tall tablet rail; production content density and live provider answers still require review. These are app-screen assessments, not marketing-page picture/motion scores.

Taste source lint for the new rail and changed AI screens returned **0 FAIL / 0 WARN**. The design skill's browser inspector was attempted with installed Chrome and Playwright Chromium; both timed out at `Page.enable`, so no inspector pass is claimed. Fallback evidence uses Playwright screenshots and overflow measurements against the production build. Captures and measurements are under `.taste-skill/after/journey/` (ignored local artifacts), produced by `scripts/capture-applicant.mjs`.
