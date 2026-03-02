---
applyTo: "**/*.{test,spec}.{ts,tsx,kt,kts}"
---

# Testing Standards

## General
- Tests should describe behavior, not implementation
- Each test should test one thing
- Use descriptive test names that explain expected behavior
- Arrange → Act → Assert pattern

## Kotlin (Kotest + MockK)
- Use Context7 to check Kotest version and API
- Use `should` matchers for assertions
- Use Kotest DescribeSpec as the standard test style
- Use MockK for mocking — prefer `coEvery` for suspend functions
- Use Testcontainers for integration tests with real databases
- Use MockOAuth2Server for auth testing

```kotlin
@Test
fun `should process event correctly`() {
    val input = createTestInput()
    val result = service.process(input)
    result shouldBe expectedResult
    result.status shouldBe "completed"
}
```

### Testing Auth (MockOAuth2Server)

```kotlin
private val mockOAuth2Server = MockOAuth2Server()

@Test
fun `should authenticate with valid token`() {
    val token = mockOAuth2Server.issueToken(
        issuerId = "azuread",
        subject = "test-user",
        claims = mapOf("preferred_username" to "test@nav.no")
    )
    val response = client.get("/api/protected") { bearerAuth(token.serialize()) }
    response.status shouldBe HttpStatusCode.OK
}
```

## Integration Tests
- Use real dependencies where feasible (Testcontainers, MSW, or H2)
- Test the full flow, not just units in isolation
- Clean up test data after each test

## TypeScript (Vitest/Jest + Testing Library)
- Use Context7 to check the test runner and Testing Library version
- Use `screen.getByRole()` over `getByTestId()`
- Test user interactions, not component internals
- Use `userEvent` over `fireEvent` for realistic interactions
- Test accessibility: keyboard navigation, screen reader behavior

```typescript
describe('formatNumber', () => {
  it('should format numbers with Norwegian locale', () => {
    const formatted = new Intl.NumberFormat('nb-NO').format(151354);
    expect(formatted).toMatch(/151\s354/); // handles both regular and non-breaking space
  });
});
```

### Testing React Components

```typescript
import { render, screen } from '@testing-library/react';

it('should render title', () => {
  render(<MetricCard title="Total" value={100} />);
  expect(screen.getByText('Total')).toBeInTheDocument();
});
```

## Test Naming

```kotlin
// ✅ Good
`should create user when valid data provided`
`should throw exception when email is invalid`

// ❌ Bad
`test1`
`createUserTest`
```

## Boundaries

### ✅ Always
- Write tests for new code before committing
- Test both success and error cases
- Use descriptive test names
- Run full test suite before pushing

### ⚠️ Ask First
- Changing test framework or structure
- Disabling or skipping tests

### 🚫 Never
- Commit failing tests
- Skip tests without good reason
- Share mutable state between tests
