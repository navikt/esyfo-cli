---
applyTo: "**/*.{ts,tsx}"
---

# TypeScript with Aksel Design System

## General
- Use strict TypeScript — avoid `any` and type assertions where possible
- Prefer `interface` over `type` for object shapes
- Use `const` over `let`, never `var`
- Follow framework conventions for exports (e.g. `export default` for Next.js pages/components, named exports elsewhere)

## Aksel Spacing (CRITICAL)

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

## Layout Components

```tsx
import { Box, VStack, HStack, HGrid } from "@navikt/ds-react";

<VStack gap="4">          {/* Vertical stack */}
<HStack gap="4" align="center">  {/* Horizontal stack */}
<HGrid columns={{ xs: 1, md: 2, lg: 3 }} gap="4">  {/* Responsive grid */}
```

## Typography

```tsx
import { Heading, BodyShort, Label } from "@navikt/ds-react";

<Heading size="large" level="2">Title</Heading>
<BodyShort size="medium">Regular text</BodyShort>
<BodyShort weight="semibold">Bold text</BodyShort>
```

## Responsive Design
- Mobile-first with breakpoints: `xs` (0px), `sm` (480px), `md` (768px), `lg` (1024px), `xl` (1280px)
- Use responsive props: `padding={{ xs: "space-16", md: "space-24" }}`

## Number Formatting
- Always use Norwegian locale (space as thousand separator)
- Never use `toLocaleString()` without explicit locale

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
- Use Context7 to look up the project's data fetching patterns (SWR, TanStack Query, server components, etc.)
- Check `package.json` for actual dependencies before suggesting libraries
- Handle loading, error, and empty states explicitly

## Testing
- Use Context7 for the project's test runner (Vitest, Jest, etc.)
- Use Testing Library — test user behavior, not implementation
- Prefer `screen.getByRole()` over `getByTestId()`
- Test keyboard navigation for interactive components

## Boundaries

### ✅ Always
- Prefer Aksel components and spacing tokens with `space-` prefix
- Mobile-first responsive design
- Norwegian number formatting
- Explicit error handling

### ⚠️ Ask First
- Adding custom Tailwind utilities
- Deviating from Aksel patterns
- Changing data fetching strategy

### 🚫 Never
- Use numeric padding/margin values without `space-` prefix (note: `gap` on layout components like VStack/HStack/HGrid accepts numeric values e.g. `gap="4"`)
- Skip responsive props
- Ignore accessibility requirements
