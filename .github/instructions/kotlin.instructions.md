---
applyTo: "**/*.kt"
---

# Kotlin — Nav-spesifikke standarder

- Avhengigheter via Gradle Version Catalog — sjekk `libs.versions.toml`
- Database: Flyway for migreringer, parameteriserte queries (aldri string-interpolasjon i SQL)
- Logging: Sjekk eksisterende loggemønster i repoet (`KotlinLogging`, `kv()`-felter, MDC)
- Metrikker: Micrometer / Prometheus
- Auth-testing: MockOAuth2Server
- Se `tech-stack`-skillen for teamets bibliotekpreferanser
