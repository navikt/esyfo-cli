---
description: 'Autentisering i TypeScript med Oasis — token-validering og on-behalf-of'
applyTo: "src/**/*.{ts,tsx}"
---

# Authentication — TypeScript (Oasis)

Bruk `@navikt/oasis` for token-validering og -utveksling i Node.js/TypeScript-applikasjoner.

Sjekk eksisterende kode i repoet for etablert auth-mønster før du legger til nytt.

## Validering

```typescript
import { validateToken, getToken } from "@navikt/oasis"

const token = getToken(req) // Extracts Bearer token from request/headers
const result = await validateToken(token)
// result: { ok: true, payload: JWTPayload } | { ok: false, error, errorType }
```

Spesifikke varianter: `validateAzureToken()`, `validateIdportenToken()`, `validateTokenxToken()`

## Token-utveksling (OBO)

```typescript
import { requestOboToken } from "@navikt/oasis"

const obo = await requestOboToken(token, "cluster:namespace:app")
// TokenX audience format: "cluster:namespace:app"
// Azure audience format: "api://cluster.namespace.app/.default"
if (obo.ok) {
  // obo.token — bruk dette i Authorization header mot downstream-tjeneste
  // OBS: TokenResult kan IKKE stringifyes — bruk alltid .token
}
```

## M2M (Client Credentials)

```typescript
import { requestAzureClientCredentialsToken } from "@navikt/oasis"

const m2m = await requestAzureClientCredentialsToken("api://cluster.namespace.app/.default")
```

## Parsing av brukerinfo

```typescript
import { parseAzureUserToken, parseIdportenToken } from "@navikt/oasis"

const azure = parseAzureUserToken(token) // → { oid, NAVident, name, preferred_username, groups }
const idporten = parseIdportenToken(token) // → { pid } (personnummer)
```

## Caching

Oasis har innebygd token-caching (SIEVE-algoritme) med Prometheus-metrikker (`oasis_cache_hits_total`, `oasis_cache_misses_total`). Ingen manuell cache-konfigurasjon nødvendig.

## Boundaries

### ✅ Always
- Sjekk `.ok` på result types før bruk av token/payload
- Bruk `getToken()` for å ekstrahere Bearer token fra request

### 🚫 Never
- Stringify `TokenResult` direkte — bruk `.token`
- Store tokens i localStorage
