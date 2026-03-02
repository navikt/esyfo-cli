---
applyTo: "**/*.kt,**/*.ts,**/*.tsx"
---

# Observability Standards

## NAV Observability Stack
- **Prometheus**: Metrics collection (pull-based scraping)
- **Grafana**: Visualization (https://grafana.nav.cloud.nais.io)
- **Grafana Loki**: Log aggregation
- **Grafana Tempo**: Distributed tracing (OpenTelemetry)
- **Alert Manager**: Alert routing (Slack integration)

## Required Health Endpoints
Every NAIS app must implement: `/isalive`, `/isready`, `/metrics`

## Metric Naming
- Use `snake_case` with unit suffix (`_seconds`, `_bytes`, `_total`)
- Add `_total` suffix to counters
- Avoid high-cardinality labels (`user_id`, `email`, `transaction_id`)

## Structured Logging
Log to stdout/stderr with structured JSON. Use `kv()` fields for context:
```kotlin
logger.info("Processing event", kv("event_id", eventId), kv("user_id", userId))
```

## Boundaries

### ✅ Always
- Use snake_case for metric names with unit suffix
- Include `/metrics`, `/isalive`, `/isready` endpoints
- Log to stdout/stderr (not files)
- Use structured logging (JSON)
- Include `trace_id` in logs

### ⚠️ Ask First
- Changing alert thresholds in production
- Adding new metric labels (cardinality impact)

### 🚫 Never
- Use high-cardinality labels
- Log sensitive data (PII, tokens, passwords)
- Skip the `/metrics` endpoint
- Use camelCase for metric names
