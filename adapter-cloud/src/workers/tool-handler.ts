/**
 * Tool Handler — routes Anthropic tool_use blocks to the appropriate MCP
 * server via the MCP registry and returns results in the format expected
 * by the Anthropic messages API.
 *
 * Each tool call is wrapped in an OpenTelemetry span so it appears as a
 * child of the parent agent span in traces.
 */

import type { Context as OtelContext } from '@opentelemetry/api';
import {
  startToolCallSpan,
  recordSpanError,
} from '../observability/tracing.js';
import { query } from '../storage/db.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of a tool_use content block from the Anthropic API response. */
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/** Minimal interface for a registered MCP server. */
export interface McpServer {
  /** Human-readable server name (e.g. "grafana-datasource") */
  name: string;
  /** Execute a tool call against this server */
  callTool(toolName: string, input: Record<string, unknown>): Promise<McpToolResult>;
  /** List tools exposed by this server */
  listTools(): Promise<McpToolInfo[]>;
}

export interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpToolResult {
  content: McpToolResultContent[];
  isError?: boolean;
}

export interface McpToolResultContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
}

/** Registry that maps tool names to MCP servers. */
export interface McpRegistry {
  /** Find the MCP server that owns a given tool name */
  resolveServer(toolName: string): McpServer | undefined;
  /** Return all registered servers */
  getServers(): McpServer[];
  /** Return flattened list of all tools across all servers */
  listAllTools(): Promise<McpToolInfo[]>;
}

/** Result returned to the Anthropic conversation as a tool_result block. */
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/** Options for tool execution with optional tracing context. */
export interface ToolHandlerOptions {
  /** Parent trace context (agent span) for creating child tool spans */
  traceCtx?: OtelContext;
  /** Investigation ID for span attributes */
  investigationId?: string;
  /** Domain name for span attributes */
  domain?: string;
  /** Agent name issuing the tool call */
  agentName?: string;
  /** Pipeline phase issuing the tool call */
  phase?: string;
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

import {
  pmMcpToolCallTotal,
  pmMcpToolCallDurationSeconds,
  pmMcpCallDurationSeconds,
  pmMcpCallErrorsTotal,
} from '../observability/index.js';

const MAX_PAYLOAD_CHARS = 20_000;
const MAX_ARRAY_ITEMS = 1_000;
const MAX_OBJECT_KEYS = 1_000;

const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /token/i,
  /api[_-]?key/i,
  /authorization/i,
  /password/i,
  /secret/i,
  /access[_-]?key/i,
];

function truncateText(value: string): string {
  if (value.length <= MAX_PAYLOAD_CHARS) return value;
  return `${value.slice(0, MAX_PAYLOAD_CHARS)}...[truncated]`;
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((re) => re.test(key));
}

function sanitizeJson(value: unknown): unknown {
  if (typeof value === 'string') return truncateText(value);

  if (Array.isArray(value)) {
    const limited = value.slice(0, MAX_ARRAY_ITEMS).map((v) => sanitizeJson(v));
    if (value.length > MAX_ARRAY_ITEMS) {
      return [...limited, '[truncated array]'];
    }
    return limited;
  }

  if (value && typeof value === 'object') {
    const resultEntries: [string, unknown][] = [];
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (resultEntries.length >= MAX_OBJECT_KEYS) {
        break;
      }
      if (isSensitiveKey(k)) {
        resultEntries.push([k, '[REDACTED]']);
      } else {
        resultEntries.push([k, sanitizeJson(v)]);
      }
    }
    return Object.fromEntries(resultEntries);
  }

  return value;
}

async function persistMcpToolCall(input: {
  investigationId?: string;
  phase?: string;
  agentName?: string;
  toolUseId: string;
  serverName: string;
  toolName: string;
  requestPayload: Record<string, unknown>;
  responsePayload?: unknown;
  isError: boolean;
  errorMessage?: string;
  durationMs: number;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO mcp_tool_calls (
        investigation_id, phase, agent_name, tool_use_id, server_name, tool_name,
        request_payload, response_payload, is_error, error_message, duration_ms
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11)`,
      [
        input.investigationId ?? null,
        input.phase ?? null,
        input.agentName ?? null,
        input.toolUseId,
        input.serverName,
        input.toolName,
        JSON.stringify(sanitizeJson(input.requestPayload)),
        JSON.stringify(sanitizeJson(input.responsePayload ?? null)),
        input.isError,
        input.errorMessage ?? null,
        input.durationMs,
      ],
    );
  } catch {
    // Best-effort persistence only; MCP call failures should not be caused by
    // telemetry/storage side effects.
  }
}

const PERSIST_TIMEOUT_MS = 200;

/**
 * Fire-and-forget wrapper around persistMcpToolCall with a strict timeout
 * so that storage latency cannot delay tool execution.
 */
function persistMcpToolCallBestEffort(input: Parameters<typeof persistMcpToolCall>[0]): void {
  void (async () => {
    try {
      await Promise.race([
        persistMcpToolCall(input),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('persistMcpToolCall timeout')), PERSIST_TIMEOUT_MS),
        ),
      ]);
    } catch {
      // Best-effort telemetry: ignore persistence errors/timeouts.
    }
  })();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Handle a single tool_use block by routing it to the correct MCP server.
 *
 * Returns a `tool_result` block ready to be appended to the conversation.
 * When tracing options are provided, wraps the call in a child span.
 */
export async function handleToolUse(
  toolCall: ToolUseBlock,
  mcpRegistry: McpRegistry,
  options?: ToolHandlerOptions,
): Promise<ToolResultBlock> {
  const startTime = performance.now();
  const server = mcpRegistry.resolveServer(toolCall.name);

  if (!server) {
    pmMcpToolCallTotal.inc({ server: 'unknown', tool: toolCall.name, status: 'error' });
    const message = `No MCP server registered for tool "${toolCall.name}"`;
    void persistMcpToolCallBestEffort({
      investigationId: options?.investigationId,
      phase: options?.phase,
      agentName: options?.agentName,
      toolUseId: toolCall.id,
      serverName: 'unknown',
      toolName: toolCall.name,
      requestPayload: toolCall.input,
      responsePayload: { error: message },
      isError: true,
      errorMessage: message,
      durationMs: 0,
    });
    return {
      type: 'tool_result',
      tool_use_id: toolCall.id,
      content: JSON.stringify({
        error: message,
      }),
      is_error: true,
    };
  }

  // Start a tool-call span if trace context is available
  const spanInfo = options?.traceCtx
    ? startToolCallSpan(options.traceCtx, {
        investigation_id: options.investigationId ?? 'unknown',
        tool_name: toolCall.name,
        server_name: server.name,
        domain: options.domain,
      })
    : undefined;

  try {
    const result = await server.callTool(toolCall.name, toolCall.input);
    const durationSec = (performance.now() - startTime) / 1000;

    const status = result.isError ? 'error' : 'success';

    // New metrics
    pmMcpToolCallTotal.inc({ server: server.name, tool: toolCall.name, status });
    pmMcpToolCallDurationSeconds.observe({ server: server.name }, durationSec);

    // Legacy metrics
    pmMcpCallDurationSeconds.observe({ server: server.name, tool: toolCall.name }, durationSec);
    if (result.isError) {
      pmMcpCallErrorsTotal.inc({ server: server.name, tool: toolCall.name, error_type: 'tool_error' });
    }

    // Flatten content into a single text string for the model
    const text = result.content
      .map((c) => {
        if (c.type === 'text' && c.text) return c.text;
        if (c.type === 'image' && c.data) return `[image: ${c.mimeType ?? 'unknown'}]`;
        if (c.type === 'resource' && c.text) return c.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');

    if (spanInfo) {
      spanInfo.span.setAttribute('pm.tool_result_length', text.length);
      spanInfo.span.setAttribute('pm.is_error', result.isError ?? false);
      spanInfo.span.end();
    }

    // Fire-and-forget persistence with strict timeout to avoid blocking tool execution
    void persistMcpToolCallBestEffort({
      investigationId: options?.investigationId,
      phase: options?.phase,
      agentName: options?.agentName,
      toolUseId: toolCall.id,
      serverName: server.name,
      toolName: toolCall.name,
      requestPayload: toolCall.input,
      responsePayload: result,
      isError: result.isError ?? false,
      durationMs: Math.round(performance.now() - startTime),
    });

    return {
      type: 'tool_result',
      tool_use_id: toolCall.id,
      content: text || '(empty result)',
      is_error: result.isError ?? false,
    };
  } catch (err) {
    const durationSec = (performance.now() - startTime) / 1000;

    if (spanInfo) {
      recordSpanError(spanInfo.span, err);
      spanInfo.span.end();
    }

    const message = err instanceof Error ? err.message : String(err);

    // New metrics
    pmMcpToolCallTotal.inc({ server: server.name, tool: toolCall.name, status: 'error' });
    pmMcpToolCallDurationSeconds.observe({ server: server.name }, durationSec);

    // Legacy metrics
    pmMcpCallErrorsTotal.inc({ server: server.name, tool: toolCall.name, error_type: 'exception' });

    // Fire-and-forget persistence with strict timeout
    void persistMcpToolCallBestEffort({
      investigationId: options?.investigationId,
      phase: options?.phase,
      agentName: options?.agentName,
      toolUseId: toolCall.id,
      serverName: server.name,
      toolName: toolCall.name,
      requestPayload: toolCall.input,
      responsePayload: { error: message },
      isError: true,
      errorMessage: message,
      durationMs: Math.round(performance.now() - startTime),
    });

    return {
      type: 'tool_result',
      tool_use_id: toolCall.id,
      content: JSON.stringify({ error: `Tool execution failed: ${message}` }),
      is_error: true,
    };
  }
}

/**
 * Handle multiple tool_use blocks in parallel.  Returns results in the
 * same order as the input array.
 */
export async function handleToolUseBatch(
  toolCalls: ToolUseBlock[],
  mcpRegistry: McpRegistry,
  options?: ToolHandlerOptions,
): Promise<ToolResultBlock[]> {
  return Promise.all(toolCalls.map((tc) => handleToolUse(tc, mcpRegistry, options)));
}
