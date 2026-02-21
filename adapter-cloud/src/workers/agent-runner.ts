/**
 * Agent Runner — drives the agentic loop for a single agent using the
 * Anthropic messages API.  Handles tool_use round-trips, token tracking,
 * and output persistence.
 *
 * Accepts an optional trace context so that tool-call spans are nested
 * under the parent agent span in distributed traces.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Context as OtelContext } from '@opentelemetry/api';
import { buildPrompt, readAgentDefinition } from './prompt-builder.js';
import { handleToolUseBatch, type McpRegistry, type ToolUseBlock, type ToolResultBlock } from './tool-handler.js';
import { resolveModel, type ModelAlias } from '../config/model-registry.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentRunOptions {
  /** Investigation context injected into the prompt */
  investigationContext?: string;
  /** Override the model alias for this run */
  modelOverride?: ModelAlias;
  /** Maximum agentic loop iterations (default: 50) */
  maxIterations?: number;
  /** Anthropic API key — falls back to ANTHROPIC_API_KEY env var */
  apiKey?: string;
  /** MCP registry for tool routing */
  mcpRegistry: McpRegistry;
  /** Optional callback for persisting output */
  onOutput?: (output: AgentOutput) => Promise<void>;
  /** Optional callback for recording run metadata in DB */
  onRecord?: (record: AgentRunRecord) => Promise<void>;
  /** Maximum tokens for model response per turn */
  maxTokens?: number;
  /** Parent trace context for creating child tool-call spans */
  traceCtx?: OtelContext;
  /** Investigation ID for span attributes */
  investigationId?: string;
  /** Domain name for span attributes */
  domain?: string;
}

export interface AgentOutput {
  agentName: string;
  content: string;
  tokenUsage: TokenUsage;
  iterations: number;
  stopReason: StopReason;
}

export interface AgentRunRecord {
  agentName: string;
  model: string;
  iterations: number;
  tokenUsage: TokenUsage;
  stopReason: StopReason;
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export type StopReason = 'end_turn' | 'max_iterations' | 'error';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_ITERATIONS = 50;
const DEFAULT_MAX_TOKENS = 16384;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run a single agent through the full agentic loop:
 *
 * 1. Build system prompt from agent definition + skills + context
 * 2. Call Anthropic messages.create
 * 3. If response contains tool_use blocks, execute them via MCP and loop
 * 4. Repeat until end_turn or max iterations reached
 * 5. Persist output and record metadata
 */
export async function runAgent(
  agentName: string,
  context: { investigationContext?: string } = {},
  options: AgentRunOptions,
): Promise<AgentOutput> {
  const startedAt = new Date();
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

  // Resolve model
  const definition = await readAgentDefinition(agentName);
  const modelAlias = options.modelOverride ?? (definition.frontmatter.model as ModelAlias);
  const model = resolveModel(agentName, modelAlias);

  // Build system prompt
  const systemPrompt = await buildPrompt(agentName, {
    investigationContext: context.investigationContext,
  });

  // Collect tool definitions from MCP registry
  const allTools = await options.mcpRegistry.listAllTools();
  const tools: Anthropic.Tool[] = allTools.map((t) => ({
    name: t.name,
    description: t.description ?? '',
    input_schema: (t.inputSchema as Anthropic.Tool.InputSchema) ?? { type: 'object' as const, properties: {} },
  }));

  // Initialize Anthropic client
  const client = new Anthropic({ apiKey: options.apiKey });

  // Conversation state
  const messages: Anthropic.MessageParam[] = [];
  const tokenUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let iterations = 0;
  let stopReason: StopReason = 'end_turn';
  let finalContent = '';

  // Build tool handler options for trace propagation
  const toolHandlerOptions = options.traceCtx
    ? {
        traceCtx: options.traceCtx,
        investigationId: options.investigationId,
        domain: options.domain,
      }
    : undefined;

  // Agentic loop
  while (iterations < maxIterations) {
    iterations++;

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      tools: tools.length > 0 ? tools : undefined,
      messages,
    });

    // Track token usage
    tokenUsage.inputTokens += response.usage.input_tokens;
    tokenUsage.outputTokens += response.usage.output_tokens;
    tokenUsage.totalTokens = tokenUsage.inputTokens + tokenUsage.outputTokens;

    // Extract text and tool_use blocks from response
    const textParts: string[] = [];
    const toolUseParts: ToolUseBlock[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        textParts.push(block.text);
      } else if (block.type === 'tool_use') {
        toolUseParts.push({
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        });
      }
    }

    // Add assistant message to conversation
    messages.push({ role: 'assistant', content: response.content });

    // If no tool calls, we're done
    if (response.stop_reason === 'end_turn' || toolUseParts.length === 0) {
      finalContent = textParts.join('\n');
      stopReason = 'end_turn';
      break;
    }

    // Execute tool calls and add results (with optional tracing)
    const toolResults = await handleToolUseBatch(toolUseParts, options.mcpRegistry, toolHandlerOptions);
    const userContent: (ToolResultBlock | Anthropic.TextBlockParam)[] = toolResults.map((r) => ({
      type: 'tool_result' as const,
      tool_use_id: r.tool_use_id,
      content: r.content,
      is_error: r.is_error,
    }));

    messages.push({ role: 'user', content: userContent });
  }

  // If we exited the loop due to max iterations
  if (iterations >= maxIterations && stopReason !== 'end_turn') {
    stopReason = 'max_iterations';
  }

  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();

  const output: AgentOutput = {
    agentName,
    content: finalContent,
    tokenUsage,
    iterations,
    stopReason,
  };

  const record: AgentRunRecord = {
    agentName,
    model,
    iterations,
    tokenUsage,
    stopReason,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs,
  };

  // Persist output if callback provided
  if (options.onOutput) {
    await options.onOutput(output);
  }

  // Record run metadata if callback provided
  if (options.onRecord) {
    await options.onRecord(record);
  }

  return output;
}
