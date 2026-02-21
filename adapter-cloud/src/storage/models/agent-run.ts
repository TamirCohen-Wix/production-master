import { query } from '../db.js';

export interface AgentRun {
  id: string;
  investigation_id: string;
  agent_name: string;
  phase: string;
  model: string;
  status: string;
  input_tokens: number;
  output_tokens: number;
  duration_ms: number;
  output_path: string | null;
  error: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAgentRunInput {
  investigation_id: string;
  agent_name: string;
  phase: string;
  model: string;
  status?: string;
}

export async function create(input: CreateAgentRunInput): Promise<AgentRun> {
  const { rows } = await query<AgentRun>(
    `INSERT INTO agent_runs (investigation_id, agent_name, phase, model, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.investigation_id,
      input.agent_name,
      input.phase,
      input.model,
      input.status ?? 'pending',
    ],
  );
  return rows[0];
}

export async function getByInvestigation(investigationId: string): Promise<AgentRun[]> {
  const { rows } = await query<AgentRun>(
    'SELECT * FROM agent_runs WHERE investigation_id = $1 ORDER BY created_at ASC',
    [investigationId],
  );
  return rows;
}

export async function updateStatus(
  id: string,
  status: string,
  error?: string,
): Promise<AgentRun | null> {
  const { rows } = await query<AgentRun>(
    `UPDATE agent_runs
     SET status = $1, error = $2, updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [status, error ?? null, id],
  );
  return rows[0] ?? null;
}

export async function updateTokens(
  id: string,
  inputTokens: number,
  outputTokens: number,
  durationMs: number,
  outputPath?: string,
): Promise<AgentRun | null> {
  const { rows } = await query<AgentRun>(
    `UPDATE agent_runs
     SET input_tokens = $1, output_tokens = $2, duration_ms = $3, output_path = $4, updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [inputTokens, outputTokens, durationMs, outputPath ?? null, id],
  );
  return rows[0] ?? null;
}
