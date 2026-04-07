---
description: "Nav-spesifikt for Ktor — NAVident JWT-claim, Koin DI, CallLogging MDC"
applyTo: "**/*.kt"
---

# Ktor — Nav-spesifikt

## Auth

```kotlin
authenticate("azureAd") {
    get("/api/protected") {
        val principal = call.principal<JWTPrincipal>()
        val navIdent = principal?.getClaim("NAVident", String::class)
    }
}
```

## Dependency Injection

Koin er standard DI-rammeverk for Ktor-repos i teamet (hvis `io.insert-koin` finnes i dependencies).

## Logging

```kotlin
install(CallLogging) {
    mdc("x_request_id") { call.request.header("X-Request-Id") ?: UUID.randomUUID().toString() }
}
```
