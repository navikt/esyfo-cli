# Copilot Instructions for esyfo-cli

## Overview

esyfo-cli (`ecli`) is an internal CLI toolbox for NAV's #team-esyfo. It manages GitHub repositories across the `navikt` organization — verifying repo settings, listing PRs, syncing files across repos, and cloning team repos. Written in TypeScript, it runs on **Bun** (not Node.js) and is published to GitHub Package Registry as `@navikt/esyfo-cli`.

## Build & Lint Commands

```bash
bun install                # Install dependencies
bun run tsc                # Type-check
bun run lint               # ESLint on src/**/*.ts
bun run build              # Full build: clean → compile → sanity-check
bun run build-cli          # Compile only (runs src/build.ts)
bun run src/index.ts       # Run CLI directly during development (no build needed)
```

There are no tests in this project.

## Architecture

### Entry point & CLI framework

`src/index.ts` → `src/yargs-parser.ts` — Yargs defines all commands. Each command maps to an action function in `src/actions/`.

### Build & distribution

`src/build.ts` uses `Bun.build()` to bundle the CLI into a single file at `esyfo-cli/bin/ecli` with a bun shebang. The `esyfo-cli/` directory is a separate publishable npm package (`esyfo-cli/package.json`) with its own version, auto-incremented by CI on each push to main.

### Configuration

`config.yml` (root) defines the team's repositories, their expected CI checks, and the org owner. Parsed via `src/config/config.ts` into typed `Config`/`RepoConfig` objects. `skip-enforce-admins.yml` lists repos exempt from admin enforcement rules.

### GitHub API access

`src/common/octokit.ts` — Authenticates via `gh auth status --show-token` (GitHub CLI) for interactive use, or `NPM_AUTH_TOKEN` for package operations. Uses both REST (Octokit) and GraphQL APIs. Helper types like `OrgTeamRepoResult` and `BaseRepoNode` standardize GraphQL response shapes.

### Git operations

`src/common/git.ts` — `Gitter` class wraps `simple-git` for clone/pull operations. Two modes: `'cache'` (uses `~/.cache/team-esyfo/repos/`) and `'user-config'` (arbitrary directory). Used by sync-file and clone commands.

### Commands

- `verifiser` — Validates repo settings against `config.yml`, optionally patches them (`--patch`)
- `prs` — Lists open PRs across all team repos
- `sync-file` — Interactive workflow to copy files between repos, create branches, commit, push, and optionally open auto-merge PRs
- `repos` — Lists non-archived team repos (JSON or Markdown output)
- `clone-team-repos` — Clones all team repos, with optional subfolder grouping by topic (backend/frontend/microfrontend)

## Conventions

- **Language**: Code and comments are in English; user-facing CLI output and README are in Norwegian
- **Imports**: Use `.ts` extensions in import paths (e.g., `'./common/log.ts'`)
- **Console output**: Use `log` from `src/common/log.ts` (re-export of `console.log`) and `chalk` for colored output
- **Functional utilities**: Uses `remeda` (imported as `R`) for functional data transformations
- **ESLint**: Extends `@navikt/eslint-config-teamsykmelding` with `no-explicit-any` and `explicit-function-return-type` turned off
- **GraphQL**: Inline queries use the `/* GraphQL */` tagged template comment for syntax highlighting
- **Bun APIs**: Use `Bun.file()`, `Bun.write()`, `Bun.spawnSync()`, `Bun.env` — not Node.js equivalents
- **CI skip**: Commit messages containing `[docs]` skip the CI build; `[skip ci]` skips entirely
