/**
 * Request validation middleware using Zod schemas.
 *
 * Validates request bodies and returns 400 with structured error details
 * when validation fails.
 */

import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** POST /api/v1/investigate */
export const investigateSchema = z.object({
  ticket_id: z.string().min(1, 'ticket_id is required'),
  domain: z.string().optional(),
  mode: z.enum(['fast', 'balanced', 'deep']).optional().default('balanced'),
  callback_url: z.string().url('callback_url must be a valid URL').optional(),
});

/** POST /api/v1/query/logs */
export const queryLogsSchema = z.object({
  query: z.string().min(1, 'query is required'),
  service: z.string().optional(),
  time_range: z.object({
    from: z.string(),
    to: z.string(),
  }).optional(),
  limit: z.number().int().min(1).max(10000).optional().default(100),
});

/** POST /api/v1/query/slack */
export const querySlackSchema = z.object({
  query: z.string().min(1, 'query is required'),
  channel: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional().default(50),
});

/** POST /api/v1/query/changes */
export const queryChangesSchema = z.object({
  query: z.string().min(1, 'query is required'),
  repo: z.string().optional(),
  since: z.string().optional(),
  limit: z.number().int().min(1).max(500).optional().default(50),
});

/** Domain config body */
export const domainConfigSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  services: z.array(z.string()).optional().default([]),
  mcp_servers: z.array(z.string()).optional().default([]),
  settings: z.record(z.unknown()).optional().default({}),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InvestigateBody = z.infer<typeof investigateSchema>;
export type QueryLogsBody = z.infer<typeof queryLogsSchema>;
export type QuerySlackBody = z.infer<typeof querySlackSchema>;
export type QueryChangesBody = z.infer<typeof queryChangesSchema>;
export type DomainConfigBody = z.infer<typeof domainConfigSchema>;

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Returns Express middleware that validates `req.body` against the given
 * Zod schema.  On failure, responds with 400 and structured error details.
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
      return;
    }

    // Replace body with parsed (and defaulted) values
    req.body = result.data;
    next();
  };
}
