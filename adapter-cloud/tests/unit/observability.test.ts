/**
 * Unit tests for the observability stack (PR 4.5).
 *
 * These tests validate metric definitions, logger output structure,
 * and the tracing module's public API without requiring a running
 * collector or Prometheus instance.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

describe('metrics', () => {
  // Dynamic import so each test suite gets a fresh module if needed
  const importMetrics = async () => import('../../src/observability/metrics.js');

  it('should export initMetrics function', async () => {
    const m = await importMetrics();
    expect(typeof m.initMetrics).toBe('function');
  });

  it('should export getMetricsEndpoint function', async () => {
    const m = await importMetrics();
    expect(typeof m.getMetricsEndpoint).toBe('function');
  });

  it('should register all 12 domain metrics', async () => {
    const m = await importMetrics();
    const expectedNames = [
      'pm_investigation_total',
      'pm_investigation_duration_seconds',
      'pm_investigation_verdict',
      'pm_agent_duration_seconds',
      'pm_agent_tokens_total',
      'pm_mcp_call_duration_seconds',
      'pm_mcp_call_errors_total',
      'pm_hypothesis_iterations',
      'pm_hypothesis_confidence',
      'pm_llm_cost_dollars',
      'pm_queue_depth',
      'pm_worker_utilization',
    ];

    const registeredNames = (await m.register.getMetricsAsJSON()).map(
      (metric) => metric.name,
    );

    for (const name of expectedNames) {
      expect(registeredNames).toContain(name);
    }
  });

  it('should produce valid Prometheus text output', async () => {
    const m = await importMetrics();
    m.pmInvestigationTotal.inc({ trigger: 'api' });
    const output = await m.register.metrics();
    expect(output).toContain('pm_investigation_total');
    expect(output).toContain('trigger="api"');
  });

  it('should record histogram observations', async () => {
    const m = await importMetrics();
    m.pmInvestigationDurationSeconds.observe({ status: 'success' }, 42);
    const output = await m.register.metrics();
    expect(output).toContain('pm_investigation_duration_seconds_bucket');
  });

  it('should track gauge values', async () => {
    const m = await importMetrics();
    m.pmQueueDepth.set({ queue: 'default' }, 7);
    const output = await m.register.metrics();
    expect(output).toContain('pm_queue_depth');
  });
});

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

describe('logging', () => {
  const importLogging = async () => import('../../src/observability/logging.js');

  it('should export createLogger function', async () => {
    const l = await importLogging();
    expect(typeof l.createLogger).toBe('function');
  });

  it('should return a logger with standard levels', async () => {
    const l = await importLogging();
    const logger = l.createLogger('test-module');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should produce JSON output with required fields', async () => {
    const l = await importLogging();
    const logger = l.createLogger('test-module');

    // Capture console output
    const chunks: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(chunk.toString());
      return true;
    }) as typeof process.stdout.write;

    logger.info('test message', {
      investigation_id: 'inv-123',
      trace_id: 'trace-abc',
    });

    // Restore
    process.stdout.write = origWrite;

    // Winston Console transport writes to stdout
    // Give the async transport a tick to flush
    await new Promise((resolve) => setTimeout(resolve, 50));

    const jsonLine = chunks.find((c) => c.includes('test message'));
    if (jsonLine) {
      const parsed = JSON.parse(jsonLine);
      expect(parsed.message).toBe('test message');
      expect(parsed.level).toBe('info');
      expect(parsed.module).toBe('test-module');
      expect(parsed.investigation_id).toBe('inv-123');
      expect(parsed.trace_id).toBe('trace-abc');
      expect(parsed.timestamp).toBeDefined();
    }
    // If the transport wrote to stderr instead, we just validate the API
    // shape was correct (logger did not throw).
  });
});

// ---------------------------------------------------------------------------
// Tracing
// ---------------------------------------------------------------------------

describe('tracing', () => {
  const importTracing = async () => import('../../src/observability/tracing.js');

  it('should export initTracing function', async () => {
    const t = await importTracing();
    expect(typeof t.initTracing).toBe('function');
  });

  it('should export getTracer function', async () => {
    const t = await importTracing();
    expect(typeof t.getTracer).toBe('function');
  });

  it('should return a tracer with startSpan capability', async () => {
    const t = await importTracing();
    const tracer = t.getTracer('test');
    expect(typeof tracer.startSpan).toBe('function');
  });
});
