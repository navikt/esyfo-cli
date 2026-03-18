---
applyTo: "**/*"
---

# Observability — Nav

## Metric Naming
- `snake_case` with unit suffix (`_seconds`, `_bytes`, `_total`)
- `_total` suffix on counters
- No high-cardinality labels (`user_id`, `email`, `transaction_id`)

## Logging
- Structured JSON to stdout/stderr
- Include `trace_id` in all log entries
- Follow existing logging patterns in the codebase

## Boundaries

### ⚠️ Ask First
- New metric labels (cardinality impact)
- Changing alert thresholds in production

### 🚫 Never
- High-cardinality labels
- Log sensitive data (PII, tokens, passwords)
- camelCase metric names
