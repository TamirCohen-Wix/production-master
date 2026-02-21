/**
 * HTTP MCP Client — Streamable HTTP transport to mcp-s.wewix.net
 *
 * Provides connect/callTool/listTools/disconnect with:
 *   - Retry: 3 attempts, exponential backoff (200ms base)
 *   - Timeout: 30 seconds per request
 *   - Circuit breaker: 5 consecutive failures -> unhealthy for 60s
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface McpClientOptions {
  /** Server name (used for logging / registry identification). */
  name: string;
  /** Full URL including ?mcp= query param, e.g. https://mcp-s.wewix.net/mcp?mcp=jira */
  url: string;
  /** Vault-resolved access key injected at runtime. */
  accessKey?: string;
  /** Maximum retries per call (default 3). */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default 200). */
  baseDelayMs?: number;
  /** Per-request timeout in ms (default 30 000). */
  timeoutMs?: number;
  /** Consecutive failures before circuit opens (default 5). */
  circuitThreshold?: number;
  /** Duration in ms the circuit stays open (default 60 000). */
  circuitResetMs?: number;
}

export interface ToolCallResult {
  content: unknown[];
  isError?: boolean;
}

export type CircuitState = "closed" | "open" | "half-open";

// ---------------------------------------------------------------------------
// Circuit Breaker
// ---------------------------------------------------------------------------

export class CircuitBreaker {
  private failures = 0;
  private state: CircuitState = "closed";
  private openedAt = 0;

  constructor(
    private readonly threshold: number,
    private readonly resetMs: number,
  ) {}

  getState(): CircuitState {
    if (this.state === "open" && Date.now() - this.openedAt >= this.resetMs) {
      this.state = "half-open";
    }
    return this.state;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }

  isCallAllowed(): boolean {
    const current = this.getState();
    return current === "closed" || current === "half-open";
  }
}

// ---------------------------------------------------------------------------
// McpHttpClient
// ---------------------------------------------------------------------------

export class McpHttpClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  readonly breaker: CircuitBreaker;

  private readonly name: string;
  private readonly url: string;
  private readonly accessKey: string | undefined;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly timeoutMs: number;

  constructor(opts: McpClientOptions) {
    this.name = opts.name;
    this.url = opts.url;
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
    const headers: Record<string, string> = {};
    if (this.accessKey) {
      headers["x-user-access-key"] = this.accessKey;
    }

    this.transport = new StreamableHTTPClientTransport(new URL(this.url), {
      requestInit: { headers },
    });

    this.client = new Client(
      { name: `cloud-mcp-${this.name}`, version: "1.0.0" },
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
          `Circuit breaker OPEN for MCP server "${this.name}" — skipping call`,
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
        () => reject(new Error(`MCP call to "${this.name}" timed out after ${this.timeoutMs}ms`)),
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
        `McpHttpClient "${this.name}" is not connected — call connect() first`,
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
