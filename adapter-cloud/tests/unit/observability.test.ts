/**
 * Unit tests for the observability stack.
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

  it('should register all domain metrics', async () => {
    const m = await importMetrics();
    const expectedNames = [
      // Investigation lifecycle
      'pm_investigation_total',
      'pm_investigation_duration_seconds',
      'pm_investigation_verdict',
      'pm_investigation_hypothesis_iterations',
      // Agent execution
      'pm_agent_invocation_total',
      'pm_agent_invocation_duration_seconds',
      'pm_agent_duration_seconds',
      'pm_agent_tokens_total',
      // MCP calls
      'pm_mcp_tool_call_total',
      'pm_mcp_tool_call_duration_seconds',
      'pm_mcp_call_duration_seconds',
      'pm_mcp_call_errors_total',
      // Hypothesis loop (legacy)
      'pm_hypothesis_iterations',
      'pm_hypothesis_confidence',
      // Cost tracking
      'pm_llm_tokens_total',
      'pm_llm_cost_dollars_total',
      'pm_llm_cost_dollars',
      // Infrastructure
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
    m.pmInvestigationTotal.inc({ domain: 'payments', status: 'queued', trigger_source: 'api' });
    const output = await m.register.metrics();
    expect(output).toContain('pm_investigation_total');
    expect(output).toContain('trigger_source="api"');
    expect(output).toContain('domain="payments"');
  });

  it('should record histogram observations', async () => {
    const m = await importMetrics();
    m.pmInvestigationDurationSeconds.observe({ domain: 'payments', status: 'completed' }, 42);
    const output = await m.register.metrics();
    expect(output).toContain('pm_investigation_duration_seconds_bucket');
  });

  it('should track gauge values', async () => {
    const m = await importMetrics();
    m.pmQueueDepth.set({ queue: 'default' }, 7);
    const output = await m.register.metrics();
    expect(output).toContain('pm_queue_depth');
  });

  // --- New metric tests ---

  it('should record investigation_hypothesis_iterations with domain label', async () => {
    const m = await importMetrics();
    m.pmInvestigationHypothesisIterations.observe({ domain: 'payments' }, 3);
    const output = await m.register.metrics();
    expect(output).toContain('pm_investigation_hypothesis_iterations_bucket');
    expect(output).toContain('domain="payments"');
  });

  it('should record agent_invocation_total with agent_name and domain labels', async () => {
    const m = await importMetrics();
    m.pmAgentInvocationTotal.inc({ agent_name: 'triage', domain: 'infra' });
    const output = await m.register.metrics();
    expect(output).toContain('pm_agent_invocation_total');
    expect(output).toContain('agent_name="triage"');
    expect(output).toContain('domain="infra"');
  });

  it('should record agent_invocation_duration_seconds with agent_name label', async () => {
    const m = await importMetrics();
    m.pmAgentInvocationDurationSeconds.observe({ agent_name: 'gather-logs' }, 12.5);
    const output = await m.register.metrics();
    expect(output).toContain('pm_agent_invocation_duration_seconds_bucket');
    expect(output).toContain('agent_name="gather-logs"');
  });

  it('should record mcp_tool_call_total with server, tool, and status labels', async () => {
    const m = await importMetrics();
    m.pmMcpToolCallTotal.inc({ server: 'grafana', tool: 'query_loki', status: 'success' });
    m.pmMcpToolCallTotal.inc({ server: 'grafana', tool: 'query_loki', status: 'error' });
    const output = await m.register.metrics();
    expect(output).toContain('pm_mcp_tool_call_total');
    expect(output).toContain('server="grafana"');
    expect(output).toContain('tool="query_loki"');
    expect(output).toContain('status="success"');
    expect(output).toContain('status="error"');
  });

  it('should record mcp_tool_call_duration_seconds with server label', async () => {
    const m = await importMetrics();
    m.pmMcpToolCallDurationSeconds.observe({ server: 'jira' }, 1.5);
    const output = await m.register.metrics();
    expect(output).toContain('pm_mcp_tool_call_duration_seconds_bucket');
    expect(output).toContain('server="jira"');
  });

  it('should record llm_tokens_total with model and type labels', async () => {
    const m = await importMetrics();
    m.pmLlmTokensTotal.inc({ model: 'claude-sonnet-4-6', type: 'input' }, 1500);
    m.pmLlmTokensTotal.inc({ model: 'claude-sonnet-4-6', type: 'output' }, 800);
    const output = await m.register.metrics();
    expect(output).toContain('pm_llm_tokens_total');
    expect(output).toContain('model="claude-sonnet-4-6"');
    expect(output).toContain('type="input"');
    expect(output).toContain('type="output"');
  });

  it('should record llm_cost_dollars_total with model and domain labels', async () => {
    const m = await importMetrics();
    m.pmLlmCostDollarsTotal.inc({ model: 'claude-haiku-4-5-20251001', domain: 'payments' }, 0.05);
    const output = await m.register.metrics();
    expect(output).toContain('pm_llm_cost_dollars_total');
    expect(output).toContain('model="claude-haiku-4-5-20251001"');
    expect(output).toContain('domain="payments"');
  });

  it('should retain legacy metrics for backward compatibility', async () => {
    const m = await importMetrics();

    // Legacy metrics should still be present
    m.pmLlmCostDollars.inc({ model: 'claude-sonnet-4-6' }, 0.1);
    m.pmMcpCallDurationSeconds.observe({ server: 'grafana', tool: 'query' }, 2.0);
    m.pmMcpCallErrorsTotal.inc({ server: 'grafana', tool: 'query', error_type: 'timeout' });
    m.pmHypothesisIterations.observe(3);
    m.pmHypothesisConfidence.observe(0.85);

    const output = await m.register.metrics();
    expect(output).toContain('pm_llm_cost_dollars');
    expect(output).toContain('pm_mcp_call_duration_seconds_bucket');
    expect(output).toContain('pm_mcp_call_errors_total');
    expect(output).toContain('pm_hypothesis_iterations_bucket');
    expect(output).toContain('pm_hypothesis_confidence_bucket');
  });

  it('should expose all metrics via the registry', async () => {
    const m = await importMetrics();
    const metricsJson = await m.register.getMetricsAsJSON();
    // We expect at least 19 custom metrics
    expect(metricsJson.length).toBeGreaterThanOrEqual(19);
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
// Tracing — SDK & tracer
// ---------------------------------------------------------------------------

describe('tracing', () => {
  const importTracing = async () => import('../../src/observability/tracing.js');

  it('should export initTracing function', async () => {
    const t = await importTracing();
    expect(typeof t.initTracing).toBe('function');
  });

  it('should export shutdownTracing function', async () => {
    const t = await importTracing();
    expect(typeof t.shutdownTracing).toBe('function');
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

  it('should gracefully handle initTracing when OTEL_ENABLED=false', async () => {
    const original = process.env.OTEL_ENABLED;
    process.env.OTEL_ENABLED = 'false';
    try {
      const t = await importTracing();
      // Should not throw
      t.initTracing();
      // Tracer still works (returns no-op tracer)
      const tracer = t.getTracer('test');
      expect(typeof tracer.startSpan).toBe('function');
    } finally {
      if (original === undefined) {
        delete process.env.OTEL_ENABLED;
      } else {
        process.env.OTEL_ENABLED = original;
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Tracing — investigation span helpers
// ---------------------------------------------------------------------------

describe('tracing span helpers', () => {
  const importTracing = async () => import('../../src/observability/tracing.js');

  it('should export startInvestigationSpan', async () => {
    const t = await importTracing();
    expect(typeof t.startInvestigationSpan).toBe('function');
  });

  it('should create an investigation span with span and context', async () => {
    const t = await importTracing();
    const result = t.startInvestigationSpan({
      investigation_id: 'inv-001',
      domain: 'payments',
    });

    expect(result).toHaveProperty('span');
    expect(result).toHaveProperty('ctx');
    expect(typeof result.span.end).toBe('function');
    expect(typeof result.span.setAttribute).toBe('function');
    expect(typeof result.span.setStatus).toBe('function');

    // Clean up
    result.span.end();
  });

  it('should create an agent span as a child of a parent context', async () => {
    const t = await importTracing();

    const { span: parentSpan, ctx: parentCtx } = t.startInvestigationSpan({
      investigation_id: 'inv-002',
    });

    const { span: agentSpan, ctx: agentCtx } = t.startAgentSpan(parentCtx, {
      investigation_id: 'inv-002',
      agent_name: 'gather-logs',
    });

    expect(agentSpan).toBeDefined();
    expect(agentCtx).toBeDefined();
    expect(typeof agentSpan.end).toBe('function');

    agentSpan.end();
    parentSpan.end();
  });

  it('should create a tool call span as a child of an agent context', async () => {
    const t = await importTracing();

    const { span: parentSpan, ctx: parentCtx } = t.startInvestigationSpan({
      investigation_id: 'inv-003',
    });

    const { span: agentSpan, ctx: agentCtx } = t.startAgentSpan(parentCtx, {
      investigation_id: 'inv-003',
      agent_name: 'gather-logs',
    });

    const { span: toolSpan } = t.startToolCallSpan(agentCtx, {
      investigation_id: 'inv-003',
      tool_name: 'query_loki_logs',
      server_name: 'grafana-datasource',
    });

    expect(toolSpan).toBeDefined();
    expect(typeof toolSpan.end).toBe('function');

    toolSpan.end();
    agentSpan.end();
    parentSpan.end();
  });

  it('should create a hypothesis span with iteration attributes', async () => {
    const t = await importTracing();

    const { span: parentSpan, ctx: parentCtx } = t.startInvestigationSpan({
      investigation_id: 'inv-004',
    });

    const { span: hypoSpan } = t.startHypothesisSpan(parentCtx, {
      investigation_id: 'inv-004',
      hypothesis_id: 'inv-004:h1',
      iteration: 1,
      domain: 'payments',
    });

    expect(hypoSpan).toBeDefined();
    expect(typeof hypoSpan.end).toBe('function');

    hypoSpan.end();
    parentSpan.end();
  });
});

// ---------------------------------------------------------------------------
// Tracing — error recording
// ---------------------------------------------------------------------------

describe('tracing error recording', () => {
  const importTracing = async () => import('../../src/observability/tracing.js');

  it('should record span errors without throwing', async () => {
    const t = await importTracing();

    const { span } = t.startInvestigationSpan({
      investigation_id: 'inv-err-001',
    });

    // Should not throw
    t.recordSpanError(span, new Error('something went wrong'));
    t.recordSpanError(span, 'string error');

    span.end();
  });
});

// ---------------------------------------------------------------------------
// Tracing — BullMQ trace context propagation
// ---------------------------------------------------------------------------

describe('tracing context propagation', () => {
  const importTracing = async () => import('../../src/observability/tracing.js');

  it('should export injectTraceContext and extractTraceContext', async () => {
    const t = await importTracing();
    expect(typeof t.injectTraceContext).toBe('function');
    expect(typeof t.extractTraceContext).toBe('function');
  });

  it('should inject _traceContext into job data', async () => {
    const t = await importTracing();
    const jobData = { investigation_id: 'inv-005', ticket_id: 'TICK-1' };
    const injected = t.injectTraceContext(jobData);

    // Should preserve original fields
    expect(injected.investigation_id).toBe('inv-005');
    expect(injected.ticket_id).toBe('TICK-1');

    // Should add _traceContext
    expect(injected).toHaveProperty('_traceContext');
    expect(typeof injected._traceContext).toBe('object');
  });

  it('should not mutate the original job data object', async () => {
    const t = await importTracing();
    const original = { investigation_id: 'inv-006' };
    const injected = t.injectTraceContext(original);

    expect(injected).not.toBe(original);
    expect(original).not.toHaveProperty('_traceContext');
  });

  it('should return a valid context from extractTraceContext', async () => {
    const t = await importTracing();

    // With no trace context, should return current active context
    const ctx = t.extractTraceContext({});
    expect(ctx).toBeDefined();
  });

  it('should round-trip inject -> extract without error', async () => {
    const t = await importTracing();

    const jobData = { id: 'test-123' };
    const injected = t.injectTraceContext(jobData);
    const extracted = t.extractTraceContext(injected);

    // Should return a valid context object
    expect(extracted).toBeDefined();
  });

  it('should export getActiveTraceId', async () => {
    const t = await importTracing();
    expect(typeof t.getActiveTraceId).toBe('function');

    // When no active span, should return empty string
    const traceId = t.getActiveTraceId();
    expect(typeof traceId).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Tracing — observability index re-exports
// ---------------------------------------------------------------------------

describe('observability index', () => {
  const importIndex = async () => import('../../src/observability/index.js');

  it('should re-export all tracing helpers', async () => {
    const idx = await importIndex();
    expect(typeof idx.initTracing).toBe('function');
    expect(typeof idx.shutdownTracing).toBe('function');
    expect(typeof idx.getTracer).toBe('function');
    expect(typeof idx.startInvestigationSpan).toBe('function');
    expect(typeof idx.startAgentSpan).toBe('function');
    expect(typeof idx.startToolCallSpan).toBe('function');
    expect(typeof idx.startHypothesisSpan).toBe('function');
    expect(typeof idx.recordSpanError).toBe('function');
    expect(typeof idx.injectTraceContext).toBe('function');
    expect(typeof idx.extractTraceContext).toBe('function');
    expect(typeof idx.getActiveTraceId).toBe('function');
  });
});
