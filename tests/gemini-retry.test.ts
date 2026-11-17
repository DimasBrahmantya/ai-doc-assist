import { describe, expect, it, vi } from 'vitest';
import { isRetryableError, withRetry } from '@/lib/gemini/retry';

describe('Gemini retry & backoff', () => {
  it('classifies 429 and 5xx as retryable, 400/401/403/404 as non-retryable', () => {
    expect(isRetryableError({ status: 429 })).toBe(true);
    expect(isRetryableError({ status: 503 })).toBe(true);
    expect(isRetryableError(new Error('429 RESOURCE_EXHAUSTED'))).toBe(true);
    expect(isRetryableError({ status: 400 })).toBe(false);
    expect(isRetryableError({ status: 401 })).toBe(false);
    expect(isRetryableError({ status: 404 })).toBe(false);
  });

  it('returns immediately when fn succeeds on first attempt', async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn(async () => 'ok');

    const result = await withRetry(fn, { sleep });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries transient 429 errors with exponential backoff and succeeds', async () => {
    const delays: number[] = [];
    const sleep = vi.fn(async (ms: number) => {
      delays.push(ms);
    });
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw Object.assign(new Error('429 Too Many Requests'), { status: 429 });
      }
      return 'recovered';
    });

    const result = await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      sleep,
    });

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(delays).toHaveLength(2);
    expect(delays[0]).toBeGreaterThanOrEqual(100);
    expect(delays[1]).toBeGreaterThanOrEqual(200);
  });

  it('does not retry non-retryable 400 errors', async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn(async () => {
      throw Object.assign(new Error('Bad request'), { status: 400 });
    });

    await expect(withRetry(fn, { maxRetries: 3, sleep })).rejects.toThrow(
      'Bad request',
    );
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('throws after exhausting maxRetries', async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn(async () => {
      throw Object.assign(new Error('503 Unavailable'), { status: 503 });
    });

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 10, sleep }),
    ).rejects.toThrow('503 Unavailable');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('stops retrying immediately when AbortSignal is aborted', async () => {
    const controller = new AbortController();
    const fn = vi.fn(async () => {
      controller.abort();
      throw Object.assign(new Error('503 Unavailable'), { status: 503 });
    });

    await expect(
      withRetry(fn, { maxRetries: 3, baseDelayMs: 5000, signal: controller.signal }),
    ).rejects.toThrow('503 Unavailable');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
