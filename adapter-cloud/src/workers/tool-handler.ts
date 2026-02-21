/**
 * Tool Handler — routes Anthropic tool_use blocks to the appropriate MCP
 * server via the MCP registry and returns results in the format expected
 * by the Anthropic messages API.
 */

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Handle a single tool_use block by routing it to the correct MCP server.
 *
 * Returns a `tool_result` block ready to be appended to the conversation.
 */
export async function handleToolUse(
  toolCall: ToolUseBlock,
  mcpRegistry: McpRegistry,
): Promise<ToolResultBlock> {
  const server = mcpRegistry.resolveServer(toolCall.name);

  if (!server) {
    return {
      type: 'tool_result',
      tool_use_id: toolCall.id,
      content: JSON.stringify({
        error: `No MCP server registered for tool "${toolCall.name}"`,
      }),
      is_error: true,
    };
  }

  try {
    const result = await server.callTool(toolCall.name, toolCall.input);

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

    return {
      type: 'tool_result',
      tool_use_id: toolCall.id,
      content: text || '(empty result)',
      is_error: result.isError ?? false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
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
): Promise<ToolResultBlock[]> {
  return Promise.all(toolCalls.map((tc) => handleToolUse(tc, mcpRegistry)));
}
