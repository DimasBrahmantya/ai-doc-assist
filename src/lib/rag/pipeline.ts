import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateAnswer, type TokenUsage } from '@/lib/gemini/generate';
import {
  buildPrompt,
  NOT_ENOUGH_INFO_ANSWER,
  parseCitations,
  RAG_SYSTEM_INSTRUCTION,
} from './prompt';
import { retrieveChunks } from './retrieve';
import type { ChatHistoryTurn, RetrievedChunk, ValidatedSource } from './types';

const MAX_REWRITE_HISTORY_TURNS = 4;

const REWRITE_SYSTEM_INSTRUCTION = [
  'Given a conversation history and a follow-up question, rewrite the follow-up question into a concise standalone search query.',
  'Resolve pronouns and implicit references using the history.',
  'Do NOT answer the question. Output ONLY the rewritten standalone query in the same language as the follow-up question.',
].join('\n');

export interface RagPipelineResult {
  answer: string;
  sources: ValidatedSource[];
  usage: TokenUsage | null;
  standaloneQuery: string;
  insufficientInfo: boolean;
}

export interface RagPipelineDeps {
  rewriteQuestion?: (
    question: string,
    history: ChatHistoryTurn[],
  ) => Promise<string>;
  retrieve?: (
    supabase: SupabaseClient,
    params: { documentId: string; query: string },
  ) => Promise<RetrievedChunk[]>;
  generate?: (
    systemInstruction: string,
    userPrompt: string,
  ) => Promise<{ text: string; usage: TokenUsage | null }>;
}

/**
 * Rewrites a follow-up question into a standalone query using the last few
 * conversation turns via a low-temperature Gemini call.
 *
 * Choice rationale: A lightweight Gemini rewrite handles multilingual
 * (English/Indonesian) pronouns and implicit references ("it", "that section",
 * "berapa biayanya?") much more reliably than regex heuristics, skips the call
 * entirely on first-turn questions, and falls back to the raw question on error.
 */
export async function rewriteFollowUpQuestion(
  question: string,
  history: ChatHistoryTurn[],
): Promise<string> {
  const trimmed = question.trim();
  if (history.length === 0) {
    return trimmed;
  }

  const recent = history.slice(-MAX_REWRITE_HISTORY_TURNS);
  const formattedHistory = recent
    .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
    .join('\n');

  const prompt = `Conversation history:\n${formattedHistory}\n\nFollow-up question: ${trimmed}`;

  try {
    const result = await generateAnswer(REWRITE_SYSTEM_INSTRUCTION, prompt, {
      temperature: 0,
      maxOutputTokens: 120,
    });
    return result.text.trim() || trimmed;
  } catch {
    // Graceful fallback: retrieval still works with the original question
    return trimmed;
  }
}

/**
 * Orchestrates the end-to-end RAG pipeline:
 * 1. Rewrite follow-up question (if prior history exists)
 * 2. Retrieve relevant document chunks via pgvector
 * 3. Short-circuit with "not enough information" if no chunk passes threshold
 * 4. Build grounded prompt and call Gemini
 * 5. Parse and validate [p.N] citations against sent chunks
 */
export async function runRagPipeline(
  supabase: SupabaseClient,
  params: {
    documentId: string;
    question: string;
    history?: ChatHistoryTurn[];
  },
  deps: RagPipelineDeps = {},
): Promise<RagPipelineResult> {
  const history = params.history ?? [];
  const rewrite = deps.rewriteQuestion ?? rewriteFollowUpQuestion;
  const retrieve = deps.retrieve ?? retrieveChunks;
  const generate = deps.generate ?? generateAnswer;

  const standaloneQuery =
    history.length > 0
      ? await rewrite(params.question, history)
      : params.question.trim();

  const chunks = await retrieve(supabase, {
    documentId: params.documentId,
    query: standaloneQuery,
  });

  if (chunks.length === 0) {
    return {
      answer: NOT_ENOUGH_INFO_ANSWER,
      sources: [],
      usage: null,
      standaloneQuery,
      insufficientInfo: true,
    };
  }

  const userPrompt = buildPrompt(chunks, params.question);
  const generated = await generate(RAG_SYSTEM_INSTRUCTION, userPrompt);
  const { answer, sources } = parseCitations(generated.text, chunks);

  return {
    answer: answer || NOT_ENOUGH_INFO_ANSWER,
    sources,
    usage: generated.usage,
    standaloneQuery,
    insufficientInfo: false,
  };
}
