---
description: "Log System — Abstract Capability Skill Reference"
user-invocable: false
capability: log-system
provider: abstract
---

# Log System — Capability Skill Reference

Abstract capability contract for production log querying, metrics, error analysis, and request tracing. This skill file defines the normalized tool interface — the actual MCP server translates to the active provider (Grafana, Datadog, Splunk, etc.).

---

## Tools

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
