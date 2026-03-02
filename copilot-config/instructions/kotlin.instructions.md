---
applyTo: "**/*.kt"
---

# Kotlin Development Standards

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

    data class Dev(...) : ApplicationConfig()
    data class Prod(...) : ApplicationConfig()
    data class Local(...) : ApplicationConfig()
}
```

## Database Access

- Use Context7 to look up the project's ORM library before writing database code
- Check `build.gradle.kts` for actual dependencies — do not assume any specific ORM
- Parameterized queries always — never string interpolation in SQL
- Use Flyway for all schema migrations
- Implement Repository pattern with interface + implementation

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
- Check `build.gradle.kts` for actual test dependencies before writing tests
- Use descriptive test names: `` `should create user when valid data provided` ``
- Use MockOAuth2Server for auth testing

## Boundaries

### ✅ Always
- Use sealed classes for state and configuration
- Implement Repository pattern for database access
- Add Prometheus metrics for business operations
- Use Flyway for database migrations

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
