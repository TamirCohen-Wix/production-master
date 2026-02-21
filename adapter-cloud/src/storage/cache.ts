import Redis from 'ioredis';
import { getRedisUrl } from '../config/wix-config.js';

const redis = new Redis.default(getRedisUrl(), {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err: Error) => {
  console.error('[cache] Redis error:', err.message);
});

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
  await redis.set(
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
  const data = await redis.get(`${KEY_PREFIX}${investigationId}`);
  if (!data) return null;
  return JSON.parse(data) as InvestigationState;
}

/**
 * Invalidate cached investigation state.
 */
export async function deleteInvestigationState(
  investigationId: string,
): Promise<void> {
  await redis.del(`${KEY_PREFIX}${investigationId}`);
}

/**
 * Gracefully disconnect Redis (for clean process exit).
 */
export async function closeCache(): Promise<void> {
  await redis.quit();
}

export { redis };
