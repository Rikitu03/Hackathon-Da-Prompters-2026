# GabayIskolar — Architecture and team boundaries

## Architecture

Next.js App Router (React, TypeScript) → Next.js Route Handlers → Supabase PostgreSQL/Auth + verified Lumen OCR/Chat API. Hosted on Vercel.

**No Python FastAPI server.** AI processing is an outgoing server-side HTTP request. PostgreSQL FTS supports an initial RAG pipeline without embeddings.

The first database-backed guide workflow is implemented. Use `/backend-lab` for
a simple visual integration workbench and `/scholarships` for anonymous reads and
the preparation checklist. `/admin` temporarily redirects to the workbench while
the final admin interface is developed. [BACKEND_WALKTHROUGH.md](BACKEND_WALKTHROUGH.md)
explains the process, account provisioning, tests, and the decision to defer
applicant profiles until student accounts or syncing are required. Lumen OCR/chat
remain a separate, unimplemented integration.

## Applicant journey

Discover published cycle → read requirements → view acquisition steps and FAQs → save local preparation checklist → optionally upload a demonstration document → confirm OCR fields → ask source-grounded Lumen questions → follow official scholarship application link.

## Administrator journey

Admin authentication → create program/cycle → add requirements/steps/FAQs → attach sources → review and approve source text → publish → preview applicant journey → maintain versioned guidance.

## Security boundaries

- Browser: public anon key only, never Lumen secrets or a Supabase service key.
- Admin: only `admin_profiles` members. Server-side checks + RLS. Never self-signup into admin privileges.
- Published-only knowledge retrieval; source approval does not depend on applicant text.
- Student uploads are consent-based and never stored by this app, but the Lumen OCR provider keeps a copy (no delete API) visible to the organization — use demo documents only. No automated authenticity or eligibility claims.
- Use demo data, and identify the product as an independent prototype.

## Ownership

| Owner | Directory responsibility | Integration contract |
|---|---|---|
| Member 1 | `src/app/(applicant)`, `src/components/applicant` | GET scholarship endpoints; POST AI endpoints |
| Member 2 | `src/app/admin`, `src/components/admin` | Admin CRUD endpoints, source publication |
| Member 3 | `src/lib/supabase`, `supabase/`, admin/read API | SQL schema, authorization and types |
| Member 4 | `src/lib/lumen`, `src/lib/rag`, `src/app/api/ai` | Source-grounded chat, OCR contract, deploy |

## Milestones

1. Verify a real Lumen sandbox call (Member 4) while database/schema is created (Member 3).
2. Publish one admin-managed scholarship and read it from applicant portal.
3. Connect published knowledge to real Lumen chat with source citations.
4. OCR one sample document and let user correct fields.
5. Deploy; demo end-to-end; prepare README and ≤10 slides by code freeze.

Do not claim the integration works until tested with actual services.
