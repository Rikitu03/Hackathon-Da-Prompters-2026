# Backend API contracts

Contract audit: **13 November 2026**. Chat behavior below includes the existing uncommitted Member 4 work in this checkout. For differences still present in the merged applicant/admin frontend, see [STATUS.md](STATUS.md).

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

## Account-free browser references

| Method and path | Body / result |
|---|---|
| `POST /api/applicant/session` | No body allowed → `{sessionId,expiresAt}` and signed HttpOnly cookie; reuses a valid reference, replaces an expired one |
| `DELETE /api/applicant/session` | No body needed → `{forgotten:true}`; deletes only the caller's signed reference and clears its cookie |

No applicant Auth session is required. The server sends only random identity,
token hash, optional trusted daily IP hash, and a short-lived proof to Supabase.
Personal fields and draft JSON are rejected. References expire after seven days.
Returns 429 for the best-effort bootstrap limit, or 503 for missing private server
configuration/database failure; neither gates local drafts or public guides.
See [Applicant privacy](APPLICANT_PRIVACY.md) for persistence and private setup.

## Administrative content

Editors and publishers can read; only publishers can mutate content.

| Method and path | Body / result |
|---|---|
| `GET /api/admin/workspace` | `{data:{programs,cycles,requirements,steps,faqs,sources}}`; protected flat data for the final admin UI; sources include saved reference text |
| `GET /api/admin/guides/:cycleId/readiness` | `{checks:[{name,ok}],ready,status}`; read-only preflight using stored content and caller role |
| `POST /api/admin/content` | Typed `save_cycle`, `save_requirement`, or `save_source` action; applies the requested edit atomically and returns `{guide}`; publisher-only |
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

The `/api/admin/content` action bodies are strictly validated:

- `save_cycle`: `{action,programId,cycleId?,academicYear,applicationStart,applicationEnd,officialUrl}`.
- `save_requirement`: `{action,cycleId,requirementId?,title,description,required,steps,faqs}`.
- `save_source`: `{action,cycleId,sourceId?,title,url,content,approved}`. Approval
  requires reference text and an HTTPS URL. Human verification remains required.

Related IDs must belong to the selected cycle. Each action locks and loads the
current document inside its transaction, preserves unrelated content, then saves
as draft. Unchanged sources retain their version/review timestamp; changed source
text, title, or URL increments its version. A publisher must explicitly reapprove
changed sources. Existing full-document guide saves remain supported.

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

- `POST /api/ai/chat` — JSON `{ cycleId: uuid, requirementId?: uuid, message: 1–500 chars }`.
  - `200` → `ChatResponse`: `{ "answer": "...", "sources": [{ "sourceId", "title", "url"? }], "grounded": true|false, "officialUrl"?: "..." }`.
    - `grounded: true`: Lumen answered and cited at least one of the approved passages we sent. Every `sources[]` entry is a real `knowledge_sources.id` from the requested published cycle. The server translates provider `[S1]` passage markers into inline `[1]` markers numbered in `sources` order, deduplicating passages from the same source. Unknown references are removed.
    - `grounded: false`: a **fixed system message, not AI output**, with `sources: []` and the cycle's `officialUrl` when it has one. Returned when the question has no searchable terms, no approved passage matches, Lumen's scope gate refuses, or Lumen's reply cites none of the passages we sent. A closed cycle (Manila date past `application_end`) gets a separate fixed message naming the end date. No Lumen call happens for a closed cycle or when there's no evidence.
    - UI: show `sources` as chips. For `grounded:false`, style it as a notice (not a chat bubble from the AI) and link `officialUrl`.
  - Errors `{ "error": "..." }`: `400` invalid JSON / non-UUID ids / message over 500 chars, `403` cross-site request, `404` cycle not published (draft, archived, unknown), `429` rate limited (10 Lumen-bound attempts per 10 minutes per IP per server instance, `Retry-After` header), `500` unexpected, `502`/`503`/`504` AI or database service problems (`503` also when not configured or `LUMEN_CHAT_ENABLED=false`). A failure never comes with an `answer`.
  - Retrieval reads with the anonymous Supabase client, so RLS limits it to approved sources in published cycles of published programs. Chunks for `requirementId` are ranked first. Each question opens a fresh Lumen session (≈7 credits; up to ~35 s). Don't put personal data in questions, because Lumen stores transcripts.
- `POST /api/ai/ocr` — `multipart/form-data` with `file` (JPG, PNG, WebP, TIFF or PDF; ≤ 4 MB; type checked by file contents) and `consent=true`.
  - `200` → `OCRReviewResponse`: `{ "rawText": "...", "fields": [{ "key", "label", "value", "needsReview", "originalText", "warnings": [] }], "warnings": [], "disclaimer": "..." }`. The frozen keys (`rawText`, `fields[].key/label/value/needsReview`, `warnings`) are unchanged; `originalText`, per-field `warnings` and `disclaimer` are additions. Field keys: `document_type`, `full_name`, `barangay`, `date_issued`, `purpose`, `issuing_office`. Values are editable suggestions; an empty `value` comes with a "Not found" warning.
  - Errors `{ "error": "..." }`: `400` missing consent/file, `403` cross-site request, `413` too large, `415` unsupported type, `422` unreadable document, `429` rate limited (5 uploads per 10 minutes, `Retry-After` header), `500` unexpected, `502`/`503`/`504` OCR service problems (`503` also when OCR is switched off).
  - Optional `profile` form field: `certificate_of_registration`, `certificate_of_residency` or `school_id`. With it, `fields[]` holds that document's key details (defined in `src/lib/verification/document-keywords.json`) instead of the six general ones, and the response adds `profileId` and `detected` (`{ "detected": <profile id> | null, "variant"?: "government_id", "otherTitle"?: "...", "evidence": "..." }`, the document type read from its title line). Without `profile` the response is unchanged. An unknown value returns `400 { "error": "Unknown document type." }` before any upload or credit spend.
  - ⚠ The file is sent to Lumen OCR, which keeps a copy that's visible to the whole hackathon organization (no delete). UI consent text must say so; use demo documents only.
  - UI: disable submit while a request is in flight; a retry after `504` re-uploads and spends credits again; error bodies may be non-JSON when the platform times out.
- `POST /api/ai/verify` — JSON `{ "consent": true, "profileId": "certificate_of_registration" | "certificate_of_residency" | "school_id", "fields": [{ "key", "label", "value" }] (≤ 12), "rawText": "..." (≤ 1500 chars), "related": [{ "profileId", "fields": [...] }] (≤ 2) }`. Asks Lumen AI (the chat instance) whether the extracted details look inconsistent, outdated, incorrect or misread. Only short extracted text is sent, never a file.
  - `200` → `{ "status": "ok", "flags": [{ "id", "severity": "warning" | "info", "title", "detail", "fieldKeys": [], "origin": "ai" }] }` (at most 5; AI never raises an alert, and suggestions that read like a verdict are dropped), or `{ "status": "unavailable", "message": "..." }` when Lumen's scope gate refuses or its reply is unreadable. Rule checks in the browser stand on their own either way.
  - Errors `{ "error": "..." }`: `400` invalid input or missing `consent: true`, `403` cross-site request, `413` body over 32 KB, `429` rate limited (10 reviews per 10 minutes per server instance, `Retry-After` header), `500` unexpected, `502`/`503`/`504` Lumen problems (`503` also when `LUMEN_CHAT_ENABLED=false`).
  - Cost: each review opens a fresh Lumen session (≈7 API credits, up to ~35 s). ⚠ Lumen keeps chat transcripts; send only fictional or sample document details.

Both AI routes are implemented against the Lumen sandbox adapters. OCR has a
recorded live route extraction; the chat route's recorded provider calls were
scope-gated on synthetic disclaimer content, so a cited route answer remains an
acceptance gap. Fixed chat refusals return `grounded:false`; provider failures
return error bodies. Mocked tests do not establish a successful deployed AI flow.

Retrieval is cycle-scoped. Requirement-linked chunks are prioritized when
present, but `save_guide` does not currently populate their `requirement_id`.
The optional requirement UUID is not separately checked for cycle ownership.
Rate limits are best-effort per instance, not a shared organization spending cap.

See [BACKEND_WALKTHROUGH.md](BACKEND_WALKTHROUGH.md) for browser acceptance tests.
