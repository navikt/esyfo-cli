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

## Documentation Lookup
```
For Aksel (@navikt/ds-react): Check aksel.nav.no for component API and usage examples
For other libraries: Use web search to find and verify API documentation
```

## Testing
- Look up the project's testing framework documentation via web search (Vitest, Jest, Testing Library)
- Test user interactions, not implementation details
- Use `screen.getByRole()` over `getByTestId()`
- Test keyboard navigation for interactive components

## Boundaries

### ✅ Always
- Use Aksel components from `@navikt/ds-react`
- Use design tokens for styling
- Follow WCAG 2.1 AA accessibility standards
- Check [aksel.nav.no](https://aksel.nav.no) for Aksel component API before using
- Follow existing patterns in the codebase

### ⚠️ Ask First
- Adding new dependencies
- Changing routing patterns
- Introducing new state management solutions

### 🚫 Never
- Use raw HTML for elements Aksel provides
- Hardcode colors, spacing, or typography values
- Skip accessibility requirements
- Import from `@navikt/ds-react` internals
