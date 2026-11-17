import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '@/lib/errors/app-error';
import type { ConversationRow, MessageRow } from '@/lib/supabase/types';
import { conversationsRepository } from '@/repositories/conversations.repository';
import { documentsRepository } from '@/repositories/documents.repository';
import { messagesRepository } from '@/repositories/messages.repository';

export const conversationsService = {
  async listConversations(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<ConversationRow[]> {
    return conversationsRepository.listByUser(supabase, userId);
  },

  async getConversationWithMessages(
    supabase: SupabaseClient,
    conversationId: string,
    userId: string,
  ): Promise<{ conversation: ConversationRow; messages: MessageRow[] }> {
    const conversation = await conversationsRepository.findByIdForUser(
      supabase,
      conversationId,
      userId,
    );
    if (!conversation) {
      throw new AppError('NOT_FOUND', 'Conversation not found', 404);
    }

    const messages = await messagesRepository.listByConversationForUser(
      supabase,
      conversationId,
      userId,
    );

    return { conversation, messages };
  },

  async createConversation(
    supabase: SupabaseClient,
    userId: string,
    input: { documentId: string; title?: string },
  ): Promise<ConversationRow> {
    const doc = await documentsRepository.findByIdForUser(
      supabase,
      input.documentId,
      userId,
    );
    if (!doc) {
      throw new AppError('NOT_FOUND', 'Document not found', 404);
    }

    return conversationsRepository.create(supabase, {
      userId,
      documentId: doc.id,
      title: input.title,
    });
  },

  async renameConversation(
    supabase: SupabaseClient,
    conversationId: string,
    userId: string,
    title: string,
  ): Promise<ConversationRow> {
    const updated = await conversationsRepository.updateTitleForUser(
      supabase,
      conversationId,
      userId,
      title,
    );
    if (!updated) {
      throw new AppError('NOT_FOUND', 'Conversation not found', 404);
    }
    return updated;
  },

  async deleteConversation(
    supabase: SupabaseClient,
    conversationId: string,
    userId: string,
  ): Promise<{ id: string }> {
    const deleted = await conversationsRepository.deleteForUser(
      supabase,
      conversationId,
      userId,
    );
    if (!deleted) {
      throw new AppError('NOT_FOUND', 'Conversation not found', 404);
    }
    return { id: deleted.id };
  },
};
