import { query } from '../db.js';

export interface DomainConfig {
  id: string;
  repo: string;
  config: Record<string, unknown>;
  claude_md: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDomainConfigInput {
  repo: string;
  config: Record<string, unknown>;
  claude_md?: string;
}

export async function create(input: CreateDomainConfigInput): Promise<DomainConfig> {
  const { rows } = await query<DomainConfig>(
    `INSERT INTO domain_configs (repo, config, claude_md)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.repo, JSON.stringify(input.config), input.claude_md ?? ''],
  );
  return rows[0];
}

export async function getByRepo(repo: string): Promise<DomainConfig | null> {
  const { rows } = await query<DomainConfig>(
    'SELECT * FROM domain_configs WHERE repo = $1',
    [repo],
  );
  return rows[0] ?? null;
}

export async function update(
  id: string,
  input: { config?: Record<string, unknown>; claude_md?: string },
): Promise<DomainConfig | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (input.config !== undefined) {
    sets.push(`config = $${paramIdx++}`);
    params.push(JSON.stringify(input.config));
  }
  if (input.claude_md !== undefined) {
    sets.push(`claude_md = $${paramIdx++}`);
    params.push(input.claude_md);
  }

  if (sets.length === 0) return getById(id);

  sets.push('updated_at = NOW()');
  params.push(id);

  const { rows } = await query<DomainConfig>(
    `UPDATE domain_configs SET ${sets.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
    params,
  );
  return rows[0] ?? null;
}

export async function list(): Promise<DomainConfig[]> {
  const { rows } = await query<DomainConfig>(
    'SELECT * FROM domain_configs ORDER BY repo ASC',
  );
  return rows;
}

async function getById(id: string): Promise<DomainConfig | null> {
  const { rows } = await query<DomainConfig>(
    'SELECT * FROM domain_configs WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}
