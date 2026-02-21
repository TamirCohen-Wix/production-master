/**
 * OpenTelemetry tracing setup for production-master cloud pipeline.
 *
 * Initializes the NodeSDK with OTLP exporter and auto-instruments
 * HTTP, pg, and ioredis libraries.
 *
 * Environment variables:
 *   OTEL_EXPORTER_OTLP_ENDPOINT — Collector endpoint (default: http://localhost:4318)
 *   OTEL_SERVICE_NAME            — Service name (default: production-master)
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { trace, type Tracer } from '@opentelemetry/api';

let sdk: NodeSDK | undefined;

/**
 * Initialize OpenTelemetry tracing.
 *
 * Must be called once at process startup, before any instrumented
 * library is imported. Calling more than once is a no-op.
 */
export function initTracing(): void {
  if (sdk) {
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
 * Return a named tracer instance.
 *
 * @param name — logical module name, e.g. "orchestrator" or "mcp-client"
 */
export function getTracer(name: string): Tracer {
  return trace.getTracer(name);
}
