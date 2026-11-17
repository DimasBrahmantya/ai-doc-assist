export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
  signal?: AbortSignal;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 10_000;

function createAbortError(signal?: AbortSignal): Error {
  if (signal?.reason instanceof Error) return signal.reason;
  const err = new Error('Operation aborted');
  err.name = 'AbortError';
  return err;
}

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(createAbortError(signal));
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(createAbortError(signal));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
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
 * Determines whether a Gemini / network error is transient and worth retrying.
 * Retries 429 (rate limit), 5xx, and transient network errors; skips 4xx client errors.
 */
export function isRetryableError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toUpperCase() : String(error).toUpperCase();

  // Do not retry daily/hard quota exhaustion; retrying only wastes time and quota
  if (
    message.includes('PERDAY') ||
    message.includes('PER DAY') ||
    message.includes('QUOTA EXCEEDED')
  ) {
    return false;
  }

  const status = extractStatusCode(error);
  if (status !== null) {
    return status === 429 || (status >= 500 && status < 600);
  }

  if (
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('RATE LIMIT') ||
    message.includes('TOO MANY REQUESTS') ||
    message.includes('UNAVAILABLE') ||
    message.includes('DEADLINE_EXCEEDED') ||
    message.includes('INTERNAL') ||
    message.includes('ECONNRESET') ||
    message.includes('ETIMEDOUT') ||
    message.includes('FETCH FAILED')
  ) {
    return true;
  }

  return false;
}

/**
 * Executes `fn` with exponential backoff + jitter on retryable errors.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const shouldRetry = options.shouldRetry ?? isRetryableError;
  const signal = options.signal;
  const sleep = options.sleep ?? ((ms: number) => defaultSleep(ms, signal));

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw createAbortError(signal);
    }
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (signal?.aborted || attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }
      const expDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const jitter = Math.floor(Math.random() * Math.max(1, expDelay * 0.25));
      await sleep(expDelay + jitter);
    }
  }

  throw lastError;
}
