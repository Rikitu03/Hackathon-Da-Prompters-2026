# Admin Portal V3 — Visual Quality, Analytics and Pagination QA

**Target branch:** `feat/admin-portal` → PR to `staging`. No direct staging/main edits.

## Implemented scope

- Reduced glare: calm neutral `#F3F5F8` page canvas, white cards, clearer neutral borders and softer shadow depth.
- Admin typography uses a neutral system UI stack for legibility, preserving the shared GabayIskolar navy/book-and-wave brand. Removed oversized global overrides on small text.
- Subtle, accessible smooth blue **gradient area chart** plus muted dashed secondary series. Six UTC calendar-month buckets use **real `scholarship_programs.created_at` and `application_cycles.published_at` values**; no synthetic activity. If both have zero counts in range, show an honest empty state. The chart now uses accessible month-selection buttons rather than full-height focusable SVG rectangles; pointer hover displays a bounded tooltip adjacent to the month marker. Sparse history uses straight segments to avoid exaggerated curves.
- Compact current-state guide/source distribution cards remain, using muted colors, smaller status strips and readable numbers. No student activity, applicant counts or official submissions are reported.
- Conditional 10-record **Ysabelle-style pagination** for: scholarship guides, application cycles, requirement selectors, knowledge sources.
- Pagination stays **hidden at 10 records or fewer**, exposes numbered buttons/ellipsis, Prev/Next, and "Showing X–Y of Z" for longer filtered lists; no rows-per-page dropdown. Mobile hides redundant intermediate page buttons.
- Filtering and searching reset scholarship program pagination to page 1; other sections reset their page on program/cycle scope changes. Current page is clamped after list length changes.
- Keeps source verification/publisher role safeguards, step drag-and-drop editor and local-only context import with truthful progress. No Applicant UI redesign.
- Admin MVP presentation cleanup: removes redundant dashboard Start Here/recommended-workflow cards and sidebar tip card, compresses the four-step guide navigation into one row, shortens repeated copy, makes document import an explicit opt-in action, and fixes demo-mode Manage All navigation.

## Manual acceptance checks

1. Confirm every Admin screen is visually calm with readable typography, fully visible white cards, navy sidebar and blue/white primary actions. Pay particular attention at desktop widths 1280–1920px.
2. On Dashboard, check the main smooth area chart against real saved creation/publication dates, including zero-month hover values and periods with no activity. Check keyboard focus on the month selectors (not the plot hit zones), tooltip position, absence of the large black focus rectangle, and screen-reader accessible summary.
3. Check status/source distribution legend alignment and that pending sources cannot be treated as approved.
4. With **10 or fewer** filtered scholarship records, no pagination is shown. With **11 or more**, page 2 appears, numbered page controls work, and the record counter is correct.
5. Change search/status filter from page 2 and confirm the pager resets correctly; edit/save items and confirm pagination remains valid.
6. Repeat long-list tests for application cycles, requirement selectors, and knowledge sources. Verify no missing or duplicate rows between pages.
7. At mobile width 320px, check table/list overflow, compact Previous/Next layout, chart legibility, month-selection buttons, focus states, dropzone browse fallback and card separation.
8. Confirm the existing drag-to-reorder acquisition steps are **not paginated** and the Applicant public pages are unchanged.
9. Open the **Import file** action on Scholarship Guides; the large import surface must stay hidden until requested. Test text prefill, progress state, manual application and hide/show. Verify Lumen AI does not claim successful extraction until connected. Imported file validation statuses are locally simulated equivalents; no actual HTTP upload happens here.
10. Verify live data with a provisioned admin profile and safe test records; Playwright uses mock Supabase. No destructive production records.

## Release boundaries

**Backend integration, 13 November 2026:** `feat/backend-db` preserves this V3 UI
and uses protected cookie APIs for admin sessions, reads, atomic saves, reference
review, and publication checks. The import-to-program save regression verifies
that staged cycle fields survive saving. Production browser checks passed 78
cases, with two intentional viewport skips; see [current status](STATUS.md).
These changes await pull request review and explicit approval to merge into staging.

- The history chart uses timestamps already present on loaded content, not a publication audit log. It is the aggregate of currently visible rows; deleting/archiving records can alter past counts.
- Client-side pagination is appropriate for current content size. Before >1000 Supabase-visible records, implement proper server-side pagination and count queries to avoid the default API row cap.
- Admin-uploaded PDF/DOC/DOCX AI extraction, acquisition map/hours metadata, private applicant OCR and telemetry require their backend contracts. V3 does **not** imply these systems are operational.
- A green CI pipeline is necessary but not equivalent to manual visual or real-Supabase acceptance QA.

## Focused regression (post-screenshot issue)

- The former full-height black focus rectangle was an SVG interaction-target defect. It must never appear on hover, click, or keyboard navigation.
- Compare interaction discipline to the Ysabelle Store SARIMA Forecast UI: clear grid, readable counts, compact tooltip, keyboard/touch-friendly month selection, and separate mobile behavior. This dashboard is **historical activity**, not a SARIMA prediction; it must not draw a confidence band or invent forecast values.
- Demo mode intentionally cannot save; use a real publisher account and safe seeded records for full CRUD/approve/publish QA. Backend acquisition map/office details and admin AI document conversion are not yet supplied by this UI-only change.
