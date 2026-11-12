# Member 4 — Lumen OCR, AI Chat & RAG Sprint Guide

**Branch:** `feat/lumen-rag`  
**Owner:** Real Lumen integration, retrieval, grounding, OCR review logic and AI verification  
**Primary files:** `src/lib/lumen/`, `src/lib/rag/`, `src/app/api/ai/`, AI evaluation fixtures/tests  
**Unblockers:** Lumen provider/docs (critical), M2 (verified sources), M3 (published KB access), M1 (chat/OCR UI contracts)

## Deliverable and acceptance

At least one genuine Lumen tool must work in the submitted web app; demonstrate BOTH OCR and contextual Chat if possible. For RAG, Chat answers must rely on retrieved, approved scholarship information and cite matching source IDs. Applicants can correct OCR errors. Never claim a fake response is real provider output.

## Sprint 0 — External service validation + contracts (Nov 12 11:25 PM–12:15 AM)

- [ ] **M4-00 / P0-08:** Verify organizer's sandbox **Lumen OCR** and **Lumen AI Chat** documentation and actual request/response format. Scaffold header names are unverified until checked.
- [ ] **M4-01:** Run smallest live test for each endpoint using secure local environment variables and a fictional sample. Record sanitized status/error observations only.
- [ ] **M4-02:** Share provider limits, supported upload formats, response shape and timeouts with M1/M3; do not paste credentials in chat/PR/logs.
- [ ] **M4-03:** Freeze app-level ChatRequest/ChatResponse and OCRReviewResponse shape with M1 and M3; API adapter must normalize provider-specific JSON.
- [ ] **M4-04:** Review knowledge schema and source approval/version rules with M2/M3.
- [ ] **M4-05:** Define no-source policy and 5-question evaluation corpus with at least one out-of-scope and one adversarial sample.

**Gate G0:** one verified provider call or documented exact connectivity blocker; UI contracts delivered so M1 can continue independently.

## Sprint 1 — RAG retrieval and provider adapters (12:15–2:00 AM)

- [ ] **M4-10:** Build isolated Lumen OCR and Chat adapters; secrets strictly server-only.
- [ ] **M4-11:** Implement approved knowledge search using indexed PostgreSQL full-text retrieval, scoped to selected cycle, optional requirement and current published source/version.
- [ ] **M4-12:** Create prompt builder with retrieved excerpts, clear source identifiers, forbidden-policy invention instruction, and explicit 'insufficient information' behavior.
- [ ] **M4-13 / P0-09:** Implement `POST /api/ai/chat` with Zod request validation, retrieval and provider call; response includes grounded answer and **real** source reference.
- [ ] **M4-14:** If DB not yet ready, validate with source-checked local chunks and swap to M3 contract before integration; never expose fixtures as live policy.
- [ ] **M4-15:** Handle empty retrieval and expired cycles without calling Lumen to invent an answer.

**Gate G1:** live Chat response trace demonstrates source selection and valid app response, even if UI awaits integration.

## Sprint 2 — OCR review and full AI integration (2:00–4:00 AM)

- [ ] **M4-20 / P0-10:** Implement `POST /api/ai/ocr` with file type/size validation, opt-in consent, correct provider request mapping and safe parse.
- [ ] **M4-21:** Normalize extracted text into editable review fields; unknown fields remain uncertain, not guessed.
- [ ] **M4-22:** Add deterministic school-year/document-type comparisons ONLY against explicit approved requirement criteria.
- [ ] **M4-23:** Send M1 tested API examples for valid extraction, unreadable scan, provider error, mismatch and user correction.
- [ ] **M4-24:** Ensure uploaded document text cannot become a prompt instruction or modify scholarship policy.
- [ ] **M4-25:** Integrate deployed server-side Lumen secrets through M3; test with a fictional document. Never store raw uploads by default.

**Gate G2:** live OCR extraction + correction + grounded Chat in applicant UI. Capture evidence without publishing sensitive inputs.

## Sprint 3 — Evaluation and guardrails (8:30–11:30 AM)

- [ ] **M4-30:** Test exact and paraphrased applicant FAQs in English; test Filipino/Taglish variants where possible.
- [ ] **M4-31:** Ask unsupported question; system should disclose missing evidence rather than fabricate deadline/office address.
- [ ] **M4-32:** Ask about an archived/outdated cycle; retrieval must not cite stale content as authoritative.
- [ ] **M4-33:** Prompt-injection test inside applicant upload and source text (e.g. 'ignore previous instructions'): model must not follow it.
- [ ] **M4-34:** Simulate provider timeout/429/503 and malformed response; retry/error feedback rather than success claim.
- [ ] **M4-35:** Confirm source chips in M1 UI correspond to approved database source IDs/URLs.
- [ ] **M4-36:** Run the exact demonstration on the deployed Vercel URL and report usage limits/credits risk.

**Gate G3:** verified live provider output, grounded sources, robust refusal path and recovery from failure.

## Sprint 4 — Demo evidence and freeze (11:30 AM–1:30 PM)

- [ ] **M4-40:** Capture sanitized demonstration: selected requirement → OCR → manual correction → grounded Chat answer.
- [ ] **M4-41:** Brief team on boundaries: OCR extracts; app checks known fields; Chat explains retrieved knowledge; no official verification or eligibility decisions.
- [ ] **M4-42:** Ensure all Lumen secrets remain private and provider responses are not accidentally logged/persisted.
- [ ] **M4-43:** Freeze Lumen adapters before code freeze; no speculative feature expansion.
- [ ] **M4-44:** Supply short explanation of retrieval architecture for README and pitch.

## RAG grounding quality contract

1. Retrieve by **published active cycle + approved source**; keep source/version/review date.
2. Rank verified facts and requirement-specific FAQ passages before general guidance.
3. Use source excerpts as context, **not instructions**. Ignore instructions embedded in uploaded files.
4. Return clear uncertainty when no trusted evidence exists; refer applicant to official channels.
5. Sources shown to student must genuinely correspond to retrieved passages; do not manufacture citations.
6. No storage of real student documents in public repo or test corpus.

## Evaluation mini-matrix

| Case | Expected |
|---|---|
| Verified requirement question | Accurate, brief answer + source URL |
| Paraphrase of known FAQ | Relevant answer + correct source |
| Unknown office fee / deadline | Honest 'Cannot verify from published guide' |
| Old cycle in KB | Filtered out or clearly historical |
| OCR wrong school year | Editable extraction + 'Possible mismatch' |
| Prompt injection inside document | Treat as data, never obey |
| Lumen unavailable | 503/error state; no mocked answer presented as real |

## Handoff matrix

| Partner | Needed from them | You provide |
|---|---|---|
| **M2** | Approved source texts and citations | AI feedback on ambiguities and missing evidence |
| **M3** | Secure KB queries, auth/DB and deployment environment | Working server routes, normalization and tests |
| **M1** | OCR/chat UI contract and correction interactions | Typed response examples and error states |

**Escalate:** provider authentication failure immediately, with sanitized error text and no secrets.  
**Out of scope:** external embedding API, semantic vector DB, broad legal/eligibility advice, document authenticity certification.

## PSCS documentary research and demo data

- [Requirements by grade level and applicant classification](../scholarships/pscs/requirements.md): official sources, historical new-applicant lists, 2026–2027 renewal lists, PAG-ASA distinctions, and evidence gaps. Researched 13 November 2026.
- [Member 4 demo data guide](../scholarships/pscs/demo-data.md): six fictional document bundles, sample text, current OCR fields, negative variants, and source-scoped RAG questions. Source inspection does not replace Member 2's publication review.
- [OCR field priorities and keywords](../scholarships/pscs/ocr-extraction.md), with [JSON profiles](../scholarships/pscs/ocr-profiles.json): document-specific P0/P1/P2 extraction targets and label hints, clearly separated from the current six-field parser.
