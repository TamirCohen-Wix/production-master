/**
 * Unit tests for the MCP client layer:
 *   - CircuitBreaker behaviour
 *   - McpHttpClient retry logic
 *   - McpRegistry health tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CircuitBreaker } from "../../../src/mcp/client.js";

// ---------------------------------------------------------------------------
// CircuitBreaker
// ---------------------------------------------------------------------------

describe("CircuitBreaker", () => {
  it("starts in closed state", () => {
    const cb = new CircuitBreaker(3, 1_000);
    expect(cb.getState()).toBe("closed");
    expect(cb.isCallAllowed()).toBe(true);
  });

  it("opens after threshold consecutive failures", () => {
    const cb = new CircuitBreaker(3, 1_000);
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe("closed");

    cb.recordFailure(); // 3rd failure — threshold reached
    expect(cb.getState()).toBe("open");
    expect(cb.isCallAllowed()).toBe(false);
  });

  it("resets failure count on success", () => {
    const cb = new CircuitBreaker(3, 1_000);
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();

    // Counter reset — need 3 more failures to open
    cb.recordFailure();
    expect(cb.getState()).toBe("closed");
  });

  it("transitions to half-open after reset window", () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker(2, 500);

    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe("open");

    vi.advanceTimersByTime(500);
    expect(cb.getState()).toBe("half-open");
    expect(cb.isCallAllowed()).toBe(true);

    vi.useRealTimers();
  });

  it("closes again after success in half-open state", () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker(2, 500);

    cb.recordFailure();
    cb.recordFailure();
    vi.advanceTimersByTime(500);
    expect(cb.getState()).toBe("half-open");

    cb.recordSuccess();
    expect(cb.getState()).toBe("closed");

    vi.useRealTimers();
  });

  it("re-opens on failure during half-open", () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker(1, 300);

    cb.recordFailure();
    expect(cb.getState()).toBe("open");

    vi.advanceTimersByTime(300);
    expect(cb.getState()).toBe("half-open");

    cb.recordFailure();
    expect(cb.getState()).toBe("open");

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Retry logic (tested via a lightweight harness without real MCP transport)
// ---------------------------------------------------------------------------

describe("Retry logic (integration-style)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Simulate the retry + circuit-breaker loop used by McpHttpClient.withRetry
   * without instantiating a real transport.
   */
  async function simulateRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 50,
    breaker = new CircuitBreaker(5, 60_000),
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (!breaker.isCallAllowed()) {
        throw new Error("circuit open");
      }
      try {
        const result = await fn();
        breaker.recordSuccess();
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        breaker.recordFailure();
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
        }
      }
    }
    throw lastError!;
  }

  it("succeeds on first try without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await simulateRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient failure and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValue("ok");

    const result = await simulateRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("exhausts retries and throws last error", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("persistent"));

    await expect(simulateRetry(fn, 2)).rejects.toThrow("persistent");
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("respects circuit breaker — stops retrying once open", async () => {
    const breaker = new CircuitBreaker(2, 60_000);
    const fn = vi.fn().mockRejectedValue(new Error("fail"));

    // After 2 failures the breaker opens; the 3rd attempt sees circuit open.
    await expect(simulateRetry(fn, 5, 10, breaker)).rejects.toThrow("circuit open");
    // fn called twice (failures that opened the breaker), then loop detects open
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("uses exponential backoff between retries", async () => {
    const delays: number[] = [];
    const realSetTimeout = globalThis.setTimeout;
    const spy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      fn: () => void,
      ms: number,
    ) => {
      if (ms > 0) delays.push(ms);
      return realSetTimeout(fn, 0); // resolve immediately for test speed
    }) as typeof setTimeout);

    const fnMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("e1"))
      .mockRejectedValueOnce(new Error("e2"))
      .mockResolvedValue("ok");

    await simulateRetry(fnMock, 3, 100, new CircuitBreaker(10, 60_000));

    // First retry delay = 100 * 2^0 = 100, second = 100 * 2^1 = 200
    expect(delays).toEqual(expect.arrayContaining([100, 200]));
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// McpRegistry (config loading + health)
// ---------------------------------------------------------------------------

describe("McpRegistry", () => {
  // We import dynamically so we can test loadConfig in isolation
  it("loadConfig parses YAML with all 9 servers", async () => {
    const { loadConfig } = await import("../../../src/mcp/registry.js");
    const { resolve: pathResolve } = await import("node:path");

    const cfgPath = pathResolve(
      import.meta.dirname ?? ".",
      "..",
      "..",
      "..",
      "src",
      "config",
      "mcp-config.yaml",
    );

    const servers = loadConfig(cfgPath);
    expect(servers).toHaveLength(9);

    const names = servers.map((s) => s.name);
    expect(names).toContain("octocode");
    expect(names).toContain("slack");
    expect(names).toContain("jira");
    expect(names).toContain("grafana-datasource");
    expect(names).toContain("FT-release");
    expect(names).toContain("github");
    expect(names).toContain("context-7");
    expect(names).toContain("grafana-mcp");
    expect(names).toContain("fire-console");
  });

  it("classifies octocode as stdio and rest as http", async () => {
    const { loadConfig } = await import("../../../src/mcp/registry.js");
    const { resolve: pathResolve } = await import("node:path");

    const cfgPath = pathResolve(
      import.meta.dirname ?? ".",
      "..",
      "..",
      "..",
      "src",
      "config",
      "mcp-config.yaml",
    );

    const servers = loadConfig(cfgPath);
    const stdio = servers.filter((s) => s.type === "stdio");
    const http = servers.filter((s) => s.type === "http");

    expect(stdio).toHaveLength(1);
    expect(stdio[0].name).toBe("octocode");
    expect(http).toHaveLength(8);
  });

  it("fire-console has auth: none", async () => {
    const { loadConfig } = await import("../../../src/mcp/registry.js");
    const { resolve: pathResolve } = await import("node:path");

    const cfgPath = pathResolve(
      import.meta.dirname ?? ".",
      "..",
      "..",
      "..",
      "src",
      "config",
      "mcp-config.yaml",
    );

    const servers = loadConfig(cfgPath);
    const fc = servers.find((s) => s.name === "fire-console");
    expect(fc?.auth).toBe("none");
  });

  it("McpRegistry.listServers returns all entries with initial unhealthy state", async () => {
    const { McpRegistry } = await import("../../../src/mcp/registry.js");

    const registry = new McpRegistry([
      { name: "test-http", type: "http", url: "https://example.com/mcp?mcp=test", auth: "none" },
      { name: "test-stdio", type: "stdio", mcpId: "test", auth: "none" },
    ]);

    const servers = registry.listServers();
    expect(servers).toHaveLength(2);
    // Not yet connected, so not healthy
    expect(servers.every((s) => !s.healthy)).toBe(true);
    expect(servers.every((s) => s.circuitState === "closed")).toBe(true);
  });

  it("McpRegistry.getClient throws for unknown server", async () => {
    const { McpRegistry } = await import("../../../src/mcp/registry.js");

    const registry = new McpRegistry([]);
    await expect(registry.getClient("nonexistent")).rejects.toThrow(
      'Unknown MCP server: "nonexistent"',
    );
  });
});
