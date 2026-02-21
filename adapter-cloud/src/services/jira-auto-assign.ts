import type { McpRegistry } from '../mcp/registry.js';
import { createLogger } from '../observability/index.js';

const log = createLogger('services:jira-auto-assign');
const GROUP_FIELD_CACHE_TTL_MS = 5 * 60_000;

type UnknownRecord = Record<string, unknown>;

interface JiraClientLike {
  listTools(): Promise<unknown[]>;
  callTool(toolName: string, args?: Record<string, unknown>): Promise<{ content: unknown[]; isError?: boolean }>;
}

export interface JiraAssignmentTarget {
  group: string;
  assignee_account_id?: string;
  assignee_email?: string;
}

export interface JiraAssignmentRule extends JiraAssignmentTarget {
  match_issue_types?: string[];
  match_keywords_any?: string[];
}

export interface JiraAssignmentConfig {
  enabled?: boolean;
  cc_bug_issue_types?: string[];
  group_field_name?: string;
  group_field_key?: string;
  rules?: JiraAssignmentRule[];
  default?: JiraAssignmentTarget;
}

export interface JiraAutoAssignInput {
  issueKey: string;
  issueType?: string;
  summary?: string;
  description?: string;
  assignment?: JiraAssignmentConfig;
}

export type JiraAutoAssignStatus = 'assigned' | 'fallback_assigned' | 'skipped' | 'failed';

export interface JiraAutoAssignResult {
  status: JiraAutoAssignStatus;
  ruleType?: 'rule' | 'default';
  ruleIndex?: number;
  groupFieldKey?: string;
  assigneeAccountId?: string;
  reason?: string;
  error?: string;
}

let cachedGroupField: { fieldName: string; fieldKey: string; expiresAt: number } | null = null;
let inFlightGroupFieldLookup: Promise<string | undefined> | null = null;
const toolNameCache = new Map<string, string>();

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function looksLikeCcBug(issueType: string | undefined, assignment: JiraAssignmentConfig): boolean {
  if (!issueType) return false;
  const expected = assignment.cc_bug_issue_types?.length
    ? assignment.cc_bug_issue_types
    : ['CC Bug'];
  const normalized = normalize(issueType);
  return expected.some((t) => normalize(t) === normalized);
}

function pickAssignmentTarget(
  assignment: JiraAssignmentConfig,
  issueType: string | undefined,
  summary: string,
  description: string,
): { target: JiraAssignmentTarget; ruleType: 'rule' | 'default'; ruleIndex?: number } | null {
  const issueTypeNorm = issueType ? normalize(issueType) : '';
  const text = `${summary}\n${description}`.toLowerCase();

  for (let i = 0; i < (assignment.rules ?? []).length; i += 1) {
    const rule = assignment.rules![i];
    const typeMatch = !rule.match_issue_types?.length
      || rule.match_issue_types.some((t) => normalize(t) === issueTypeNorm);
    const keywordMatch = !rule.match_keywords_any?.length
      || rule.match_keywords_any.some((k) => text.includes(k.toLowerCase()));
    if (typeMatch && keywordMatch) {
      return { target: rule, ruleType: 'rule', ruleIndex: i };
    }
  }

  if (assignment.default?.group) {
    return { target: assignment.default, ruleType: 'default' };
  }
  return null;
}

function extractTextContent(result: { content: unknown[] }): string {
  return (result.content ?? [])
    .map((c) => {
      if (!c || typeof c !== 'object') return '';
      const block = c as UnknownRecord;
      if (typeof block.text === 'string') return block.text;
      if (typeof block.data === 'string') return block.data;
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function parseJsonFromText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue searching for embedded JSON.
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      return null;
    }
  }

  const objectLike = trimmed.match(/\{[\s\S]*\}/);
  if (objectLike?.[0]) {
    try {
      return JSON.parse(objectLike[0]);
    } catch {
      return null;
    }
  }

  return null;
}

function findFieldKeyFromJson(payload: unknown, desiredFieldName: string): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;

  const queue: unknown[] = [payload];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }
    if (typeof current !== 'object') continue;

    const rec = current as UnknownRecord;
    const nameCandidates = [rec.name, rec.displayName, rec.fieldName]
      .filter((v): v is string => typeof v === 'string');
    const keyCandidates = [rec.key, rec.id, rec.fieldId]
      .filter((v): v is string => typeof v === 'string');

    if (nameCandidates.some((n) => normalize(n) === normalize(desiredFieldName))) {
      const fieldKey = keyCandidates.find((k) => /^customfield_\d+$/i.test(k)) ?? keyCandidates[0];
      if (fieldKey) return fieldKey;
    }

    for (const value of Object.values(rec)) {
      queue.push(value);
    }
  }

  return undefined;
}

function findFieldKeyFromText(text: string, desiredFieldName: string): string | undefined {
  const escaped = desiredFieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`${escaped}[\\s\\S]{0,120}?(customfield_\\d+)`, 'i'));
  return match?.[1];
}

async function resolveJiraToolName(client: JiraClientLike, suffix: string): Promise<string> {
  const cached = toolNameCache.get(suffix);
  if (cached) return cached;

  const tools = await client.listTools();
  const names = tools
    .map((t) => (t && typeof t === 'object' ? (t as UnknownRecord).name : undefined))
    .filter((n): n is string => typeof n === 'string');

  const exact = names.find((name) => name === suffix);
  if (exact) {
    toolNameCache.set(suffix, exact);
    return exact;
  }

  const endsWith = names.find((name) => name.endsWith(`__${suffix}`) || name.endsWith(suffix));
  if (endsWith) {
    toolNameCache.set(suffix, endsWith);
    return endsWith;
  }

  throw new Error(`Unable to resolve Jira MCP tool name for suffix "${suffix}"`);
}

async function callJiraTool(
  client: JiraClientLike,
  suffix: string,
  args: Record<string, unknown>,
): Promise<{ content: unknown[]; isError?: boolean }> {
  const name = await resolveJiraToolName(client, suffix);
  return client.callTool(name, args);
}

async function resolveGroupFieldKey(
  client: JiraClientLike,
  groupFieldName: string,
  fallbackKey?: string,
): Promise<string | undefined> {
  const now = Date.now();
  if (
    cachedGroupField
    && cachedGroupField.expiresAt > now
    && normalize(cachedGroupField.fieldName) === normalize(groupFieldName)
  ) {
    return cachedGroupField.fieldKey;
  }

  // Deduplicate concurrent field discovery calls during cold cache windows.
  if (!inFlightGroupFieldLookup) {
    inFlightGroupFieldLookup = (async () => {
      try {
        const result = await callJiraTool(client, 'list_fields', {});
        const text = extractTextContent(result);
        const parsed = parseJsonFromText(text);

        const fieldKey = findFieldKeyFromJson(parsed, groupFieldName) ?? findFieldKeyFromText(text, groupFieldName);
        if (fieldKey) {
          cachedGroupField = {
            fieldName: groupFieldName,
            fieldKey,
            expiresAt: now + GROUP_FIELD_CACHE_TTL_MS,
          };
          return fieldKey;
        }
      } catch (err) {
        log.warn('Failed to discover Jira Group field key', {
          error: err instanceof Error ? err.message : String(err),
          group_field_name: groupFieldName,
        });
      } finally {
        inFlightGroupFieldLookup = null;
      }
      return undefined;
    })();
  }

  const discovered = await inFlightGroupFieldLookup;
  return discovered ?? fallbackKey;
}

function extractAccountId(payload: unknown): string | undefined {
  if (!payload) return undefined;
  if (typeof payload === 'string') return undefined;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const candidate = extractAccountId(item);
      if (candidate) return candidate;
    }
    return undefined;
  }
  if (typeof payload !== 'object') return undefined;
  const rec = payload as UnknownRecord;
  const direct = rec.accountId ?? rec.account_id ?? rec.id;
  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }
  for (const value of Object.values(rec)) {
    const candidate = extractAccountId(value);
    if (candidate) return candidate;
  }
  return undefined;
}

async function resolveAssigneeAccountId(
  client: JiraClientLike,
  target: JiraAssignmentTarget,
): Promise<string | undefined> {
  if (target.assignee_account_id) return target.assignee_account_id;
  if (!target.assignee_email) return undefined;

  try {
    const result = await callJiraTool(client, 'get_user', { email: target.assignee_email });
    const text = extractTextContent(result);
    const parsed = parseJsonFromText(text);
    return extractAccountId(parsed) ?? extractAccountId(text);
  } catch (err) {
    log.warn('Failed to resolve Jira assignee account id from email', {
      assignee_email: target.assignee_email,
      error: err instanceof Error ? err.message : String(err),
    });
    // Continue with Group-only assignment when user resolution fails.
    return undefined;
  }
}

export function resetJiraAutoAssignCaches(): void {
  cachedGroupField = null;
  inFlightGroupFieldLookup = null;
  toolNameCache.clear();
}

export async function autoAssignJiraIssue(
  registry: McpRegistry,
  input: JiraAutoAssignInput,
): Promise<JiraAutoAssignResult> {
  const assignment = input.assignment;
  if (!assignment?.enabled) {
    return { status: 'skipped', reason: 'assignment disabled' };
  }

  if (!looksLikeCcBug(input.issueType, assignment)) {
    return { status: 'skipped', reason: 'issue type not configured for CC bug auto-assignment' };
  }

  const summary = input.summary ?? '';
  const description = input.description ?? '';
  const selected = pickAssignmentTarget(assignment, input.issueType, summary, description);
  if (!selected) {
    return { status: 'skipped', reason: 'no matching routing rule and no default route' };
  }

  try {
    const jiraClient = await registry.getClient('jira');
    const groupFieldName = assignment.group_field_name ?? 'Group';
    const groupFieldKey = await resolveGroupFieldKey(
      jiraClient,
      groupFieldName,
      assignment.group_field_key,
    );

    if (!groupFieldKey) {
      return { status: 'failed', reason: 'group field key could not be resolved' };
    }

    const assigneeAccountId = await resolveAssigneeAccountId(jiraClient, selected.target);
    const customFields: Record<string, unknown> = {
      [groupFieldKey]: selected.target.group,
    };

    const payload: Record<string, unknown> = {
      issueKey: input.issueKey,
      customFields,
    };

    if (assigneeAccountId) {
      // Keep both fields for compatibility with heterogeneous Jira server mappings.
      payload.assignee = { accountId: assigneeAccountId };
      customFields.assignee = { accountId: assigneeAccountId };
    }

    const updateResult = await callJiraTool(jiraClient, 'update-issue', payload);
    if (updateResult.isError) {
      return {
        status: 'failed',
        reason: 'jira update-issue returned an error',
        groupFieldKey,
        assigneeAccountId,
      };
    }

    return {
      status: selected.ruleType === 'rule' ? 'assigned' : 'fallback_assigned',
      ruleType: selected.ruleType,
      ruleIndex: selected.ruleIndex,
      groupFieldKey,
      assigneeAccountId,
    };
  } catch (err) {
    return {
      status: 'failed',
      reason: 'jira assignment call failed',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

