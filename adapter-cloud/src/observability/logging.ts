/**
 * Structured JSON logger for production-master cloud pipeline.
 *
 * Every log line includes: timestamp, level, message, module,
 * and optional investigation_id / trace_id fields for correlation.
 */

import { createLogger as winstonCreateLogger, format, transports } from 'winston';
import type { Logger } from 'winston';
import { PanoramaTransport } from './panorama.js';

const { combine, timestamp, json, errors } = format;

/**
 * Minimum log level, controllable via LOG_LEVEL env variable.
 * Defaults to "info" in production, "debug" in development.
 */
const defaultLevel =
  process.env.LOG_LEVEL ??
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

/**
 * Create a structured JSON logger scoped to a logical module.
 *
 * Usage:
 * ```ts
 * const log = createLogger('orchestrator');
 * log.info('Investigation started', { investigation_id: '...', trace_id: '...' });
 * ```
 *
 * @param module — logical module name (e.g. "orchestrator", "mcp-client")
 */
export function createLogger(module: string): Logger {
  return winstonCreateLogger({
    level: defaultLevel,
    defaultMeta: { module },
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'ISO' }),
      // Ensure investigation_id and trace_id propagate through the JSON output
      format((info) => {
        // If these fields are passed in the meta object they will already
        // appear on `info`. We list them explicitly so that the type
        // contract is visible in every log line — they default to undefined
        // and JSON.stringify will omit undefined values automatically.
        info.investigation_id = info.investigation_id ?? undefined;
        info.trace_id = info.trace_id ?? undefined;
        return info;
      })(),
      json(),
    ),
    transports: [
      new transports.Console(),
      ...(process.env.LOG_TO_PANORAMA === 'true'
        ? [new PanoramaTransport({ serviceName: module })]
        : []),
    ],
  });
}
