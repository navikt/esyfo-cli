
## Tech Stack
- **Language**: Kotlin
- **Framework**: {{framework}}
- **Build**: Gradle (Kotlin DSL)
- **Database**: {{database}}
- **Messaging**: {{messaging}}
- **Testing**: {{testing}}
- **Auth**: Les NAIS-manifestene i prosjektet for å finne hvilke auth-mekanismer som er konfigurert (mulige: Azure AD, TokenX, ID-porten, Maskinporten)

## Backend Patterns
- Check `build.gradle.kts` for actual dependencies before suggesting libraries
- Use Flyway for all database migrations — never modify existing migrations
- Parameterized queries always — never string interpolation in SQL
- Follow the existing data access pattern in the repository (extension functions, repositories, etc.)
- Structured logging — check which pattern this repo uses (KotlinLogging, SLF4J, kv() fields, MDC)
- Follow existing code patterns in the repository

## Boundaries

### ✅ Always
- Run `./gradlew build` after changes
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
