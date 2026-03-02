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

## Database Access (Kotliquery)

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
