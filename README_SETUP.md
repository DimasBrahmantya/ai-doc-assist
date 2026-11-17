# Cara pakai paket file ini di Antigravity

## Penempatan
```
repo-root/
├── AGENTS.md                         <- rules agent
├── .env.example
├── docs/                             <- 01_PRD, 03_ROADMAP, 04_ARCHITECTURE, 05_UI_SPEC, 06_CHECKLIST...
├── prompts/                          <- 01_MASTER_PROMPT, 02_PHASE_PROMPTS, 03_FINAL_REVIEW_PROMPT
└── supabase/migrations/001_init.sql
```
Tiap file berdiri sendiri. Tidak ada yang digabung.

## Langkah awal
1. Buat folder proyek kosong, salin semua file ke sana, buka di Antigravity.
2. Buat project Supabase. Jalankan `001_init.sql` di SQL editor. Buat bucket private `documents`, lalu jalankan policy storage (yang di-comment di akhir file).
3. Buat API key di Google AI Studio. Isi `.env.local` dari `.env.example`. Cek nama model terbaru di dokumentasi Gemini sebelum isi `GEMINI_CHAT_MODEL`.
4. Buka Agent Manager, tempel isi `prompts/01_MASTER_PROMPT.md` sebagai pesan pertama. Agent akan inspeksi repo dan beri rencana. Baca, lalu balas "approved".
5. Lanjut phase satu per satu dari `prompts/02_PHASE_PROMPTS.md`. Review hasil tiap phase sebelum lanjut.
6. Phase terakhir: jalankan `prompts/03_FINAL_REVIEW_PROMPT.md`.

## Yang tidak bisa dilakukan agent
Buat akun/project Supabase, buat API key, set env di Vercel, login GitHub. Agent harus berhenti dan minta kamu.
