---
description: 'Frontend-standarder — Aksel Design System, spacing, responsivt design'
applyTo: "**/*.{ts,tsx,css}"
---

# Frontend — Aksel Design System

## General
- Use strict TypeScript — avoid `any` and type assertions where possible
- Prefer `interface` over `type` for object shapes
- Use `const` over `let`, never `var`
- Follow framework conventions for exports

## NAV Aksel Design System
- Components: `@navikt/ds-react`
- Icons: `@navikt/aksel-icons`
- Tokens: `@navikt/ds-tokens`
- Documentation: [aksel.nav.no](https://aksel.nav.no)
- For komplett Aksel-referanse (tokens, komponenter, patterns), bruk `aksel-design`-skillen.

### Key Principles
- Use Aksel components for all standard UI elements
- Use design tokens for spacing, colors, and typography
- Follow Aksel composition patterns
- Check aksel.nav.no for component API before implementing

### Spacing (CRITICAL)
- Prefer Aksel spacing tokens over Tailwind padding/margin when Aksel tokens are available
- Use `space-*` tokens in Aksel props like `gap`, `padding`, and `margin`
- Prefer directional spacing with `paddingBlock`, `paddingInline`, `marginBlock`, and `marginInline`
- For komplett Aksel-referanse (tokens, komponenter, patterns), bruk `aksel-design`-skillen.

### Layout Components
- Prefer `Box` for padding, background, border, and radius
- Prefer `VStack` / `HStack` for linear layout and action rows
- Prefer `HGrid` for responsive columns and dashboard-like sections
- Keep layout in Aksel primitives before custom CSS

### Typography
- Prefer `Heading` for titles and section headings
- Prefer `BodyShort` for short supporting copy
- Prefer `BodyLong` for longer explanatory text

### Responsive Design
- Mobile-first with breakpoints: `xs` (0px), `sm` (480px), `md` (768px), `lg` (1024px), `xl` (1280px)
- Use responsive props: `padding={{ xs: "space-16", md: "space-24" }}`
- Use `Show` / `Hide` when content should differ by breakpoint

### Number Formatting
- Always use Norwegian locale (space as thousand separator)
- Never use `toLocaleString()` without explicit locale

## Accessibility (UU) — WCAG 2.1 AA
- Follow WCAG 2.1 AA — use Aksel components with built-in a11y support
- Use semantic HTML, keyboard navigation, and proper ARIA
- Detailed UU guidance is available via the `accessibility` skill

## React
- Use functional components with hooks
- Follow existing component patterns in the codebase
- Co-locate related files when the framework supports it

## Data Fetching
- Check existing patterns before making assumptions about libraries or architecture
- Handle loading, error, and empty states explicitly

## Testing
- Check existing test files for the project's test runner patterns
- Use Testing Library and test user interactions
- Prefer `screen.getByRole()` over `getByTestId()`

## Boundaries

### ✅ Always
- Use Aksel components from `@navikt/ds-react`
- Prefer Aksel spacing tokens with `space-` prefix
- Use design tokens for styling
- Follow WCAG 2.1 AA accessibility standards
- Use mobile-first responsive design
- Follow existing patterns in the codebase

### ⚠️ Ask First
- Adding new dependencies
- Adding custom Tailwind utilities
- Deviating from Aksel patterns
- Changing routing or data-fetching strategy
- Introducing new state management solutions

### 🚫 Never
- Use raw HTML for elements Aksel provides
- Hardcode colors, spacing, or typography values
- Use numeric spacing values without `space-` prefix for Aksel spacing props
- Skip accessibility requirements
- Import from `@navikt/ds-react` internals
