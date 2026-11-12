---
name: gabay-lumen-client
description: Build, verify, and debug the server-side Lumen API client for GabayIskolar (src/lib/lumen). Use this whenever work touches Lumen OCR or Lumen AI Chat calls, LUMEN_* environment variables, the lumen-api-key/lumen-api-secret headers, Lumen instances/sessions/documents, mapping Lumen request/response shapes, Lumen error codes (API_CREDITS_INSUFFICIENT, AI_CHAT_REPLY_TIMEOUT, OCR_READ_QUEUE_FULL…), credits, timeouts, or docs/LUMEN_CONTRACT.md — even if the user only says "hook up the AI", "test the API key", or "why is Lumen returning 403".
---

# Lumen client (Member 4)

Lumen is the organizer-provided AI Chat + OCR API. **The verified contract is in `docs/LUMEN_CONTRACT.md` — read it first.** It was checked against the live staging gateway. Don't code from memory or from this skill alone.

If the contract and reality disagree (a new error code, a different field), trust what the real call returns, update `docs/LUMEN_CONTRACT.md`, and say so. The upstream source is the OpenAPI spec at `https://sandbox.docs.lumensuite.io/specs/{ai-chat,ocr}-openapi.yaml`, plus the companion guides `…/specs/{ai-chat,ocr}-api.md`. The docs site itself is a JS app, so fetch those raw files instead.

## Ground rules (and why)

- **Server-only.** Every Lumen module starts with `import "server-only";`. `LUMEN_API_KEY` / `LUMEN_API_SECRET` are never `NEXT_PUBLIC_*`. A leaked key spends the team's credits and is a judged security failure.
- **Every call costs credits.** Chat message = 5, session = 2, OCR upload = 6, every GET = 1 (including each OCR status poll). Design to minimise calls, and don't "test" in loops.
- **No spoofed AI output.** Unconfigured → 503, not wired → 501, Lumen failure → mapped error. Never return canned text that looks like a model answer.
- **Never log secrets or student content.** Log status, latency, Lumen `error.code`, and OCR `requestId`.
- **The org is shared and OCR uploads can't be deleted.** Only demo documents, generic upload names. See the privacy section of the contract.

## Shape of the APIs (summary; details in the contract)

- Env: `LUMEN_CHAT_URL` = `{origin}/ai_chat`, `LUMEN_OCR_URL` = `{origin}/ocr`, `LUMEN_CHAT_INSTANCE_ID` = our instance (avoids paying 1 credit for `/instances` on every request).
- **Chat:** `POST {chat}/instances/{id}/sessions` → `Session.id`, then `POST …/sessions/{sid}/messages` with `{ message }` (≤ 4000 chars) → `Answer.answer`. The instance is *blank*, so there's no system/context field and instructions, sources and question all go in `message`. The backend times out at 25 s with `504 AI_CHAT_REPLY_TIMEOUT`.
- **OCR:** `POST {ocr}/documents` with **raw bytes**, `Content-Type` = file type, and `X-Lumen-Document-Name` percent-encoded → 202 `data.DocumentID`. Then poll `GET {ocr}/documents/{id}` until `READY`/`PARTIAL`/`FAILED`, then `GET …/pages?IncludeWords=true`. Success bodies are `{ data, requestId }`.
- Errors: `{ error: { code, message } }`.

## Smoke test (real calls)
From the repo root. Each mode prints its credit cost in the script header:
```bash
node .claude/skills/gabay-lumen-client/scripts/lumen-smoke.mjs instances
node .claude/skills/gabay-lumen-client/scripts/lumen-smoke.mjs chat "Reply with the word OK."
node .claude/skills/gabay-lumen-client/scripts/lumen-smoke.mjs ocr path/to/DEMO-document.png
node .claude/skills/gabay-lumen-client/scripts/lumen-smoke.mjs get ocr "/documents?Limit=1"
```
It reads `.env.local` then `.env`, and redacts credentials from output. Run the chat/OCR modes only when the user wants a real paid call, and tell them the cost first.

## Adapter layout (`src/lib/lumen/`)
Keep Lumen's PascalCase wire format inside this folder. The rest of the app uses our types in `src/types/domain.ts`.

- `config.ts`: reads env and throws when missing. Add `chatInstanceId` from `LUMEN_CHAT_INSTANCE_ID`.
- `http.ts`: `lumenFetch(url, init & { timeoutMs })`. It adds headers and `AbortSignal.timeout`, parses `{ error: { code } }`, and throws `LumenError { kind, status, code? }`.
- `chat.ts`: `openSession(title?)` returns **only** the session id. The raw session response contains our API key in `metadata.admin`, so it must never be logged or returned. `sendMessage(sessionId, message)` → `{ answer, outOfScope, citations, degradedSources }`, where `outOfScope` is true when the answer is the instance's fixed refusal ("That question is outside what this assistant covers."). Use a **28 s timeout** on `sendMessage` (just above Lumen's 25 s) and set `export const maxDuration = 35` (or more) on the route.
- `ocr.ts`: `uploadDocument(bytes, mime)` → id; `waitForRead(id, { maxMs })`, which polls with back-off (~1.5 s, then 2.5 s, capped at about 8 polls, and remember every poll costs a credit); `getPages(id)`. Validate `data` with zod. The page schema isn't published, so parse it loosely and update the contract once observed.

Map `error.code` to a `LumenError.kind`, then to our HTTP response:

| Lumen | kind | our status / message |
|---|---|---|
| 401 `*_NOT_FOUND`, `INVALID_API_CREDENTIALS`; 403 `ACCESS_DENIED`, `VIEW_ONLY_ACCESS`, `ORG_SUBSCRIPTION_INACTIVE`, `SESSION_NOT_OWNED` | `auth` | 502 "AI service unavailable" (our config problem; don't leak details) |
| 403 `API_CREDITS_INSUFFICIENT`, `LC_INSUFFICIENT` | `credits` | 503 "AI service temporarily unavailable" (log loudly, since the team must top up) |
| 429 any | `rate_limited` | 429 with `Retry-After` |
| 504 `AI_CHAT_REPLY_TIMEOUT`, our abort | `timeout` | 504 "Took too long, please try again" |
| 503 any (`*_NOT_CONFIGURED`, `OCR_READ_QUEUE_FULL`, `PERMISSIONS_UPDATING`…) | `unavailable` | 503 |
| 502, unexpected shape (zod fails) | `upstream` / `bad_response` | 502 |
| 400 `AI_CHAT_QUERY_TOO_LONG` | `bad_request` | means our prompt builder exceeded 4000 chars, which is a bug; log it and return 500 |

## Done means
- `npm run typecheck && npm run lint` pass; `grep -rn "LUMEN_" src --include=*.tsx` finds nothing in client components.
- One real call went through the adapter, and you tell the user which call it was, its status, and what came back. Don't claim the integration works until it has been tested against the real service.
- Anything newly observed (page schema, citations shape, rate-limit numbers) is added to `docs/LUMEN_CONTRACT.md`.

## Coordination
- If `/api/ai/*` response shapes change, update `docs/API_CONTRACTS.md` and `src/types/domain.ts` together, and tell the user to notify Member 1.
- Credentials may stop working after OVERCLOCK. The 503 path must stay graceful.
