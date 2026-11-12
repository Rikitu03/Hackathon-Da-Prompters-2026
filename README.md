# GabayIskolar

A Pasig scholarship preparation assistant for **The Prompters — OVERCLOCK 2026**.

> **Independent prototype.** Not affiliated with or endorsed by Pasig City Government or the scholarship office. This project guides document preparation; it does not submit applications, verify eligibility, or approve scholarships.

## Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS, Lucide icons, Motion for React
- Supabase PostgreSQL and Supabase Auth for admin identity
- PostgreSQL Full-Text Search for RAG retrieval
- Lumen OCR and AI Chat through **server-side** adapters
- Vercel deployment

**No FastAPI service is needed for this MVP.**

## Local setup

1. Install Node.js 20.9+ and npm.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and configure values privately.
4. Run `npm run dev`. Open http://localhost:3000.
5. For database setup, create a Supabase project and apply `supabase/migrations/0001_initial.sql` in its SQL editor.
6. Run `npm run typecheck`, `npm run lint`, and `npm run build` before opening a pull request.

The landing, scholarship and admin informational pages work without credentials. Database-backed features and Lumen processing require configuration and implementation. The AI endpoints **explicitly fail when unconfigured** rather than inventing a response.

## Team ownership

| Developer | Ownership |
|---|---|
| Member 1 | `src/app/(applicant)`, `src/components/applicant` |
| Member 2 | `src/app/admin`, `src/components/admin`, source verification |
| Member 3 | `src/lib/supabase`, `supabase/migrations`, admin REST/data/auth |
| Member 4 | `src/lib/lumen`, `src/lib/rag`, `src/app/api/ai`, deployment |

Branches: `feat/applicant-ui`, `feat/admin-portal`, `feat/backend-db`, `feat/lumen-rag`. See `docs/ARCHITECTURE.md` and `docs/API_CONTRACTS.md`.

## Security and ethics

- Never commit API keys, database passwords, personal documents, or `.env.local`.
- Public-facing content must be **published and source-backed**. Admin changes must be authorized on the server, not only in the UI.
- Lumen credentials must only be read by server handlers.
- Student uploads should be opt-in, used only for document review, and not persisted in the initial MVP.
- Human review is required for OCR extracted fields; **prepared ≠ officially approved**.
- The exact Lumen HTTP endpoints and response shapes must be checked against the sandbox docs before live integration. Set `LUMEN_OCR_URL` and `LUMEN_CHAT_URL` only after verifying them.
- Secrets previously pasted into messages should be rotated if their confidentiality is in doubt.

## Deployment

Import this repository into Vercel (root `/`, framework Next.js). Set the same server-only environment variables from `.env.example` in Vercel. Configure Supabase separately. Vercel Hobby eligibility and resource limits apply; Lumen credits are event-issued, not a permanent free API. See `docs/DEPLOYMENT.md`.

## Official handoff

Application submissions occur through the [Pasig City Scholarship Portal](https://scholars.pasigcity.gov.ph/), never through this prototype.
