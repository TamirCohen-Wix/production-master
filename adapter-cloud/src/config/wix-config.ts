/**
 * Unified config reader — resolves configuration values from
 * Wix FunctionContext (SDM) when available, falling back to
 * process.env for local development.
 *
 * Usage:
 *   import { getConfig } from '../config/wix-config.js';
 *   const dbHost = getConfig('postgresHost', 'POSTGRES_HOST', 'localhost');
 */

let wixConfig: Record<string, string> | null = null;

/**
 * Initialize with Wix FunctionContext config map.
 * Called once during Serverless bootstrap.
 */
export function setWixConfig(config: Record<string, string>): void {
  wixConfig = config;
}

/**
 * Read a config value. Resolution order:
 * 1. Wix SDM config (if initialized via setWixConfig)
 * 2. process.env[envKey]
 * 3. defaultValue
 */
export function getConfig(sdmKey: string, envKey: string, defaultValue?: string): string {
  if (wixConfig && wixConfig[sdmKey] !== undefined) {
    return wixConfig[sdmKey];
  }
  return process.env[envKey] ?? defaultValue ?? '';
}

/**
 * Convenience: get the full Postgres connection string.
 */
export function getDatabaseUrl(): string {
  const host = getConfig('postgresHost', 'POSTGRES_HOST', 'localhost');
  const password = getConfig('postgresPassword', 'POSTGRES_PASSWORD', '');
  const port = process.env.POSTGRES_PORT ?? '5432';
  const db = process.env.POSTGRES_DB ?? 'production_master';
  const user = process.env.POSTGRES_USER ?? 'production_master';

  // If DATABASE_URL is explicitly set, use it directly
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  return `postgresql://${user}:${password}@${host}:${port}/${db}`;
}

/**
 * Convenience: get the Redis URL.
 */
export function getRedisUrl(): string {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  const host = getConfig('redisHost', 'REDIS_HOST', 'localhost');
  const password = getConfig('redisPassword', 'REDIS_PASSWORD', '');
  const port = process.env.REDIS_PORT ?? '6379';
  return password ? `redis://:${password}@${host}:${port}` : `redis://${host}:${port}`;
}

/**
 * Convenience: get the Anthropic API key.
 */
export function getAnthropicApiKey(): string {
  return getConfig('anthropicApiKey', 'ANTHROPIC_API_KEY', '');
}

/**
 * Convenience: get the JWT secret.
 */
export function getJwtSecret(): string {
  return getConfig('jwtSecret', 'JWT_SECRET', '');
}

/**
 * Convenience: get AWS credentials and S3 bucket.
 */
export function getAwsConfig(): { accessKeyId: string; secretAccessKey: string; bucket: string } {
  return {
    accessKeyId: getConfig('awsAccessKeyId', 'AWS_ACCESS_KEY_ID', ''),
    secretAccessKey: getConfig('awsSecretAccessKey', 'AWS_SECRET_ACCESS_KEY', ''),
    bucket: getConfig('s3Bucket', 'S3_REPORTS_BUCKET', 'production-master-reports'),
  };
}
