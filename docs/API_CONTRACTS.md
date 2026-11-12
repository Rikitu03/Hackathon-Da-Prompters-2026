# API contracts (proposed, not Lumen-native formats)

## Public

- `GET /api/scholarships` → published program summaries
- `GET /api/scholarships/:id` → public program and active cycles
- `GET /api/requirements/:id` → requirement and its approved journey

## Admin (authenticated roles only)

- `POST /api/admin/programs` → create draft program
- `PATCH /api/admin/programs/:id` → edit program
- `POST /api/admin/publish` → publish a validated application cycle

## AI (server only)

- `POST /api/ai/chat` with `{ "cycleId":"uuid", "requirementId":"uuid", "message":"Where can I get this?" }`
- Response when implemented: `{ "answer":"...", "sources":[{"sourceId":"uuid","title":"...","url":"https://..."}], "grounded":true }`
- `POST /api/ai/ocr` multipart file → editable extracted fields with original text and review warnings.

Current AI handlers intentionally return 501 until a verified grounded pipeline exists, or 503 if Lumen is not configured. **Never spoof AI responses in production.**

## Data behavior

- Applicant checklist progress stays in local browser storage for MVP.
- Published guidance is accessible publicly; drafts and unapproved knowledge are private.
- Server must re-check auth on every administrative write.
