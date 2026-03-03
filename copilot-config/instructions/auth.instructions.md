---
applyTo: "**/*"
---

# Authentication Standards

## Authentication Types in NAV

### 1. Azure AD (Internal NAV Users)
```yaml
azure:
  application:
    enabled: true
    tenant: nav.no
```
Env vars: `AZURE_APP_CLIENT_ID`, `AZURE_APP_CLIENT_SECRET`, `AZURE_APP_WELL_KNOWN_URL`, `AZURE_OPENID_CONFIG_JWKS_URI`

### 2. TokenX (Service-to-Service, on-behalf-of)
```yaml
tokenx:
  enabled: true
accessPolicy:
  inbound:
    rules:
      - application: calling-service
        namespace: team-calling
```
Env vars: `TOKEN_X_WELL_KNOWN_URL`, `TOKEN_X_CLIENT_ID`, `TOKEN_X_PRIVATE_JWK`

### 3. ID-porten (Citizens)
```yaml
idporten:
  enabled: true
  sidecar:
    enabled: true
    level: Level4
```

### 4. Maskinporten (External Organizations)
```yaml
maskinporten:
  enabled: true
  scopes:
    consumes:
      - name: "nav:example/scope"
```

## Approach
1. Read NAIS manifest to identify which auth mechanisms are configured
2. Search codebase for existing JWT validation setup and follow the same pattern
3. Search codebase for existing auth implementations and follow them

## Testing
Use the appropriate mock auth server for your framework (search the codebase for existing test auth setup before adding new dependencies).

## Boundaries

### ✅ Always
- Validate JWT issuer, audience, expiration, and signature
- Use HTTPS only for token transmission
- Define explicit `accessPolicy`
- Use env vars from NAIS (never hardcode)

### ⚠️ Ask First
- Changing access policies in production
- Modifying token validation rules

### 🚫 Never
- Hardcode client secrets or tokens
- Log full JWT tokens
- Skip token validation
- Store tokens in localStorage
