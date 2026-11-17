export interface RetrievedChunk {
  id: string;
  chunkIndex: number;
  pageNumber: number;
  content: string;
  similarity: number;
}

export interface ValidatedSource {
  page: number;
  chunkId: string;
  snippet: string;
  similarity: number;
}

export interface ChatHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}
