import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DocumentChunkRow, MatchedChunkRow } from '@/lib/supabase/types';

export interface InsertChunkInput {
  documentId: string;
  userId: string;
  chunkIndex: number;
  pageNumber: number;
  content: string;
  embedding: number[];
}

export const chunksRepository = {
  async insertBatch(
    supabase: SupabaseClient,
    chunks: InsertChunkInput[],
  ): Promise<void> {
    if (chunks.length === 0) return;
    const rows = chunks.map((c) => ({
      document_id: c.documentId,
      user_id: c.userId,
      chunk_index: c.chunkIndex,
      page_number: c.pageNumber,
      content: c.content,
      embedding: `[${c.embedding.join(',')}]`,
    }));

    const { error } = await supabase.from('document_chunks').insert(rows);
    if (error) throw error;
  },

  async listByDocumentForUser(
    supabase: SupabaseClient,
    documentId: string,
    userId: string,
  ): Promise<DocumentChunkRow[]> {
    const { data, error } = await supabase
      .from('document_chunks')
      .select('*')
      .eq('document_id', documentId)
      .eq('user_id', userId)
      .order('chunk_index', { ascending: true });

    if (error) throw error;
    return (data ?? []) as DocumentChunkRow[];
  },

  async matchChunks(
    supabase: SupabaseClient,
    params: {
      queryEmbedding: number[];
      documentId: string;
      matchCount: number;
      minSimilarity: number;
    },
  ): Promise<MatchedChunkRow[]> {
    const { data, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: `[${params.queryEmbedding.join(',')}]`,
      match_document_id: params.documentId,
      match_count: params.matchCount,
      min_similarity: params.minSimilarity,
    });

    if (error) throw error;
    return (data ?? []) as MatchedChunkRow[];
  },

  async deleteByDocumentForUser(
    supabase: SupabaseClient,
    documentId: string,
    userId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId)
      .eq('user_id', userId);

    if (error) throw error;
  },
};
