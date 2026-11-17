import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MessageRole,
  MessageRow,
  MessageSourceJson,
} from '@/lib/supabase/types';

export const messagesRepository = {
  async listByConversationForUser(
    supabase: SupabaseClient,
    conversationId: string,
    userId: string,
  ): Promise<MessageRow[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, role, content, sources, created_at, conversations!inner(user_id)')
      .eq('conversation_id', conversationId)
      .eq('conversations.user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id as string,
      conversation_id: row.conversation_id as string,
      role: row.role as MessageRole,
      content: row.content as string,
      sources: (row.sources as MessageSourceJson[] | null) ?? null,
      created_at: row.created_at as string,
    }));
  },

  async create(
    supabase: SupabaseClient,
    input: {
      conversationId: string;
      role: MessageRole;
      content: string;
      sources?: MessageSourceJson[] | null;
    },
  ): Promise<MessageRow> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: input.conversationId,
        role: input.role,
        content: input.content,
        sources: input.sources ?? null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as MessageRow;
  },
};
