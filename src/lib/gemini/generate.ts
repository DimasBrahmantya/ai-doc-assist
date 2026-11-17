import 'server-only';
import { getServerEnv } from '@/lib/env';
import { AppError } from '@/lib/errors/app-error';
import { getGeminiClient } from './client';
import { withRetry } from './retry';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface GenerateAnswerResult {
  text: string;
  usage: TokenUsage | null;
}

export interface GenerateAnswerOptions {
  temperature?: number;
  maxOutputTokens?: number;
}

function extractStatusCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;
  const err = error as Record<string, unknown>;
  if (typeof err.status === 'number') return err.status;
  if (typeof err.statusCode === 'number') return err.statusCode;
  if (typeof err.code === 'number') return err.code;
  return null;
}

/**
 * Maps raw Gemini SDK / network errors into safe AppError instances
 * without exposing API keys, stack traces, or internal SDK details.
 */
export function mapGeminiError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const status = extractStatusCode(error);
  const message =
    error instanceof Error ? error.message.toUpperCase() : String(error).toUpperCase();

  if (
    status === 429 ||
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('RATE LIMIT') ||
    message.includes('TOO MANY REQUESTS')
  ) {
    return new AppError(
      'RATE_LIMITED',
      'AI service is temporarily busy. Please try again shortly.',
      429,
    );
  }

  if (
    status === 401 ||
    status === 403 ||
    message.includes('API_KEY_INVALID') ||
    message.includes('PERMISSION_DENIED') ||
    message.includes('UNAUTHENTICATED')
  ) {
    return new AppError(
      'INTERNAL_ERROR',
      'AI service configuration error. Please contact support.',
      500,
    );
  }

  if (
    status === 400 ||
    message.includes('INVALID_ARGUMENT')
  ) {
    return new AppError(
      'BAD_REQUEST',
      'Unable to process this request with the AI model.',
      400,
    );
  }

  return new AppError(
    'INTERNAL_ERROR',
    'Failed to generate AI response. Please try again.',
    500,
  );
}

/**
 * Generates a grounded response from Gemini using systemInstruction and userPrompt.
 * Retries transient 429/5xx errors and maps any remaining failure to a safe AppError.
 */
export async function generateAnswer(
  systemInstruction: string,
  userPrompt: string,
  options: GenerateAnswerOptions = {},
): Promise<GenerateAnswerResult> {
  const env = getServerEnv();
  const ai = getGeminiClient();

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: env.GEMINI_CHAT_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: options.temperature ?? 0.2,
          ...(options.maxOutputTokens !== undefined
            ? { maxOutputTokens: options.maxOutputTokens }
            : {}),
        },
      }),
    );

    const text = (response.text ?? '').trim();
    const meta = response.usageMetadata;
    const usage: TokenUsage | null = meta
      ? {
          promptTokens: meta.promptTokenCount ?? 0,
          completionTokens: meta.candidatesTokenCount ?? 0,
          totalTokens: meta.totalTokenCount ?? 0,
        }
      : null;

    return { text, usage };
  } catch (error) {
    console.error('[Gemini generateContent error]', error);
    throw mapGeminiError(error);
  }
}
