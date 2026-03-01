
## Tech Stack
- **Language**: Kotlin
- **Framework**: {{framework}}
- **Build**: Gradle (Kotlin DSL)
- **Database**: PostgreSQL{{database_details}}
- **Messaging**: {{messaging}}
- **Testing**: Kotest, MockK, Testcontainers
- **Auth**: Azure AD + TokenX (check `.nais/` for which are enabled)

## Backend Patterns
- Check `build.gradle.kts` for actual dependencies before suggesting libraries
- Use Flyway for all database migrations — never modify existing migrations
- Parameterized queries always — never string interpolation in SQL
- Use sealed classes for environment configuration (Dev/Prod/Local)
- Implement Repository pattern for database access
- Use Ktor extension functions for route organization
- Structured logging with KotlinLogging and `kv()` fields
- Follow existing code patterns in the repository

## Kafka (Rapids & Rivers)
- Use past tense for event names (`user_created`, not `create_user`)
- Include standard metadata (`@event_name`, `@id`, `@created_at`)
- Implement idempotency — check `@id` before processing
- Use `demandValue` for event type filtering, `requireKey` for required fields

## Boundaries

### ✅ Always
- Implement `/isalive`, `/isready`, `/metrics` endpoints
- Use Flyway for database migrations
- Add Prometheus metrics for business operations
- Validate JWT issuer, audience, and expiration

### ⚠️ Ask First
- Changing database schema or Kafka event schemas
- Modifying authentication configuration
- Adding new GCP resources

### 🚫 Never
- Skip database migration versioning
- Hardcode secrets or configuration values
- Use `!!` operator without null checks
- Bypass authentication checks
