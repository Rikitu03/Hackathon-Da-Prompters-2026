# Applicant Journey Alignment Implementation Plan

> **Implementation checkpoint, 13 November 2026:** Tasks 1–8 and the automated acceptance/documentation work in Task 9 are implemented in the working tree. See the [acceptance and design record](../../verification/2026-11-13-applicant-journey.md) for actual checks and limitations. No commits or deployment are claimed. The Task 9 live provider step remains deferred until reviewed PSCS content is published. The original task checkboxes below are retained as the execution specification.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One connected applicant journey (choose a guide → prepare the checklist → check a document → ask Gabay → take the official step) that matches the documented API contracts and product rules, with the blue visual system tightened along the way.

**Architecture:** Shared limits and cycle-date logic move into two small client-safe modules used by both the API routes and the applicant UI, so they can't drift. The applicant adapters (`src/lib/applicant/`) stop discarding fields the server returns. A journey model plus a `JourneyRail` component ties the existing pages together, and the requirement page becomes the hub that launches the document check and Ask Gabay with the same requirement context. Playwright specs with mocked `/api/*` routes prove the whole flow at 1440 px and 320 px without touching Supabase or Lumen.

**Tech Stack:** Next.js 15 App Router, React, TypeScript, Zod, plain CSS in `src/components/applicant/applicant.css`, Vitest (`npm test`), Node test runner (`npm run test:applicant`), Playwright (`npm run test:e2e`).

**Spec:** The product documentation is the spec. Read these first:
- [ARCHITECTURE.md](../../ARCHITECTURE.md): applicant journey and security boundaries
- [MEMBER_1_APPLICANT_UI.md](../../sprints/MEMBER_1_APPLICANT_UI.md): deliverable and acceptance scenarios 1–6
- [API_CONTRACTS.md](../../API_CONTRACTS.md): AI endpoints section
- [STATUS.md](../../STATUS.md): verified gaps (the applicant-side P0 rows)
- [APPLICANT-HANDOFF.md](../../APPLICANT-HANDOFF.md): contract differences table
- [LUMEN_CONTRACT.md](../../LUMEN_CONTRACT.md): privacy constraints (OCR retention, chat transcripts)
- [MEMBER_4_LUMEN_RAG.md](../../sprints/MEMBER_4_LUMEN_RAG.md): M4-40 demo order (selected requirement → OCR → manual correction → grounded chat answer)
- [PSCS requirements](../../scholarships/pscs/requirements.md): education levels covered

**Precondition:** The Member 4 chat/RAG work (`src/app/api/ai/chat/*`, `src/lib/rag/{fallback,rank,retrieve}*`) is committed on `feat/lumen-rag` before Task 1. This plan builds on it.

**Out of scope (separate plans/owners):** the admin publish bridge in `src/components/admin/console.tsx` (hard-coded readiness check, Bearer-token publish, unapproved sources; owned by M2/M3), populating `knowledge_chunks.requirement_id` in `save_guide` (M3), document-specific OCR profiles, applicant accounts, and publishing reviewed PSCS content (done through `/backend-lab`).

## Global Constraints

- Palette: only the existing tokens on `.applicant-ui`, namely navy `#102a51`, blue `#155bb0`, river `#eef6ff`, line `#d7e3ef`, muted `#53657b` and yellow `#f7c744`. The yellow appears only as the "you are here" marker. No new colors outside derived tints of these.
- Type: the bundled Instrument Sans ("Gabay Sans") only, on the existing scale (h1 `clamp(30px, 3vw, 42px)`, h2 24px, h3 19px, body 16px). No new fonts, UI libraries or npm dependencies.
- Limits: chat message ≤ **500** characters; OCR upload ≤ **4 MiB** (`4 * 1024 * 1024` bytes). Client timeouts: chat **55 000 ms**, OCR **70 000 ms** (route `maxDuration` 45 s / 60 s plus ≥ 5 s transport margin).
- A `grounded: false` chat response is a fixed system message. Render it as a notice, never as Gabay speech. Never fabricate or simulate a provider answer outside the labelled simulated examples.
- Persist only preferences and checklist statuses (existing `localStorage` keys). Files, OCR values, corrections and chat history stay in memory for the visit.
- Checklist status changes only when the student picks one. OCR confirmation never sets a status by itself.
- Official handoff goes to the cycle's HTTPS `officialUrl`, falling back to `https://scholars.pasigcity.gov.ph/`.
- Layout works from 320 px with no horizontal page scroll, visible keyboard focus and `prefers-reduced-motion` respected.
- Don't edit `src/app/admin`, `src/components/admin`, `supabase/` or API routes other than the two AI routes named in Task 1.
- Copy is sentence case with plain verbs. An action keeps one name through the flow. Fixed strings:

| Where | Exact text |
|---|---|
| Journey stages (rail, landing, nav) | `Choose a guide` · `Prepare your checklist` · `Check a document` · `Ask Gabay` · `Take the official step` |
| Sidebar nav labels | `Dashboard`, `Scholarships`, `My checklist`, `Check a document`, `Ask Gabay`, `Official step` |
| OCR consent | `Send this document to Lumen OCR to read its text. Lumen keeps a copy that other teams in this hackathon can see, and it can't be deleted. Use a sample or fictional document only.` |
| Upload hint | `JPG, PNG or PDF, up to 4 MB` |
| File too large | `This file is larger than 4 MB. Choose a smaller copy.` |
| Chat privacy hint | `Don't include names, addresses or ID numbers. Lumen, the AI service, stores chat messages.` |
| Chat notice heading | `Not in the published guide` |
| Chat notice link | `Open the official page` |
| Client no-evidence fallback (`NO_EVIDENCE_NOTICE`) | `I couldn't find this in the published guide for this cycle. Check the official page or contact the scholarship office.` |
| Closed cycle | `Applications for this cycle closed on {date}. You can still read the guide, but Gabay only answers questions about open cycles.` |
| Requirement hub actions | `Check my document` · `Ask Gabay about this item` |
| After OCR confirmation | heading `What's next for {title}`, link `Ask Gabay about {title}` |
| Summary CTA | `Continue to the official application page`; secondary `Pasig City Scholarship Portal` |

## Design Direction

**Tokens.** Navy `#102a51` for ink and the sidebar. Pasig blue `#155bb0` for actions, links and focus. River `#eef6ff` for surfaces, the rail track and system notices. Line `#d7e3ef` for borders. Muted `#53657b` for secondary text. Sun `#f7c744` for the single current-stage marker.

**Type.** One family; hierarchy comes from weight and size, not from extra faces. Stage labels are body size at weight 600. Never use all-caps labels.

**Layout.** The journey rail sits at the top of every workspace page, above the page heading.

```
desktop
 (✓)──────────(✓)──────────( ● )──────────(  )──────────(  )
 Choose a     Prepare your  Check a       Ask Gabay     Take the
 guide        checklist     document                    official step
              2 of 3 ready  ▲ yellow = you are here
mobile (≤ 600px)
 Step 3 of 5 · Check a document
 ▰▰▰▱▱            (five segments, no labels, no horizontal scroll)
```

The requirement page is the hub:

```
← Back to guide
Proof of enrollment                          ┌ Your status [select]  ┐
How to prepare (1, 2, 3 steps)               │ Check my document     │
Questions you might have (accordion)         │ Ask Gabay about this… │
Source references                            └───────────────────────┘
```

In the chat, a Gabay answer is a white bubble with inline `[1]` citations and chips below. A system notice is a river-tinted block with a 3 px navy left rule, a heading and an official link. It never carries the "Gabay" label.

**Principles.** The river rail is the one bold element. It draws on the river in the existing Pasig illustration and the `Waves` icon in the brand mark. Everything else stays quiet. Numbered markers appear only where the content is a real sequence (rail, preparation steps). The rail's line draws in once on first paint and is static under reduced motion.

**Review against the brief.** My first plan used numbered circles joined by thin grey connectors. That's the stepper every template ships. I revised it to a continuous river line with the yellow marker as the only accent, because that ties to this product's Pasig identity and keeps the brief's blue palette intact.

## Review Focus

1. Saved preferences pointing at a guide that's no longer published (stale `localStorage`): the workspace should say the guide is no longer published and offer a way to choose a current one, not show a generic error. Test in Task 8.
2. A pasted question over 500 characters: the composer keeps the first 500 and the counter reads `500/500`; the server never sees more. Test in Task 7.
3. A file of exactly 4 MiB should be accepted, and 4 MiB + 1 byte rejected with the size message. Test in Task 3.
4. A platform timeout with a non-JSON 504 body should give the "didn't respond in time" message, not "unreadable response". Test in Task 3.
5. `/assistant?requirement=<id not in this cycle>` (stale link) should fall back to the whole guide and send no `requirementId`. Test in Task 7.

---

### Task 1: Shared AI limits and cycle-date module

**Files:**
- Create: `src/lib/ai-limits.ts`, `src/lib/cycle-window.ts`
- Create: `src/lib/cycle-window.test.ts`, `src/lib/ai-limits.test.ts`
- Modify: `src/lib/rag/prompt.ts` (`MAX_QUESTION_CHARS` re-exports `CHAT_MESSAGE_MAX_CHARS`)
- Modify: `src/app/api/ai/ocr/route.ts` (`MAX_UPLOAD_BYTES` comes from `OCR_MAX_UPLOAD_BYTES`)
- Modify: `src/lib/rag/fallback.ts` (`isCycleClosed` delegates to `cycleWindow`; delete its private `manilaToday`)
- Modify: `tests/applicant-test-loader.mjs` (also resolve extensionless `../` imports from files under `/src/lib/`)

**Interfaces:**
- Produces, in `src/lib/ai-limits.ts`: `CHAT_MESSAGE_MAX_CHARS = 500`, `OCR_MAX_UPLOAD_BYTES = 4 * 1024 * 1024`, `CHAT_CLIENT_TIMEOUT_MS = 55_000`, `OCR_CLIENT_TIMEOUT_MS = 70_000`.
- Produces, in `src/lib/cycle-window.ts`: `type CycleWindow = "undated" | "upcoming" | "open" | "closed"`, `manilaToday(now?: Date): string` (YYYY-MM-DD in Asia/Manila), `cycleWindow(start: string | null, end: string | null, now?: Date): CycleWindow`, and `formatCycleDate(isoDate: string): string`. The formatter treats a date-only string as a calendar date, so there's no UTC shift. The output is `en-PH` day, short month and year.
- Both modules are pure, so client components can import them.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/cycle-window.test.ts
it("is undated only when both dates are missing", () => expect(cycleWindow(null, null)).toBe("undated"));
it("is upcoming before the Manila start date", () =>
  expect(cycleWindow("2026-12-01", "2026-12-31", new Date("2026-11-30T15:59:00Z"))).toBe("upcoming"));
it("is open on the end date in Manila", () =>
  expect(cycleWindow("2026-11-01", "2026-12-31", new Date("2026-12-31T15:00:00Z"))).toBe("open"));
it("closes at Manila midnight after the end date", () =>
  expect(cycleWindow(null, "2026-12-31", new Date("2026-12-31T16:30:00Z"))).toBe("closed"));
it("formats a date-only string without shifting the day", () => expect(formatCycleDate("2026-12-31")).toBe("31 Dec 2026"));

// src/lib/ai-limits.test.ts
import { maxDuration as chatMax } from "@/app/api/ai/chat/route";
import { maxDuration as ocrMax } from "@/app/api/ai/ocr/route";
it("client timeouts outlast the route budgets by at least 5 s", () => {
  expect(CHAT_CLIENT_TIMEOUT_MS).toBeGreaterThanOrEqual(chatMax * 1000 + 5000);
  expect(OCR_CLIENT_TIMEOUT_MS).toBeGreaterThanOrEqual(ocrMax * 1000 + 5000);
});
it("server limits use the shared values", () => {
  expect(MAX_QUESTION_CHARS).toBe(CHAT_MESSAGE_MAX_CHARS);
});
```

- [ ] **Step 2: Run them and confirm they fail.** `npx vitest run src/lib/cycle-window.test.ts src/lib/ai-limits.test.ts`. Expected: FAIL, modules not found.
- [ ] **Step 3: Implement both modules and rewire `prompt.ts`, `ocr/route.ts`, `fallback.ts` and the test loader.** Route `maxDuration` values stay numeric literals, because Next.js reads them statically.
- [ ] **Step 4: Run all checks and confirm they pass.** `npm test && npm run test:applicant && npm run typecheck`. Expected: all pass, including the existing `fallback.test.ts`.
- [ ] **Step 5: Commit.** `git commit -m "refactor(ai): share chat/OCR limits and Manila cycle window between routes and UI"`

### Task 2: Number citations to match the sources list

The model cites `[S2]` by the position of the passage in our prompt. The client never sees that order, so it can't link a marker to a chip. The server renumbers markers to match the `sources` array it returns.

**Files:**
- Modify: `src/lib/rag/citations.ts` (replace `mapCitations`)
- Modify: `src/lib/rag/citations.test.ts`, `src/app/api/ai/chat/route.ts`, `src/app/api/ai/chat/route.test.ts`
- Modify: `docs/API_CONTRACTS.md` (chat `grounded: true` bullet: "inline `[1]` markers numbered in `sources` order")

**Interfaces:**
- Produces: `renumberCitations(answer: string, included: PromptSource[]): { answer: string; sources: ChatSource[] }`. Sources come out in first-cited order, deduplicated by `sourceId`. A marker group keeps only known references, rewritten as `[1]` or `[1, 2]`. A group with no known reference is removed together with the space before it. The route uses `sources.length` exactly as it used `cited.length` before.

- [ ] **Step 1: Write the failing tests** in `citations.test.ts`:

```ts
it("renumbers markers in first-cited order", () => {
  const r = renumberCitations("Barangay Hall [S2]. Bring an ID [S1].", [s1, s2]);
  expect(r.answer).toBe("Barangay Hall [1]. Bring an ID [2].");
  expect(r.sources.map((s) => s.sourceId)).toEqual(["src-2", "src-1"]);
});
it("reuses a number for a repeated source and keeps groups", () =>
  expect(renumberCitations("A [S1]. B [S1, S2].", [s1, s2]).answer).toBe("A [1]. B [1, 2]."));
it("drops markers for sources we didn't send", () => {
  const r = renumberCitations("Deadline is March 3 [S9].", [s1]);
  expect(r.answer).toBe("Deadline is March 3.");
  expect(r.sources).toEqual([]);
});
```

In `route.test.ts`, update the grounded test so it expects `answer` to end with `[1].` and `sources[0].sourceId` to be `"src-1"`.
- [ ] **Step 2: Run them and confirm they fail.** `npx vitest run src/lib/rag src/app/api/ai/chat`. Expected: FAIL, `renumberCitations` is not exported.
- [ ] **Step 3: Implement `renumberCitations`, switch the route to it, remove `mapCitations`, and update the API_CONTRACTS bullet.**
- [ ] **Step 4: Run the checks and confirm they pass.** `npm test && npm run typecheck`
- [ ] **Step 5: Commit.** `git commit -m "feat(rag): renumber inline citations to match returned sources"`

### Task 3: Applicant adapters follow the implemented contract

**Files:**
- Modify: `src/lib/applicant/model.ts` (`validateFile`, `serviceMessage`)
- Modify: `src/lib/applicant/api.ts` (`askGabay`, OCR schema)
- Modify: `tests/applicant-model.test.mjs`, `tests/applicant-api.test.mjs`

**Interfaces:**
- Consumes: `OCR_MAX_UPLOAD_BYTES` (Task 1), imported as `../ai-limits`.
- Produces in `api.ts`:
  - `export const NO_EVIDENCE_NOTICE` (exact copy from Global Constraints)
  - `export type ChatReply = { kind: "answer"; answer: string; sources: { sourceId: string; title: string; url?: string }[] } | { kind: "notice"; answer: string; officialUrl: string | null }`
  - `askGabay(cycleId, message, requirementId?, signal?): Promise<ChatReply>`. Rules: `grounded && sources.length` → `answer`. `!grounded` → `notice` with the server's text and `safeHttps(officialUrl)`. `grounded` with no sources → `notice` with `NO_EVIDENCE_NOTICE`.
  - `OcrResult = { rawText: string; fields: { key: string; label: string; value: string; needsReview: boolean; originalText: string; warnings: string[] }[]; warnings: string[]; disclaimer: string }`. Zod defaults: `needsReview` false, `originalText` "", `warnings` [], `disclaimer` "".
- `serviceMessage` gains these cases:
  - 403: `{service} blocked a request from another site. Reload GabayIskolar and try again.`
  - 404: `This guide is no longer published. Choose a current guide to continue.`
  - 422: `The document couldn't be read. Try a clearer, well-lit photo, or continue with the written guide.`
  - 502 and 504: `{service} didn't respond in time. Try again in a moment.`

  Existing cases are unchanged.
- `validateFile` keeps JPG/PNG/PDF and uses the 4 MiB limit with the "File too large" copy.

- [ ] **Step 1: Write the failing tests.** Replace the old ungrounded test and the 10 MB assertions:

```js
test("a server notice keeps its text and official link", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    answer: "Natapos na ang application period… ended on 2026-06-30…", grounded: false, sources: [],
    officialUrl: "https://example.org/apply" }));
  const reply = await askGabay("cycle", "Question");
  assert.equal(reply.kind, "notice");
  assert.match(reply.answer, /2026-06-30/);
  assert.equal(reply.officialUrl, "https://example.org/apply");
});
test("a grounded reply without sources becomes the no-evidence notice", async (t) => { /* grounded:true, sources:[] */
  assert.equal(reply.kind, "notice"); assert.equal(reply.answer, NO_EVIDENCE_NOTICE); assert.equal(reply.officialUrl, null);
});
test("an unsafe officialUrl is dropped", /* officialUrl "javascript:alert(1)" → null */);
test("OCR keeps originalText, field warnings and the disclaimer", /* response with all three → preserved */);
test("a non-JSON 504 explains the timeout", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("<html>504</html>", { status: 504 }));
  await assert.rejects(askGabay("c", "q"), /didn't respond in time/);
});
// model
assert.equal(validateFile({ name: "x.pdf", type: "application/pdf", size: 4 * 1024 * 1024 }), null);
assert.match(validateFile({ name: "x.pdf", type: "application/pdf", size: 4 * 1024 * 1024 + 1 }), /larger than 4 MB/);
assert.match(serviceMessage(404, "Ask Gabay"), /no longer published/);
assert.match(serviceMessage(422, "Document review"), /couldn't be read/);
assert.match(serviceMessage(403, "Ask Gabay"), /another site/);
```

- [ ] **Step 2: Run them and confirm they fail.** `npm run test:applicant`. Expected: FAIL on the new assertions.
- [ ] **Step 3: Implement the adapter and model changes.** Keep `request()`'s status-first error handling.
- [ ] **Step 4: Run the checks and confirm they pass.** `npm run test:applicant && npm run typecheck`. `typecheck` fails where `assistant.tsx` and `document-review.tsx` use the old types. Patch only the type names there (`Answer` → `ChatReply`; render `reply.answer`). The UI work comes in Tasks 6–7.
- [ ] **Step 5: Commit.** `git commit -m "fix(applicant): keep server notices, official links and OCR review fields; align limits"`

### Task 4: Journey model, visit state and the river rail

**Files:**
- Modify: `src/lib/applicant/model.ts` (journey types and functions)
- Modify: `src/components/applicant/workspace.tsx` (visit state on the provider; nav order and labels)
- Create: `src/components/applicant/journey.tsx`
- Modify: `src/components/applicant/applicant.css` (`.journey-rail` block)
- Modify: `src/components/applicant/preparation.tsx` (`Dashboard` renders `<JourneyRail current={null} />`)
- Create: `tests/support/applicant-mocks.ts`, `tests/applicant-journey.spec.ts`
- Modify: `tests/applicant-model.test.mjs`

**Interfaces:**
- Produces in `model.ts`:
  - `type StageId = "guide" | "checklist" | "document" | "ask" | "official"`
  - `JOURNEY_STAGES: readonly { id: StageId; label: string; href: string; description: string }[]`, in order, with labels from Global Constraints. The hrefs are `/onboarding`, `/my-checklist`, `/document-review`, `/assistant` and `/summary`.
  - `stageForPath(path: string): StageId | null`. `/onboarding` and `/scholarships*` map to `guide`. `/my-checklist` and `/requirements/*` map to `checklist`. `/document-review` maps to `document`, `/assistant` to `ask`, and `/summary` to `official`. Anything else is `null`.
  - `journeyProgress(input: { hasCycle: boolean; prepared: number; total: number; documentsChecked: number; asked: boolean }): Record<StageId, "done" | "todo">`. The rules:
    - `guide`: done when `hasCycle`.
    - `checklist`: done when `total > 0 && prepared === total`.
    - `document`: done when `documentsChecked > 0`.
    - `ask`: done when `asked`.
    - `official`: always `todo`.
  - `nextStage(progress): StageId` returns the first `todo`.
- Produces on the workspace context: `visit: { documentsChecked: number; asked: boolean }`, `recordDocumentCheck(): void` and `recordQuestion(): void`. This state is memory-only and resets when `preferences.cycleId` changes.
- Produces: `JourneyRail({ current }: { current: StageId | null })`. When `current` is null it uses `nextStage`. It renders `<nav aria-label="Your preparation journey"><ol>`, and the current stage gets `aria-current="step"`. Each stage is a link. A done stage shows a check plus visually hidden text ", done". The checklist stage shows `{prepared} of {total} ready`. On mobile it switches to `Step {n} of 5 · {label}` with five segments.
- Produces in `tests/support/applicant-mocks.ts`:
  - Constants `PROGRAM_ID`, `CYCLE_ID`, `REQ_ENROLL_ID`, `REQ_RESIDENCY_ID` (UUIDs), `OFFICIAL_URL = "https://example.org/apply"` and `SOURCE_URL = "https://example.org/reference"`.
  - `mockPublishedGuide(page: Page, cycle?: Partial<PublicCycle>): Promise<void>`, which serves `/api/scholarships?page=*` and `/api/scholarships/{PROGRAM_ID}`. The cycle ends on 31 Dec of next year unless overridden. It has two requirements with steps and FAQs and one approved source.
  - `mockChat(page, replies: object[]): Promise<{ bodies: unknown[] }>`, which answers in order and records request bodies.
  - `mockOcr(page, response: object, status = 200): Promise<void>`.
  - `chooseGuide(page): Promise<void>`, which sets the preferences key in `localStorage` for the mocked program and cycle.

- [ ] **Step 1: Write the failing tests.** Add node tests for `stageForPath` (one assertion per route family above, plus `/` → `null`) and for `journeyProgress`/`nextStage` (empty input → next is `guide`; `hasCycle` with 1 of 2 prepared → next is `checklist`; all prepared, a document checked and not asked → next is `ask`). Add the first Playwright test:

```ts
test("dashboard shows the journey with the next stage marked", async ({ page }) => {
  await mockPublishedGuide(page); await chooseGuide(page);
  await page.goto("/dashboard");
  const rail = page.getByRole("navigation", { name: "Your preparation journey" });
  await expect(rail.getByRole("link", { name: /Choose a guide, done/ })).toBeVisible();
  await expect(rail.locator('[aria-current="step"]')).toContainText("Prepare your checklist");
  await expect(page.getByRole("navigation", { name: "Student workspace" }).getByRole("link"))
    .toHaveText(["Dashboard", "Scholarships", "My checklist", "Check a document", "Ask Gabay", "Official step"]);
});
```

- [ ] **Step 2: Run them and confirm they fail.** `npm run test:applicant`, then `npx playwright test tests/applicant-journey.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement the model functions, provider visit state, `JourneyRail`, the CSS, the nav order and labels, and the Dashboard rail.** CSS:
  - a 4 px river track using `--line`, with the completed part in `--blue`;
  - the current stop filled `--yellow` with a navy border;
  - a stroke-dashoffset draw-in once on mount, removed under `prefers-reduced-motion`;
  - the compact segment layout at ≤ 600 px.
- [ ] **Step 4: Run them and confirm they pass.** Expected: PASS on both Playwright projects.
- [ ] **Step 5: Commit.** `git commit -m "feat(applicant): add journey model, visit state and river progress rail"`

### Task 5: Discovery and onboarding match the published data

**Files:**
- Modify: `src/components/applicant/catalogue.tsx` (`Onboarding`, `GuideDetail`)
- Modify: `src/components/applicant/landing.tsx` (journey section renders `JOURNEY_STAGES`)
- Modify: `src/components/applicant/applicant.css` (window badge)
- Modify: `tests/applicant-journey.spec.ts`

**Interfaces:**
- Consumes: `cycleWindow`, `formatCycleDate` (Task 1); `JOURNEY_STAGES`, `JourneyRail` (Task 4).
- Onboarding education levels, in order: `Elementary (Grades 4–6)`, `Junior high school (Grades 7–10)`, `Senior high school (Grades 11–12)`, `College / university`. Applicant types: `New applicant`, `Renewing scholar`. Level is a required select whose placeholder is `Choose your level`.
- `GuideDetail` shows these labels:

  | Window | Label |
  |---|---|
  | `open` | `Open` |
  | `upcoming` | `Opens {date}` |
  | `closed` | `Closed` |
  | `undated` | `Dates not published` |

  The period reads `{start} – {end}` via `formatCycleDate`. A closed cycle also shows the closed-cycle notice from Global Constraints. "Use this guide" stays available.
- `Onboarding` and `GuideDetail` render `<JourneyRail current="guide" />`. The landing journey section lists all five stages with the same labels.

- [ ] **Step 1: Write the failing Playwright tests.**

```ts
test("onboarding offers the PSCS levels and lands on the dashboard", async ({ page }) => {
  await mockPublishedGuide(page); await page.goto("/onboarding");
  await expect(page.getByLabel("Education level").locator("option"))
    .toHaveText(["Choose your level", "Elementary (Grades 4–6)", "Junior high school (Grades 7–10)", "Senior high school (Grades 11–12)", "College / university"]);
  /* choose level, type, guide → "Create my workspace" → expect URL /dashboard */
});
test("a closed cycle is labelled and explained", async ({ page }) => {
  await mockPublishedGuide(page, { application_end: "2020-01-31" });
  await page.goto(`/scholarships/${PROGRAM_ID}`);
  await expect(page.getByText("Closed", { exact: true })).toBeVisible();
  await expect(page.getByText(/closed on 31 Jan 2020/)).toBeVisible();
});
test("the landing page names the same five stages", /* expect each JOURNEY_STAGES label visible on "/" */);
```

- [ ] **Step 2: Run them and confirm they fail.** `npx playwright test tests/applicant-journey.spec.ts -g "onboarding|closed|landing"`
- [ ] **Step 3: Implement the changes.**
- [ ] **Step 4: Run them and confirm they pass.** Also run `npm run typecheck && npm run lint`.
- [ ] **Step 5: Commit.** `git commit -m "feat(applicant): align onboarding levels with PSCS and show cycle window"`

### Task 6: Requirement hub and the document check in context

**Files:**
- Modify: `src/components/applicant/preparation.tsx` (`RequirementDetail` action panel and rail)
- Modify: `src/app/(applicant)/document-review/page.tsx` (read `searchParams.requirement`)
- Modify: `src/components/applicant/document-review.tsx`
- Modify: `src/components/applicant/applicant.css`
- Modify: `tests/applicant-journey.spec.ts`

**Interfaces:**
- Consumes: `OCR_CLIENT_TIMEOUT_MS` (Task 1), the `OcrResult` shape (Task 3), `recordDocumentCheck` and `JourneyRail` (Task 4), `usePreparation` and `StatusSelect` (existing).
- `RequirementDetail` adds a `Check my document` link to `/document-review?requirement={id}` and renders `<JourneyRail current="checklist" />`.
- `DocumentReview({ initialRequirementId }: { initialRequirementId?: string })`:
  - A context select labelled `Document for` lists the current cycle's requirements plus `Not linked to a requirement`. It preselects `initialRequirementId` when that ID is in the cycle.
  - Consent copy and upload hint come from Global Constraints. The OCR timeout uses `OCR_CLIENT_TIMEOUT_MS`.
  - `result.disclaimer` shows above the fields. Each field lists its `warnings` under the input. When `originalText` exists, it shows as `Read from document: {originalText}`.
  - After **Confirm my review** it calls `recordDocumentCheck()`. When a requirement is linked, it shows the `What's next for {title}` panel: `StatusSelect` (the student chooses), `Ask Gabay about {title}` (to `/assistant?requirement={id}`) and `Back to my checklist`.
  - The simulated example gains `originalText`, `warnings` and `disclaimer`, and stays labelled.

- [ ] **Step 1: Write the failing Playwright test.**

```ts
test("a requirement leads to a document check without changing its status", async ({ page }) => {
  await mockPublishedGuide(page); await chooseGuide(page);
  await mockOcr(page, { rawText: "Certificate of Enrollment\nName: Juan Dela Cruz (fictional)", disclaimer: "Automatically read text may contain errors.",
    warnings: [], fields: [
      { key: "full_name", label: "Full name", value: "Juan Dela Cruz (fictional)", needsReview: false, originalText: "Name: Juan Dela Cruz (fictional)", warnings: [] },
      { key: "barangay", label: "Barangay", value: "", needsReview: true, originalText: "", warnings: ["Not found. Please fill this in if it applies."] } ] });
  await page.goto(`/requirements/${REQ_ENROLL_ID}?program=${PROGRAM_ID}&cycle=${CYCLE_ID}`);
  await page.getByRole("link", { name: "Check my document" }).click();
  await expect(page.getByLabel("Document for")).toHaveValue(REQ_ENROLL_ID);
  await expect(page.getByText(/Lumen keeps a copy/)).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles("tests/fixtures/demo-certificate.png");
  await page.getByLabel(/Send this document to Lumen OCR/).check();
  await page.getByRole("button", { name: "Extract details" }).click();
  await expect(page.getByText("Read from document: Name: Juan Dela Cruz (fictional)")).toBeVisible();
  await expect(page.getByText("Not found. Please fill this in if it applies.")).toBeVisible();
  await page.getByLabel("Barangay").fill("San Antonio");
  await page.getByLabel(/I compared these details/).check();
  await page.getByRole("button", { name: "Confirm my review" }).click();
  await expect(page.getByRole("heading", { name: /What's next for/ })).toBeVisible();
  await expect(page.getByLabel(/Preparation status for/)).toHaveValue("not-started");
  await expect(page.getByRole("link", { name: /Ask Gabay about/ })).toHaveAttribute("href", `/assistant?requirement=${REQ_ENROLL_ID}`);
});
```

- [ ] **Step 2: Run it and confirm it fails.**
- [ ] **Step 3: Implement the changes.**
- [ ] **Step 4: Run it and confirm it passes.** Also run `npm run typecheck && npm run lint`.
- [ ] **Step 5: Commit.** `git commit -m "feat(applicant): launch document check from a requirement and keep OCR review detail"`

### Task 7: Ask Gabay follows the grounding contract

**Files:**
- Modify: `src/lib/applicant/model.ts` (`citedSegments`)
- Modify: `src/components/applicant/assistant.tsx`
- Modify: `src/components/applicant/applicant.css` (`.chat-notice`, inline citation links)
- Modify: `tests/applicant-model.test.mjs`, `tests/applicant-journey.spec.ts`

**Interfaces:**
- Consumes: `CHAT_MESSAGE_MAX_CHARS` and `CHAT_CLIENT_TIMEOUT_MS` (Task 1), `cycleWindow` and `formatCycleDate` (Task 1), `ChatReply` and `NO_EVIDENCE_NOTICE` (Task 3), `recordQuestion` and `JourneyRail` (Task 4).
- Produces: `citedSegments(text: string, sourceCount: number): ({ text: string } | { cite: number })[]`. It splits `[1]` and `[1, 2]` groups into `cite` segments. Numbers outside `1..sourceCount` stay as plain text.
- Assistant behavior:
  - It renders `<JourneyRail current="ask" />`.
  - The composer has `maxLength={CHAT_MESSAGE_MAX_CHARS}`, a counter reading `{n}/500`, and the privacy hint directly above it. The request timeout is `CHAT_CLIENT_TIMEOUT_MS`.
  - A `kind: "answer"` reply is a Gabay bubble whose `cite` segments render as links (`<a href={sources[n-1].url}>[n]</a>`), followed by chips `{n} {title}`.
  - A `kind: "notice"` reply is `<aside role="note" className="chat-notice">` with the heading `Not in the published guide`, the server text, and `Open the official page`. The link goes to `reply.officialUrl ?? cycle.officialUrl`. A notice carries no "Gabay" label.
  - When `cycleWindow(cycle.start, cycle.end) === "closed"`, the composer is disabled and the closed-cycle notice shows instead.
  - A successful reply of either kind calls `recordQuestion()`.
  - An `initialRequirementId` that isn't in the cycle falls back to `The whole guide`.

- [ ] **Step 1: Write the failing tests.** Node: `citedSegments("Hall [1]. ID [1, 2]. Odd [7].", 2)` equals `[{text:"Hall "},{cite:1},{text:". ID "},{cite:1},{cite:2},{text:". Odd [7]."}]`. Playwright:

```ts
test("asking from a requirement sends its context and shows real citations", async ({ page }) => {
  await mockPublishedGuide(page); await chooseGuide(page);
  const chat = await mockChat(page, [
    { answer: "Ask the registrar for a certificate of enrollment [1].", grounded: true, sources: [{ sourceId: "s1", title: "Enrollment reference", url: SOURCE_URL }] },
    { answer: "Hindi ko nakita ito… I couldn't find this…", grounded: false, sources: [], officialUrl: OFFICIAL_URL } ]);
  await page.goto(`/assistant?requirement=${REQ_ENROLL_ID}`);
  await page.getByLabel("Your scholarship question").fill("Where do I get proof of enrollment?");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: "[1]" })).toHaveAttribute("href", SOURCE_URL);
  expect(chat.bodies[0]).toMatchObject({ cycleId: CYCLE_ID, requirementId: REQ_ENROLL_ID });
  await page.getByLabel("Your scholarship question").fill("What is the office fee?");
  await page.keyboard.press("Enter");
  const notice = page.getByRole("note");
  await expect(notice.getByRole("heading", { name: "Not in the published guide" })).toBeVisible();
  await expect(notice.getByRole("link", { name: "Open the official page" })).toHaveAttribute("href", OFFICIAL_URL);
  await expect(notice).not.toContainText("Gabay");
});
test("a long paste is capped at 500 characters", async ({ page }) => { /* fill "x".repeat(600) → inputValue length 500, text "500/500" visible */ });
test("a stale requirement link falls back to the whole guide", async ({ page }) => {
  /* /assistant?requirement=00000000-0000-4000-8000-000000000000 → select value "" ; send → chat.bodies[0] has no requirementId */ });
test("a closed cycle disables the composer", /* application_end 2020-01-31 → textarea disabled, closed notice visible, no chat request */);
```

- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement the changes.**
- [ ] **Step 4: Run them and confirm they pass.** Also run `npm run test:applicant && npm run typecheck && npm run lint`.
- [ ] **Step 5: Commit.** `git commit -m "feat(applicant): render grounded answers with linked citations and server notices as system notes"`

### Task 8: Summary, official handoff and stale workspaces

**Files:**
- Modify: `src/components/applicant/preparation.tsx` (`Summary`, `Checklist`, `WorkspaceGate`)
- Modify: `tests/applicant-journey.spec.ts`

**Interfaces:**
- Consumes: `JourneyRail` and `visit` (Task 4), `cycleWindow` and `formatCycleDate` (Task 1).
- `Checklist` renders `<JourneyRail current="checklist" />`.
- `Summary` renders `<JourneyRail current="official" />`. Below the existing groups it shows `Documents you checked this visit: {visit.documentsChecked}`. If the cycle is closed, it shows the closed-cycle notice. The primary CTA `Continue to the official application page` links to `cycle.officialUrl` (new tab, `noopener noreferrer`). When that differs from `OFFICIAL_PORTAL`, a secondary link `Pasig City Scholarship Portal` follows.
- `WorkspaceGate`'s error branch keeps the adapter's message (the 404 copy from Task 3). The "Choose another guide" link points to `/onboarding`.

- [ ] **Step 1: Write the failing Playwright tests.**

```ts
test("the summary hands off to the cycle's official page", async ({ page }) => {
  await mockPublishedGuide(page); await chooseGuide(page); await page.goto("/summary");
  await expect(page.getByRole("link", { name: "Continue to the official application page" })).toHaveAttribute("href", OFFICIAL_URL);
  await expect(page.getByRole("link", { name: "Pasig City Scholarship Portal" })).toHaveAttribute("href", "https://scholars.pasigcity.gov.ph/");
});
test("a saved guide that is no longer published explains what to do", async ({ page }) => {
  await page.route(`**/api/scholarships/${PROGRAM_ID}`, (r) => r.fulfill({ status: 404, json: { error: "Record not found" } }));
  await chooseGuide(page); await page.goto("/my-checklist");
  await expect(page.getByText("This guide is no longer published. Choose a current guide to continue.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Choose another guide" })).toHaveAttribute("href", "/onboarding");
});
```

- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement the changes.**
- [ ] **Step 4: Run them and confirm they pass.**
- [ ] **Step 5: Commit.** `git commit -m "feat(applicant): hand off to the cycle's official page and explain unpublished guides"`

### Task 9: Whole-journey acceptance, mobile check and docs

**Files:**
- Modify: `tests/applicant-journey.spec.ts`
- Modify: `docs/APPLICANT-HANDOFF.md` ("Member 4 integration" and the contract-differences table now describe the aligned behavior)
- Modify: `docs/STATUS.md` (mark the six applicant-side P0 rows resolved with the commit hash). Coordinate with whoever is editing it, and don't overwrite their changes.

- [ ] **Step 1: Write the end-to-end test.** It covers M1 acceptance scenarios 1–6 and the M4-40 order in one run, on both Playwright projects:

```ts
test("a student completes the whole preparation journey", async ({ page }) => {
  test.setTimeout(120_000);
  await mockPublishedGuide(page); await mockOcr(page, /* fixture from Task 6 */); const chat = await mockChat(page, [/* grounded reply from Task 7 */]);
  await page.goto("/");                                   // landing
  await page.getByRole("link", { name: "Start preparing" }).first().click();       // → /onboarding
  /* choose level, type, guide; Create my workspace → /dashboard */
  await page.getByRole("link", { name: "Continue preparing" }).click();             // → /my-checklist
  await page.getByRole("link", { name: /Read preparation steps/ }).first().click(); // → requirement hub
  await page.getByLabel(/Preparation status for/).selectOption("in-progress");
  await page.getByRole("link", { name: "Check my document" }).click();              // → document check
  /* upload fixture, consent, extract, correct, confirm */
  await page.getByRole("link", { name: /Ask Gabay about/ }).click();               // → assistant with context
  /* ask; expect citation link to SOURCE_URL; chat.bodies[0].requirementId === REQ_ENROLL_ID */
  await page.getByRole("link", { name: "Official step" }).click();                 // → summary
  await expect(page.getByText("Documents you checked this visit: 1")).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue to the official application page" })).toHaveAttribute("href", OFFICIAL_URL);
  await page.reload(); await expect(page.getByText(/In progress/)).toBeVisible();  // status survives refresh
});
test("no applicant page scrolls sideways at 320px", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await mockPublishedGuide(page); await chooseGuide(page);
  for (const path of ["/", "/onboarding", "/scholarships", `/scholarships/${PROGRAM_ID}`, "/dashboard", "/my-checklist",
    `/requirements/${REQ_ENROLL_ID}?program=${PROGRAM_ID}&cycle=${CYCLE_ID}`, "/document-review", "/assistant", "/summary"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), path).toBe(true);
  }
});
```

- [ ] **Step 2: Run the spec.** `npx playwright test tests/applicant-journey.spec.ts`. Expected: PASS on `desktop-chromium` and `mobile-chromium`. Fix any failure in the task that owns the behavior, then re-run.
- [ ] **Step 3: Run the full verification.** `npm test && npm run test:applicant && npm run typecheck && npm run lint && npm run build && npm run test:e2e`. Expected: all pass. Lint keeps only the existing `auto-textarea.tsx` warning. Stop any other `next dev` sharing `.next` before `build`.
- [ ] **Step 4: Update the docs.** In APPLICANT-HANDOFF, list the aligned limits, timeouts, notice handling, OCR fields and consent wording, and delete the resolved difference rows. In STATUS, mark the resolved rows and the commit.
- [ ] **Step 5: Do a live check, only after reviewed content is published.** On the dev server, with a reviewed PSCS guide published through `/backend-lab`, walk the journey once using a fictional document. It costs about 9 credits for OCR and 7 for chat. Record the cited answer and the OCR fields in `docs/LUMEN_CONTRACT.md`. Skip this step and say so if no reviewed content is published yet.
- [ ] **Step 6: Commit.** `git commit -m "test(applicant): cover the full preparation journey and update handoff docs"`
