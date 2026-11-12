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

## Admin workspace: missing Supabase configuration

If `/admin` shows **Supabase configuration is missing**, check `/api/health`.
`configured.supabase: false` means the deployment is missing one or both public
connection values; this is a configuration failure before administrator sign-in.
The setup gate should remain enabled until those values are configured.

Local `.env` and `.env.local` files are ignored by Git and do not configure Vercel.
In the Vercel project's **Settings > Environment Variables**, add both entries:

| Variable | Value | Staging scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Shared development URL from `.env.example` | Preview, branch `staging` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public publishable/anon key from `.env.example` | Preview, branch `staging` |

Use the shared development project described in [TEAM_ENVIRONMENT.md](TEAM_ENVIRONMENT.md).
Do not use a Supabase secret or service-role key in either browser-facing entry.
Other branches and Production need their own explicit environment configuration.

Redeploy the existing **staging Preview** commit after saving the variables.
Changing environment settings alone does not update an existing deployment's
browser bundle: Next.js embeds `NEXT_PUBLIC_*` values during the build.
See [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables)
and [Vercel environment variables](https://vercel.com/docs/environment-variables).

Verify the new deployment, using an authorized Vercel session when Preview
Deployment Protection is enabled:

1. `/api/health` returns HTTP 200, `configured.supabase: true`, and
   `database.connected: true`. Lumen configuration is separate from admin access.
2. In a browser without an application session, `/admin` displays the email and
   password fields and the **Sign in securely** button; the missing-configuration notice
   is absent. Check both desktop and mobile layouts after hydration.
3. Unauthenticated `/api/auth/session` and `/api/admin/guides` requests return
   HTTP 401, without protected content.
4. Complete successful sign-in with an individually provisioned editor or
   publisher account. Public connection values do not grant administrator access.
   A rendered login form alone does not verify authenticated editing or publishing.

When creating a redeployment through the REST API, preserve the staging
deployment ID and commit. The API accepts an omitted `target` for Preview;
`target: "preview"` is not a valid request value, and a response with
`target: null` identifies Preview. Verify these semantics in the
[Vercel deployment API](https://vercel.com/docs/rest-api/deployments/create-a-new-deployment)
before issuing a request; never select Production to repair a staging deployment.
