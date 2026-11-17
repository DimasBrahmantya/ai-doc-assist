export type DocumentStatus = 'uploaded' | 'processing' | 'ready' | 'failed';
export type MessageRole = 'user' | 'assistant';

export interface DocumentRow {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  content_hash: string | null;
  status: DocumentStatus;
  error_message: string | null;
  total_pages: number | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunkRow {
  id: string;
  document_id: string;
  user_id: string;
  chunk_index: number;
  page_number: number;
  content: string;
  embedding: string | number[];
  created_at: string;
}

export interface ConversationRow {
  id: string;
  user_id: string;
  document_id: string;
  title: string;
  created_at: string;
}

export interface MessageSourceJson {
  chunkId: string;
  page: number;
  snippet: string;
  similarity?: number;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  sources: MessageSourceJson[] | null;
  created_at: string;
}

export interface MatchedChunkRow {
  id: string;
  chunk_index: number;
  page_number: number;
  content: string;
  similarity: number;
}
