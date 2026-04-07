---
description: "Nav-spesifikt for Spring Boot — @ProtectedWithClaims, NAIS env vars, testing"
applyTo: "**/*.kt"
---

# Spring Boot — Nav-spesifikt

## Auth

```kotlin
@ProtectedWithClaims(issuer = "azuread", claimMap = ["NAVident=*"])
```
Krever `token-validation-spring`-avhengigheten.

## NAIS-miljøvariabler for database

```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_DATABASE}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
```

## Testing

- `@SpringBootTest` + Testcontainers for integrasjonstester
- `@MockkBean` (krever `com.ninja-squad:springmockk`)
- MockOAuth2Server for auth-tester
