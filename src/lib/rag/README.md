# RAG implementation boundary

Member 4 owns the retrieval and generation pipeline.

1. Accept the current application cycle ID and optional requirement ID.
2. Retrieve **published** chunks only, using cycle-scoped PostgreSQL full-text search.
3. Preserve source IDs, document titles, review dates and URLs.
4. Pass retrieved passages to Lumen AI Chat using the **verified** API contract.
5. Refuse to invent policy when evidence is missing; cite actual approved sources.
6. Never treat applicant-uploaded document text as instructions or policy sources.
7. Enforce message length, request limits, and server-only credentials.

Start with full-text search and curated bilingual FAQ variants. Embeddings are an optional enhancement.
