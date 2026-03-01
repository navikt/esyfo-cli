
## Tech Stack
- **Language**: TypeScript
- **Type**: Microfrontend (imported by host application)
- **UI Library**: NAV Aksel Design System (`@navikt/ds-react`, `@navikt/aksel-icons`)
- **Bundler**: Vite
- **Testing**: {{testing}}

## Microfrontend Patterns
- Check `package.json` for actual dependencies before suggesting libraries
- Use Aksel components — never raw HTML for UI elements that Aksel provides
- This is a microfrontend: keep bundle size minimal, avoid heavy dependencies
- Follow existing code patterns in the repository
- Mobile-first responsive design with breakpoints: `xs`, `sm`, `md`, `lg`, `xl`

## Aksel Spacing (CRITICAL)
- **Always** use Aksel spacing tokens with `space-` prefix: `space-4`, `space-8`, `space-12`, `space-16`, `space-20`, `space-24`, `space-32`, `space-40`
- **Never** use Tailwind padding/margin utilities (`p-4`, `mx-2`, etc.)
- Use `Box` with `paddingBlock`/`paddingInline` for directional spacing

## Boundaries

### ✅ Always
- Use Aksel components and spacing tokens
- Keep bundle size minimal
- Test keyboard navigation

### ⚠️ Ask First
- Adding new external dependencies (bundle size impact)
- Deviating from Aksel patterns

### 🚫 Never
- Use Tailwind `p-*`/`m-*` utilities for spacing
- Import heavy libraries without justification
- Skip accessibility requirements
