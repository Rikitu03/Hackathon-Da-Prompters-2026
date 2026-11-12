# PSCS requirements, demo data, and OCR

Research and implementation references for Pasig City scholarship preparation. Start here for Member 4 content work. Research baseline: **13 November 2026, Asia/Manila**.

For the current merged build, remaining integration gaps and what to do next, read [Current status and next steps](../../STATUS.md) first. These references supply researched content and test designs; they do not automatically seed the shared database or enable extraction profiles.

## Reading order

| Priority | File | Use it to |
|---|---|---|
| 1 | [Requirements](requirements.md) | Identify the correct program, level, applicant classification, school year, and official evidence |
| 2 | [Demo data](demo-data.md) | Assemble fictional samples and test the applicant journey |
| 3 | [OCR extraction](ocr-extraction.md) | Choose fields to review first and understand keyword matching limits |
| 4 | [JSON profiles](ocr-profiles.json) | Reference the 20 proposed document profiles and shared field definitions |

## Team handoffs

- **Member 2:** review requirements and source text before publication.
- **Member 3:** persist reviewed content through the [guide API](../../API_CONTRACTS.md), preserving real record IDs and publication rules.
- **Member 4:** use the demo data and OCR profiles for extraction and source-grounded RAG tests; follow the [Member 4 sprint guide](../../sprints/MEMBER_4_LUMEN_RAG.md).
- **Member 1:** render the selected cycle's checklist, editable OCR suggestions, review warnings, and source citations using the shared contract.

Requirements research, fictional test records, and proposed extraction fields have different roles. Historical requirements remain explicitly scoped; the JSON profiles are not automatically loaded by the current parser. The requirements reference records unresolved evidence, including uninspected GCash-form fields.

[All documentation](../../README.md)
