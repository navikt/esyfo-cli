---
applyTo: "**/*.ts"
---

# TypeScript for Bun CLI

## General
- Use strict TypeScript — avoid `any` and type assertions where possible
- Prefer `interface` over `type` for object shapes
- Use `const` over `let`, never `var`
- Use named exports (no default exports)
- Use `.ts` extensions in all import paths (e.g., `'./common/log.ts'`)

## Bun APIs
- Prefer `Bun.file()` and `Bun.write()` over Node.js `fs` equivalents
- Use `Bun.spawnSync()` for shell commands instead of `child_process`
- Use `Bun.env` instead of `process.env`
- Use `Bun.build()` for bundling (see `src/build.ts`)

## CLI Patterns
- Use `yargs` for command parsing — all commands are defined in `src/yargs-parser.ts`
- Each command maps to an action function in `src/actions/`
- Console output: use `log` from `src/common/log.ts` and `chalk` for colors
- Use `remeda` (imported as `R`) for functional data transformations

## GitHub API
- Octokit for REST, raw GraphQL for complex queries
- Auth via `gh auth status --show-token` (interactive) or `NPM_AUTH_TOKEN` (CI)
- GraphQL queries use `/* GraphQL */` tagged template comment
- Standardize response shapes with types like `OrgTeamRepoResult`, `BaseRepoNode`

## Error Handling
- Handle GitHub API errors explicitly (rate limits, 404s, auth failures)
- Use `chalk.red()` for user-facing errors
- Exit with non-zero code on failure

## Boundaries

### ✅ Always
- Use `.ts` extensions in imports
- Use Bun APIs over Node.js equivalents
- Follow existing patterns in `src/actions/` for new commands
- Explicit error handling with colored output

### ⚠️ Ask First
- Adding new dependencies
- Changing the build pipeline (`src/build.ts`)
- Modifying the yargs parser structure

### 🚫 Never
- Use `process.env` (use `Bun.env`)
- Use Node.js `fs` when `Bun.file()`/`Bun.write()` works
- Use `var`
- Add tests (there are no tests in this project — if that changes, update this)
