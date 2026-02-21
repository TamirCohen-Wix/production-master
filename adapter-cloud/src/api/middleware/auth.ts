/**
 * Authentication middleware — API key (x-api-key header) and JWT bearer token.
 *
 * API keys are loaded from the API_KEYS environment variable (comma-separated).
 * JWTs are verified using the JWT_SECRET env variable.
 * Attaches a `user` context object to the request on success.
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret as getJwtSecretConfig } from '../../config/wix-config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserContext {
  /** Authenticated identity (API key prefix or JWT subject) */
  identity: string;
  /** Authentication method used */
  authMethod: 'api_key' | 'jwt';
  /** Raw API key (for rate-limit bucketing) */
  apiKey?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadApiKeys(): Set<string> {
  const raw = process.env.API_KEYS ?? '';
  return new Set(raw.split(',').map((k) => k.trim()).filter(Boolean));
}

function getJwtSecret(): string | undefined {
  const secret = getJwtSecretConfig();
  return secret || undefined;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Express middleware that authenticates requests via:
 * 1. `x-api-key` header — checked against API_KEYS env
 * 2. `Authorization: Bearer <token>` — verified as JWT
 *
 * Returns 401 if neither mechanism succeeds.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // --- Try API key first ---
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (apiKey) {
    const validKeys = loadApiKeys();
    if (validKeys.has(apiKey)) {
      req.user = {
        identity: `key:${apiKey.slice(0, 8)}...`,
        authMethod: 'api_key',
        apiKey,
      };
      next();
      return;
    }
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  // --- Try JWT bearer token ---
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const secret = getJwtSecret();
    if (!secret) {
      res.status(500).json({ error: 'JWT authentication not configured' });
      return;
    }

    try {
      const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
      req.user = {
        identity: decoded.sub ?? 'unknown',
        authMethod: 'jwt',
      };
      next();
      return;
    } catch {
      res.status(401).json({ error: 'Invalid or expired JWT' });
      return;
    }
  }

  // --- No credentials ---
  res.status(401).json({ error: 'Authentication required. Provide x-api-key header or Bearer token.' });
}
