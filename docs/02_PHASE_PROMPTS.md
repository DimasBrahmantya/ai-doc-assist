# PHASE PROMPTS

Kirim satu per satu. Review hasil sebelum lanjut. Semua phase tunduk pada `AGENTS.md` dan master prompt.

---
## Phase 1 — Project Setup (Hari 1)
Execute project initialization.
- Inspect repo. Initialize Next.js (App Router, TypeScript strict, `src/` dir) if needed.
- Configure Tailwind CSS and shadcn/ui. Define design tokens from `docs/05_UI_SPEC.md` as CSS variables + Tailwind theme.
- Create folder architecture from `docs/03_ROADMAP.md`.
- Create env validation module (Zod) reading `.env.example` variables; fail fast on missing server vars.
- Setup Git, `.gitignore` (ignore `.env*` except `.env.example`), initial README, lint + typecheck + test scripts (Vitest).
- Verify dev server starts and `npm run build` passes.
Do not implement AI features yet.

---
## Phase 2 — Frontend (Hari 2)
Build responsive UI exactly following `docs/05_UI_SPEC.md` and the reference design.
- Layout: IconRail, ConversationSidebar (search, + New Conversation, Today/Yesterday groups, item menu), AppHeader, DocBanner.
- Pages: `/login`, `/dashboard`, `/documents`, `/documents/[id]`, `/chat/[conversationId]`.
- Components: UploadDropzone, DocumentList, StatusBadge, PdfViewer shell + PdfToolbar, ChatMessage, ChatInput, SourceCitation, LoadingState, ErrorState, EmptyState, ConfirmDialog.
- Responsive: desktop 3-column, tablet drawer + tabs, mobile tabs + sticky input.
- Mock data only in `src/mocks/`, clearly separated, removable in one step.
Do not call real APIs yet.

---
## Phase 3 — Database & Backend (Hari 3)
- Review `supabase/migrations/001_init.sql`; apply to Supabase (tell me the manual steps if needed). Confirm pgvector, RLS, `match_document_chunks`.
- Supabase clients: browser, server (session-bound, RLS on), admin (service role, server-only, narrow use).
- Auth: Supabase Auth login/logout, session middleware, protect routes.
- Repositories: documents, chunks, conversations, messages. Services layer. Route handlers with Zod validation and a central error handler returning `{ error: { code, message } }`.
- Ownership checks in code in addition to RLS.
- Test DB connectivity and RLS with two users.

---
## Phase 4 — PDF Processing & Embeddings (Hari 4–5)
- `POST /api/documents/upload`: auth, Zod, size limit, MIME + magic bytes `%PDF-`, reject empty/corrupt/encrypted, SHA-256 hash, duplicate check, store in private bucket at `userId/docId.pdf`, insert row `uploaded`.
- `POST /api/documents/:id/process`: atomic status lock to `processing` (409 if already processing), extract text per page (preserve page numbers, enforce `MAX_PDF_PAGES`), clean text, chunk per page, embed in batches via `src/lib/gemini/embeddings.ts` with retry/backoff, insert chunks in batches, set `ready` + `total_pages`; on failure set `failed` + safe `error_message`.
- Scanned/no-text PDF -> `failed` with a clear message.
- Set `maxDuration`; UI polls status. Document how large PDFs behave on Vercel limits.
- `DELETE /api/documents/:id`: remove chunks, conversations, storage file.
- Unit tests for validation, cleaning, chunking (page boundary, overlap), retry.
Verify with a real PDF end to end and report actual numbers (pages, chunks, time).

---
## Phase 5 — RAG Implementation (Hari 6–7)
- `src/lib/rag/`: `retrieve` (embed `RETRIEVAL_QUERY`, call `match_document_chunks`, threshold `RAG_MIN_SIMILARITY`, top-k `RAG_TOP_K`, cap context chars), `prompt` (system instruction + `<context>` / `<question>` per `docs/04_ARCHITECTURE.md`), `pipeline` (orchestration).
- Follow-up questions: rewrite to standalone question using the last few messages (cheap Gemini call or simple heuristic; explain choice).
- `generateAnswer` via `src/lib/gemini/generate.ts`; parse `[p.N]`, validate against sent chunks, return `{ answer, sources: [{ page, chunkId, snippet, similarity }], usage }`.
- If no chunk passes threshold: return the "not enough information" answer without calling the LLM.
- `POST /api/chat`: auth, Zod, ownership, rate limit, store both messages with `sources`.
- Tests: prompt builder, citation parser, no-results path, prompt-injection fixture PDF, Gemini failure mapping.

---
## Phase 6 — Chat Integration (Hari 8–9)
- Connect UI to real APIs: document list/upload/process polling, conversation CRUD, chat send, message history.
- PdfViewer with signed URL, zoom, page nav, search; clicking a citation jumps to the page and highlights it.
- Loading, error (retry), empty, and insufficient-info states. Copy / like / dislike actions on bot messages (like/dislike may be local state for MVP).
- Remove mock usage from production paths.
- Verify complete workflow manually and report what was actually tested.

---
## Phase 7 — Testing & Security (Hari 10–11)
- Unit, integration, and API tests. Authorization tests: user A cannot GET/DELETE/process/chat on user B's document or conversation.
- Security review against `AGENTS.md` list: key leakage (grep `.next/static` for `GEMINI_API_KEY` / `SERVICE_ROLE`), rate limits, Zod coverage, error leakage, signed URL expiry, prompt injection.
- RAG evaluation scaffolding per `docs/06_CHECKLIST_AND_EVALUATION.md` (retrieval, answers, cost/latency scripts + sample data).
- Fix all critical issues. Report remaining ones honestly.

---
## Phase 8 — Deployment (Hari 12–14)
- Production env on Vercel + Supabase (tell me manual steps; never invent credentials).
- Deploy. Test production upload, process, chat, citation jump, delete.
- README with architecture diagram, RAG workflow, setup, limitations; screenshots and demo script.
- Report deployment status, URL (only if real), and known limitations.
