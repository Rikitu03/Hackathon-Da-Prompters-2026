# Requirement import and pinned issuing office — UAT

**Branch:** feat/requirement-import-locations → staging  
**Purpose:** Replace repetitive manual requirement entry with a review-first import option, and give applicants a verified destination for obtaining each document.

## What is implemented

- Requirement editor: **Import text / file** opens a modal with dimmed backdrop, drag/drop, paste input, validation and a review form.
- Local parsing: UTF-8 \`.txt\` and \`.md\` (up to 512 KB). It recognizes **labeled** title, purpose, office, address, hours, maps URL and numbered acquisition steps. It does not invent values.
- Conditional remote OCR: \`.pdf\`, \`.png\`, \`.jpg\`/\`.jpeg\`, \`.webp\`, \`.tif\`/\`.tiff\` up to 4 MB, only when the existing OCR service is configured and the admin explicitly consents to provider processing/retention. DOC/DOCX are **not** currently supported here.
- Reviewer can edit extracted suggestions and apply them to the requirement form. **Apply is not Save**; saving a draft remains a separate authorized action.
- Added optional issuing office, full address, office hours and explicit pinned map URL to the requirement editor. Map URL validation accepts direct HTTPS Google Maps, Apple Maps or OpenStreetMap links. No geocoding or map coordinate guesses.
- The applicant requirement guide shows these details and **Open pinned location** only when saved and published.

## Required deployment order

1. Review the migration \`supabase/migrations/20261113120000_requirement_locations.sql\` with the DB owner and apply it **before** deploying dependent Admin and public guide queries.
2. Deploy the application with the same PR; the API/Zod contract then accepts the new location fields.
3. Confirm publisher permissions and run a live safe-data integration test. A local/demo preview does not persist data, and mocked browser tests do not prove a production DB migration.
4. OCR requires the existing configured Lumen backend; an unconfigured service returns a recoverable error. Admins must not upload personal applicant documents. Service-side retention is external and is disclosed in the modal.

## Manual UAT

- [ ] Requirement Edit → Import text / file opens centered above a dimmed workspace.
- [ ] Escape / close / backdrop click work, and keyboard focus returns to the trigger.
- [ ] On phone, modal scrolls internally without screen overflow.
- [ ] Drag-and-drop or browse a labeled MD/TXT; verify title, purpose, ordered steps, office, address, hours and URL are suggested and editable.
- [ ] Pasted text produces the same suggestions. Unsupported DOCX, empty files and excessive sizes show actionable errors.
- [ ] PDF/image OCR cannot be run without consent, and if service configuration is missing, shows the actual server error instead of fake progress.
- [ ] Applying changes closes the modal and prefills form fields without saving or replacing existing non-empty values with missing suggestions.
- [ ] Valid pinned map URL offers preview; arbitrary host / HTTP URL is rejected.
- [ ] Save the requirement as a **publisher** and reload it. All office/map fields and acquisition steps should persist.
- [ ] Publishing via approved sources shows the location on the applicant requirement page, with safe external navigation; old published requirements without a map remain uncluttered.
- [ ] Edit an unrelated source/cycle afterward; the pinned location must remain intact (SQL guide reconstruction regression).
- [ ] Confirm no unexpected applicant UI changes outside the requirement detail section.

**Limit:** Text extraction is conservative labeled-field recognition, not semantic LLM extraction from arbitrary prose. User review and official source validation are mandatory. This PR does not auto-geocode an address or independently verify an office's opening hours.
