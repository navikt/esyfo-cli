
## Tech Stack
- **Language**: TypeScript
- **Framework**: {{framework}}
- **UI Library**: NAV Aksel Design System (`@navikt/ds-react`, `@navikt/aksel-icons`)
- **Testing**: {{testing}}
- **Bundler**: {{bundler}}

## Frontend Patterns
- Check `package.json` for actual dependencies before suggesting libraries
- Use Aksel components — never raw HTML for UI elements that Aksel provides
- Follow existing code patterns in the repository
- Mobile-first responsive design with breakpoints: `xs`, `sm`, `md`, `lg`, `xl`

## Aksel Spacing (CRITICAL)
- **Always** use Aksel spacing tokens with `space-` prefix: `space-4`, `space-8`, `space-12`, `space-16`, `space-20`, `space-24`, `space-32`, `space-40`
- **Never** use Tailwind padding/margin utilities (`p-4`, `mx-2`, etc.)
- Use `Box` with `paddingBlock`/`paddingInline` for directional spacing
- Use `VStack`/`HStack` with `gap` for layout, `HGrid` for responsive grids

## Number Formatting
- Always use Norwegian locale for numbers (space as thousand separator)
- Never use `toLocaleString()` without explicit locale

## Boundaries

### ✅ Always
- Use Aksel components and spacing tokens
- Handle loading, error, and empty states explicitly
- Test keyboard navigation for interactive components

### ⚠️ Ask First
- Adding custom Tailwind utilities or deviating from Aksel patterns
- Changing authentication flow or data fetching strategy

### 🚫 Never
- Use Tailwind `p-*`/`m-*` utilities for spacing
- Skip responsive props
- Ignore accessibility requirements
