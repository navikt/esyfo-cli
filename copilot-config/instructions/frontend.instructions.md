---
applyTo: "**/*.tsx,**/*.ts,**/*.css"
---

# Frontend & Aksel Standards

## NAV Aksel Design System
- Components: `@navikt/ds-react`
- Icons: `@navikt/aksel-icons`
- Tokens: `@navikt/ds-tokens` (spacing, colors, typography)
- Documentation: aksel.nav.no

### Key Principles
- Use Aksel components for all standard UI elements
- Use design tokens for spacing (`--a-spacing-*`), colors, typography
- Follow Aksel's composition patterns (e.g., `<Table>`, `<Table.Header>`, `<Table.Row>`)
- Check aksel.nav.no for component API before implementing

## Accessibility (UU) — WCAG 2.1 AA
- All interactive elements must be keyboard accessible
- Use semantic HTML (`<nav>`, `<main>`, `<section>`, `<article>`)
- All images need `alt` text (decorative: `alt=""`)
- Color contrast minimum 4.5:1 for text
- Form inputs must have associated `<label>` elements
- Error messages must be programmatically associated with inputs
- Use `aria-live` for dynamic content updates

## Context7 Workflow
```
Step 1: Identify framework and Aksel version from package.json
Step 2: context7-resolve-library-id → resolve @navikt/ds-react (or framework)
Step 3: context7-query-docs → get component API, patterns, usage examples
```

## Testing
- Use Context7 to look up the project's testing framework (Vitest, Jest, Testing Library)
- Test user interactions, not implementation details
- Use `screen.getByRole()` over `getByTestId()`
- Test keyboard navigation for interactive components

## Boundaries

### ✅ Always
- Use Aksel components from `@navikt/ds-react`
- Use design tokens for styling
- Follow WCAG 2.1 AA accessibility standards
- Check Context7 for component API before using
- Follow existing patterns in the codebase

### ⚠️ Ask First
- Adding new npm dependencies
- Changing routing patterns
- Introducing new state management solutions

### 🚫 Never
- Use raw HTML for elements Aksel provides
- Hardcode colors, spacing, or typography values
- Skip accessibility requirements
- Import from `@navikt/ds-react` internals
