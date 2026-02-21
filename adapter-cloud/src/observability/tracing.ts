/**
 * OpenTelemetry tracing setup for production-master cloud pipeline.
 *
 * Initializes the NodeSDK with OTLP exporter and auto-instruments
 * HTTP, pg, and ioredis libraries.  Provides helper utilities for
 * creating investigation-scoped spans and propagating trace context
 * through BullMQ jobs.
 *
 * Environment variables:
 *   OTEL_EXPORTER_OTLP_ENDPOINT — Collector endpoint (default: http://localhost:4318)
 *   OTEL_SERVICE_NAME            — Service name (default: production-master)
 *   OTEL_ENABLED                 — Set to "false" to disable tracing entirely
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import {
  trace,
  context,
  propagation,
  SpanStatusCode,
  type Tracer,
  type Span,
  type Context,
} from '@opentelemetry/api';

let sdk: NodeSDK | undefined;

// ---------------------------------------------------------------------------
// SDK lifecycle
// ---------------------------------------------------------------------------

/**
 * Initialize OpenTelemetry tracing.
 *
 * Must be called once at process startup, before any instrumented
 * library is imported. Calling more than once is a no-op.
 *
 * If OTEL_ENABLED is set to "false", tracing is completely disabled
 * and all span helpers become no-ops (graceful degradation).
 */
export function initTracing(): void {
  if (sdk) {
    return;
  }

  // Allow explicit opt-out via env var
  if (process.env.OTEL_ENABLED === 'false') {
    return;
  }

  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';
  const serviceName =
    process.env.OTEL_SERVICE_NAME ?? 'production-master';

  const exporter = new OTLPTraceExporter({ url: `${endpoint}/v1/traces` });

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: '1.0.0-alpha.1',
  });

  sdk = new NodeSDK({
    resource,
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Only enable the instrumentations we care about
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true },
        '@opentelemetry/instrumentation-ioredis': { enabled: true },
        // Disable noisy/unused instrumentations
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk
      ?.shutdown()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
}

/**
 * Gracefully shut down the OpenTelemetry SDK, flushing any pending spans.
 *
 * Returns a resolved promise if no SDK was initialized.
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = undefined;
  }
}

// ---------------------------------------------------------------------------
// Tracer access
// ---------------------------------------------------------------------------

/**
 * Return a named tracer instance.
 *
 * @param name — logical module name, e.g. "orchestrator" or "mcp-client"
 */
export function getTracer(name: string): Tracer {
  return trace.getTracer(name);
}

// ---------------------------------------------------------------------------
// Investigation span helpers
// ---------------------------------------------------------------------------

/** Common investigation-level span attributes. */
export interface InvestigationSpanAttributes {
  investigation_id: string;
  domain?: string;
}

/** Attributes for an agent invocation span. */
export interface AgentSpanAttributes extends InvestigationSpanAttributes {
  agent_name: string;
}

/** Attributes for an MCP tool call span. */
export interface ToolCallSpanAttributes extends InvestigationSpanAttributes {
  tool_name: string;
  server_name?: string;
}

/** Attributes for a hypothesis iteration span. */
export interface HypothesisSpanAttributes extends InvestigationSpanAttributes {
  hypothesis_id: string;
  iteration: number;
}

/**
 * Start a root span for an investigation.  The caller is responsible for
 * ending the span when the investigation completes.
 *
 * All child spans created within the returned context will be nested under
 * this root span automatically.
 */
export function startInvestigationSpan(
  attrs: InvestigationSpanAttributes,
): { span: Span; ctx: Context } {
  const tracer = getTracer('orchestrator');
  const span = tracer.startSpan('investigation', {
    attributes: {
      'pm.investigation_id': attrs.investigation_id,
      'pm.domain': attrs.domain ?? 'unknown',
    },
  });
  const ctx = trace.setSpan(context.active(), span);
  return { span, ctx };
}

/**
 * Start a child span for an agent invocation.
 *
 * @param parentCtx — parent context (typically the investigation root context)
 */
export function startAgentSpan(
  parentCtx: Context,
  attrs: AgentSpanAttributes,
): { span: Span; ctx: Context } {
  const tracer = getTracer('orchestrator');
  const span = tracer.startSpan(
    `agent:${attrs.agent_name}`,
    {
      attributes: {
        'pm.investigation_id': attrs.investigation_id,
        'pm.domain': attrs.domain ?? 'unknown',
        'pm.agent_name': attrs.agent_name,
      },
    },
    parentCtx,
  );
  const ctx = trace.setSpan(parentCtx, span);
  return { span, ctx };
}

/**
 * Start a child span for an MCP tool call.
 *
 * @param parentCtx — parent context (typically the agent span context)
 */
export function startToolCallSpan(
  parentCtx: Context,
  attrs: ToolCallSpanAttributes,
): { span: Span; ctx: Context } {
  const tracer = getTracer('mcp-client');
  const span = tracer.startSpan(
    `tool:${attrs.tool_name}`,
    {
      attributes: {
        'pm.investigation_id': attrs.investigation_id,
        'pm.domain': attrs.domain ?? 'unknown',
        'pm.tool_name': attrs.tool_name,
        'pm.server_name': attrs.server_name ?? 'unknown',
      },
    },
    parentCtx,
  );
  const ctx = trace.setSpan(parentCtx, span);
  return { span, ctx };
}

/**
 * Start a child span for a hypothesis iteration.
 *
 * @param parentCtx — parent context (typically the investigation root context)
 */
export function startHypothesisSpan(
  parentCtx: Context,
  attrs: HypothesisSpanAttributes,
): { span: Span; ctx: Context } {
  const tracer = getTracer('orchestrator');
  const span = tracer.startSpan(
    `hypothesis:iteration-${attrs.iteration}`,
    {
      attributes: {
        'pm.investigation_id': attrs.investigation_id,
        'pm.domain': attrs.domain ?? 'unknown',
        'pm.hypothesis_id': attrs.hypothesis_id,
        'pm.hypothesis_iteration': attrs.iteration,
      },
    },
    parentCtx,
  );
  const ctx = trace.setSpan(parentCtx, span);
  return { span, ctx };
}

/**
 * Mark a span as errored and record the exception.
 *
 * Safe to call even when tracing is disabled — non-recording spans
 * silently ignore attribute/event operations.
 */
export function recordSpanError(span: Span, error: unknown): void {
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error instanceof Error ? error.message : String(error),
  });
  if (error instanceof Error) {
    span.recordException(error);
  }
}

// ---------------------------------------------------------------------------
// BullMQ trace context propagation
// ---------------------------------------------------------------------------

/** Carrier type used to serialize trace context into BullMQ job data. */
export interface TraceCarrier {
  _traceContext?: Record<string, string>;
}

/**
 * Inject the current trace context into a plain object (the BullMQ job
 * payload).  The injected `_traceContext` field can later be extracted
 * on the worker side with `extractTraceContext`.
 */
export function injectTraceContext<T extends Record<string, unknown>>(
  data: T,
): T & TraceCarrier {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return { ...data, _traceContext: carrier };
}

/**
 * Extract trace context from a BullMQ job payload and return a
 * `Context` that can be used as the parent for worker-side spans.
 *
 * Returns `context.active()` if no trace context is present (graceful
 * degradation for jobs enqueued before tracing was enabled).
 */
export function extractTraceContext(data: TraceCarrier): Context {
  if (!data._traceContext || Object.keys(data._traceContext).length === 0) {
    return context.active();
  }
  return propagation.extract(context.active(), data._traceContext);
}

/**
 * Return the current trace ID from the active context.
 *
 * Useful for injecting into log lines as `trace_id`.  Returns an empty
 * string when no active span exists.
 */
export function getActiveTraceId(): string {
  const span = trace.getActiveSpan();
  if (!span) return '';
  return span.spanContext().traceId;
}
