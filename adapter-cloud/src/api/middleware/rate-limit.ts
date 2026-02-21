/**
 * In-memory rate limiter middleware.
 *
 * Enforces per-API-key limits:
 *   - 10 investigations / minute  (POST /investigate)
 *   - 100 queries / minute        (all other endpoints)
 *
 * Uses a sliding-window counter stored in a Map.  Entries are lazily pruned.
 */

import type { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WindowEntry {
  timestamps: number[];
}

interface RateLimitConfig {
  /** Maximum requests allowed per window */
  max: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const buckets = new Map<string, WindowEntry>();

const INVESTIGATION_LIMIT: RateLimitConfig = { max: 10, windowMs: 60_000 };
const QUERY_LIMIT: RateLimitConfig = { max: 100, windowMs: 60_000 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBucketKey(apiKeyOrIdentity: string, category: string): string {
  return `${apiKeyOrIdentity}:${category}`;
}

function pruneAndCount(entry: WindowEntry, now: number, windowMs: number): number {
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
  return entry.timestamps.length;
}

// ---------------------------------------------------------------------------
// Middleware factories
// ---------------------------------------------------------------------------

function createRateLimiter(config: RateLimitConfig, category: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const identity = req.user?.apiKey ?? req.user?.identity ?? req.ip ?? 'anonymous';
    const key = getBucketKey(identity, category);
    const now = Date.now();

    let entry = buckets.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      buckets.set(key, entry);
    }

    const count = pruneAndCount(entry, now, config.windowMs);

    if (count >= config.max) {
      const retryAfter = Math.ceil(config.windowMs / 1000);
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        error: 'Rate limit exceeded',
        limit: config.max,
        window_seconds: config.windowMs / 1000,
        category,
        retry_after_seconds: retryAfter,
      });
      return;
    }

    entry.timestamps.push(now);
    next();
  };
}

/** Rate limiter for investigation endpoints — 10 req/min per key. */
export const investigationRateLimit = createRateLimiter(INVESTIGATION_LIMIT, 'investigation');

/** Rate limiter for query/general endpoints — 100 req/min per key. */
export const queryRateLimit = createRateLimiter(QUERY_LIMIT, 'query');
