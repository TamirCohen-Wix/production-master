import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  autoAssignJiraIssue,
  resetJiraAutoAssignCaches,
  type JiraAssignmentConfig,
} from '../../../src/services/jira-auto-assign.js';
import type { McpRegistry } from '../../../src/mcp/registry.js';

interface FakeToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

class FakeJiraClient {
  listToolsMock = vi.fn(async () => [
    { name: 'jira__list_fields' },
    { name: 'jira__get_user' },
    { name: 'jira__update-issue' },
  ]);

  callToolMock = vi.fn(
    async (toolName: string, args: Record<string, unknown>): Promise<FakeToolResult> => {
      if (toolName.endsWith('list_fields')) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify([
                { id: 'customfield_10126', name: 'Group' },
                { id: 'customfield_20000', name: 'Other Field' },
              ]),
            },
          ],
        };
      }
      if (toolName.endsWith('get_user')) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ accountId: 'acc-123', args }) }],
        };
      }
      if (toolName.endsWith('update-issue')) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ ok: true, args }) }],
        };
      }
      throw new Error(`Unexpected tool: ${toolName}`);
    },
  );

  async listTools(): Promise<unknown[]> {
    return this.listToolsMock();
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown> = {},
  ): Promise<{ content: unknown[]; isError?: boolean }> {
    return this.callToolMock(toolName, args);
  }
}

function makeRegistry(client: FakeJiraClient): McpRegistry {
  return {
    getClient: vi.fn(async () => client),
    listServers: vi.fn().mockReturnValue([]),
    healthCheck: vi.fn(),
    disconnectAll: vi.fn(),
  } as unknown as McpRegistry;
}

function assignmentConfig(): JiraAssignmentConfig {
  return {
    enabled: true,
    cc_bug_issue_types: ['CC Bug'],
    group_field_name: 'Group',
    rules: [
      {
        match_keywords_any: ['payment'],
        group: 'Pulse',
        assignee_email: 'pulse@wix.com',
      },
    ],
    default: {
      group: 'Bookeepers',
      assignee_email: 'triage@wix.com',
    },
  };
}

describe('autoAssignJiraIssue', () => {
  beforeEach(() => {
    resetJiraAutoAssignCaches();
  });

  it('skips when assignment is disabled', async () => {
    const client = new FakeJiraClient();
    const registry = makeRegistry(client);
    const result = await autoAssignJiraIssue(registry, {
      issueKey: 'PROD-1',
      issueType: 'CC Bug',
      assignment: { enabled: false },
    });

    expect(result.status).toBe('skipped');
    expect(client.callToolMock).not.toHaveBeenCalled();
  });

  it('skips when issue type is not configured as CC Bug', async () => {
    const client = new FakeJiraClient();
    const registry = makeRegistry(client);
    const result = await autoAssignJiraIssue(registry, {
      issueKey: 'PROD-2',
      issueType: 'Task',
      assignment: assignmentConfig(),
    });

    expect(result.status).toBe('skipped');
    expect(client.callToolMock).not.toHaveBeenCalled();
  });

  it('assigns based on matching rule and resolves user at runtime', async () => {
    const client = new FakeJiraClient();
    const registry = makeRegistry(client);

    const result = await autoAssignJiraIssue(registry, {
      issueKey: 'PROD-3',
      issueType: 'CC Bug',
      summary: 'Payment fails with 500',
      description: 'users fail on checkout',
      assignment: assignmentConfig(),
    });

    expect(result.status).toBe('assigned');
    expect(result.ruleType).toBe('rule');

    const updateCall = client.callToolMock.mock.calls.find((call) => call[0].endsWith('update-issue'));
    expect(updateCall).toBeTruthy();
    const updateArgs = updateCall?.[1] as Record<string, unknown>;
    expect(updateArgs.issueKey).toBe('PROD-3');
    expect(updateArgs.assignee).toEqual({ accountId: 'acc-123' });
    expect(updateArgs.customFields).toMatchObject({
      customfield_10126: 'Pulse',
      assignee: { accountId: 'acc-123' },
    });
  });

  it('uses default route when no rule matches', async () => {
    const client = new FakeJiraClient();
    const registry = makeRegistry(client);

    const result = await autoAssignJiraIssue(registry, {
      issueKey: 'PROD-4',
      issueType: 'CC Bug',
      summary: 'unknown incident category',
      description: 'no mapped keywords',
      assignment: assignmentConfig(),
    });

    expect(result.status).toBe('fallback_assigned');
    const updateCall = client.callToolMock.mock.calls.find((call) => call[0].endsWith('update-issue'));
    const updateArgs = updateCall?.[1] as Record<string, unknown>;
    expect(updateArgs.customFields).toMatchObject({
      customfield_10126: 'Bookeepers',
    });
  });

  it('returns failed when update-issue reports an error', async () => {
    const client = new FakeJiraClient();
    client.callToolMock.mockImplementation(
      async (toolName: string, args: Record<string, unknown>): Promise<FakeToolResult> => {
        if (toolName.endsWith('list_fields')) {
          return { content: [{ type: 'text', text: JSON.stringify([{ id: 'customfield_10126', name: 'Group' }]) }] };
        }
        if (toolName.endsWith('get_user')) {
          return { content: [{ type: 'text', text: JSON.stringify({ accountId: 'acc-123', args }) }] };
        }
        return { content: [{ type: 'text', text: '{"error":"failed"}' }], isError: true };
      },
    );
    const registry = makeRegistry(client);

    const result = await autoAssignJiraIssue(registry, {
      issueKey: 'PROD-5',
      issueType: 'CC Bug',
      summary: 'payment issue',
      assignment: assignmentConfig(),
    });

    expect(result.status).toBe('failed');
  });

  it('caches Group field discovery between calls', async () => {
    const client = new FakeJiraClient();
    const registry = makeRegistry(client);
    const config = assignmentConfig();

    await autoAssignJiraIssue(registry, {
      issueKey: 'PROD-6',
      issueType: 'CC Bug',
      summary: 'payment one',
      assignment: config,
    });
    await autoAssignJiraIssue(registry, {
      issueKey: 'PROD-7',
      issueType: 'CC Bug',
      summary: 'payment two',
      assignment: config,
    });

    const listFieldsCalls = client.callToolMock.mock.calls.filter((call) => call[0].endsWith('list_fields'));
    expect(listFieldsCalls.length).toBe(1);
  });
});

