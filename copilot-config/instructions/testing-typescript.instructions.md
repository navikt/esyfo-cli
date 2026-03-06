---
applyTo: "**/*.{test,spec}.{ts,tsx}"
---

# Testing Standards (TypeScript)

## General
- Tests should describe behavior, not implementation
- Each test should test one thing
- Use descriptive test names that explain expected behavior
- Arrange → Act → Assert pattern

## Vitest/Jest + Testing Library
- Check existing test files and package.json for the test runner and Testing Library version.
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
