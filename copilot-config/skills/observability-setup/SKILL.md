---
description: Set up observability (metrics, logging, tracing) for a NAV application
---

# Observability Setup

Configure metrics, structured logging, and tracing for a NAV application.

## Steps

1. Read NAIS manifest to check current observability config and endpoint paths
2. Check `build.gradle.kts` or `package.json` for existing observability dependencies
3. Check existing code for metrics library patterns (Micrometer, prom-client, etc.).
4. Search codebase for existing metric definitions, logging patterns, and health endpoints

## Backend (Kotlin)

### Health & Metrics Endpoints
Check existing NAIS manifests and `application.yaml` for the actual paths — these vary per repo (e.g. `/isalive` vs `/internal/health/livenessState`, `/metrics` vs `/internal/prometheus`).

### NAIS Auto-Instrumentation
```yaml
spec:
  observability:
    autoInstrumentation:
      enabled: true
      runtime: java
```

### Structured Logging
Follow the existing logging pattern in the codebase (look for `kv()` helpers, MDC, or structured argument patterns):
```kotlin
logger.info("Processing event", kv("event_id", eventId))
```

## Frontend (Next.js/Vite)

### NAIS Auto-Instrumentation
```yaml
spec:
  observability:
    autoInstrumentation:
      enabled: true
      runtime: nodejs
```

## Checklist

- [ ] Health and metrics endpoints implemented (verify paths from NAIS manifest)
- [ ] Auto-instrumentation enabled in NAIS manifest
- [ ] Structured logging configured (JSON to stdout)
- [ ] Custom business metrics defined where relevant
- [ ] No sensitive data in logs or metric labels
