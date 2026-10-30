# BookLeaf Author Support & Communication Portal

MERN app (MongoDB, Express, React, Node) with two portals — **Author** and **Admin** — and AI-assisted ticket handling (auto-classification, priority scoring, drafted replies grounded in the BookLeaf Knowledge Base).

## Quick start (local)

Requirements: Node.js 18+ and a MongoDB (local install **or** free MongoDB Atlas).

```bash
# 1. install everything
npm run setup                 # or: cd server && npm i ; cd ../client && npm i

# 2. configure (files already exist; edit if needed)
#    server/.env   -> MONGODB_URI, JWT_SECRET, GEMINI_API_KEY (optional)
#    client/.env   -> VITE_API_URL=http://localhost:5000/api

# 3. load the sample data (10 authors, 18 books, 7 demo tickets)
npm run seed

# 4. run (two terminals)
npm run dev:server            # http://localhost:5000
npm run dev:client            # http://localhost:5173
```

### Test logins (created by the seed)
| Role | Email | Password |
|---|---|---|
| Admin | admin@bookleaf.com | Admin@123 |
| Admin 2 | admin2@bookleaf.com | Admin@123 |
| Author | priya.sharma@email.com (any of the 10 sample emails) | Author@123 |

Interesting author cases: `ananya.reddy@email.com` (zero royalty paid), `sneha.kulkarni@email.com` (book in production, ₹0 royalty), `kavita.deshmukh@email.com` (one book in typesetting, one live).

## AI setup (free)
1. Create a free key at https://aistudio.google.com/apikey
2. Put it in `server/.env` as `GEMINI_API_KEY=...` and restart the server.

**No key? The app still works**: tickets are classified by a keyword rule engine and admins get a template-based draft built from the same knowledge base (labelled "Template draft (AI offline)").

## Architecture
```
client/ (React + Vite)           server/ (Express + Mongoose)
  pages/author, pages/admin        routes/    auth, books, tickets (author), admin
  usePolling (5-10s refresh)       middleware/ auth (JWT + RBAC), validate (zod), errorHandler
  api.js (fetch wrapper)           models/    User, Book, Ticket
                                   services/ai/ knowledge, facts, prompts, llmClient, fallback, index
                                   seed/      sample data + seed script
```
Decisions:
- **MongoDB + Mongoose**: tickets embed `responses` and `internalNotes` (always read together with the ticket). Books are a separate collection referenced by author.
- **JWT auth + bcrypt**; `authenticate` on every route, `requireRole` for admin routes; author queries are always filtered by `req.user._id` (another author's ticket/book returns 404, never leaks).
- **Serializers** (`utils/serializers.js`) decide what each role sees: authors never receive internal notes, AI metadata or priority.
- **Real time = polling** (5s author tickets, 8-10s admin). Chosen because WebSockets/SSE don't work on Vercel serverless. It pauses when the tab is hidden, and Express ETags make unchanged polls cheap (304).
- **Urgency sorting**: `priorityRank` and `isActive` are stored on the ticket and indexed, so "active first, most urgent, then oldest" is a single indexed sort. Tickets past their response target (Critical 24h, High 48h, Medium 72h, Low 120h) are flagged overdue.

## AI integration
**Model**: Google Gemini Flash (`gemini-2.5-flash`, configurable via `GEMINI_MODEL`) — has a free tier (needed for a zero-cost deployment), is fast, and supports JSON output mode. The client (`llmClient.js`) is provider-isolated, so switching to OpenAI/Anthropic means changing one file.

**Prompt strategy**
- *Classification* (`prompts.js`): system prompt with the six categories, routing hints and a priority rubric; returns strict JSON validated with zod. Business rule on top: ISBN errors are never below **High**.
- *Drafting*: persona + tone guidelines + hard rules (no invented numbers, plain text, 110–190 words, specific next step, sign-off), the **policy section for that ticket's category only**, a one-line calibration example, and **ACCOUNT FACTS computed in code** (pending royalty, last payout, next payout window, book status, platforms). The model phrases facts; it doesn't calculate them, so figures are right.

**Cost awareness**
- Whole KB is never sent: COMPANY + TONE (~300 tokens) + one category policy.
- Classification sends only subject + book status + message clipped to 1,200 chars; `maxOutputTokens` 200.
- Draft sends at most the last 3 messages (each clipped), and only the one relevant book (or a compact list of ≤6 books for account-level tickets).
- Drafts are **cached on the ticket**: reopening a ticket costs nothing; regenerating is an explicit click. Thinking tokens are disabled on 2.5 models.
- Seeding uses the rule engine, so it spends no quota.

**Graceful degradation**: ticket is saved *before* any AI call. Missing key, timeout (12s), 429/5xx (one retry) or bad JSON → rule-based classification / template draft. A circuit breaker pauses AI calls for 60s after 3 consecutive failures so the app never waits on a dead API. The admin UI shows whether a label/draft came from AI, rules or an admin override.

**API key security**: key only in `server/.env` / Vercel env vars, read in `config/env.js`, never sent to the browser; `.env` is git-ignored (`.env.example` is committed).

## API reference
Base URL: `/api`. Auth: `Authorization: Bearer <token>`. Errors: `{ "error": { "status", "message", "details?" } }` (400 validation, 401 unauthenticated, 403 wrong role, 404, 409, 503 DB down).

| Method | Path | Role | Description |
|---|---|---|---|
| GET | /health | public | Liveness + whether AI is configured |
| POST | /auth/login | public | `{email,password}` → `{token,user}` (rate-limited) |
| GET | /auth/me | any | Current user |
| GET | /books | any | Author: own books. Admin: all (`?authorId=`) |
| GET | /books/:id | any | One book (author: own only) |
| GET | /tickets | author | Own tickets with admin responses |
| POST | /tickets | author | `{bookId: "general"\|<id>, subject, description, attachmentName?}` → creates + AI-classifies |
| GET | /tickets/:id | author | Own ticket |
| GET | /admin/tickets | admin | Filters: `status, category, priority, assigned(me\|unassigned), from, to, q, sort(urgency\|newest\|oldest), page, limit` |
| GET | /admin/stats | admin | Open / in-progress / critical / high / overdue counts |
| GET | /admin/tickets/:id | admin | Full ticket incl. notes, AI draft, book details |
| PATCH | /admin/tickets/:id | admin | `{status?, category?, priority?, assignedTo?: "me"\|null}` (category/priority overrides recorded as `admin`) |
| POST | /admin/tickets/:id/draft | admin | `{regenerate?: bool}` → AI draft (cached) |
| POST | /admin/tickets/:id/respond | admin | `{message, status?, fromDraft?}` → visible to author |
| POST | /admin/tickets/:id/notes | admin | `{text}` internal note |

## Deploy free on Vercel (two projects from one repo)
1. Push this repo to GitHub.
2. **Database**: create a free MongoDB Atlas M0 cluster → Database Access (user/password) → Network Access allow `0.0.0.0/0` → copy the connection string.
3. **Backend**: Vercel → New Project → import repo → *Root Directory* `server` → Environment Variables: `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `CLIENT_URL` (set after step 4) → Deploy. Note the URL, e.g. `https://bookleaf-api.vercel.app`.
4. **Frontend**: New Project → same repo → *Root Directory* `client` (Vite preset) → env `VITE_API_URL=https://bookleaf-api.vercel.app/api` → Deploy.
5. Go back to the backend project, set `CLIENT_URL=https://<your-frontend>.vercel.app`, redeploy.
6. **Seed the live DB** from your laptop: put the Atlas URI in `server/.env` temporarily and run `npm run seed`.

## Known limitations / next steps
- File attachments are UI-only (name stored, no upload). Next: S3/Cloudinary + signed URLs.
- Authors can't reply to a ticket after the first message (admin replies are one-way). Next: threaded conversation + reopen.
- Polling instead of push. Next: SSE/WebSocket on a long-running host, or a managed realtime service.
- Demo users share a seeded password; production needs password reset, invite flow, and account lockout.
- No automated tests yet; I'd add API tests (supertest) and a small labelled set to measure classification accuracy.
- AI call runs inside the request (needed on serverless); at scale move it to a queue/worker and email authors on replies.


   ## Live demo
   - App: https://client-psi-henna-74.vercel.app
   - API: https://server-two-pi-81.vercel.app/api/health
   - Admin: admin@bookleaf.com / Admin@123
   - Author: priya.sharma@email.com / Author@123 (all sample authors use Author@123)