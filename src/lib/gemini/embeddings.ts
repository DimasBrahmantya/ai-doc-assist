import 'server-only';
import { getServerEnv } from '@/lib/env';
import { AppError } from '@/lib/errors/app-error';
import { getGeminiClient } from './client';
import { withRetry } from './retry';

export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

const DEFAULT_EMBED_BATCH_SIZE = 50;

export interface EmbedTextsOptions {
  batchSize?: number;
}

/**
 * Generates embeddings for an array of texts in batches using Gemini's embedding model.
 * Uses retry with exponential backoff on transient failures (429 / 5xx).
 */
export async function embedTexts(
  texts: string[],
  taskType: EmbeddingTaskType,
  options: EmbedTextsOptions = {},
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const env = getServerEnv();
  const ai = getGeminiClient();
  const batchSize = Math.max(1, Math.min(options.batchSize ?? DEFAULT_EMBED_BATCH_SIZE, 100));
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const embeddings = await withRetry(async () => {
      const response = await ai.models.embedContent({
        model: env.GEMINI_EMBEDDING_MODEL,
        contents: batch,
        config: {
          taskType,
          outputDimensionality: env.GEMINI_EMBEDDING_DIM,
        },
      });

      const vectors = response.embeddings?.map((e) => e.values ?? []) ?? [];
      if (vectors.length !== batch.length) {
        throw new AppError(
          'INTERNAL_ERROR',
          `Embedding count mismatch: expected ${batch.length}, got ${vectors.length}`,
          500,
        );
      }

      for (const vec of vectors) {
        if (vec.length !== env.GEMINI_EMBEDDING_DIM) {
          throw new AppError(
            'INTERNAL_ERROR',
            `Embedding dimension mismatch: expected ${env.GEMINI_EMBEDDING_DIM}, got ${vec.length}`,
            500,
          );
        }
      }

      return vectors;
    });

    results.push(...embeddings);
  }

  return results;
}
