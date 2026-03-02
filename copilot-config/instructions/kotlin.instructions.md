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

Follow the existing configuration approach in the codebase. Common patterns:
- Environment data classes with properties
- Sealed class hierarchies for multi-environment config

```kotlin
// Check existing config classes before creating new ones
// Follow whichever pattern the repo already uses
```

## Database Access

- Use Context7 to look up the project's ORM library before writing database code
- Check `build.gradle.kts` for actual dependencies — do not assume any specific ORM
- Parameterized queries always — never string interpolation in SQL
- Use Flyway for all schema migrations
- **Follow the repo's existing data access pattern** (Repository interfaces, extension functions, etc.)

## Observability

```kotlin
// Structured logging — follow existing pattern in the codebase (logger(), KotlinLogging, or SLF4J)
private val logger = LoggerFactory.getLogger(MyClass::class.java)

// Check which structured logging pattern this repo uses (kv(), MDC, etc.)
logger.info("Processing event", kv("event_id", eventId))
logger.error("Failed to process event", exception)

// Prometheus metrics with Micrometer
val requestCounter = Counter.builder("http_requests_total")
    .tag("method", "GET")
    .register(meterRegistry)
```

## Error Handling
- Use Kotlin Result type or sealed classes for expected failures
- Throw exceptions only for unexpected/unrecoverable errors
- Always log errors with structured context

## Testing
- Check `build.gradle.kts` for actual test dependencies before writing tests
- Use descriptive test names: `` `should create user when valid data provided` ``
- Use MockOAuth2Server for auth testing

## Boundaries

### ✅ Always
- Follow existing patterns in the codebase for config and data access
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
