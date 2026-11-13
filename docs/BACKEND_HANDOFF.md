# Backend handoff for staging

This is a tested development backend that the other feature branches can connect
to. It is not the final admin/applicant interface or a deployed release.

**Integration update, 13 November 2026:** `feat/backend-db` now connects the existing admin screens to cookie-authenticated, atomic backend saves and real publication checks. Account-free references and local private drafts are implemented; see [Applicant privacy](APPLICANT_PRIVACY.md) for setup, testing, and remaining applicant scope. These local changes still need review/deployment.

## What is ready

| Area | Implemented behavior |
|---|---|
| Admin identity | Email/password login, server-verified identity, HTTP-only session cookies, refresh, role checks, and logout |
| Guide management | Atomic draft saves across programs, cycles, requirements, steps, FAQs, sources, and text chunks; program deletion |
| Publishing | Publisher-only publish/unpublish with readiness checks; drafts and unapproved knowledge stay private |
| Applicant reads | Published scholarship list/detail, requirement details, and a browser-local preparation checklist |
| Database | One shared Supabase project, eight RLS-protected tables, explicit grants, indexes, and three applied migrations |
| Test content | One test publisher, one published DEMO guide, and one private draft; committed database rows survive reloads |
| Developer tools | `/backend-lab`, database/HTTP checks, transactional SQL tests, and repeatable development content seeding |

The Supabase project is **gabayiskolar-dev**, reference
`jchbbechdldfcyralrln`, in The Prompters organization. All four teammates use it.
The migrations are already applied. Do not run them again or reset the shared DB.
Git stores the SQL history and application code; pushing or merging does not
copy the database. Everyone connects to the same existing hosted records.

## Connect your machine

After bringing `staging` into your own feature branch through the team's normal
Git workflow, use Node.js 22+ and run:

```powershell
npm ci
npm run setup:env
npm run check:db
npm run dev
```

If `.env.local` already exists, `setup:env` deliberately preserves it. Copy the
two `NEXT_PUBLIC_SUPABASE_*` values from `.env.example` into it and restart the
server. They are public connection values, not administrator credentials.

Open `/backend-lab` for the visual test page and `/scholarships` for public reads.
With the server running, `npm run check:backend` checks the HTTP boundary.

Test application login: `dev-admin@gabayiskolar.test`. Its password is in the
owner's ignored `.env.seed.local`; obtain it privately or ask for an individual
application account. Git does not distribute this file. Use the shared test login
only for synthetic development tests. Individual teammate accounts are preferable
for regular work. App login does not grant Supabase dashboard access; that needs
a separate organization invitation.

## What each teammate can integrate

- **M1:** use anonymous scholarship/requirement GET endpoints in
  [API_CONTRACTS.md](API_CONTRACTS.md). Keep checklist progress in the browser.
- **M2:** use `/api/auth/*`, `/api/admin/guides*`, `/api/admin/programs*`, and
  `/api/admin/publish`. The guide save endpoint accepts the entire editable
  document; preserve loaded IDs and omit its read-only `status` field.
- **M4:** the local chat route now consumes approved, published cycle-scoped
  FTS chunks and calls Lumen with mapped citations. Finish contract alignment
  with the applicant frontend and verify a cited route answer using reviewed
  scholarship content. SQL relevance ranking and requirement associations remain limited.

The merged build renders the persistent admin UI at `/admin` and Member 1's
applicant workspace on public routes. Keep `/backend-lab` as the developer workbench:
it supports the same cookie-authenticated source-text/review/save/publish flow
now available through the admin screens.
Combine package scripts/dependencies and regenerate the lockfile when adding
frontend packages. Do not overwrite either feature's dependencies wholesale.

## Current limits and remaining sprint work

- Editors can inspect all content but are read-only. The sprint guide also
  discusses editor draft editing; agree and implement that separately. Publishers
  currently own all mutations, including publishing.
- Saving edits returns the program and selected cycle to draft, hiding the
  program's other cycles until it is published again. Historical published
  revisions are not retained.
- Demo guides use invented content and example.com URLs. Replace them with M2's
  source-verified scholarship material before a real content demonstration.
- OCR and the local chat/RAG implementation call real Lumen adapters, with
  validation, same-origin checks, rate limits and configuration kill switches.
  Missing configuration returns 503; neither current route is a 501 stub.
  Combined frontend success and deployment checks remain separate acceptance work.
- There are no student accounts, application submissions, or applicant tables in
  this MVP. Per-user cloud checklist syncing would require additional design.
- Vercel deployment, rollback instructions, merged frontend QA, and final release
  checks still need completion. Merging to staging does not complete these sprints.

All writes affect the shared development data. Avoid editing the same guide at
the same time. Coordinate before deleting a program or resetting demo content.
See [BACKEND_WALKTHROUGH.md](BACKEND_WALKTHROUGH.md) for the full browser test.
