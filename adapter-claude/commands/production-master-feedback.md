# Production Master Feedback

Capture structured feedback for a completed investigation.

## Usage

`/production-master-feedback <INVESTIGATION_ID> <accurate|partially_accurate|inaccurate> [optional correction]`

Examples:

- `/production-master-feedback inv-2026-02-21-123 accurate`
- `/production-master-feedback inv-2026-02-21-123 inaccurate "Root cause was DNS timeout in CoreDNS"`

## Behavior

1. Parse arguments into:
   - `investigation_id`
   - `rating`
   - `corrected_root_cause` (optional)
2. Submit feedback to cloud API:
   - `POST /api/v1/investigations/:id/feedback`
3. If cloud API is unavailable, fall back to opening a GitHub issue via `/production-master-report`.

## Payload

```json
{
  "rating": "inaccurate",
  "corrected_root_cause": "Root cause details here",
  "submitted_by": "claude-adapter"
}
```

## Notes

- This command closes the feedback-loop gap for Claude adapter parity.
- Rating values must be one of: `accurate`, `partially_accurate`, `inaccurate`.
