# Shared team environment

All four members use one Supabase development project. Each computer runs its own
Next.js app connected to that same database. Drafts, published guides, sources,
and test admin accounts are shared; applicant checklist progress remains local
to each browser.

## Shared development project

The connected Supabase account had no existing projects. One shared project was
created in **The Prompters** organization with a quoted cost of **$0/month**:

| Setting | Value |
|---|---|
| Project | `gabayiskolar-dev` |
| Project reference | `jchbbechdldfcyralrln` |
| Region | Singapore (`ap-southeast-1`) |
| Public URL | `https://jchbbechdldfcyralrln.supabase.co` |
| Dashboard | [Shared Supabase project](https://supabase.com/dashboard/project/jchbbechdldfcyralrln) |
| Public key | Publishable key in `.env.example`, using `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

All four teammates use these same public values. Share the template and migration
changes through the team's normal reviewed Git workflow. No separate project is
needed for each teammate.

M3 has applied these migrations once to the shared database:

- `20261112161002_initial.sql`: eight tables, indexes, explicit grants, and RLS.
- `20261112161426_consolidate_content_policies.sql`: one read policy per role and
  separate publisher insert, update, and delete policies.
- `20261112163314_guide_workflow.sql`: ordered text chunks, date constraints,
  atomic draft saving, validated publishing/unpublishing, and source reconstruction.

The filenames match the hosted migration versions. The original unapplied
`0001_initial.sql` was corrected and renamed to the recorded initial version.
Do not rerun these migrations manually on the shared project. For a new empty
database, apply every migration in filename order using migration tooling.

| Caller | Content reads | Content writes |
|---|---|---|
| Anonymous / ordinary signed-in user | Published programs and cycles, their requirements/steps/FAQs, and approved published knowledge | None |
| Editor | All content, including drafts and unapproved knowledge | None |
| Publisher | All content | Insert, update, delete |

Every public child record requires its cycle and program to be published.
`admin_profiles` permits authenticated users to read only their own profile;
client roles cannot assign or change roles. Internal helpers use caller
permissions in a non-exposed `private` schema, with no security-definer bypass.

Provision each teammate's application Auth identity through trusted admin tooling
when needed, then assign their role in `admin_profiles` through the dashboard or
a trusted backend. A requested development test publisher is now seeded as
`dev-admin@gabayiskolar.test`; its generated password is in the ignored
`.env.seed.local` on this computer. Two persistent DEMO guides are also seeded.
See [Backend walkthrough](BACKEND_WALKTHROUGH.md) for sign-in and seed instructions.
A Supabase dashboard login and an application's Supabase Auth user are separate
identities. Do not share one publisher login between all members.

Supabase's [Next.js quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
and [API key guide](https://supabase.com/docs/guides/getting-started/api-keys)
describe project connection and the distinction between public and secret keys.

## Every teammate: local setup

After pulling the shared configuration changes:

Use Node.js 22+ to match the locked Supabase SDK requirements.

```powershell
npm ci
npm run setup:env
npm run check:db
npm run dev
```

`setup:env` copies `.env.example` to `.env.local` only if the local file does not
exist. It never overwrites existing values. If you already have `.env.local`,
update its two Supabase entries to match the shared template yourself.
Restart the development server after changing environment variables.

| Variables | Shared value and location |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Same project URL for all four members; may be committed in `.env.example` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same public publishable/anon key; may be committed in `.env.example` |
| `LUMEN_API_KEY`, `LUMEN_API_SECRET` | Share privately using a team password manager or another private channel; put only in `.env.local` and server hosting settings |
| `LUMEN_OCR_URL`, `LUMEN_CHAT_URL` | M4 supplies verified endpoints; set them in `.env.local` |

`.env.local` is ignored by Git. Database passwords, Supabase access tokens, and
secret/service-role keys do not belong in the shared template. The current app
does not require a service-role key in its environment.

## Shared database coordination

- M3 owns schema migrations and coordinates changes with the other members.
- M2 owns reviewed demo content; use synthetic student documents and identities.
- M1 consumes published reads; M4 consumes approved published knowledge.
- Do not reset or delete shared data without coordinating with the team.
- Configure the same project values separately in Vercel. A local environment
  file does not automatically configure a deployed app.

The health route now checks a real public database read and reports
`database.connected`, returning 503 when the database is unavailable. Use
`check:db` for table access checks and `check:backend` with the local server running
for HTTP checks. The visual workbench and manual publishing tests are described
in [BACKEND_WALKTHROUGH.md](BACKEND_WALKTHROUGH.md).

## Verification

`npm run check:db` uses the configured public key to read all seven content tables
over the Data API and confirms anonymous profile access is denied. The seeded
published DEMO guide is expected to be visible; the private draft stays hidden.

Run `supabase/tests/permissions.sql` as `postgres` through the SQL editor or the
integration's SQL tool to recheck permissions after future database changes. It
exercises real INSERT, UPDATE, and DELETE attempts on every content table as
anonymous, ordinary authenticated, editor, and publisher callers. It also checks
draft/archived parent visibility, unapproved sources, profile isolation, and
resistance to role escalation through user metadata. All fixtures and synthetic
Auth identities are rolled back; no test records remain.

The permission suite passed against the shared project. Security advisors reported
no findings, and performance advisors reported no warnings. The remaining
[unused full-text index notice](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
is informational on this new database; retain the index for planned RAG queries.
