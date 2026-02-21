# Production Master Feedback

Submit structured feedback for a completed investigation.

## Usage

`/production-master-feedback <INVESTIGATION_ID> <accurate|partially_accurate|inaccurate> [optional correction]`

Examples:

- `/production-master-feedback inv-2026-02-21-123 accurate`
- `/production-master-feedback inv-2026-02-21-123 inaccurate "Should have focused on DNS errors"`

## Behavior

1. Parse arguments into:
   - `investigation_id`
   - `rating`
   - `corrected_root_cause` (optional)
2. Submit feedback to cloud API:
   - `POST /api/v1/investigations/:id/feedback`
3. If cloud API is unavailable, fall back to creating a feedback issue through `/production-master-report`.

## Payload

```json
{
  "rating": "partially_accurate",
  "corrected_root_cause": "Additional or corrected RCA context",
  "submitted_by": "cursor-adapter"
}
```

## Notes

- Rating values must be one of: `accurate`, `partially_accurate`, `inaccurate`.
- Keeps Cursor surface aligned with cloud feedback ingestion workflow.
