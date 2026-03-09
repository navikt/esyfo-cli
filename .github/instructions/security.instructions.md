---
applyTo: "**/*"
---

# Security Standards for CLI Tools

## Principles
1. **Least Privilege**: Request minimum necessary permissions (GitHub scopes, file system access)
2. **No Secrets in Code**: All credentials via environment variables or `gh auth`
3. **Defense in Depth**: Validate inputs even from trusted sources

## Token & Credential Handling
- GitHub auth: always via `gh auth status --show-token` (interactive) or `NPM_AUTH_TOKEN` env var (CI)
- Never log, print, or persist tokens — even in debug mode
- Never hardcode tokens, org names with elevated access, or API keys

## Input Validation
- Validate repo names, branch names, and file paths from user input
- Sanitize paths to prevent directory traversal
- Validate YAML/JSON parsed from config files before using

## GitHub API Security
- Use Octokit's built-in auth — don't construct Authorization headers manually
- Respect rate limits — check `x-ratelimit-remaining` headers
- Handle 401/403 gracefully with clear error messages about token scope

## CI/CD
- `NPM_AUTH_TOKEN` for publishing — never committed, always from GitHub secrets
- Commit messages with `[skip ci]` skip pipeline entirely — use deliberately
- Version auto-increment happens in CI only — don't hardcode versions

## Dependency Management
- Dependabot enabled for vulnerability scanning
- Review dependency updates before merging (especially Octokit, simple-git, yargs)
- Prefer well-maintained packages with active security response

## Boundaries

### ✅ Always
- Use `gh auth` or env vars for authentication
- Validate all user-provided paths and repo names
- Handle API auth errors with clear messages

### ⚠️ Ask First
- Adding new GitHub API scopes
- Changing authentication flow
- Writing to file system outside of known directories (`~/.cache/team-esyfo/`, repo roots)

### 🚫 Never
- Commit secrets to git
- Log tokens or credentials (even partially)
- Use string interpolation for GitHub API queries (use Octokit/parameterized GraphQL)
- Write to arbitrary paths without validation
