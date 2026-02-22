/**
 * MCP Server Registry
 *
 * Loads server configuration from mcp-config.yaml, instantiates the correct
 * client type (HTTP or stdio), tracks per-server health, and exposes:
 *   - getClient(serverName)  — returns a connected client
 *   - listServers()          — returns all registered server names + health
 *   - healthCheck()          — probes all servers and returns aggregate health
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { McpHttpClient, type McpClientOptions } from "./client.js";
import { McpStdioClient, type StdioClientOptions } from "./stdio-client.js";
import { getMcpServiceAccountToken } from "../config/wix-config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServerConfig {
  name: string;
  type: "http" | "stdio";
  url?: string;
  mcpId?: string;
  baseUrl?: string;
  auth?: string; // "vault://<path>" | "none"
}

export interface ServerHealth {
  name: string;
  type: "http" | "stdio";
  healthy: boolean;
  circuitState: string;
  lastError?: string;
}

type AnyMcpClient = McpHttpClient | McpStdioClient;

interface RegistryEntry {
  config: ServerConfig;
  client: AnyMcpClient;
  connected: boolean;
  lastError?: string;
}

// ---------------------------------------------------------------------------
// Config loader
// ---------------------------------------------------------------------------

export function loadConfig(configPath?: string): ServerConfig[] {
  const path =
    configPath ??
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "config",
      "mcp-config.yaml",
    );

  const raw = readFileSync(path, "utf-8");
  const doc = parseYaml(raw) as { servers: ServerConfig[] };

  if (!doc?.servers || !Array.isArray(doc.servers)) {
    throw new Error(`Invalid mcp-config.yaml — expected a top-level "servers" array`);
  }

  return doc.servers;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export class McpRegistry {
  private entries = new Map<string, RegistryEntry>();

  constructor(configs?: ServerConfig[]) {
    const serverConfigs = configs ?? loadConfig();
    for (const cfg of serverConfigs) {
      const client = this.createClient(cfg);
      this.entries.set(cfg.name, { config: cfg, client, connected: false });
    }
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Return a connected client for `serverName`.
   * Lazily connects on first call.
   */
  async getClient(serverName: string): Promise<AnyMcpClient> {
    const entry = this.entries.get(serverName);
    if (!entry) {
      throw new Error(`Unknown MCP server: "${serverName}"`);
    }

    if (!entry.connected) {
      try {
        await entry.client.connect();
        entry.connected = true;
        entry.lastError = undefined;
      } catch (err) {
        entry.lastError = err instanceof Error ? err.message : String(err);
        throw err;
      }
    }

    return entry.client;
  }

  /**
   * Return metadata + health for every registered server.
   */
  listServers(): ServerHealth[] {
    return [...this.entries.values()].map((e) => ({
      name: e.config.name,
      type: e.config.type,
      healthy: e.connected && e.client.breaker.isCallAllowed(),
      circuitState: e.client.breaker.getState(),
      lastError: e.lastError,
    }));
  }

  /**
   * Probe all servers (connect if needed) and return aggregate health.
   */
  async healthCheck(): Promise<{ healthy: boolean; servers: ServerHealth[] }> {
    const results: ServerHealth[] = [];

    for (const [name] of this.entries) {
      try {
        await this.getClient(name);
      } catch {
        // getClient already records lastError
      }
    }

    const servers = this.listServers();
    const healthy = servers.every((s) => s.healthy);
    return { healthy, servers };
  }

  /**
   * Gracefully disconnect all clients.
   */
  async disconnectAll(): Promise<void> {
    for (const entry of this.entries.values()) {
      if (entry.connected) {
        try {
          await entry.client.disconnect();
        } catch {
          // best effort
        }
        entry.connected = false;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private resolveAccessKey(auth: string | undefined): string | undefined {
    if (!auth || auth === "none") return undefined;

    if (auth.startsWith("vault://")) {
      // In production, this would call a Vault client.
      // For now, fall back to the SDM-managed service account token.
      return getMcpServiceAccountToken() || undefined;
    }

    return auth;
  }

  private createClient(cfg: ServerConfig): AnyMcpClient {
    const accessKey = this.resolveAccessKey(cfg.auth);

    if (cfg.type === "stdio") {
      return new McpStdioClient({
        name: cfg.name,
        mcpId: cfg.mcpId ?? cfg.name,
        baseUrl: cfg.baseUrl ?? "https://mcp-s.wewix.net",
        accessKey,
      } satisfies StdioClientOptions);
    }

    // Default: HTTP transport
    if (!cfg.url) {
      throw new Error(`HTTP MCP server "${cfg.name}" requires a "url" field`);
    }

    return new McpHttpClient({
      name: cfg.name,
      url: cfg.url,
      accessKey,
    } satisfies McpClientOptions);
  }
}
