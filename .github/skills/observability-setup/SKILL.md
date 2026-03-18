---
description: Sett opp og vedlikehold observability — metrikker, navngivning, logging, tracing for Nav-applikasjoner
---

# Sett opp observability

Konfigurer metrikker, strukturert logging og tracing for en Nav-applikasjon.

## Steg

1. Les NAIS-manifestet for å sjekke gjeldende observability-konfigurasjon og endepunktstier.
2. Sjekk `build.gradle.kts` eller `package.json` for eksisterende observability-avhengigheter.
3. Sjekk eksisterende kode for mønstre i metrics-biblioteket (Micrometer, prom-client osv.).
4. Søk i kodebasen etter eksisterende metrikkdefinisjoner, logging-mønstre og health-endepunkter.

## Metrikk-navngivning

- Bruk `snake_case`.
- Bruk enhetssuffiks der det er relevant, for eksempel `_seconds`, `_bytes` og `_total`.
- Countere skal ha suffikset `_total`.
- Unngå labels med høy kardinalitet, som `user_id`, `email` og `transaction_id`.
- Ikke bruk `camelCase` i metrikk-navn.

## Backend (Kotlin)

### Endepunkter for health og metrics
Sjekk eksisterende NAIS-manifester og `application.yaml` for de faktiske stiene — disse varierer fra repo til repo (for eksempel `/isalive` vs `/internal/health/livenessState`, `/metrics` vs `/internal/prometheus`).

### NAIS Auto-Instrumentation
```yaml
spec:
  observability:
    autoInstrumentation:
      enabled: true
      runtime: java
```

### Strukturert logging
Følg det eksisterende logging-mønsteret i kodebasen (se etter `kv()`-hjelpere, MDC eller mønstre for strukturerte argumenter):
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

## Logging

- Structured JSON to stdout/stderr.
- Include `trace_id` in all log entries.
- Follow existing logging patterns in the codebase.
- Never log sensitive data such as PII, tokens or passwords.

## Sjekkliste

- [ ] Health- og metrics-endepunkter er implementert (verifiser stier fra NAIS-manifestet)
- [ ] Auto-instrumentation er aktivert i NAIS-manifestet
- [ ] Strukturert logging er konfigurert (JSON til stdout)
- [ ] Egendefinerte business-metrics er definert der det er relevant
- [ ] Ingen sensitive data i logger eller metric-labels

## Boundaries

### ✅ Always
- Include `trace_id` in log entries
- Use `snake_case` with unit suffix for metrics
- Follow existing logging patterns

### ⚠️ Ask First
- New metric labels (cardinality impact)
- Changing alert thresholds in production

### 🚫 Never
- High-cardinality labels
- Log sensitive data (PII, tokens, passwords)
- camelCase metric names
