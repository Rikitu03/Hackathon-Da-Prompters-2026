# Member 2 — Admin Frontend UAT & Integration Handoff

Branch: `feat/admin-portal`
Owner: Member 2 (Admin UI/UX). Backend authorization, versioned publication and source indexing belong to Members 3 and 4.

**Merged-checkout update, 13 November 2026:** the protected `POST /api/admin/publish`, atomic `save_guide` RPC and source chunk creation already exist. Remaining work is connecting these to the final admin UI, aligning browser/API authentication, and exposing real source-text review/readiness. See [STATUS.md](STATUS.md); `/backend-lab` exercises the API workflow today.

The latest local mocked browser audit passed 23 cases, skipped one desktop-only-inapplicable case, and timed out on mobile multi-page layout navigation and desktop authenticated navigation. It used a development server; the production-server CI configuration still needs to verify those two cases. This does not establish a visual/layout failure, and the suite is not fully passing locally.

## Delivered frontend routes
- `/admin` — protected-data-gated dashboard (roles checked with Supabase)
- `/admin/login` — pre-provisioned account sign-in
- `/admin/programs`, `/admin/programs/new`, `/admin/programs/[id]` — program/cycle editor
- `/admin/requirements`, `/admin/programs/[id]/requirements` — requirement steps and FAQ editor
- `/admin/knowledge` — create unapproved source links and inspect approval metadata
- `/admin/preview` — applicant preview, publication preflight, future backend publish action

## Security and data behavior
- No fabricated scholarship programs, dates, statuses or system health. Every dashboard count comes from Supabase.
- Without Supabase public configuration, the workspace shows a setup state instead of fake data.
- Anonymous and non-admin sessions cannot see protected content in the UI; actual authorization MUST also be enforced by PostgreSQL RLS and backend routes.
- Admin sign-up is not provided. Only pre-provisioned editor and publisher profiles are accepted.
- Program and cycle editing, requirement steps/FAQs, and source registration use existing Supabase tables and RLS. Successful saves are acknowledged after a database response and a fresh read.
- Source registration always inserts `is_approved: false`. The frontend does not pretend to verify or index an uploaded reference.
- Editing a *published* cycle's requirements is intentionally disabled in this UI until a versioned update flow exists.
- Publishing remains blocked by the UI's hardcoded false readiness check. Connect the existing publication API and real server readiness results, retaining publisher enforcement. Do not simply remove the gate.
- Steps/FAQ editing currently uses sequential delete+insert on a draft. Member 3 should replace this with an atomic RPC/transaction before production deployment.

## UI/UX refinement — Member 2 review items
- [x] Replace browser-native selects with accessible Radix Select (custom popper, sufficient chevron inset, consistent option styles and one focused outline).
- [x] Raise supporting text from hard-to-read microcopy and increase muted-text contrast on light backgrounds.
- [x] Align notice icons with first text line; consistent 19px icon and flexible text column.
- [x] Rebuild acquisition steps as structured cards with a dedicated grip handle, keyboard/touch drag-and-drop and persistent Up/Down alternatives.
- [x] Provide removal + Undo feedback and dynamic step numbers; retain draft editing without automatic save.
- [x] Add non-blocking route/card/feedback motions; respect prefers-reduced-motion.
- [x] Move desktop Admin sign-in away from the fixed Next.js development indicator and reserve bottom clearance.
- [x] Preserve the soft sage/matcha-green selection styling.
- [ ] User-provided MP4 references: visual samples reviewed. Full spoken narration and exact curve/frame matching not yet verified.
- [ ] Validate final form behavior and motion against actual devices and accessibility tools.

## QA Round 2 — November 13, 2026
The following feedback was incorporated in `feat/admin-portal`, without changing applicant-facing pages:

- [x] Make **View cycles / Select** visually prominent with solid evergreen and **Edit** with a clear white outlined style, even on selected sage cards.
- [x] Remove redundant `01` badges; show **Step N** only, auto-renumbered after drag or arrow reorder.
- [x] Replace program, requirement, FAQ, and step textareas with auto-growing fields; hide native resize grips and short-content scrollbars (long input scrolls within a sensible max height).
- [x] Restrict acquisition step drag movement to the vertical axis and list boundaries; keep touch/keyboard/arrow controls and prevent horizontal document scroll.
- [x] Replace the browser-native FAQ triangle with a chevron accordion, accessible expanded state, and reduced-motion-aware transition.
- [x] Use one accessible 2px focus outline with a neutral input border rather than stacked green rings.
- [x] Remove the dashboard Refresh button; silently revalidate real Supabase data every 60s and on focus/visibility with stale content preserved. An error appears when background updates fail.
- [x] Add local program-name suggestions and tab-scoped recent searches. Recent queries are stored only in `sessionStorage`, can be cleared, and are removed on admin sign-out.
- [x] Make dashboard scholarship rows full keyboard-accessible links to program details, including demo routes.
- [x] Extend Chromium desktop/mobile tests for buttons, focus, drag bounds, textareas, FAQ, search, and overview navigation.

**Limits:** Search suggestions are generated from visible records, not AI. Background revalidation and admin roles rely on a functioning Supabase integration. Mobile Chromium tests are automated; manual iOS Safari, Android Chrome, Firefox, and screen-reader UAT remain necessary. MP4 references inform motion principles, but exact frame-timing reproduction is not claimed.

## Automated browser checks
The workflow `.github/workflows/admin-frontend-quality.yml` runs:
- `npm run typecheck`, `npm run lint`, `npm run build`.
- `npm run test:e2e` via Playwright Chromium with desktop (1440px) and mobile (320px) projects.
- Screenshot/trace HTML reports uploaded as a workflow artifact.
- Demo page `/admin/demo` contains fictional examples; no DB writes or source verification.

Browser tests cover overview/navigation, Radix Select opening and keyboard dismissal, step arrow reordering and Undo, no fake save acknowledgements, and no horizontal body overflow at small mobile widths. **This does not replace real iOS Safari, Firefox, Android browser and screen-reader UAT.**

## Manual UAT checklist

| ID | Scenario | Expected result |
|---|---|---|
| ADMIN-01 | Visit /admin when Supabase env is absent | Honest setup state; no sample admin data |
| ADMIN-02 | Visit as anonymous | Sign-in, no draft content rendered |
| ADMIN-03 | Sign in with non-admin profile | Access denied; cannot edit |
| ADMIN-04 | Sign in as editor | Dashboard metrics match real RLS-visible rows |
| ADMIN-05 | Create a program draft | Record persists after refresh; not marked published |
| ADMIN-06 | Create cycle with end date before start | Inline alert; no write |
| ADMIN-07 | Create cycle with HTTP portal URL | Rejected; HTTPS-only |
| ADMIN-08 | Create a requirement and two steps | Checklist order and data survive refresh |
| ADMIN-09 | Reorder step, add FAQ, save draft | Preview reflects saved sequence and FAQ |
| ADMIN-10 | Create a knowledge source | Source remains unapproved |
| ADMIN-11 | Select a published cycle | Requirement editor is read-only |
| ADMIN-12 | Check preview without indexed sources | Publish unavailable |
| ADMIN-13 | Simulate Supabase query failure | Alert displayed; no fake success |
| ADMIN-14 | Sign out | Workspace content is cleared and login appears |
| ADMIN-15 | Keyboard-only: Tab, Shift+Tab, Enter, Space | No keyboard trap; visible focus; all controls operable |
| ADMIN-16 | Reduced-motion OS setting | Motion transitions reduced; workflow remains functional |
| ADMIN-17 | 320px, 375px, 430px mobile viewports | Horizontal scrolling limited to mobile nav, no clipped forms or actions |
| ADMIN-18 | 768px & 1024px tablet widths | Single-column content / adaptive cards are readable |
| ADMIN-19 | 1280px & 1440px desktop widths | Persistent sidebar, balanced dual-panel editors |
| ADMIN-20 | Chrome, Edge, Firefox, iOS Safari, Android Chrome | Forms, auth, routing, focus, date inputs and feedback verified |

## Spec alignment
From GabayIskolar UI/UX specification:
- S10: Admin dashboard (loading, empty, unauthorized, error)
- S11: Program/cycle editor (draft, saving, saved, validation error)
- S12: Requirement/FAQ builder (add, edit, step reorder, preview)
- S13: Knowledge intake (unapproved sources and review metadata)
- S14: Preview/publish (readiness checks and server-only publication)
- UAT-08: authenticated content editor saves draft; anonymous cannot
- UAT-09: publishing updates applicant view — **pending backend integration**
- UAT-10: keyboard and mobile walkthrough — **partial Chromium automation; manual cross-browser/device walkthrough still required**

## Accessibility and motion targets
- WCAG 2.2 AA target, semantic form labels, native keyboard-operable inputs, meaningful text states.
- 44px touch targets where practical; no status conveyed by color alone.
- Motion for React config `reducedMotion="user"`; route entrance 180ms and button feedback 150ms.
- Test screen readers (VoiceOver/NVDA) and real mobile browsers; passing Chromium automation is not a substitute for full UAT.

## Integration blockers before claiming production readiness
1. Member 3: working Supabase configuration, seeded pre-provisioned admin role, RLS verification including negative tests.
2. Members 2/3: connect final editors to the existing transactional guide save/publish APIs and cookie-authenticated session. Historical published revisions/audit history remain separate work.
3. Members 2/3/4: source-text review, approved chunk presence and server readiness so the publish gate can reflect real results.
4. Member 1: validate published content appears correctly in public scholarship guide.
5. Whole team: run `npm run typecheck`, `npm run lint`, `npm run build` and full device/browser UAT in a runnable environment.

## Design foundation
Uses existing React 19, Next.js 15, Tailwind CSS 4, Lucide and Motion dependencies, with shared shadcn-style cards/forms/buttons. The official shadcn CLI components have not yet been installed in this branch; visual composition follows familiar, accessible dashboard patterns without introducing a paid or unlicensed template. 13 uploaded MP4 references were available for visual-frame review; motion principles and ethics informed the refinement, but exact animation timing and voiceover guidance remain to be validated.

## Persistent navigation performance (follow-up)

- One shared /admin layout renders AdminConsole for every live admin route; it is no longer remounted on ordinary sidebar navigation.
- The initial Supabase login/role check is retained, while the verified session and loaded records persist during client-side route changes.
- Background refresh on focus, visibility and every 60 seconds remains active without blanking content.
- Sign-out in another tab clears the protected content and returns to the login gate.
- Direct program links and new-program routes still select the requested program or editor.
- The read-only /admin/demo page is isolated from authenticated data.
- Browser regression tests mock Supabase on a reserved test-only origin; no shared team database is contacted by automation.
- This targets repeated navigation requests; initial data loading, real-device checks and backend publishing readiness remain separate tasks.
