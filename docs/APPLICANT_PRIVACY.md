# Account-free applicants and local drafts

Implemented on `feat/backend-db`, 13 November 2026. Migration
`20261113014838_admin_integration_and_guest_privacy.sql` is applied to the shared
development project. The code still needs the team's normal review and deployment.

## What is saved where

| Data | Location | Lifetime |
|---|---|---|
| Random browser reference, token hash, optional daily IP hash, timestamps | Supabase `private.applicant_sessions` | Seven days; hourly cleanup removes expired rows |
| Signed reference token | HttpOnly, SameSite=Lax cookie; Secure in production | At most seven days, without sliding renewal |
| Name, email, mobile, school, education level, barangay, preparation notes | This browser profile's IndexedDB, keyed by scholarship cycle | Until deleted or browser storage is cleared |
| Selected guide and checklist progress | Existing browser localStorage | Until cleared |

There is no applicant signup, password, Auth user, fingerprint, personal-details
table, draft upload endpoint, or cross-device synchronization. A reference
identifies a browser profile temporarily; it does not prove a person's identity.
All four teammates share the same Supabase project, but applicants' private drafts
are not shared between computers or browser profiles.

The IP hash is recorded only on Vercel using its trusted request header. The
server hashes it with the date and a private key; it never stores the raw IP in
this table. Localhost and untrusted proxy deployments record no IP hash.
This does not change hosting providers' independent access-log retention.

Private tables deny direct client access through grants and RLS. A narrow private
database function verifies a short-lived HMAC proof from the Next.js server and
the caller's token hash. Its public wrapper requires this proof too. Public
Supabase keys alone cannot create session records or inspect another browser's
metadata. Bootstrap requests have a best-effort limit of 120 requests per ten
minutes per trusted IP hash (one fallback bucket outside Vercel), per server
instance. This is not distributed abuse protection.

## Try the interface

1. Run `npm run dev`, open `/onboarding`, and choose a published guide.
2. Open **Private draft** in the workspace navigation (`/application-draft`).
3. Enter synthetic details, press **Save on this device**, and refresh.
4. Check DevTools Network: the session POST has no applicant fields. Draft saving
   makes no network request. DevTools Application → IndexedDB contains the draft.
5. Export a private JSON copy, delete the saved draft, and refresh to confirm deletion.
6. **Reset browser reference** deletes that reference's database metadata and
   creates a new one. The local draft stays available.
7. A separate browser profile starts with empty fields. Session-service failure
   does not prevent browsing guides or saving/exporting a local draft.

Local storage is not encrypted by this app. Someone using the same browser
profile can access it; avoid shared devices or delete drafts afterward. Clearing
site data can permanently lose a draft. Exported files also contain personal data
and must be kept private. Saving a draft is preparation, not official submission.

This change does not modify the separately owned Lumen functionality or its
existing data flows. The local-only guarantee applies to this draft form.

## Teammate and deployment configuration

The existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` remain
the shared public connection values. Obtain **`APPLICANT_SESSION_SECRET` privately**
from the project maintainer and place it in `.env.local` and the server hosting
environment. It must match the existing 64-character hexadecimal value provisioned
in `private.applicant_session_secret`. The current computer is configured.

Do not commit the secret, prefix it with `NEXT_PUBLIC_`, generate a different value
for each teammate, or overwrite the shared database key. A blank/mismatched key
makes session requests return 503; guides and local drafts continue working.
The app does not need a Supabase service-role key. New database provisioning
requires privately installing the same secret after applying migrations.
Coordinated secret rotation invalidates existing references, not local drafts.

## Applicant backend boundaries

Published catalogue/detail, requirement steps/FAQs, source references, official
links, checklist preparation, and private local drafts are supported. Draft and
unapproved administrative content remains unavailable to applicants.

The team still needs reviewed real scholarship content and confirmed official
dates/links. Education-level, new/renewal, and semester filtering needs explicit
guide metadata and agreed rules before the backend can guarantee those filters.
Official application submission, uploads for office review, adjudication, and
status tracking are not implemented; define those workflows separately before
adding sensitive server-side records.

Supabase still reports its existing Auth warning that leaked-password protection
is disabled. Review the [Supabase password protection setting](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
for provisioned admin accounts. The private metadata tables intentionally have no
RLS policies: direct access is denied; the server-proof function is their sole
application access path.
