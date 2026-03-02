---
applyTo: "**/*.kt"
---

# Ktor Framework Patterns

## Routing

Structure routes using extension functions on `Application`:

```kotlin
fun Application.api() {
    routing {
        authenticate("azureAd") {
            get("/api/resource") {
                val user = call.principal<JWTPrincipal>()
                call.respond(HttpStatusCode.OK, data)
            }
        }
    }
}
```

## Database Access

Check `build.gradle.kts` for the actual database library before writing queries. Common patterns in team-esyfo Ktor apps:

```kotlin
// Extension functions on a database interface (raw JDBC / HikariCP):
fun DatabaseInterface.findById(id: Long): Entity? {
    val stmt = "SELECT * FROM table WHERE id = ?"
    return connection.prepareStatement(stmt).use { ps ->
        ps.setLong(1, id)
        ps.executeQuery().toList { toEntity() }
    }.firstOrNull()
}

// Kotliquery (if dependency is present):
using(sessionOf(dataSource)) { session ->
    session.run(queryOf("SELECT * FROM table WHERE id = ?", id)
        .map { row -> Entity(row.long("id"), row.string("name")) }.asSingle)
}
```

**Always follow the existing data access pattern in the repo.**

## Auth (Ktor JWT)

```kotlin
authenticate("azureAd") {
    get("/api/protected") {
        val principal = call.principal<JWTPrincipal>()
        val navIdent = principal?.getClaim("NAVident", String::class)
        call.respond(HttpStatusCode.OK, data)
    }
}
```

## Structured Logging

```kotlin
// Check which pattern this repo uses
logger.info("Processing event", kv("event_id", eventId))
// or with MDC for request-scoped context
MDC.put("x_request_id", requestId)
logger.info("Processing event: eventId={}", eventId)
```

## Testing

- Use Kotest for structure and assertions
- Use Kotest DescribeSpec as the standard test style
- Use MockK for mocking — prefer `coEvery` for suspend functions
- Use Testcontainers for integration tests with real databases
- Use `testApplication { }` for route testing

```kotlin
@Test
fun `should return 200 for authenticated request`() = testApplication {
    application { api() }
    val response = client.get("/api/resource") {
        bearerAuth(validToken)
    }
    response.status shouldBe HttpStatusCode.OK
}
```
