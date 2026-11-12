# Vercel + Supabase free-tier setup

1. For team development, use the existing shared `gabayiskolar-dev` project described in [Shared team environment](TEAM_ENVIRONMENT.md); its migrations are already applied. For a separate deployment database, apply all files in `supabase/migrations/` in filename order and record their versions in migration history.
2. Add the public Supabase project URL and anon/publishable key to local `.env.local`.
3. Invite and provision administrator accounts via Supabase dashboard/admin tooling, not open signup.
4. Check the organizer-provided Lumen API docs and add **verified** endpoint URLs and credentials as server-only environment variables. Keep secrets out of client-side variables and Git.
5. Import GitHub repository into Vercel as Next.js framework; root directory `/`.
6. Configure environment variables in Vercel project settings. Trigger a redeployment.
7. Verify `/api/health`, public guide navigation, admin security and one live Lumen call.
8. Use sample documents and test a grounded chat answer, a no-source fallback and a recoverable OCR error.

Hosting providers and AI credits have quotas. Vercel Hobby is for eligible non-commercial use; review current terms and limits before use. Do not assume Lumen credentials remain valid after OVERCLOCK.

For OCR on serverless functions, respect upload/request limits; use small sample images. Do not persist real student documents.
