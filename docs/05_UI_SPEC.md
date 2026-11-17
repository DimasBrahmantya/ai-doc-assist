# UI Spec (mengacu gambar referensi AskYourPDF)

Gaya: SaaS bersih, modern. Rail hitam, area putih, aksen kuning, bubble chat user hitam, bubble bot putih dengan border tipis. Radius besar, shadow halus.

## Layout desktop (3 kolom)
1. **Icon rail** (hitam, ~72px): logo (atas), Chat, Developer/API (opsional), Upload, Tools (opsional), lalu Help, Settings, Profile, Logout (bawah). Badge angka pada ikon chat = jumlah percakapan.
2. **Conversation sidebar** (~280px): judul app, kotak "Search for conversation", tombol hitam `+ New Conversation`, daftar dikelompokkan `TODAY` / `YESTERDAY` / `EARLIER`. Item aktif ber-highlight abu, menu `...` (rename, delete). Judul panjang dipotong ellipsis.
3. **Workspace**:
   - Header: avatar bot + status online + "Document Assistant". Kanan: tombol `Documents`.
   - Banner abu: "Ask me about {fileName}. **View Doc**".
   - Split: kiri **PDF viewer**, kanan **chat**.
   - Bawah: toolbar viewer (zoom out, zoom in, search, select-text, "Page X of N"), tombol sapu kuning (clear/new chat), input "Ask any question about your document", tombol kirim (disabled saat kosong).

## Chat
- Pesan bot: avatar kecil, bubble putih, timestamp, aksi copy / like / dislike.
- Pesan user: bubble hitam rata kanan, ikon user, timestamp.
- Sitasi: chip `p.12` di bawah jawaban + cuplikan. Klik -> viewer loncat ke halaman, highlight sementara.
- State: loading (skeleton/typing dots), error (pesan + tombol coba lagi), empty (saran pertanyaan), "tidak cukup informasi".

## PDF viewer
- Render via pdf.js (`react-pdf`). Zoom in/out, navigasi halaman, search teks.
- Mode select-text: saat teks dipilih muncul toolbar mengambang `Explain` `Summarise` `Rewrite` (FR-08, sesudah MVP inti). Tooltip "Select a text".
- Sumber file: signed URL pendek dari `/api/documents/:id/file`.

## Halaman
- `/login`
- `/dashboard`: ringkasan (jumlah dokumen, percakapan terbaru, upload cepat).
- `/documents`: dropzone upload, tabel/kartu dokumen + StatusBadge (uploaded, processing dengan progress/polling, ready, failed + retry), hapus dengan konfirmasi.
- `/documents/[id]`: detail (metadata, halaman, status, tombol "Chat").
- `/chat/[conversationId]`: workspace di atas.

## Komponen
IconRail, ConversationSidebar, ConversationItem, AppHeader, DocBanner, UploadDropzone, DocumentList, StatusBadge, PdfViewer, PdfToolbar, SelectionToolbar, ChatMessage, ChatInput, SourceCitation, LoadingState, ErrorState, EmptyState, ConfirmDialog.

## Responsive
- Tablet: rail tetap, sidebar jadi drawer, split viewer/chat jadi tab.
- Mobile: rail jadi bottom nav atau menu, viewer dan chat berupa tab "Document | Chat", input sticky bawah.

## Tidak dibuat (sengaja)
Switcher model (GPT-4/Claude), saldo credit + Buy More Credit, language switcher. Boleh ditambah nanti. Sidebar tidak menampilkan nama model.

## Design tokens
Warna: `--bg #fff`, `--rail #000`, `--surface #f4f4f5`, `--accent #f5b800` (kuning), `--text #111`, `--muted #6b7280`, `--border #e5e7eb`. Font: Inter / Geist. Radius: 12–20px (bubble 20px). Definisikan sebagai CSS variable + Tailwind theme, jangan hardcode di komponen.
