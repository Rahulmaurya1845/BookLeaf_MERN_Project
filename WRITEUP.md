# Write-up: Author Support & Communication Portal

**What I prioritised.** The brief weights AI integration highest, so I built the AI layer to behave like production code rather than a demo: strict JSON classification validated by schema, drafts grounded in the knowledge base *plus facts computed in code* (royalty, dates, status) so the model can't invent numbers, and a deterministic fallback (rule classifier + template drafts) so the system never depends on the LLM being up. Next came the ticket lifecycle end to end: create → classify → queue → draft → edit → send → author sees it.

**Trade-offs.** Polling instead of WebSockets (works on free serverless hosting; a 5s delay is acceptable for support). Embedded responses/notes in the ticket document (simple, fast reads) instead of separate collections. AI runs inside the request on ticket creation (simple, ~1-3s) instead of a queue. Attachments are UI-only as allowed.

**Cost control.** Per-category KB slices, clipped inputs, last 3 messages only, cached drafts, tiny classification output, free-tier model.

**Production evolution.** Queue-based AI jobs with retries; email/WhatsApp notifications; author replies and reopen; S3 uploads; SLA dashboards and auto-escalation; audit log; password reset/SSO; feedback loop (admin overrides and edit-distance on drafts) to measure classification accuracy and fine-tune prompts; a vector index over past resolved tickets once the KB grows beyond a few pages.
