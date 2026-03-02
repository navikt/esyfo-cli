---
applyTo: "**/*.kt"
---

# Spring Boot Framework Patterns

## Controller Layer

```kotlin
@RestController
@RequestMapping("/api")
class ResourceController(
    private val service: ResourceService
) {
    @GetMapping("/resources/{id}")
    fun getResource(@PathVariable id: UUID): ResponseEntity<ResourceDTO> {
        val resource = service.findById(id)
        return ResponseEntity.ok(resource)
    }

    @PostMapping("/resources")
    fun createResource(@RequestBody @Valid request: CreateResourceRequest): ResponseEntity<ResourceDTO> {
        val created = service.create(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(created)
    }
}
```

## Service Layer

```kotlin
@Service
class ResourceService(
    private val repository: ResourceRepository
) {
    @Transactional
    fun create(request: CreateResourceRequest): ResourceDTO {
        val entity = request.toEntity()
        return repository.save(entity).toDTO()
    }
}
```

## Database Access (Spring Data JDBC)

```kotlin
@Repository
interface ResourceRepository : CrudRepository<ResourceEntity, UUID> {
    fun findByIdent(ident: String): List<ResourceEntity>

    @Query("SELECT * FROM resource WHERE status = :status")
    fun findByStatus(status: String): List<ResourceEntity>
}
```

## Auth (token-validation-spring)

```kotlin
@ProtectedWithClaims(issuer = "azuread")
@RestController
class ProtectedController {
    @GetMapping("/api/protected")
    fun protectedEndpoint(): ResponseEntity<Any> {
        // Token validation is handled automatically by the filter
        return ResponseEntity.ok(data)
    }
}
```

## Configuration

Use `application.yml` / `application-{profile}.yml` for Spring configuration:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_DATABASE}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  flyway:
    enabled: true
```

## Testing

- Use `@SpringBootTest` for integration tests
- Use Testcontainers for integration tests with real databases
- Use MockOAuth2Server for auth testing
- Use `@MockkBean` for mocking Spring beans

```kotlin
@SpringBootTest
class ResourceServiceTest {
    @MockkBean
    private lateinit var repository: ResourceRepository

    @Autowired
    private lateinit var service: ResourceService

    @Test
    fun `should create resource`() {
        every { repository.save(any()) } returns testEntity
        val result = service.create(request)
        result.id shouldBe testEntity.id
    }
}
```
