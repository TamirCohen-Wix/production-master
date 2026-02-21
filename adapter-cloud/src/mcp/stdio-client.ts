/**
 * Stdio MCP Client — for servers that require a local child process (e.g. Octocode).
 *
 * Spawns `npx -y @mcp-s/mcp` with the required env vars via StdioClientTransport.
 * Shares the same retry / circuit-breaker semantics as McpHttpClient.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CircuitBreaker, type ToolCallResult } from "./client.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StdioClientOptions {
  /** Logical server name, e.g. "octocode". */
  name: string;
  /** MCP identifier passed as MCP env var, e.g. "octocode". */
  mcpId: string;
  /** Base URL for the MCP proxy (default https://mcp-s.wewix.net). */
  baseUrl?: string;
  /** Vault-resolved user access key. */
  accessKey?: string;
  /** Maximum retries (default 3). */
  maxRetries?: number;
  /** Base delay ms for exponential backoff (default 200). */
  baseDelayMs?: number;
  /** Timeout per call in ms (default 30 000). */
  timeoutMs?: number;
  /** Circuit breaker failure threshold (default 5). */
  circuitThreshold?: number;
  /** Circuit breaker reset window in ms (default 60 000). */
  circuitResetMs?: number;
}

// ---------------------------------------------------------------------------
// McpStdioClient
// ---------------------------------------------------------------------------

export class McpStdioClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  readonly breaker: CircuitBreaker;

  private readonly name: string;
  private readonly mcpId: string;
  private readonly baseUrl: string;
  private readonly accessKey: string | undefined;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly timeoutMs: number;

  constructor(opts: StdioClientOptions) {
    this.name = opts.name;
    this.mcpId = opts.mcpId;
    this.baseUrl = opts.baseUrl ?? "https://mcp-s.wewix.net";
    this.accessKey = opts.accessKey;
    this.maxRetries = opts.maxRetries ?? 3;
    this.baseDelayMs = opts.baseDelayMs ?? 200;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.breaker = new CircuitBreaker(
      opts.circuitThreshold ?? 5,
      opts.circuitResetMs ?? 60_000,
    );
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  async connect(): Promise<void> {
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      BASE_URL: this.baseUrl,
      MCP: this.mcpId,
    };

    if (this.accessKey) {
      env.USER_ACCESS_KEY = this.accessKey;
    }

    this.transport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "@mcp-s/mcp"],
      env,
    });

    this.client = new Client(
      { name: `cloud-stdio-${this.name}`, version: "1.0.0" },
      { capabilities: {} },
    );

    await this.client.connect(this.transport);
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
    }
    this.client = null;
    this.transport = null;
  }

  // -----------------------------------------------------------------------
  // Tool operations (with retry + circuit breaker)
  // -----------------------------------------------------------------------

  async listTools(): Promise<unknown[]> {
    return this.withRetry(async () => {
      this.ensureConnected();
      const result = await this.withTimeout(this.client!.listTools());
      return result.tools;
    });
  }

  async callTool(toolName: string, args: Record<string, unknown> = {}): Promise<ToolCallResult> {
    return this.withRetry(async () => {
      this.ensureConnected();
      const result = await this.withTimeout(
        this.client!.callTool({ name: toolName, arguments: args }),
      );
      return result as ToolCallResult;
    });
  }

  // -----------------------------------------------------------------------
  // Retry + Circuit breaker internals
  // -----------------------------------------------------------------------

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (!this.breaker.isCallAllowed()) {
        throw new Error(
          `Circuit breaker OPEN for stdio MCP server "${this.name}" — skipping call`,
        );
      }

      try {
        const result = await fn();
        this.breaker.recordSuccess();
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.breaker.recordFailure();

        if (attempt < this.maxRetries) {
          const delay = this.baseDelayMs * 2 ** attempt;
          await sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Stdio MCP call to "${this.name}" timed out after ${this.timeoutMs}ms`)),
        this.timeoutMs,
      );
      promise.then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); },
      );
    });
  }

  private ensureConnected(): void {
    if (!this.client) {
      throw new Error(
        `McpStdioClient "${this.name}" is not connected — call connect() first`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
