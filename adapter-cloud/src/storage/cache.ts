import Redis from 'ioredis';
import { getRedisUrl } from '../config/wix-config.js';

let _redis: Redis.default | undefined;

function getRedis(): Redis.default {
  if (!_redis) {
    _redis = new Redis.default(getRedisUrl(), {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    _redis.on('error', (err: Error) => {
      console.error('[cache] Redis error:', err.message);
    });
  }
  return _redis;
}

const KEY_PREFIX = 'pm:investigation:';
const DEFAULT_TTL_SECONDS = 3600; // 1 hour

export interface InvestigationState {
  id: string;
  status: string;
  phase: string;
  verdict?: string | null;
  confidence?: number | null;
  error?: string | null;
}

/**
 * Cache the current state of an investigation for fast reads.
 */
export async function setInvestigationState(
  investigationId: string,
  state: InvestigationState,
  ttl: number = DEFAULT_TTL_SECONDS,
): Promise<void> {
  await getRedis().set(
    `${KEY_PREFIX}${investigationId}`,
    JSON.stringify(state),
    'EX',
    ttl,
  );
}

/**
 * Retrieve cached investigation state.
 * Returns null on cache miss.
 */
export async function getInvestigationState(
  investigationId: string,
): Promise<InvestigationState | null> {
  const data = await getRedis().get(`${KEY_PREFIX}${investigationId}`);
  if (!data) return null;
  return JSON.parse(data) as InvestigationState;
}

/**
 * Invalidate cached investigation state.
 */
export async function deleteInvestigationState(
  investigationId: string,
): Promise<void> {
  await getRedis().del(`${KEY_PREFIX}${investigationId}`);
}

/**
 * Gracefully disconnect Redis (for clean process exit).
 */
export async function closeCache(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = undefined;
  }
}

/** @deprecated Use the cache functions instead of accessing redis directly. */
export const redis = new Proxy({} as Redis.default, {
  get(_target, prop, receiver) {
    return Reflect.get(getRedis(), prop, receiver);
  },
});
