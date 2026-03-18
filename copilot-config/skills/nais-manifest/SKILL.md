---
description: Generer NAIS-applikasjonsmanifest for team-esyfo — spec, ressurser, accessPolicy
---

# NAIS-manifest

Bruk denne skillen når du skal lage et komplett NAIS-manifest for en applikasjon i team-esyfo.

## Fremgangsmåte

1. Les eksisterende NAIS-manifester i `.nais/` eller `nais/` for å forstå hvordan applikasjonen er satt opp i dag.
2. Avklar om applikasjonen er backend (Kotlin) eller frontend (Node.js).
3. Kartlegg hvilke ressurser applikasjonen trenger, for eksempel database, Kafka, auth og ingress.
4. Gjenbruk eksisterende stier for health, readiness og metrics fra nåværende manifester.

## Mal

Generer manifestet med denne strukturen:

```yaml
apiVersion: nais.io/v1alpha1
kind: Application
metadata:
  name: {app-name}
  namespace: team-esyfo
  labels:
    team: team-esyfo
spec:
  image: {{ image }}
  port: 8080  # Sjekk eksisterende manifester for faktisk port
  # Sjekk eksisterende manifester for riktige paths — disse varierer per repo
  prometheus:
    enabled: true
    path: /metrics
  liveness:
    path: /isalive
  readiness:
    path: /isready
  resources:
    requests:
      cpu: 50m
      memory: 256Mi
    limits:
      memory: 512Mi
  replicas:
    min: 2
    max: 4
```

**Viktig**: Sjekk alltid eksisterende NAIS-manifester for korrekt `prometheus.path`, `liveness.path` og `readiness.path`. Disse varierer mellom repoer, for eksempel `/metrics` vs `/internal/prometheus` og `/isalive` vs `/internal/health/livenessState`.

Legg til seksjoner for `gcp.sqlInstances`, `kafka`, `azure`, `tokenx`, `accessPolicy` og `ingresses` ved behov, basert på kravene til applikasjonen.
