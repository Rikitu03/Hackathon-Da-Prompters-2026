# Member 2 — Admin Frontend UAT & Integration Handoff

Branch: `feat/admin-portal`
Owner: Member 2 (Admin UI/UX). Backend authorization, versioned publication and source indexing belong to Members 3 and 4.

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
- Publishing is blocked pending verifiable server checks, RAG indexing and role enforcement. The backend should implement `POST /api/admin/publish` and a readiness endpoint. Do not remove the safety gate merely for the demo.
- Steps/FAQ editing currently uses sequential delete+insert on a draft. Member 3 should replace this with an atomic RPC/transaction before production deployment.

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
- UAT-10: keyboard and mobile walkthrough — **requires device/browser execution**

## Accessibility and motion targets
- WCAG 2.2 AA target, semantic form labels, native keyboard-operable inputs, meaningful text states.
- 44px touch targets where practical; no status conveyed by color alone.
- Motion for React config `reducedMotion="user"`; route entrance 180ms and button feedback 150ms.
- Test screen readers (VoiceOver/NVDA) and real mobile browsers; code inspection is not a substitute for UAT.

## Integration blockers before claiming production readiness
1. Member 3: working Supabase configuration, seeded pre-provisioned admin role, RLS verification including negative tests.
2. Member 3: transactional requirement/FAQ editor operation and protected draft/publish API with versioned approval and audit trail.
3. Members 3/4: reviewer approval and RAG indexing state + server-side preflight check so publish gate can open.
4. Member 1: validate published content appears correctly in public scholarship guide.
5. Whole team: run `npm run typecheck`, `npm run lint`, `npm run build` and full device/browser UAT in a runnable environment.

## Design foundation
Uses existing React 19, Next.js 15, Tailwind CSS 4, Lucide and Motion dependencies, with shared shadcn-style cards/forms/buttons. The official shadcn CLI components have not yet been installed in this branch; visual composition follows familiar, accessible dashboard patterns without introducing a paid or unlicensed template. No MP4 motion references were accessible in this conversation, so exact animation matching remains pending their review.
