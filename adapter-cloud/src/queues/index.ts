/**
 * Shared BullMQ queue factory — lazy-initializes queues so they are
 * created after SDM config has been loaded via withStartup().
 */

import { Queue } from 'bullmq';
import { getRedisUrl } from '../config/wix-config.js';

const queues = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    queues.set(name, new Queue(name, { connection: { url: getRedisUrl() } }));
  }
  return queues.get(name)!;
}

/**
 * Gracefully close all cached queue connections.
 */
export async function closeAllQueues(): Promise<void> {
  for (const q of queues.values()) {
    await q.close();
  }
  queues.clear();
}
