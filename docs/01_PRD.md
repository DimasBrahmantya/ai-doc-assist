# PRD — AI Document Assistant (RAG PDF Chatbot)

Versi 1.1 · Tipe: AI-powered web app · Target: portfolio Full Stack / AI Developer
Perubahan dari v1.0: LLM dan embedding pakai **Google Gemini API** (bukan OpenAI), tambah detail UI, batas, dan metrik.

## 1. Ringkasan
Aplikasi web untuk upload PDF lalu bertanya dengan bahasa natural. Sistem mencari potongan dokumen relevan (RAG), mengirim konteks ke LLM Gemini, dan menampilkan jawaban dengan sumber dokumen + nomor halaman.

Contoh: user upload SOP perusahaan, bertanya "Bagaimana prosedur pengajuan cuti?". Sistem cari bagian relevan -> ambil chunk -> kirim konteks ke LLM -> hasilkan jawaban -> tampilkan sumber halaman.

## 2. Tujuan
- Integrasi LLM API nyata (Gemini).
- Pipeline RAG lengkap: ingest, embed, retrieve, generate.
- Ekstraksi teks PDF dengan info halaman.
- Semantic search dengan vector embedding (pgvector).
- Jawaban grounded, bukan mengarang.
- Bukti integrasi API aman + manajemen database.

## 3. Target pengguna
- Mahasiswa menganalisis dokumen akademik.
- Profesional mereview dokumen bisnis.
- Karyawan mencari SOP/pedoman perusahaan.
- Siapa pun yang butuh info cepat dari PDF panjang.

## 4. Functional requirements

### FR-01 Upload dokumen
- Upload PDF. Validasi tipe, ukuran (default maks 10 MB), magic bytes `%PDF-`.
- Tolak file rusak, kosong, atau terenkripsi.
- Tampilkan status upload dan proses.
- Simpan metadata. Cegah duplikat per user via `content_hash`.

### FR-02 Pemrosesan dokumen
- Ekstrak teks per halaman, simpan nomor halaman.
- Bersihkan teks (whitespace, header/footer berulang, hyphenation).
- Chunking ~1200 karakter, overlap ~200, tidak melintasi batas halaman.
- Embedding per chunk (Gemini embedding, task type `RETRIEVAL_DOCUMENT`, batch).
- Simpan chunk + embedding ke pgvector.
- Jika PDF tanpa teks (scan): status `failed` dengan pesan jelas. OCR out of scope.

### FR-03 Manajemen dokumen
- Daftar dokumen + status (`uploaded`, `processing`, `ready`, `failed`).
- Hapus dokumen -> hapus chunk, percakapan, dan file di storage.
- Tolak akses ke dokumen milik user lain.

### FR-04 Chat AI
- Pilih dokumen, ajukan pertanyaan.
- Embed pertanyaan (task type `RETRIEVAL_QUERY`).
- Retrieve top-k chunk dengan ambang similarity.
- Susun konteks, kirim ke Gemini dengan system instruction anti-halusinasi.
- Tampilkan jawaban + sumber (file, halaman, cuplikan).
- Klik sumber -> PDF viewer loncat ke halaman itu.
- Jika konteks tidak cukup: jawab bahwa dokumen tidak memuat info tersebut.
- Jawab dalam bahasa yang dipakai user (Indonesia/Inggris).

### FR-05 Percakapan
- Simpan riwayat. Banyak pertanyaan per percakapan.
- Mulai percakapan baru. Konteks dokumen tetap per percakapan.
- Daftar percakapan dikelompokkan Today / Yesterday / Earlier, dengan pencarian.
- Rename dan hapus percakapan.
- Follow-up question memakai beberapa pesan terakhir sebagai konteks (query rewrite sederhana).

### FR-06 Error handling
- Gagal LLM, gagal embedding, error DB, upload invalid, rate limit (429 dari Gemini maupun limit sendiri).
- Retry dengan exponential backoff untuk error sementara (maks 3x).
- Pesan error mudah dipahami. Tanpa stack trace.

### FR-07 Autentikasi
- Supabase Auth (email/password; Google OAuth opsional).
- Semua route kecuali halaman login butuh sesi.

### FR-08 Aksi teks terpilih (nice-to-have, sesudah MVP inti)
- User pilih teks di PDF viewer -> toolbar mengambang: **Explain**, **Summarise**, **Rewrite**.
- Hasil muncul di chat sebagai pesan baru dengan referensi halaman.

## 5. Non-functional

### Performa
- Proses asinkron (status polling). Batch embedding.
- Jangan embed ulang dokumen yang sama (hash).
- Batasi ukuran konteks (top-k, maks karakter total).
- Indikator loading/processing di UI.
- Streaming jawaban: future enhancement.

### Keamanan
- API key server-side saja. Tidak ada secret di `NEXT_PUBLIC_*`.
- Validasi tipe, ukuran, isi file. Zod di semua endpoint.
- Auth + authorization. Ownership enforced di route dan RLS.
- Query terparameter.
- Rate limiting (chat dan upload).
- Prompt injection: isi dokumen diperlakukan sebagai data, dibungkus delimiter, system instruction melarang mengikuti perintah di dalamnya.
- Storage bucket private, akses lewat signed URL berumur pendek.

### Reliabilitas
- Tangani job gagal (`failed` + `error_message`), bisa retry manual.
- Cegah proses ganda (lock via status `processing`).
- Tracking status proses.

### Maintainability
- Arsitektur modular, TypeScript strict, komponen reusable.
- Business logic terpisah dari UI.

## 6. Tech stack
| Komponen | Teknologi |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Backend | Next.js Route Handlers, Node.js runtime, Zod |
| LLM | Google Gemini API (`@google/genai`), model dari env |
| Embedding | Gemini Embedding API (`gemini-embedding-001`, 768 dim) |
| Database | Supabase PostgreSQL + pgvector |
| Auth + Storage | Supabase Auth, Supabase Storage |
| PDF extract | `unpdf` atau `pdfjs-dist` (pilih yang stabil di serverless) |
| PDF viewer | `react-pdf` / `pdfjs-dist` |
| Testing | Vitest (unit/integration), Playwright (e2e opsional) |
| Deploy | Vercel, Supabase Cloud |

## 7. Desain database
Lihat `supabase/migrations/001_init.sql`. Tabel: `documents`, `document_chunks`, `conversations`, `messages`. Dimensi vector 768 harus sama dengan `GEMINI_EMBEDDING_DIM`.

## 8. API
| Method | Path | Fungsi |
|---|---|---|
| POST | /api/documents/upload | Upload PDF |
| GET | /api/documents | Daftar dokumen user |
| GET | /api/documents/:id | Detail dokumen |
| DELETE | /api/documents/:id | Hapus dokumen + chunk + file |
| POST | /api/documents/:id/process | Proses dokumen |
| GET | /api/documents/:id/file | Signed URL untuk viewer |
| POST | /api/chat | Tanya, hasilkan jawaban |
| GET | /api/conversations | Riwayat percakapan |
| POST | /api/conversations | Buat percakapan |
| PATCH | /api/conversations/:id | Rename |
| DELETE | /api/conversations/:id | Hapus |
| GET | /api/conversations/:id/messages | Pesan percakapan |

## 9. Alur RAG
Ingest: upload -> validasi -> ekstrak per halaman -> bersihkan -> chunk -> embed (batch) -> simpan -> status `ready`.
Tanya: terima pertanyaan -> validasi + ownership -> (rewrite follow-up) -> embed query -> vector search -> filter ambang -> bangun prompt -> Gemini -> jawaban + sumber -> simpan pesan.

## 10. Acceptance criteria
- Upload PDF valid berhasil. File invalid ditolak dengan pesan jelas.
- Teks terekstrak dengan nomor halaman benar.
- Embedding Gemini tergenerate dan tersimpan di pgvector.
- Retrieval mengembalikan chunk relevan.
- Jawaban memakai konteks dokumen dan mencantumkan halaman.
- Pertanyaan di luar dokumen -> jawaban "tidak cukup informasi".
- User A tidak bisa baca/hapus/tanya dokumen user B (diuji).
- API key tidak muncul di bundle client (diperiksa).
- Test inti lulus. Aplikasi ter-deploy dan bisa diakses.

## 11. Out of scope MVP
DOCX/XLSX, multi-provider LLM, voice, multi-dokumen cross-search, kolaborasi tim, pembayaran/kredit, OCR, agent orchestration. Elemen UI "credit" dan switcher multi-model dari desain referensi tidak dibuat.

## 12. Metrik sukses
Success rate proses PDF, retrieval relevance (hit@k), answer groundedness, latensi respons, token usage, error rate, test pass rate.

## 13. Future
Multi-document RAG, streaming, ringkasan percakapan, perbandingan dokumen, DOCX/XLSX, evaluation pipeline lanjutan, background queue, OCR, AI agent workflow.
