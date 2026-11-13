# Admin Portal V3 — Visual Quality, Analytics and Pagination QA

**Target branch:** `feat/admin-portal` → PR to `staging`. No direct staging/main edits.

## Implemented scope

- Reduced glare: calm neutral `#F3F5F8` page canvas, white cards, clearer neutral borders and softer shadow depth.
- Admin typography uses a neutral system UI stack for legibility, preserving the shared GabayIskolar navy/book-and-wave brand. Removed oversized global overrides on small text.
- Subtle, accessible smooth blue **gradient area chart** plus muted dashed secondary series. Six UTC calendar-month buckets use **real `scholarship_programs.created_at` and `application_cycles.published_at` values**; no synthetic activity. If both have zero counts in range, show an honest empty state. Data marks can be focused by keyboard.
- Compact current-state guide/source distribution cards remain, using muted colors, smaller status strips and readable numbers. No student activity, applicant counts or official submissions are reported.
- Conditional 10-record **Ysabelle-style pagination** for: scholarship guides, application cycles, requirement selectors, knowledge sources.
- Pagination stays **hidden at 10 records or fewer**, exposes numbered buttons/ellipsis, Prev/Next, and "Showing X–Y of Z" for longer filtered lists; no rows-per-page dropdown. Mobile hides redundant intermediate page buttons.
- Filtering and searching reset scholarship program pagination to page 1; other sections reset their page on program/cycle scope changes. Current page is clamped after list length changes.
- Keeps source verification/publisher role safeguards, step drag-and-drop editor and local-only context import with truthful progress. No Applicant UI redesign.

## Manual acceptance checks

1. Confirm every Admin screen is visually calm with readable typography, fully visible white cards, navy sidebar and blue/white primary actions. Pay particular attention at desktop widths 1280–1920px.
2. On Dashboard, check the main smooth area chart against real saved creation/publication dates, including zero-month hover values and periods with no activity. Check keyboard focus on chart points and screen-reader accessible summary.
3. Check status/source distribution legend alignment and that pending sources cannot be treated as approved.
4. With **10 or fewer** filtered scholarship records, no pagination is shown. With **11 or more**, page 2 appears, numbered page controls work, and the record counter is correct.
5. Change search/status filter from page 2 and confirm the pager resets correctly; edit/save items and confirm pagination remains valid.
6. Repeat long-list tests for application cycles, requirement selectors, and knowledge sources. Verify no missing or duplicate rows between pages.
7. At mobile width 320px, check table/list overflow, compact Previous/Next layout, chart legibility, focus states, dropzone browse fallback and card separation.
8. Confirm the existing drag-to-reorder acquisition steps are **not paginated** and the Applicant public pages are unchanged.
9. Verify Lumen AI still does not claim successful extraction until connected. Imported file validation statuses are locally simulated equivalents; no actual HTTP upload happens here.
10. Verify live data with a provisioned admin profile and safe test records; Playwright uses mock Supabase. No destructive production records.

## Release boundaries

- The history chart uses timestamps already present on loaded content, not a publication audit log. It is the aggregate of currently visible rows; deleting/archiving records can alter past counts.
- Client-side pagination is appropriate for current content size. Before >1000 Supabase-visible records, implement proper server-side pagination and count queries to avoid the default API row cap.
- Admin-uploaded PDF/DOC/DOCX AI extraction, acquisition map/hours metadata, private applicant OCR and telemetry require their backend contracts. V3 does **not** imply these systems are operational.
- A green CI pipeline is necessary but not equivalent to manual visual or real-Supabase acceptance QA.
