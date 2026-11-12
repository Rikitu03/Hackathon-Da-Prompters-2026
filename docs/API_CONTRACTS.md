# Backend API contracts

All implemented API responses are JSON with `Cache-Control: private, no-store`.
Failures return `{ "error": "Readable message" }`. Typical status codes are 400
for invalid data, 401 for missing/invalid authentication, 403 for insufficient
permissions or cross-site writes, 404 for missing/private records, and 503 for
database unavailability. Administrative mutations use the signed-in caller's
session and RLS; no service key is involved. JSON request bodies are limited to
512 KB. Browser writes must have the same origin.

## Authentication

| Method and path | Body / result |
|---|---|
| `POST /api/auth/login` | `{email,password}` → `{user:{id,email},role}` and session cookies |
| `GET /api/auth/session` | `{user:{id,email},role}`; requires an administrator profile |
| `POST /api/auth/logout` | `{signedOut:true}`; signs out this session |

Sessions use HTTP-only cookies, secure cookies in production, and refresh
middleware. Server authorization verifies identity with `auth.getUser()` and
checks `admin_profiles`; user metadata is never an authorization source.

## Public reads

| Method and path | Result |
|---|---|
| `GET /api/scholarships?page=1` | `{programs,page,pageSize:20}` with published cycle summaries |
| `GET /api/scholarships/:id` | `{program}` with published cycles, requirements, ordered preparation steps, FAQs, and approved source references |
| `GET /api/requirements/:id` | `{requirement}` with preparation steps and FAQs |
| `GET /api/health` | `{status,service,database:{connected},configured}`; 503 if the database cannot be read |

Public reads always use an anonymous client, including when an administrator is
signed in. Both the program and cycle must be published. Knowledge must also
be approved. There is no applicant signup requirement for public reads.

## Administrative content

Editors and publishers can read; only publishers can mutate content.

| Method and path | Body / result |
|---|---|
| `GET /api/admin/guides` | `{guides}` with up to 100 cycle/program summaries, including drafts |
| `GET /api/admin/guides/:cycleId` | `{guide}` as an editable document including its current status |
| `POST /api/admin/guides` | Guide document below → `{guide:{programId,cycleId,status:"draft"}}`; 201 for a new cycle, 200 for an existing one |
| `POST /api/admin/programs` | `{title,description?}` → `{program}`; creates a draft, 201 |
| `PATCH /api/admin/programs/:id` | `{title?,description?}` → `{program}`; returns the program to draft |
| `DELETE /api/admin/programs/:id` | `{deleted:id}`; deletes the program and all descendant cycles/content |
| `POST /api/admin/publish` | `{cycleId,publish?:true}` → `{guide:{programId,cycleId,status}}` |

Use `publish:false` to unpublish a cycle. Publication is atomic with the program
status update. It requires valid dates, description, HTTPS application URL,
requirements with acquisition steps, and a reviewed approved source with HTTPS
URL and reference text. Source support is confirmed by the human publisher.

### Guide document

```json
{
  "title": "Scholarship name",
  "description": "Reviewed description",
  "academicYear": "2026–2027",
  "applicationStart": "2026-11-01",
  "applicationEnd": "2026-12-01",
  "officialUrl": "https://example.com/application",
  "requirements": [{
    "title": "Document name",
    "description": "What to prepare",
    "required": true,
    "steps": ["First preparation step"],
    "faqs": [{"question":"Question?", "answer":"Reviewed answer."}]
  }],
  "sources": [{
    "title": "Official reference",
    "url": "https://example.com/reference",
    "content": "Reviewed source text",
    "approved": false
  }]
}
```

These example URLs and dates are illustrative, not scholarship guidance.
When editing, preserve `programId`, `cycleId`, and requirement/source `id` values
from the loaded document, but omit the read-only `status` field. Empty dates,
URLs, requirement arrays, and source arrays are allowed in drafts. The title and
academic year are required. Maximums: 30 requirements, 20 steps and 20 FAQs per
requirement, 10 sources, and 30,000 characters of text per source.

Saving atomically replaces descendants and returns the program and edited cycle
to draft. This hides the program's other cycles until the program is published
again; old published revisions are not kept live. Requirements retain supplied
IDs so browser checklists can survive edits. Source content versions increment
when a supplied source ID is reused; historical text revisions are not retained.

## AI endpoints

- `POST /api/ai/chat`: `{cycleId,requirementId?,message}`. Planned response:
  `{answer,sources:[{sourceId,title,url}],grounded:true}`.
- `POST /api/ai/ocr` — `multipart/form-data` with `file` (JPG, PNG, WebP, TIFF or PDF; ≤ 4 MB; type checked by file contents) and `consent=true`.
  - `200` → `OCRReviewResponse`: `{ "rawText": "...", "fields": [{ "key", "label", "value", "needsReview", "originalText", "warnings": [] }], "warnings": [], "disclaimer": "..." }`. The frozen keys (`rawText`, `fields[].key/label/value/needsReview`, `warnings`) are unchanged; `originalText`, per-field `warnings` and `disclaimer` are additions. Field keys: `document_type`, `full_name`, `barangay`, `date_issued`, `purpose`, `issuing_office`. Values are editable suggestions; an empty `value` comes with a "Not found" warning.
  - Errors `{ "error": "..." }`: `400` missing consent/file, `403` cross-site request, `413` too large, `415` unsupported type, `422` unreadable document, `429` rate limited (5 uploads per 10 minutes, `Retry-After` header), `500` unexpected, `502`/`503`/`504` OCR service problems (`503` also when OCR is switched off).
  - ⚠ The file is sent to Lumen OCR, which keeps a copy that's visible to the whole hackathon organization (no delete). UI consent text must say so; use demo documents only.
  - UI: disable submit while a request is in flight; a retry after `504` re-uploads and spends credits again; error bodies may be non-JSON when the platform times out.

`/api/ai/chat` still returns 503 when configuration is missing and 501 until the
grounded pipeline is wired. Member 4 must verify Lumen's actual contract,
add rate limits and upload validation, and restrict retrieval to approved
published cycle-scoped knowledge. No AI response is fabricated.

See [BACKEND_WALKTHROUGH.md](BACKEND_WALKTHROUGH.md) for browser acceptance tests.
