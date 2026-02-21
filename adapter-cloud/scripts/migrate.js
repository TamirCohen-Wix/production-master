#!/usr/bin/env node

/**
 * migrate.js — Node.js migration runner for production-master.
 *
 * Reads SQL files from ../migrations/, tracks applied migrations in a
 * `_migrations` table, and applies unapplied ones in order within a
 * transaction.
 *
 * Usage:
 *   node scripts/migrate.js              # Apply pending migrations
 *   node scripts/migrate.js --dry-run    # Preview without applying
 *
 * Environment:
 *   DATABASE_URL                         # Full Postgres connection string
 *   — OR individual vars: —
 *   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
 */

import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, '..', 'migrations');

const dryRun = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.POSTGRES_HOST ?? 'localhost';
  const port = process.env.POSTGRES_PORT ?? '5432';
  const db = process.env.POSTGRES_DB ?? 'production_master';
  const user = process.env.POSTGRES_USER ?? 'production_master';
  const password = process.env.POSTGRES_PASSWORD ?? '';

  return `postgresql://${user}:${password}@${host}:${port}/${db}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const connectionString = getDatabaseUrl();
  const client = new pg.Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    // Ensure tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename  TEXT PRIMARY KEY,
        applied   TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Read migration files
    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found');
      return;
    }

    // Get already-applied migrations
    const { rows: applied } = await client.query(
      'SELECT filename FROM _migrations ORDER BY filename',
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    let applyCount = 0;
    let skipCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  SKIP  ${file}`);
        skipCount++;
        continue;
      }

      if (dryRun) {
        console.log(`  WOULD APPLY  ${file}`);
        applyCount++;
        continue;
      }

      console.log(`  APPLY ${file}...`);

      const sql = await readFile(resolve(MIGRATIONS_DIR, file), 'utf-8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file],
        );
        await client.query('COMMIT');
        applyCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  FAIL  ${file}: ${err.message}`);
        process.exit(1);
      }
    }

    const verb = dryRun ? 'would apply' : 'applied';
    console.log(`\nDone: ${applyCount} ${verb}, ${skipCount} skipped.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
