import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';
import { embedTexts } from '@/lib/gemini/embeddings';
import { chunksRepository } from '@/repositories/chunks.repository';
import { capChunksByChars, DEFAULT_MAX_CONTEXT_CHARS } from './prompt';
import type { RetrievedChunk } from './types';

export interface RetrieveChunksParams {
  documentId: string;
  query: string;
  topK?: number;
  minSimilarity?: number;
  maxContextChars?: number;
}

/**
 * Embeds the retrieval query using Gemini (`RETRIEVAL_QUERY`), queries
 * `match_document_chunks` with similarity threshold and top-k limits,
 * and caps the returned chunks to `maxContextChars`.
 */
export async function retrieveChunks(
  supabase: SupabaseClient,
  params: RetrieveChunksParams,
): Promise<RetrievedChunk[]> {
  const trimmedQuery = params.query.trim();
  if (!trimmedQuery) return [];

  const env = getServerEnv();
  const topK = params.topK ?? env.RAG_TOP_K;
  const minSimilarity = params.minSimilarity ?? env.RAG_MIN_SIMILARITY;
  const maxContextChars = params.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS;

  const [queryEmbedding] = await embedTexts([trimmedQuery], 'RETRIEVAL_QUERY');
  if (!queryEmbedding || queryEmbedding.length === 0) {
    return [];
  }

  const rows = await chunksRepository.matchChunks(supabase, {
    queryEmbedding,
    documentId: params.documentId,
    matchCount: topK,
    minSimilarity,
  });

  const chunks: RetrievedChunk[] = rows.map((row) => ({
    id: row.id,
    chunkIndex: row.chunk_index,
    pageNumber: row.page_number,
    content: row.content,
    similarity: row.similarity,
  }));

  return capChunksByChars(chunks, maxContextChars);
}
