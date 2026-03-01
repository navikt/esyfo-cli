---
description: Set up observability (metrics, logging, tracing) for a NAV application
---

# Observability Setup

Configure metrics, structured logging, and tracing for a NAV application.

## Steps

1. Read NAIS manifest to check current observability config
2. Check `build.gradle.kts` or `package.json` for existing observability dependencies
3. Use Context7 to look up the metrics library API (Micrometer, prom-client, etc.)
4. Search codebase for existing metric definitions and patterns

## Backend (Kotlin/Ktor)

### Required Endpoints
- `/isalive` — Liveness check
- `/isready` — Readiness check (verify dependencies)
- `/metrics` — Prometheus scrape endpoint

### NAIS Auto-Instrumentation
```yaml
spec:
  observability:
    autoInstrumentation:
      enabled: true
      runtime: java
```

### Structured Logging
```kotlin
logger.info("Processing request", kv("request_id", id), kv("user_id", userId))
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

- [ ] Health endpoints implemented (`/isalive`, `/isready`, `/metrics`)
- [ ] Auto-instrumentation enabled in NAIS manifest
- [ ] Structured logging configured (JSON to stdout)
- [ ] Custom business metrics defined where relevant
- [ ] No sensitive data in logs or metric labels
