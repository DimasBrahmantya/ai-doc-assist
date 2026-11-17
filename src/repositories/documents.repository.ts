import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DocumentRow, DocumentStatus } from '@/lib/supabase/types';

export interface CreateDocumentInput {
  id?: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  contentHash?: string | null;
  status?: DocumentStatus;
}

export const documentsRepository = {
  async listByUser(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<DocumentRow[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as DocumentRow[];
  },

  async findByIdForUser(
    supabase: SupabaseClient,
    documentId: string,
    userId: string,
  ): Promise<DocumentRow | null> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return (data as DocumentRow | null) ?? null;
  },

  async findByHashForUser(
    supabase: SupabaseClient,
    userId: string,
    contentHash: string,
  ): Promise<DocumentRow | null> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .eq('content_hash', contentHash)
      .maybeSingle();

    if (error) throw error;
    return (data as DocumentRow | null) ?? null;
  },

  async create(
    supabase: SupabaseClient,
    input: CreateDocumentInput,
  ): Promise<DocumentRow> {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        ...(input.id ? { id: input.id } : {}),
        user_id: input.userId,
        file_name: input.fileName,
        file_size: input.fileSize,
        mime_type: input.mimeType,
        storage_path: input.storagePath,
        content_hash: input.contentHash ?? null,
        status: input.status ?? 'uploaded',
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as DocumentRow;
  },

  async updateStatusForUser(
    supabase: SupabaseClient,
    documentId: string,
    userId: string,
    status: DocumentStatus,
    extra?: { errorMessage?: string | null; totalPages?: number | null },
  ): Promise<DocumentRow | null> {
    const { data, error } = await supabase
      .from('documents')
      .update({
        status,
        ...(extra?.errorMessage !== undefined
          ? { error_message: extra.errorMessage }
          : {}),
        ...(extra?.totalPages !== undefined
          ? { total_pages: extra.totalPages }
          : {}),
      })
      .eq('id', documentId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return (data as DocumentRow | null) ?? null;
  },

  async acquireProcessingLock(
    supabase: SupabaseClient,
    documentId: string,
    userId: string,
  ): Promise<DocumentRow | null> {
    const { data, error } = await supabase
      .from('documents')
      .update({
        status: 'processing',
        error_message: null,
      })
      .eq('id', documentId)
      .eq('user_id', userId)
      .in('status', ['uploaded', 'failed'])
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return (data as DocumentRow | null) ?? null;
  },

  async deleteForUser(
    supabase: SupabaseClient,
    documentId: string,
    userId: string,
  ): Promise<DocumentRow | null> {
    const { data, error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return (data as DocumentRow | null) ?? null;
  },
};
