
# Fire Console — Standalone Domain Object Query

You query Wix production domain objects directly via Fire Console gRPC. No subagents — execute MCP calls inline.

---

## Step 0: Load Domain Config

Detect the current repo name from `git remote get-url origin` (strip path and `.git` suffix).

Search for domain config in this order:
1. `~/.claude/production-master/domains/<repo-name>/domain.json` (primary)
2. `.claude/domain.json` (repo-local fallback)
3. `~/.claude/domain.json` (legacy global fallback)

If found, extract:
```
ARTIFACT_PREFIX = domain.json → artifact_prefix
PRIMARY_SERVICES = domain.json → primary_services (array of {name, artifact_id})
```

If not found: log "No domain.json found. You may need to provide full artifact IDs manually."

---

## Step 1: Parse Arguments

Parse `$ARGUMENTS` and classify the query type:

| Query Type | Trigger | Example |
|-----------|---------|---------|
| **FIND_SITE** | MSID, site name, or "find site" | `find site abc123`, `site info for my-store` |
| **GET_BOOKING** | booking ID or "booking" keyword | `get booking abc-123`, `booking details for xyz` |
| **GET_SERVICE** | service ID or "service" keyword | `get service abc-123`, `service config for xyz` |
| **GET_EVENT** | event ID or "event" keyword | `get event abc-123`, `calendar event xyz` |
| **SEARCH_SERVICES** | "search" or artifact keyword | `search bookings`, `find artifact for notifications` |
| **INVOKE_RPC** | explicit RPC call details | `invoke GetEnrichedBooking on bookings-bo-enriched-query-bookings` |

Extract identifiers: MSID, booking_id, service_id, event_id, artifact_id from the input.

---

## Step 2: Load Skill

Read `skills/fire-console/SKILL.md` for exact tool parameters, artifact naming, and payload formats.

---

## Step 3: Execute

Load the required tools:
```
ToolSearch("+fire-console invoke_rpc")
ToolSearch("+fire-console search_services")
ToolSearch("+fire-console find_site")
ToolSearch("+fire-console list_services")
ToolSearch("+fire-console get_method_schema")
```

### FIND_SITE
```
find_site(query: "<MSID or site name>")
```

### GET_BOOKING
```
invoke_rpc(
  target: { artifactId: "{ARTIFACT_PREFIX}.bookings-bo-enriched-query-bookings" },
  service: "com.wixpress.bookings.boBookingEnricher.EnrichedBookingService",
  method: "GetEnrichedBooking",
  payload: { "bookingId": "<BOOKING_ID>" },
  aspects: { "meta-site-id": "<MSID>" }
)
```
If no MSID provided, ask the user for it.

### GET_SERVICE
```
invoke_rpc(
  target: { artifactId: "{ARTIFACT_PREFIX}.services-2" },
  service: "wix.bookings.services.v2.ServicesService",
  method: "GetService",
  payload: { "id": "<SERVICE_ID>" },
  aspects: { "meta-site-id": "<MSID>" }
)
```

### GET_EVENT
```
invoke_rpc(
  target: { artifactId: "com.wixpress.calendar.events-3" },
  service: "wix.calendar.events.v3.EventsService",
  method: "GetEvent",
  payload: { "id": "<EVENT_ID>" },
  aspects: { "meta-site-id": "<MSID>" }
)
```

### SEARCH_SERVICES
```
search_services(query: "<keyword>", type: "artifact")
```

### INVOKE_RPC
Use `list_services` to discover methods, then `invoke_rpc` with the user-provided details.

---

## Step 4: Present Results

```
=== Fire Console: <query_type> ===

### Result
[Formatted response data — key fields highlighted]

### Raw Response
[Full JSON response in code block for reference]
```

**Rules:**
- If an RPC call fails, report the error immediately with the exact error message.
- If the artifact ID is wrong, suggest using `search_services` to find the correct one.
- If MSID is required but missing, ask the user before proceeding.
- Never fabricate data.
