# Lumen contract (verified 2026-11-13 by Member 4)

Sources:
- AI Chat: https://sandbox.docs.lumensuite.io/explorer/ai-chat — spec `/specs/ai-chat-openapi.yaml`, guide `/specs/ai-chat-api.md` (v1.0.0, "Preview")
- OCR: https://sandbox.docs.lumensuite.io/explorer/ocr/listOcrDocuments — spec `/specs/ocr-openapi.yaml`, guide `/specs/ocr-api.md` (v1.0.0, "Preview")

Both APIs exist on the **test/staging gateways only**, not on live.

## Gateway and auth
- Origin (sandbox docs, staging): `https://api.staging.nonlive.lumen.bayanichain.tech`
  - Chat base: `{origin}/ai_chat` → env `LUMEN_CHAT_URL`
  - OCR base: `{origin}/ocr` → env `LUMEN_OCR_URL`
- Headers on every call: `lumen-api-key`, `lumen-api-secret` (no Bearer/OAuth). The key needs the AI Chat and OCR grants: `403 ACCESS_DENIED` without one, `403 VIEW_ONLY_ACCESS` on POST routes with a read-only grant.
- Errors (both APIs): `{ "error": { "code": "...", "message": "..." } }` plus the HTTP status. Failed calls are not charged.

**Verified 2026-11-13:** `GET /ai_chat/instances` → 200 (1.0 s); `GET /ocr/documents?Limit=1` → 200 (0.9 s). Our key has both grants.

## AI Chat
Flow: list instances → open session → send message → (optional) read transcript.

| Call | Credits | Notes |
|---|---|---|
| `GET /instances` | 1 | `{ Instances: [{ InstanceID, Name, Description, Status }], Count }` |
| `POST /instances/{id}/sessions` | 2 | body optional `{ "title": "1–200 chars" }` → **201** `{ Session: { id, organizationID, title, isArchived, createdTS, updatedTS, metadata } }` |
| `POST /instances/{id}/sessions/{sessionID}/messages` | 5 | body `{ "message": "1–4000 chars" }` → **200** `{ Answer: { sessionID, answer, citations?: string[], degradedSources?: string[] } }` |
| `GET /instances/{id}/sessions/{sessionID}/messages?limit=1..200` | 1 | `{ Messages: [{ id, sessionID, role: "user"\|"assistant", content, createdTS }], Count }`, oldest first, no cursor |

**Our instance (verified):** `InstanceID 707a5232-db45-47a2-a2f3-a1290315f70f`, Name `PLP-Hackathon-Blank`, Status `ACTIVE`. Its description is "Blank instance for the PLP Student Hackathon - teams set behavior in their own messages". This means:
- **There is no system-prompt or context field.** Grounding instructions, the numbered sources and the student's question must all fit in `message`, with a **4000-character** cap on the whole thing.
- Sessions and their transcripts are stored on Lumen. They're tied to the creating key (another key gets `403 SESSION_NOT_OWNED`) and to the instance (another instance gets `404 SESSION_NOT_FOR_INSTANCE`). An archived session returns `409 AI_CHAT_CONFLICT`.
- Not verified: whether the model sees earlier turns in the same session.

Timing: the backend gives up at **25 s** and returns `504 AI_CHAT_REPLY_TIMEOUT` (not charged, and the question stays in the transcript). Our client timeout must be **above 25 s** (use ~28 s), and the route's `maxDuration` must be above that.

Error codes: 400 `VALIDATION_ERROR`, `AI_CHAT_QUERY_TOO_LONG`, `AI_CHAT_QUERY_REQUIRED`, `AI_CHAT_BAD_REQUEST`, `AI_CHAT_SESSION_ID_INVALID` · 401 `API_KEY_NOT_FOUND`, `API_SECRET_NOT_FOUND`, `INVALID_API_CREDENTIALS` · 403 `ACCESS_DENIED`, `VIEW_ONLY_ACCESS`, `ORG_SUBSCRIPTION_INACTIVE`, `API_CREDITS_INSUFFICIENT`, `LC_INSUFFICIENT`, `SESSION_NOT_OWNED` · 404 `AI_CHAT_SESSION_NOT_FOUND`, `SESSION_NOT_FOR_INSTANCE` · 409 `AI_CHAT_CONFLICT` · 429 `RATE_LIMIT_EXCEEDED`, `BURST_RATE_LIMIT_EXCEEDED`, `AI_CHAT_MODEL_RATE_LIMITED` · 502 `AI_CHAT_MODEL_UPSTREAM_ERROR` · 503 `AI_CHAT_NOT_CONFIGURED`, `AI_CHAT_DEPENDENCY_UNAVAILABLE`, `AI_CHAT_MODEL_UNAVAILABLE`, `PERMISSIONS_UPDATING`, `FEATURE_DISABLED` · 504 `AI_CHAT_REPLY_TIMEOUT`.

### Observed 2026-11-13 (session 2 credits + message 5 credits)
`POST /instances/{id}/sessions` `{"title":"gabay-smoke-test"}` → **201** in 1.0 s:
```json
{ "Session": { "id": "00b94164-…", "organizationID": "f8b8430f-…", "title": "gabay-smoke-test",
  "isArchived": false, "createdTS": 1794503087, "updatedTS": 1794503087,
  "metadata": { "instance": "707a5232-…", "admin": "<OUR API KEY, redacted>" } } }
```
⚠ `Session.metadata.admin` **echoes our API key in plain text.** Never log or return a raw session response.

`POST …/sessions/{sid}/messages` `{"message":"Reply with OK"}` → **200** in 2.6 s:
```json
{ "Answer": { "sessionID": "00b94164-…", "answer": "That question is outside what this assistant covers.",
  "citations": [], "degradedSources": [] } }
```
- `citations` and `degradedSources` came back as empty arrays (present, not absent).
- **The instance has a scope gate.** The spec mentions a classifier (`LUMEN_AI_CHAT_CLASSIFIER_TIMEOUT_MS`) and an instance-configured "out-of-scope reply". A bare "Reply with OK" was refused with a fixed sentence, still as a 200 and presumably still charged. The adapter must treat that exact sentence as a refusal, not an answer: map it to `grounded:false`.
- **Not yet verified:** whether a full grounded message (instructions + `[S#]` sources + a scholarship question) passes the gate. Test this before building the RAG prompt. Reusing session `00b94164-…` costs 5 credits, not 7.

## OCR
Asynchronous. Upload raw bytes, poll the record until it's done, then read the pages. JSON success bodies are wrapped as `{ "data": ..., "requestId": "..." }`, so always read from `data`.

1. **Upload:** `POST /documents` with the **raw file bytes** as the body (not multipart, not base64).
   - `Content-Type`: one of `application/pdf`, `image/png`, `image/jpeg`, `image/tiff`, `image/webp`. Anything else returns 415.
   - `X-Lumen-Document-Name`: percent-encoded UTF-8, 1–256 characters.
   - Max size **10 MiB** (413 above that).
   - Returns **202** with a `Location` header and `data.DocumentID`.
   - (Sending a JSON body `{ Name, MediaType, ByteSize }` instead means "descriptor mode": 201 PENDING, with the bytes sent separately. We don't use it.)
2. **Poll:** `GET /documents/{id}` until `data.Status` is `READY` or `PARTIAL`. The full sequence is `PENDING → PROCESSING → READY | PARTIAL | FAILED`; `FailureReason` is set when the status is FAILED or PARTIAL. **Each poll costs 1 credit.**
3. **Read:** `GET /documents/{id}/pages?IncludeWords=true` (`IncludeWords` is the literal string `true`/`false`), or one page with `GET /documents/{id}/pages/{n}`. The spec doesn't define the page response schema. It has words, lines, geometry, confidence and an `IncludesWords` flag.

Record fields: `DocumentID, Name, MediaType, ByteSize, PageCount, Status, FailedPageNumbers, CreatedTS, Engine{name,version,unit}, FailureReason?, ReadCompletedTS?`.
Observed engine: `amazon-textract`, unit `word`. One existing 2-page PDF went from created to read in about 2 s.

| Call | Credits |
|---|---|
| `POST /documents` | 6, charged only if the read ends READY/PARTIAL |
| `POST /documents/{id}/retry` | 3, same rule as upload |
| every `GET` | 1 |
| `POST /documents/{id}/reviews` / `review/corrections` | 2 (review flow uses `If-Match` ETags; we don't need it for the MVP) |

Error codes: 400 `invalid_request_header` · 401 as for chat · 403 as for chat · 409 `OCR_DOCUMENT_NOT_RETRYABLE`, `OCR_DOCUMENT_NOT_READY`, `OCR_REVIEW_CONFLICT` · 413 · 415 · 428 `ocr_review_precondition_required` · 429 `RATE_LIMIT_EXCEEDED`, `BURST_RATE_LIMIT_EXCEEDED` · 503 `OCR_NOT_CONFIGURED`, `OCR_READ_QUEUE_FULL`, `PERMISSIONS_UPDATING`, `FEATURE_DISABLED`.

### Observed 2026-11-13 (our demo upload, 9 credits: upload 6 + 2 polls + pages 1)
Our upload: fictional "CERTIFICATE OF INDIGENCY" PNG (1200×800, 36 KB), uploaded as `gabay-smoke-6e00b506.png` with **DocumentID `50a56ac6-8cec-4f06-a413-7ac9d409cc39`**. If you see that ID in the org list, it's ours (demo content only).
- Upload → 202 (1.2 s), Status `PROCESSING`. Poll 1 (at about 1.5 s) still `PROCESSING`; poll 2 (about 4 s) `READY`. Lumen's own read time was about 2 s (`ReadCompletedTS − CreatedTS`).
- `GET …/pages?IncludeWords=true` → 200 (1.0 s):

```jsonc
{ "data": {
    "IncludesWords": true,
    "Items": [{
      "DocumentID": "50a56ac6-…", "PageNumber": 1,
      "Origin": "rasterised",                       // or a text-layer origin for digital PDFs
      "ToSource": { "a":1,"b":0,"c":0,"d":0,"e":1,"f":0 },   // affine transform back to source page
      "Raster": { "widthPx": 1200, "heightPx": 800, "dpi": 200 },
      "Confidence": { "measured": true, "value": 0.9959, "unit": "word" },
      "Words": [ { "text": "SAMPLE",
                   "box": { "x": 0.054, "y": 0.056, "w": 0.090, "h": 0.029 },  // normalised 0..1
                   "confidence": { "measured": true, "value": 0.9928, "unit": "word" } } ],
      "Lines": [ { "text": "SAMPLE DOCUMENT - FOR TESTING ONLY", "box": {…}, "confidence": {…},
                   "words": [ /* same shape as Words */ ] } ]
    }] },
  "requestId": "1a03b463-…" }
```
- `Lines[].text` came back in reading order, top to bottom, and every line was exact (8/8). For example `Name: Juan Dela Cruz (fictional)` and `Date Issued: 2026-11-13`. Word confidence ranged from 0.949 to 1.0 on a clean image.
- Confidence is `{ measured: true, value, unit }` or `{ measured: false, reason }` (per the review schema). Handle both.
- Page-level keys are PascalCase; keys inside words and lines are lowercase (`text`, `box`, `confidence`, `words`).

## ⚠ Privacy constraints this creates
- **OCR uploads are permanent and visible to the whole organization.** There is no DELETE on the developer surface, and `GET /documents` already lists a document our team didn't upload. That means the hackathon org is shared, so another key in it can list and download whatever we upload (`GET /documents/{id}/file`). This conflicts with "student uploads are transient" in ARCHITECTURE.md. **Only upload demo/sample documents.** Send a generic `X-Lumen-Document-Name` (e.g. `gabay-upload-<random>.jpg`), never the student's file name. The consent text must say the file is stored by the OCR provider.
- **Chat transcripts are stored on Lumen too.** Don't put personal data in chat messages, and tell users not to.
- **Session responses contain our API key** (`Session.metadata.admin`). Keep them server-side and never log them.

## Credits spent so far (Member 4, 2026-11-13)
3 read-only checks (3) + chat smoke (7) + OCR smoke (9) = **19 credits**.

## Limits / quota notes
- Our credit balance hasn't been checked yet (not visible through these APIs).
- Rate limits exist (`RATE_LIMIT_EXCEEDED`, `BURST_RATE_LIMIT_EXCEEDED`), but the numbers aren't published.
