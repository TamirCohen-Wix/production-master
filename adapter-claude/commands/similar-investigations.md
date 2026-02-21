# Similar Investigations

Find similar past investigations by semantic similarity.

## Usage

`/similar-investigations <INVESTIGATION_ID> [--limit N]`

Examples:

- `/similar-investigations inv-2026-02-21-123`
- `/similar-investigations inv-2026-02-21-123 --limit 10`

## Behavior

1. Parse `$ARGUMENTS` into:
   - `investigation_id` (required)
   - `--limit N` (optional, default 5, max 20)
2. Resolve Cloud API URL:
   - `PRODUCTION_MASTER_CLOUD_URL` environment variable, OR
   - `cloud_api_url` from domain config (`domain.json`), OR
   - Error with setup instructions
3. Resolve API key:
   - `PRODUCTION_MASTER_API_KEY` environment variable (required)
4. HTTP GET `{URL}/api/v1/investigations/{id}/similar?limit={N}` with `x-api-key` header
5. Format results as a markdown table:

| Ticket | Similarity | Summary |
|--------|-----------|---------|
| SCHED-123 | 94.2% | Connection pool exhaustion caused cascading 500s |
| SCHED-456 | 87.1% | DNS resolution timeout in upstream service |

## Error Handling

- **Missing API key:** Print setup instructions for `PRODUCTION_MASTER_API_KEY`
- **Network error:** "Cloud API unavailable — check connectivity and PRODUCTION_MASTER_CLOUD_URL"
- **404 response:** "Investigation not found or no embedding available yet"

## Notes

- Similarity is computed via pgvector cosine distance on investigation embeddings.
- The `--limit` flag caps at 20 to avoid excessive result sets.
