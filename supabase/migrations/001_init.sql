-- 001_init.sql — schema AI Document Assistant (Gemini embedding 768 dim)

create extension if not exists vector;

-- ========== documents ==========
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  file_name     varchar(255) not null,
  file_size     bigint not null check (file_size > 0),
  mime_type     varchar(100) not null,
  storage_path  text not null,
  content_hash  varchar(64),
  status        varchar(20) not null default 'uploaded'
                check (status in ('uploaded','processing','ready','failed')),
  error_message text,
  total_pages   integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index documents_user_idx on public.documents(user_id, created_at desc);
create unique index documents_user_hash_uq on public.documents(user_id, content_hash)
  where content_hash is not null;

-- ========== document_chunks ==========
create table public.document_chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  chunk_index  integer not null,
  page_number  integer not null,
  content      text not null,
  embedding    vector(768) not null,
  created_at   timestamptz not null default now(),
  unique (document_id, chunk_index)
);
create index chunks_doc_idx on public.document_chunks(document_id);
create index chunks_embedding_hnsw on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

-- ========== conversations ==========
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  title       varchar(200) not null default 'New Conversation',
  created_at  timestamptz not null default now()
);
create index conversations_user_idx on public.conversations(user_id, created_at desc);

-- ========== messages ==========
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role            varchar(10) not null check (role in ('user','assistant')),
  content         text not null,
  sources         jsonb,
  created_at      timestamptz not null default now()
);
create index messages_conv_idx on public.messages(conversation_id, created_at);

-- ========== updated_at trigger ==========
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

-- ========== RLS ==========
alter table public.documents       enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations   enable row level security;
alter table public.messages        enable row level security;

create policy documents_owner on public.documents
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy chunks_owner on public.document_chunks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy conversations_owner on public.conversations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy messages_owner on public.messages
  for all using (exists (select 1 from public.conversations c
                         where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.conversations c
                      where c.id = conversation_id and c.user_id = auth.uid()));

-- ========== vector search ==========
-- security invoker: RLS + filter user_id tetap berlaku.
create or replace function public.match_document_chunks(
  query_embedding vector(768),
  match_document_id uuid,
  match_count int default 6,
  min_similarity float default 0.0
)
returns table (
  id uuid, chunk_index int, page_number int, content text, similarity float
)
language sql stable security invoker as $$
  select c.id, c.chunk_index, c.page_number, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  where c.document_id = match_document_id
    and c.user_id = auth.uid()
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit least(match_count, 20);
$$;

-- ========== Storage (jalankan setelah bucket 'documents' dibuat, private) ==========
-- create policy "own files read"   on storage.objects for select using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
-- create policy "own files insert" on storage.objects for insert with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
-- create policy "own files delete" on storage.objects for delete using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
