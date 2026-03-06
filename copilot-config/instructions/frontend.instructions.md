---
applyTo: "**/*.{ts,tsx,css}"
---

# Frontend — Aksel Design System

## General
- Use strict TypeScript — avoid `any` and type assertions where possible
- Prefer `interface` over `type` for object shapes
- Use `const` over `let`, never `var`
- Follow framework conventions for exports (e.g. `export default` for Next.js pages/components, named exports elsewhere)

## NAV Aksel Design System
- Components: `@navikt/ds-react`
- Icons: `@navikt/aksel-icons`
- Tokens: `@navikt/ds-tokens` (spacing, colors, typography)
- Documentation: [aksel.nav.no](https://aksel.nav.no)

### Key Principles
- Use Aksel components for all standard UI elements
- Use design tokens for spacing (`--a-spacing-*`), colors, typography
- Follow Aksel's composition patterns (e.g., `<Table>`, `<Table.Header>`, `<Table.Row>`)
- Check aksel.nav.no for component API before implementing

### Spacing (CRITICAL)

**Prefer** Aksel spacing tokens over Tailwind padding/margin:

```tsx
// ✅ Preferred
<Box paddingBlock={{ xs: "space-16", md: "space-24" }} paddingInline="space-16">
  {children}
</Box>

// ⚠️ Avoid when Aksel spacing tokens are available
<div className="p-4 md:p-6">
```

Available tokens: `space-4`, `space-8`, `space-12`, `space-16`, `space-20`, `space-24`, `space-32`, `space-40`

Note: `gap` on layout components (`VStack`, `HStack`, `HGrid`) uses Aksel's numeric scale (e.g. `gap="4"`), which maps to the same tokens internally. Only `padding`/`margin` on `Box` need the `space-` prefix.

### Layout Components

```tsx
import { Box, VStack, HStack, HGrid } from "@navikt/ds-react";

<VStack gap="4">          {/* Vertical stack */}
<HStack gap="4" align="center">  {/* Horizontal stack */}
<HGrid columns={{ xs: 1, md: 2, lg: 3 }} gap="4">  {/* Responsive grid */}
```

### Typography

```tsx
import { Heading, BodyShort, Label } from "@navikt/ds-react";

<Heading size="large" level="2">Title</Heading>
<BodyShort size="medium">Regular text</BodyShort>
<BodyShort weight="semibold">Bold text</BodyShort>
```

### Responsive Design
- Mobile-first with breakpoints: `xs` (0px), `sm` (480px), `md` (768px), `lg` (1024px), `xl` (1280px)
- Use responsive props: `padding={{ xs: "space-16", md: "space-24" }}`

### Number Formatting
- Always use Norwegian locale (space as thousand separator)
- Never use `toLocaleString()` without explicit locale

## Accessibility (UU) — WCAG 2.1 AA
- All interactive elements must be keyboard accessible
- Use semantic HTML (`<nav>`, `<main>`, `<section>`, `<article>`)
- All images need `alt` text (decorative: `alt=""`)
- Color contrast minimum 4.5:1 for text
- Form inputs must have associated `<label>` elements
- Error messages must be programmatically associated with inputs
- Use `aria-live` for dynamic content updates

## React
- Use functional components with hooks
- Use Aksel components from `@navikt/ds-react` — check [aksel.nav.no](https://aksel.nav.no) for component API
- Follow existing component patterns in the codebase
- Co-locate related files (component, test, styles)

## Server vs Client Components (Next.js only — skip if not using Next.js)

```tsx
// Server Component (default) — can use async/await
export default async function Page() {
  const data = await fetchData();
  return <Box padding="space-24"><Heading size="large" level="1">{data.title}</Heading></Box>;
}

// Client Component — needs "use client" directive
"use client";
import { useState } from "react";
```

## Data Fetching
- Check existing code for data fetching patterns (SWR, TanStack Query, server components, etc.) before making assumptions.
- Check `package.json` for actual dependencies before suggesting libraries
- Handle loading, error, and empty states explicitly

## Testing
- Check existing test files for the project's test runner patterns (Vitest, Jest, etc.).
- Use Testing Library — test user interactions, not implementation details
- Prefer `screen.getByRole()` over `getByTestId()`
- Test keyboard navigation for interactive components

## Boundaries

### ✅ Always
- Use Aksel components from `@navikt/ds-react`
- Prefer Aksel spacing tokens with `space-` prefix
- Use design tokens for styling
- Follow WCAG 2.1 AA accessibility standards
- Mobile-first responsive design
- Norwegian number formatting
- Explicit error handling
- Check [aksel.nav.no](https://aksel.nav.no) for Aksel component API before using
- Follow existing patterns in the codebase

### ⚠️ Ask First
- Adding new dependencies
- Adding custom Tailwind utilities
- Deviating from Aksel patterns
- Changing routing patterns
- Changing data fetching strategy
- Introducing new state management solutions

### 🚫 Never
- Use raw HTML for elements Aksel provides
- Hardcode colors, spacing, or typography values
- Use numeric padding/margin values without `space-` prefix (note: `gap` on layout components like VStack/HStack/HGrid accepts numeric values e.g. `gap="4"`)
- Skip accessibility requirements
- Skip responsive props
- Import from `@navikt/ds-react` internals
