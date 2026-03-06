---
applyTo: "**/*.kt"
---

> Framework-specific patterns for Ktor. These extend (and where overlapping, take precedence over) the base kotlin.instructions.md.

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
// Check existing log statements in the repo to match the established pattern
// SLF4J placeholder format (always available)
logger.info("Processing event: eventId={}", eventId)

// If logstash-logback-encoder is on the classpath:
// logger.info("Processing event {}", kv("event_id", eventId))

// Ktor CallLogging plugin for request-scoped MDC
install(CallLogging) {
    mdc("x_request_id") { call.request.header("X-Request-ID") }
}
```

## Dependency Injection (Koin)

> Guard: Only if `io.insert-koin` is listed in `build.gradle.kts`.

Koin is the standard DI framework for Ktor repos in team-esyfo. Install the Koin plugin once in `Application.module()` and define dependencies in separate module files:

```kotlin
install(Koin) {
    slf4jLogger()
    modules(appModule)
}

val appModule = module {
    single { Database() }
    single { UserRepository(get()) }
    single { UserService(get()) }
}
```

- Use `by inject<T>()` (lazy) in `Application` extension functions for route-level dependencies
- Use `get<T>()` for eager resolution inside Koin module definitions
- Organize modules by domain (e.g., `databaseModule`, `serviceModule`) and compose them in `modules(…)`
- **Always use web search to verify the Koin–Ktor API for the version in `build.gradle.kts`**

## Testing

- Use Kotest for structure and assertions
- Use Kotest DescribeSpec as the standard test style
- Use MockK for mocking — prefer `coEvery` for suspend functions
- Use Testcontainers for integration tests with real databases
- Use `testApplication { }` for route testing

```kotlin
class ResourceApiTest : DescribeSpec({
    describe("/api/resource") {
        it("should return 200 for authenticated request") {
            testApplication {
                application { api() }
                val response = client.get("/api/resource") {
                    bearerAuth(validToken)
                }
                response.status shouldBe HttpStatusCode.OK
            }
        }
    }
})
```
