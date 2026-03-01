---
description: Generate a NAIS application manifest for team-esyfo
---

# Generate NAIS Manifest

Create a complete NAIS manifest for this application.

## Steps

1. Read existing NAIS manifests in `.nais/` directory to understand current setup
2. Check if the app is backend (Kotlin) or frontend (Node.js)
3. Determine required resources: database, Kafka, auth, ingress

## Template

Generate a manifest following this structure:

```yaml
apiVersion: nais.io/v1alpha1
kind: Application
metadata:
  name: {app-name}
  namespace: teamesyfo
  labels:
    team: teamesyfo
spec:
  image: {{image}}
  port: 8080
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

Add sections for `gcp.sqlInstances`, `kafka`, `azure`, `tokenx`, `accessPolicy`, and `ingresses` as needed based on the application's requirements.
