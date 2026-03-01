---
applyTo: "**/*.kt"
---

# Kotlin/Ktor Development Standards

## General
- Use `val` over `var` where possible
- Prefer data classes for DTOs and value objects
- Use sealed classes for representing restricted hierarchies
- Use extension functions for utility operations

## Configuration Pattern

Use sealed classes for environment-specific configuration:

```kotlin
sealed class ApplicationConfig {
    abstract val database: DatabaseConfig
    abstract val kafka: KafkaConfig

    data class Dev(...) : ApplicationConfig()
    data class Prod(...) : ApplicationConfig()
    data class Local(...) : ApplicationConfig()
}
```

## Ktor Routing

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

        // Health endpoints (unauthenticated)
        get("/isalive") { call.respondText("Alive") }
        get("/isready") { call.respondText("Ready") }
        get("/metrics") { call.respondText(meterRegistry.scrape()) }
    }
}
```

## Database Access

- Use Context7 to look up the project's ORM library before writing database code
- Check `build.gradle.kts` for actual dependencies — do not assume Kotliquery, Exposed, or JDBC
- Parameterized queries always — never string interpolation in SQL
- Use Flyway for all schema migrations
- Implement Repository pattern with interface + Postgres implementation

```kotlin
class RepositoryPostgres(private val dataSource: DataSource) : Repository {
    override fun findById(id: Long): Entity? {
        return using(sessionOf(dataSource)) { session ->
            session.run(
                queryOf("SELECT * FROM table WHERE id = ?", id)
                    .map { row -> Entity(id = row.long("id"), name = row.string("name")) }
                    .asSingle
            )
        }
    }
}
```

## Observability

```kotlin
// Structured logging with KotlinLogging
private val logger = KotlinLogging.logger {}

logger.info { "Processing event: ${event.id}" }
logger.error(exception) { "Failed to process event" }

// Prometheus metrics with Micrometer
val requestCounter = Counter.builder("http_requests_total")
    .tag("method", "GET")
    .register(meterRegistry)
```

## Error Handling
- Use Kotlin Result type or sealed classes for expected failures
- Throw exceptions only for unexpected/unrecoverable errors
- Always log errors with structured context (using `kv()` fields)

## Testing
- Use Kotest for test structure and assertions
- Use MockK for mocking — prefer `coEvery` for suspend functions
- Use Testcontainers for integration tests with real databases
- Use MockOAuth2Server for auth testing
- Test names should describe behavior: `` `should create user when valid data provided` ``

## Boundaries

### ✅ Always
- Use sealed classes for state and configuration
- Implement Repository pattern for database access
- Add Prometheus metrics for business operations
- Use Flyway for database migrations
- Implement all three health endpoints

### ⚠️ Ask First
- Changing database schema
- Modifying Kafka event schemas
- Adding new dependencies
- Changing authentication configuration

### 🚫 Never
- Skip database migration versioning
- Bypass authentication checks
- Use `!!` operator without null checks
- Commit configuration secrets
- Use string interpolation in SQL
