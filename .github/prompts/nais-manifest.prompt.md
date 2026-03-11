---
description: Generate a NAIS application manifest for team-esyfo
---
<!-- Managed by esyfo-cli. Do not edit manually. Changes will be overwritten.
     For repo-specific customizations, create your own files without this header. -->

# Generate NAIS Manifest

Create a complete NAIS manifest for this application.

## Steps

1. Read existing NAIS manifests in `.nais/` or `nais/` directory to understand current setup
2. Check if the app is backend (Kotlin) or frontend (Node.js)
3. Determine required resources: database, Kafka, auth, ingress
4. Reuse existing health, readiness, and metrics paths from the current manifests

## Template

Generate a manifest following this structure:

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
  port: 8080  # Check existing manifests for actual port
  # Check existing manifests for correct paths — these vary per repo
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

**Important**: Check existing NAIS manifests for the correct `prometheus.path`, `liveness.path`, and `readiness.path`. These vary per repo (e.g. `/metrics` vs `/internal/prometheus`, `/isalive` vs `/internal/health/livenessState`).

Add sections for `gcp.sqlInstances`, `kafka`, `azure`, `tokenx`, `accessPolicy`, and `ingresses` as needed based on the application's requirements.
