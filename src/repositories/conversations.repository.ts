import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConversationRow } from '@/lib/supabase/types';

export const conversationsRepository = {
  async listByUser(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<ConversationRow[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as ConversationRow[];
  },

  async findByIdForUser(
    supabase: SupabaseClient,
    conversationId: string,
    userId: string,
  ): Promise<ConversationRow | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return (data as ConversationRow | null) ?? null;
  },

  async create(
    supabase: SupabaseClient,
    input: { userId: string; documentId: string; title?: string },
  ): Promise<ConversationRow> {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: input.userId,
        document_id: input.documentId,
        title: input.title ?? 'New Conversation',
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as ConversationRow;
  },

  async updateTitleForUser(
    supabase: SupabaseClient,
    conversationId: string,
    userId: string,
    title: string,
  ): Promise<ConversationRow | null> {
    const { data, error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return (data as ConversationRow | null) ?? null;
  },

  async deleteForUser(
    supabase: SupabaseClient,
    conversationId: string,
    userId: string,
  ): Promise<ConversationRow | null> {
    const { data, error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return (data as ConversationRow | null) ?? null;
  },

  async deleteByDocumentForUser(
    supabase: SupabaseClient,
    documentId: string,
    userId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('document_id', documentId)
      .eq('user_id', userId);

    if (error) throw error;
  },
};
