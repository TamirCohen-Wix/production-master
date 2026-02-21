/**
 * ShutdownGuard — ensures in-flight tasks complete (or fail cleanly)
 * during container redeployment.
 *
 * Usage:
 *   const guard = new ShutdownGuard();
 *   await guard.run(() => expensiveWork());
 *   // On SIGINT, in-flight runs race against the shutdown timeout.
 */

import { createLogger } from '../observability/logging.js';

const log = createLogger('lifecycle:shutdown-guard');

export class ShutdownGuard {
  private _isShuttingDown = false;
  private readonly activeTasks = new Set<Promise<unknown>>();
  private readonly shutdownTimeoutMs: number;

  constructor(shutdownTimeoutMs = 30_000) {
    this.shutdownTimeoutMs = shutdownTimeoutMs;

    const onSignal = (signal: string) => {
      if (this._isShuttingDown) return;
      this._isShuttingDown = true;
      log.info(`Received ${signal} — draining ${this.activeTasks.size} in-flight task(s)`, {
        active_tasks: this.activeTasks.size,
        timeout_ms: this.shutdownTimeoutMs,
      });
      this.drain().then(() => process.exit(0)).catch(() => process.exit(1));
    };

    process.on('SIGINT', () => onSignal('SIGINT'));
    process.on('SIGTERM', () => onSignal('SIGTERM'));
  }

  /** True once a shutdown signal has been received. */
  get isShuttingDown(): boolean {
    return this._isShuttingDown;
  }

  /**
   * Run a task under the shutdown guard. If a shutdown signal arrives
   * while the task is running, the guard waits up to `shutdownTimeoutMs`
   * for it to finish before forcing exit.
   *
   * Throws if called after shutdown has started (caller should check
   * `isShuttingDown` first).
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this._isShuttingDown) {
      throw new Error('Cannot start new tasks — shutdown in progress');
    }

    const task = fn();
    this.activeTasks.add(task);

    try {
      return await task;
    } finally {
      this.activeTasks.delete(task);
    }
  }

  /**
   * Wait for all in-flight tasks to settle, bounded by the shutdown
   * timeout. Resolves once all tasks finish or the timeout fires.
   */
  private async drain(): Promise<void> {
    if (this.activeTasks.size === 0) {
      log.info('No in-flight tasks — exiting immediately');
      return;
    }

    const timeout = new Promise<void>((resolve) => {
      setTimeout(() => {
        log.warn('Shutdown timeout reached — forcing exit', {
          remaining_tasks: this.activeTasks.size,
        });
        resolve();
      }, this.shutdownTimeoutMs);
    });

    await Promise.race([
      Promise.allSettled([...this.activeTasks]).then(() => {
        log.info('All in-flight tasks completed before timeout');
      }),
      timeout,
    ]);
  }
}

/** Singleton instance shared across the application. */
export const shutdownGuard = new ShutdownGuard();
