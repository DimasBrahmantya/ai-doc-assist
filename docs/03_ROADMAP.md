# Roadmap Pengerjaan (10–14 hari, 2–4 jam/hari)

Fokus MVP dulu, tambahan sesudahnya. Tiap hari = satu phase prompt di `prompts/02_PHASE_PROMPTS.md`.

| Hari | Fase | Isi | Deliverable |
|---|---|---|---|
| 1 | Project initialization | Next.js + TS strict, Tailwind, shadcn/ui, struktur folder, GitHub, env | Project ready |
| 2 | UI/UX | Layout 3 area (rail, daftar percakapan, workspace), dashboard, upload UI, daftar dokumen, chat UI, responsive. Data mock di `src/mocks/` | Frontend ready |
| 3 | Database & backend | Supabase, pgvector, migration, RLS, Supabase Auth, route handler, Zod, repository | Backend foundation |
| 4–5 | Document processing | Upload + validasi, ekstraksi per halaman, cleaning, chunking, embedding Gemini batch, simpan | Ingestion pipeline |
| 6–7 | RAG | Embed query, vector search, ambang similarity, prompt builder, Gemini generate, sitasi halaman, fallback "tidak cukup info" | RAG pipeline working |
| 8–9 | Chat integration | Chat dengan dokumen, riwayat, loading/error/empty state, PDF viewer + klik sitasi lompat halaman | Functional chatbot |
| 10–11 | Testing & security | API test, validasi PDF, retrieval accuracy, halusinasi, rate limit, proteksi key, ownership test, prompt injection test | Tested app |
| 12–14 | Deploy & dokumentasi | Vercel, env produksi, README, diagram arsitektur, screenshot, demo video, cleanup repo | Portfolio-ready |

## Setelah MVP
1. Retrieval Evaluation (hit@k, MRR).
2. Answer Evaluation (groundedness, sitasi benar).
3. Cost & Latency Evaluation (token, biaya, waktu).
4. Fitur desain referensi: Explain/Summarise/Rewrite pada teks terpilih, search di PDF, streaming.

## Struktur folder
```
ai-document-assistant/
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── dashboard/
│   │   ├── documents/
│   │   ├── chat/
│   │   └── api/
│   │       ├── documents/
│   │       ├── chat/
│   │       └── conversations/
│   ├── components/
│   │   ├── ui/            # shadcn
│   │   ├── layout/        # IconRail, ConversationSidebar, Header
│   │   ├── dashboard/
│   │   ├── documents/     # UploadDropzone, DocumentList, StatusBadge
│   │   ├── pdf/           # PdfViewer, PdfToolbar, SelectionToolbar
│   │   └── chat/          # ChatMessage, ChatInput, SourceCitation
│   ├── lib/
│   │   ├── gemini/        # client, embeddings, generate, retry
│   │   ├── supabase/      # server, browser, admin clients
│   │   ├── pdf/           # validate, extract, clean
│   │   ├── rag/           # chunk, retrieve, prompt, pipeline
│   │   ├── rate-limit/
│   │   └── validations/   # zod schemas
│   ├── services/
│   ├── repositories/
│   ├── mocks/             # hanya untuk UI sementara
│   ├── types/
│   └── utils/
├── supabase/migrations/
├── tests/
├── docs/
├── AGENTS.md
├── .env.example
├── README.md
└── package.json
```
