# Ask Gabay applicant widget

The applicant experience mounts one floating widget across the landing page and
student routes. Admin and backend walkthrough routes are excluded. The former
`/assistant` URL redirects to `/dashboard?gabay=open`, preserving an optional
requirement ID. Requirement and document-review actions open the panel in place.
The sidebar entry and the dedicated landing/dashboard tool cards were removed.
The preparation journey retains its small Ask Gabay action, which opens the widget.

## Frontend and API boundary

- Presentation: `src/components/applicant/gabay-widget.tsx` and its scoped CSS.
- Request state, timeout, cancellation, duplicate prevention, and retry:
  `src/components/applicant/use-gabay-chat.ts`.
- Uses the existing `askGabay` adapter and `POST /api/ai/chat` payload:
  `{ cycleId, requirementId?, message }`. Maximum message length: 500 characters.
- Only server-supplied sources are rendered, using HTTPS links. Ungrounded replies
  remain notices. A claimed grounded response without sources becomes the existing
  no-evidence notice. No frontend-generated AI replies or keyword restrictions.
- No changes to the AI routes, prompts, RAG, Lumen adapter, or admin features.

## Session and privacy

Conversation and draft stay in memory while moving between applicant pages,
minimizing, or closing. A refresh or leaving the applicant experience clears them.
Changing scholarship cycles cancels the current request and clears the conversation
to avoid mixing cycle-specific answers. Switching a requirement changes the next
question's context. Chat content is not saved to an applicant account or browser storage.
The input retains the existing warning that Lumen stores chat messages.

## Member 4 handoff

The current server creates a fresh Lumen session per question and accepts no
history or client session ID. The widget therefore preserves the visible transcript
but does **not** imply model memory. Follow-up shortcuts ask complete questions about
the selected guide. Contextual multi-turn reasoning needs a coordinated server
contract before history or session fields can be added.

Domain restrictions, evidence gates, source verification, and rate limits remain
server responsibilities. The current route replaces scope-gated responses with its
no-evidence answer, so the client cannot distinguish an out-of-scope response from
insufficient evidence. It displays the server's explanation as received. A dedicated
scope response is a backend follow-up, rather than a client keyword filter.

## Visual asset

`public/illustrations/gabay-kingfisher.png` is a local transparent mascot asset
derived from the supplied visual reference using the built-in imagegen tool.
Its generation prompt is saved alongside the asset. It is reused in the launcher,
header, welcome greeting, assistant avatar, and pending state. The panel follows
system light/dark preference and reduced-motion settings.

## Verification

Browser coverage: `tests/gabay-widget.spec.ts` and the updated applicant journey
suite. API responses in browser tests are explicit fixtures; they are not live
Lumen outputs. The Playwright server disables Lumen and uses mock database settings.
Live Lumen verification requires the team's server-only credentials and suitable
published, approved scholarship evidence. No credentials are included in this change.

Executed: `npm run typecheck`, `npm run lint`, `npm run build`, 134 Vitest tests,
and 24 applicant model/adapter tests passed. The client build contains no Lumen
credential variable references. Desktop/mobile browser checks exercised the
widget states, citations, errors, context, navigation, and light/dark layouts;
the real local chat route returned the expected 503 with Lumen explicitly disabled.
The last browser run recorded two desktop timeouts (multi-step launcher
focus/retention and the existing OCR timeout/retry check) and a mobile scope-notice
assertion failure. All three scenarios passed earlier runs. A readiness guard now
prevents typing/sending before the guide's chat reset has completed, addressing
the apparent initial-load race in the mobile failure. These checks need a clean
rerun before marking the PR ready; further browser test runs were stopped.

Reference captures (fictional browser-test scholarship data):

- [Desktop, light](screenshots/gabay-widget-desktop-light.png)
- [Desktop, dark](screenshots/gabay-widget-desktop-dark.png)
- [Mobile, light](screenshots/gabay-widget-mobile-light.png)
- [Mobile, dark](screenshots/gabay-widget-mobile-dark.png)
