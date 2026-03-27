# Testing — Tilgjengelighet (UU)

Oppsett og eksempler for automatisert tilgjengelighetstesting.

## jest-axe (enhetstest)

```tsx
import { axe, toHaveNoViolations } from "jest-axe";
expect.extend(toHaveNoViolations);

it("should have no accessibility violations", async () => {
  const { container } = render(<MyComponent />);
  expect(await axe(container)).toHaveNoViolations();
});
```

## Playwright + axe-core (E2E)

```tsx
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("side har ingen tilgjengelighetsfeil", async ({ page }) => {
  await page.goto("/skjema");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("skjema er brukbart med tastatur", async ({ page }) => {
  await page.goto("/skjema");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).toBe("INPUT");
});
```

## Lighthouse CLI

```bash
# Kjør Lighthouse-tilgjengelighetssjekk
npx lighthouse http://localhost:3000 --only-categories=accessibility --output=json --output-path=./a11y-report.json

# Sjekk score i CI
npx lighthouse http://localhost:3000 --only-categories=accessibility --budget-path=./lighthouse-budget.json
```
