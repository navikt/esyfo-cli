---
description: Generer conventional commit-meldinger med Nav-relevante scopes og breaking change-format
---

# Conventional Commit

Generate commit messages following the Conventional Commits specification, adapted for Nav projects.

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

## Types

| Type | Usage |
|---|---|
| `feat` | New functionality |
| `fix` | Bug fix |
| `docs` | Documentation-only changes |
| `style` | Formatting, semicolons, etc. (no code change) |
| `refactor` | Code that neither fixes a bug nor adds a feature |
| `perf` | Performance changes |
| `test` | Adding or fixing tests |
| `build` | Build system or dependency changes |
| `ci` | CI configuration changes |
| `chore` | Other changes that don't affect code |

## Nav-relevante scopes

```
feat(vedtak): legg til støtte for klagevedtak
fix(auth): fiks token-validering for TokenX
docs(api): oppdater OpenAPI-spec for vedtak-endepunktet
refactor(repository): bruk CTE for bedre lesbarhet
test(controller): legg til integrasjonstest med MockOAuth2Server
build(deps): oppgrader Spring Boot til 3.4.1
ci(deploy): legg til prod-deploy steg
perf(db): legg til indeks på bruker_id
chore(nais): oppdater ressursgrenser
```

## Breaking Changes

```
feat(api)!: endre responsformat for vedtak-endepunktet

BREAKING CHANGE: Feltet `vedtakDato` er endret til `opprettetDato`.
Konsumenter må oppdatere sin parsing.
```

## Rules

- First line: max 72 characters
- Use imperative form: "add", not "added" or "adds"
- Don't end with a period
- Use Norwegian or English consistently within the project
- Reference GitHub issue in footer: `Closes #123`
- Always include Co-authored-by trailer for Copilot

## Workflow

### 1. Analyze staged changes

```bash
git diff --cached --stat        # Overview of changed files
git diff --cached               # Detailed diff
```

### 2. Determine type and scope

Based on the diff:
1. Identify **type** (feat/fix/refactor/etc.)
2. Identify **scope** (which module/domain)
3. Write short, precise description

### 3. Write commit message

```bash
git commit -m "type(scope): kort beskrivelse" \
  -m "Utdypende forklaring hvis nødvendig." \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### 4. Multiple logical changes

If staged changes contain multiple logical changes:
1. Suggest splitting into separate commits
2. Use `git add -p` to stage partially
3. One commit per logical change

## Security Protocol

Before committing, verify that staged changes do **NOT** contain:
- Tokens, API keys, or credentials
- Passwords or secrets (even in comments)
- PII (national identity numbers, emails, names in test data)
- `.env` files with sensitive values

If sensitive data is detected: **STOP** and alert the user.

## Examples

```bash
# Simple feature
git commit -m "feat(søknad): legg til validering av fødselsnummer" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

# Bugfix with reference
git commit -m "fix(auth): håndter utløpt refresh-token" \
  -m "Refresh-tokenet ble ikke fornyet ved utløp, som førte til
at brukere ble logget ut uten varsel." \
  -m "Fixes #456

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

# Dependency update
git commit -m "build(deps): oppgrader postgresql driver til 42.7.4" \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

# Breaking change
git commit -m "feat(api)!: fjern deprecated /api/v1/vedtak endepunkt" \
  -m "BREAKING CHANGE: /api/v1/vedtak er fjernet. Bruk /api/v2/vedtak.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
