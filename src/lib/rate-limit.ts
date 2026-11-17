import { AppError } from '@/lib/errors/app-error';

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * In-memory sliding-window rate limiter keyed by namespace + user ID.
 *
 * Serverless limitation: In multi-instance / serverless deployments (e.g. Vercel),
 * each warm isolate maintains its own in-memory Map, so limits are per-isolate
 * rather than globally synchronized. Replace with Redis/Upstash when strict
 * cross-instance enforcement is required.
 */
export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = options.now ?? Date.now();
  const windowStart = now - options.windowMs;
  const bucketKey = `${options.namespace}:${options.key}`;

  const existing = store.get(bucketKey);
  const activeTimestamps = existing
    ? existing.timestamps.filter((ts) => ts > windowStart)
    : [];

  if (activeTimestamps.length >= options.limit) {
    const oldest = activeTimestamps[0] ?? now;
    store.set(bucketKey, { timestamps: activeTimestamps });
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldest + options.windowMs,
    };
  }

  activeTimestamps.push(now);
  store.set(bucketKey, { timestamps: activeTimestamps });

  const oldest = activeTimestamps[0] ?? now;
  return {
    allowed: true,
    remaining: Math.max(0, options.limit - activeTimestamps.length),
    resetAt: oldest + options.windowMs,
  };
}

export function enforceRateLimit(
  options: RateLimitOptions,
  message = 'Too many requests. Please wait a moment before trying again.',
): void {
  const result = checkRateLimit(options);
  if (!result.allowed) {
    throw new AppError('RATE_LIMITED', message, 429);
  }
}

/**
 * Cross-instance rate limiter that uses Upstash Redis REST when
 * `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set,
 * and falls back to the in-memory sliding-window store otherwise.
 */
export async function enforceRateLimitAsync(
  options: RateLimitOptions,
  message = 'Too many requests. Please wait a moment before trying again.',
): Promise<void> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!upstashUrl || !upstashToken) {
    enforceRateLimit(options, message);
    return;
  }

  const windowSec = Math.max(1, Math.ceil(options.windowMs / 1000));
  const redisKey = `rl:${options.namespace}:${options.key}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const res = await fetch(`${upstashUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['EXPIRE', redisKey, windowSec, 'NX'],
      ]),
      signal: controller.signal,
    });

    if (!res.ok) {
      enforceRateLimit(options, message);
      return;
    }

    const payload = (await res.json()) as Array<{ result?: number }>;
    const count = payload?.[0]?.result;
    if (typeof count === 'number' && count > options.limit) {
      throw new AppError('RATE_LIMITED', message, 429);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    // Fail open to in-memory limiter if Upstash is unreachable
    enforceRateLimit(options, message);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function resetRateLimitStore(): void {
  store.clear();
}
