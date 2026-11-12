---
name: gabay-ocr-intake
description: Implement and harden GabayIskolar's document OCR endpoint — POST /api/ai/ocr — covering multipart upload validation, consent, transient (never stored) handling of student documents, calling Lumen OCR, and returning editable extracted fields with original text and review warnings. Use this for any work on document upload, scanning IDs/certificates/grades, OCR field extraction or correction, file size/type limits, or privacy of student uploads, even if the user just says "make the upload work" or "parse the certificate".
---

# OCR intake (Member 4)

Purpose: an applicant optionally uploads a **demonstration** document (e.g. a certificate of indigency, report card), we run Lumen OCR, and give back fields they can review and correct. It's a preparation aid — not verification.

Two things make this endpoint sensitive: it handles real minors' personal documents, and OCR output is easy to over-trust. So the design is: accept little, keep nothing, and label everything as "please check".

Prerequisite: read the OCR section of `docs/LUMEN_CONTRACT.md`. Lumen OCR is **asynchronous**: upload raw bytes, poll the record until it's done, then read the pages. It is **not** a multipart upload and doesn't return text synchronously.

## ⚠ The privacy reality (read before building)
Lumen stores every uploaded document **permanently**: the developer API has no delete. It stores them **org-wide**, and the hackathon org is shared, so other keys can list and download them. That contradicts the original "transient uploads" plan in docs/ARCHITECTURE.md. So:
- Treat this as a **demo-documents-only** feature. Say so in the UI, and make sure the user knows to raise it with the team.
- Send a generic `X-Lumen-Document-Name` (`gabay-upload-<random>.<ext>`). Never send the student's file name, which often contains their name.
- The consent text must say plainly that the file is sent to and kept by a third-party OCR provider.
- What *we* control is still transient: no Supabase Storage, no disk, and no logging of contents.

## Route: `src/app/api/ai/ocr/route.ts`

```ts
export const runtime = "nodejs";      // need bytes handling; not edge
export const maxDuration = 40;        // upload + polling (~20 s budget) + pages
```

### 1. Check config, then the request
Order matters: cheap checks first, and before reading the body.
1. Lumen env missing → 503 (already there).
2. `content-type` not `multipart/form-data` → 415 (already there).
3. `content-length` header > limit → 413 before calling `formData()`.
4. `const form = await request.formData()`; `form.get("file")` must be a `File`.
5. **Consent:** require `form.get("consent") === "true"`; otherwise 400 `{ error: "Consent is required to process your document." }`. The UI (Member 1) shows the consent text; the server still enforces it because the UI can be bypassed.
6. **Size:** ≤ 4 MB. Lumen accepts 10 MiB, but Vercel serverless request bodies cap at about 4.5 MB, so the tighter limit wins.
7. **Type:** Lumen accepts `application/pdf`, `image/png`, `image/jpeg`, `image/tiff`, `image/webp`. Allow-list the ones the UI offers (phone photos are JPEG/PNG/WebP, and PDF is common). Don't trust `file.type` alone; check the file's first bytes (its "magic bytes"):
   - JPEG `FF D8 FF`, PNG `89 50 4E 47`, WEBP `52 49 46 46 ?? ?? ?? ?? 57 45 42 50`, PDF `25 50 44 46`, TIFF `49 49 2A 00` / `4D 4D 00 2A`.
   Mismatch → 415. Send Lumen the media type *you* detected, not the browser's.

### 2. Keep our side transient
- Read into memory (`new Uint8Array(await file.arrayBuffer())`), send it to Lumen, and drop it. No Supabase Storage, no `/tmp`, no caching.
- Don't log file names, extracted text, or field values. Log size, mime, latency, status and Lumen's `requestId`/`DocumentID`.
- Respond with `Cache-Control: no-store`.

### 3. Call Lumen via the adapter (upload → poll → pages)
Use `uploadDocument` → `waitForRead` → `getPages` from `src/lib/lumen/ocr.ts` (see `gabay-lumen-client`).
- **Credits:** 6 for the upload (charged only if the read succeeds), plus **1 per status poll**, plus 1 for pages. Poll with back-off (first check at ~1.5 s, then every ~2.5 s), and stop after about 20 s or 8 polls. An observed 2-page PDF finished in about 2 s, so most uploads should cost around 8–9 credits.
- Status `PARTIAL` is usable: return what was read and add a warning naming the `FailedPageNumbers`. `FAILED` → a recoverable error that mentions the `FailureReason` in plain words (`unsupported_media`/`corrupt_document` → "We couldn't open this file"; `timeout`/`unavailable` → "Try again in a moment"). Don't auto-retry, because a retry costs credits too.
- If it's still not done when the budget runs out, the route returns 504 with a retry message.
- Map `LumenError` kinds to HTTP as in `gabay-lumen-client`. Failures must be recoverable in the UI: `{ error: "We couldn't read this document. Try a clearer, well-lit photo, or skip this step." }`, never a stack trace.
- The page schema was observed on our demo upload and is recorded in `docs/LUMEN_CONTRACT.md`: `data.Items[].Lines[].{text, box, confidence}`, with the lines in reading order. Validate it with zod, but loosely: require only `Items[].PageNumber` and `Lines[].text`, and make the rest optional. Build `rawText` by joining `Lines[].text` with newlines, page by page.

### 4. Normalize into editable fields
Response shape (document any change in `docs/API_CONTRACTS.md` and `src/types/domain.ts`, and tell Member 1):

```ts
type OcrField = {
  key: string;            // "full_name", "date_issued", "issuing_office", ...
  label: string;          // human label shown in the form
  value: string;          // our best guess; user edits this
  originalText: string;   // the exact OCR snippet it came from ("" if not found)
  warnings: string[];     // e.g. "Low confidence", "Date format unclear", "Not found"
};
type OcrResponse = {
  fields: OcrField[];
  rawText: string;        // full OCR text so the user can see what was read
  warnings: string[];     // document-level, e.g. "Image is blurry"
  disclaimer: string;     // always present
};
```

- Lumen OCR returns lines and words, not labelled fields. Philippine certificates mostly print `Label: value` lines, which Lumen reads as single lines (e.g. `Name: Juan Dela Cruz`, `Date Issued: 2026-11-13`). So extract fields by matching each line against `^\s*(<label aliases>)\s*[:\-]\s*(.+)$`, with aliases per field (`name|pangalan`, `date issued|petsa`, `barangay`, `purpose|layunin`, `issuing office`…). Set `originalText` to the whole matched line. The document title (e.g. "CERTIFICATE OF INDIGENCY") is usually the boldest or earliest all-caps line; offer it as a `document_type` suggestion, never as a verdict.
- Confidence is `{ measured: true, value }` or `{ measured: false, reason }`. If a line's value is below 0.90, add "Low confidence, please check". If it's unmeasured, add "Confidence not reported". Thresholds are a judgement call, since a clean test image scored 0.95–1.0. When unsure, leave `value` empty and add a warning — an empty field the user fills in is better than a wrong one they don't notice.
- Never add fields or text like "verified", "authentic", "eligible", "valid", or "approved". We can't know that; claiming it could mislead a student or a reviewer.
- `disclaimer`: "Automatically read text may contain errors. Please review every field. This tool does not verify documents or decide eligibility." (Filipino version too if the UI is bilingual.)
- Consent text (shown by Member 1's UI, enforced by the server): it must say the document is sent to a third-party OCR service that **keeps a copy**, and that students should use a sample or redacted document in this prototype.
- Treat `rawText` as untrusted data. If it's ever passed to the chat model, it goes in a labelled `<student_document>` block, never as a source (see `gabay-grounded-chat`).

### 5. Done means
- `npm run typecheck && npm run lint` pass.
- Tested against real Lumen with a **sample/demo** document (never a teammate's real ID): happy path, wrong type (e.g. a `.txt` renamed `.png` → 415), oversize (→ 413), missing consent (→ 400), and a blurry image giving warnings rather than a crash.
- Report which of those you actually ran and what came back.
