# GabayIskolar

A Pasig scholarship preparation assistant for **The Prompters — OVERCLOCK 2026**.

> **Independent prototype.** Not affiliated with or endorsed by Pasig City Government or the scholarship office. This project guides document preparation; it does not submit applications, verify eligibility, or approve scholarships.

See the [documentation index](docs/README.md), including the [PSCS requirements, demo data, and OCR references](docs/scholarships/pscs/README.md).

## Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS, Lucide icons, Motion for React
- Supabase PostgreSQL and Supabase Auth for admin identity
- PostgreSQL Full-Text Search for RAG retrieval
- Lumen OCR and AI Chat through **server-side** adapters
- Vercel deployment

**No FastAPI service is needed for this MVP.**

## Local setup

1. Install Node.js 22+ and npm (required by the locked Supabase SDK).
2. Run `npm ci`.
3. Run `npm run setup:env` to create `.env.local` without overwriting existing values. All four teammates use the same Supabase development project; follow [Shared team environment](docs/TEAM_ENVIRONMENT.md).
4. Run `npm run dev`. Open http://localhost:3000.
5. Use the existing shared `gabayiskolar-dev` database and run `npm run check:db` to verify access. M3 has applied the migrations; teammates should not rerun them. See [Shared team environment](docs/TEAM_ENVIRONMENT.md) for project details and permission tests.
6. Run `npm run typecheck`, `npm run lint`, and `npm run build` before opening a pull request.

Open `/backend-lab` for a simple visual backend walkthrough: administrator sign-in, atomic draft saving, source review, publishing, and anonymous public results. `/scholarships` reads real published guides and supports a browser-local preparation checklist. See [Backend walkthrough and testing](docs/BACKEND_WALKTHROUGH.md). Lumen OCR (`POST /api/ai/ocr`) is implemented and live-verified with a fictional document; Lumen chat is not wired yet and returns 501/503. See [Lumen contract](docs/LUMEN_CONTRACT.md).

Teammates integrating this backend should start with [Backend handoff](docs/BACKEND_HANDOFF.md).

Development test data is seeded: sign in as `dev-admin@gabayiskolar.test` using
the generated password in the ignored `.env.seed.local`. One published example
and one private draft persist in the shared database. Run `npm run seed:dev`
with the local backend running to create missing demo examples without overwriting
existing ones. These are synthetic test records, not official scholarship guidance.

## Team ownership

| Developer | Ownership |
|---|---|
| Member 1 | `src/app/(applicant)`, `src/components/applicant` |
| Member 2 | `src/app/admin`, `src/components/admin`, source verification |
| Member 3 | `src/lib/supabase`, `supabase/migrations`, admin REST/data/auth |
| Member 4 | `src/lib/lumen`, `src/lib/rag`, `src/app/api/ai`, deployment |

Branches: `feat/applicant-ui`, `feat/admin-portal`, `feat/backend-db`, `feat/lumen-rag`. See `docs/ARCHITECTURE.md` and `docs/API_CONTRACTS.md`.

## Security and ethics

- Never commit secret API keys, database passwords, personal documents, or `.env.local`. Only the Supabase public project URL and publishable/anon key may be shared in `.env.example`.
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
