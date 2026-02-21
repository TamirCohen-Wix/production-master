---
description: "Log System — Abstract Capability Skill Reference"
user-invocable: false
capability: log-system
provider: abstract
---

# Log System — Capability Skill Reference

Abstract capability contract for production log querying, metrics, error analysis, and request tracing.

This skill defines normalized operations. Concrete providers (for example `grafana-datasource`) map their query formats and APIs to this interface.

---

## Tool Decision Matrix

| Need | Operation |
|------|-----------|
| Pull raw log lines around an incident | `query_logs` |
| Validate spikes/trends | `query_metrics` |
| Inspect specific error signatures | `get_error_details` |
| Follow one request across services | `trace_request` |
| Discover candidate services/datasources | `list_services` |

---

## Operations

### query_logs

Query application logs with filters and time range.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Log query expression |
| `from_time` | string (ISO 8601) | Yes | Start of time range |
| `to_time` | string (ISO 8601) | Yes | End of time range |
| `service_id` | string | No | Service/artifact identifier to scope logs |
| `level` | enum: DEBUG, INFO, WARN, ERROR | No | Minimum log level filter |
| `limit` | integer (1-500) | No | Maximum log entries to return |

**Returns:** `{ entries: [...], total: number }`

Each entry contains: `timestamp`, `level`, `message`, `service_id`, `request_id`, `metadata`.

---

### query_metrics

Query time-series metrics (CPU, memory, request rates, latency).

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `expression` | string | Yes | Metric query expression (PromQL, etc.) |
| `from_time` | string (ISO 8601) | Yes | Start of time range |
| `to_time` | string (ISO 8601) | No | End of time range |
| `step` | string | No | Query resolution step (e.g., 5m, 1h) |

**Returns:** `{ series: [{ labels: {...}, datapoints: [{timestamp, value}] }] }`

---

### get_error_details

Get detailed information about error occurrences for a service.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `service_id` | string | Yes | Service/artifact identifier |
| `from_time` | string (ISO 8601) | Yes | Start of time range |
| `to_time` | string (ISO 8601) | Yes | End of time range |
| `error_class` | string | No | Filter by exception class name |
| `limit` | integer | No | Maximum error entries |

**Returns:** `{ errors: [{ timestamp, error_class, error_code, message, stack_trace, request_id }], total: number }`

---

### trace_request

Trace a single request across all services by request ID.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `request_id` | string | Yes | Request correlation ID to trace |
| `from_time` | string (ISO 8601) | Yes | Start of time range |
| `to_time` | string (ISO 8601) | Yes | End of time range |

**Returns:** `{ spans: [{ timestamp, service_id, level, message, caller }] }`

---

### list_services

List available services/datasources for log querying.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type_filter` | string | No | Optional filter by datasource type |

**Returns:** `{ services: [{ id, name, type }] }`

---

## Standard Investigation Workflow

1. Discover available scope with `list_services`.
2. Run `query_logs` in the initial incident window.
3. If errors are found, enrich with `get_error_details`.
4. Use `trace_request` for request-level propagation.
5. Correlate with `query_metrics` to validate scale and timing.

---

## Guardrails

- Always use explicit `from_time` and `to_time`.
- Keep filters narrow first, then broaden progressively.
- Preserve request IDs and service IDs in outputs for downstream agents.
- Separate data collection from interpretation.

---

## Common Failure Modes

- Querying too broad a time window initially.
- Dropping request IDs from report outputs.
- Treating a metrics spike as proof without matching log evidence.
