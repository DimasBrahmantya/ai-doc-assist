# AI Document Assistant

Upload PDF documents and ask natural-language questions grounded in your documents with page-level source citations.

## Tech Stack
- **Framework**: Next.js (App Router), React, TypeScript (strict)
- **Styling**: Tailwind CSS, shadcn/ui
- **AI & Embeddings**: Google Gemini API (`@google/genai`)
- **Database, Auth & Storage**: Supabase (PostgreSQL, pgvector, Auth, Storage)
- **Testing**: Vitest
- **Deployment**: Vercel

## Local Setup (Phase 1)
1. Copy `.env.example` (or `env.example`) to `.env.local` and fill in your Supabase and Gemini credentials.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run checks:
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   npm run build
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

> More documentation (architecture diagram, RAG workflow, DB setup, deployment, and known limitations) will be added as phases progress.
