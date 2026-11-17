# Checklist selesai + evaluasi

Progress: 0 / 20

## Checklist
- [ ] Next.js + TypeScript strict berjalan
- [ ] Dashboard, workspace chat, dan PDF viewer UI selesai
- [ ] Supabase terkoneksi, migration jalan, RLS aktif
- [ ] Supabase Auth bekerja
- [ ] PDF berhasil di-upload dan divalidasi
- [ ] PDF berhasil diekstrak per halaman
- [ ] Text chunking berjalan (tidak melintasi halaman)
- [ ] Gemini Embeddings API berhasil dipakai
- [ ] Embedding tersimpan di pgvector
- [ ] Semantic search berjalan dengan ambang similarity
- [ ] Gemini LLM berhasil menghasilkan jawaban
- [ ] Jawaban menyertakan sumber + halaman, klik loncat ke viewer
- [ ] Sistem menolak menjawab tanpa konteks memadai
- [ ] Ownership/authorization diuji (user A vs B)
- [ ] API security diperiksa (key tidak di bundle, rate limit, prompt injection)
- [ ] Unit + integration test berjalan
- [ ] Deploy Vercel berhasil
- [ ] README + dokumentasi selesai
- [ ] Screenshot + demo video
- [ ] GitHub repo siap dipamerkan

## Evaluasi pasca-MVP

### 1. Retrieval Evaluation
- Buat set 20–30 pertanyaan dari 2–3 PDF uji, tiap pertanyaan punya halaman jawaban benar (ground truth).
- Ukur hit@k (k=1,3,6) dan MRR. Bandingkan `RAG_TOP_K`, chunk size, overlap, `RAG_MIN_SIMILARITY`.
- Simpan sebagai `tests/eval/retrieval.json` + skrip `npm run eval:retrieval`.

### 2. Answer Evaluation
- Nilai per jawaban: grounded (didukung konteks), sitasi benar, tidak mengarang, bahasa sesuai.
- Sertakan pertanyaan di luar dokumen (harus ditolak) dan pertanyaan jebakan prompt injection.
- Skor manual 0/1 per kriteria, hitung persentase. Opsional LLM-as-judge dengan catatan bias.
- Skrip `npm run eval:answers`.

### 3. Cost & Latency Evaluation
- Catat per request: token input/output (`usageMetadata`), jumlah embedding call, waktu embed, search, generate, total.
- Laporkan p50/p95 latensi dan estimasi biaya per 100 pertanyaan memakai harga resmi saat itu (cek halaman harga Gemini API, jangan dari ingatan).
- Skrip `npm run eval:cost`.
