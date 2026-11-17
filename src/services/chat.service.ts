import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';
import { AppError } from '@/lib/errors/app-error';
import type { TokenUsage } from '@/lib/gemini/generate';
import { runRagPipeline } from '@/lib/rag/pipeline';
import type { ChatHistoryTurn, ValidatedSource } from '@/lib/rag/types';
import { enforceRateLimitAsync } from '@/lib/rate-limit';
import type { MessageRow } from '@/lib/supabase/types';
import { conversationsRepository } from '@/repositories/conversations.repository';
import { documentsRepository } from '@/repositories/documents.repository';
import { messagesRepository } from '@/repositories/messages.repository';

const CHAT_RATE_WINDOW_MS = 60_000;
const MAX_HISTORY_TURNS = 6;

export interface SendChatMessageResult {
  userMessage: MessageRow;
  assistantMessage: MessageRow;
  sources: ValidatedSource[];
  usage: TokenUsage | null;
  insufficientInfo: boolean;
}

export const chatService = {
  async sendMessage(
    supabase: SupabaseClient,
    userId: string,
    input: { conversationId: string; message: string },
  ): Promise<SendChatMessageResult> {
    const startMs = Date.now();
    const env = getServerEnv();
    console.info('[chat] 1. start');

    await enforceRateLimitAsync(
      {
        namespace: 'chat',
        key: userId,
        limit: env.RATE_LIMIT_CHAT_PER_MIN,
        windowMs: CHAT_RATE_WINDOW_MS,
      },
      'Too many chat messages. Please wait a minute before sending another.',
    );

    const conversation = await conversationsRepository.findByIdForUser(
      supabase,
      input.conversationId,
      userId,
    );
    if (!conversation) {
      throw new AppError('NOT_FOUND', 'Conversation not found', 404);
    }

    const [document, existingMessages] = await Promise.all([
      documentsRepository.findByIdForUser(
        supabase,
        conversation.document_id,
        userId,
      ),
      messagesRepository.listByConversationForUser(
        supabase,
        conversation.id,
        userId,
      ),
    ]);
    if (!document) {
      throw new AppError('NOT_FOUND', 'Document not found', 404);
    }

    if (document.status !== 'ready') {
      throw new AppError(
        'CONFLICT',
        'Document is not ready for chat yet.',
        409,
      );
    }

    const history: ChatHistoryTurn[] = existingMessages
      .slice(-MAX_HISTORY_TURNS)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    const userMessage = await messagesRepository.create(supabase, {
      conversationId: conversation.id,
      role: 'user',
      content: input.message,
    });
    console.info(`[chat] 2. userMsg saved (${Date.now() - startMs}ms)`);

    const ragStartMs = Date.now();
    const ragResult = await runRagPipeline(supabase, {
      documentId: document.id,
      question: input.message,
      history,
    });
    const ragMs = Date.now() - ragStartMs;

    const assistantMessage = await messagesRepository.create(supabase, {
      conversationId: conversation.id,
      role: 'assistant',
      content: ragResult.answer,
      sources: ragResult.sources,
    });

    console.info(
      `[chat] total=${Date.now() - startMs}ms rag=${ragMs}ms sources=${ragResult.sources.length} insufficient=${ragResult.insufficientInfo}`,
    );

    return {
      userMessage,
      assistantMessage,
      sources: ragResult.sources,
      usage: ragResult.usage,
      insufficientInfo: ragResult.insufficientInfo,
    };
  },
};
