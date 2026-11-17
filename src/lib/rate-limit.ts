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

export function resetRateLimitStore(): void {
  store.clear();
}
