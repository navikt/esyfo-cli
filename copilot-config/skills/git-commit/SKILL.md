---
description: Create well-structured conventional commits with automatic diff analysis
---

# Git Commit — Team eSyfo

Lag konsistente, velstrukturerte commits som følger conventional commits-standarden.

## Format

```
type(scope): kort beskrivelse
```

### Typer

| Type | Bruk |
|------|------|
| `feat` | Ny funksjonalitet |
| `fix` | Bugfix |
| `refactor` | Kodeendring uten funksjonsendring |
| `chore` | Vedlikehold, avhengigheter, config |
| `docs` | Dokumentasjon |
| `test` | Tester |
| `style` | Formatering, linting (ingen logikkendring) |

### Scope

Scope reflekterer modulen eller domenet som endres:
- Backend: `api`, `db`, `auth`, `kafka`, `service`
- Frontend: `components`, `hooks`, `pages`, `styles`
- Infra: `nais`, `ci`, `config`

### Eksempler

- `feat(auth): add TokenX validation for service calls`
- `fix(api): handle null response from downstream service`
- `refactor(db): simplify migration rollback logic`
- `chore(deps): bump Spring Boot to 3.4.1`
- `docs(readme): update local development instructions`

## Workflow

### 1. Analyser endringer

Før du lager commit-melding, analyser hva som er endret:

**MCP (foretrukket):** Bruk tilgjengelige git-verktøy for å se staged changes.

**Fallback:**
```bash
git diff --cached --stat
git diff --cached
```

### 2. Bestem type og scope

- Se på hvilke filer som er endret og hva slags endring det er
- Velg riktig type fra tabellen over
- Velg scope basert på det mest sentrale domenet som endres
- Hvis endringen krysser mange scopes, bruk det mest relevante eller utelat scope

### 3. Skriv commit-melding

- **Første linje:** `type(scope): beskrivelse` (maks 72 tegn)
- **Body (valgfritt):** Utdypende forklaring av hva og hvorfor (ikke hvordan)
- **Trailer:** Inkluder alltid Co-authored-by for Copilot

```bash
git commit -m "type(scope): kort beskrivelse" \
  -m "Utdypende forklaring hvis nødvendig." \
  -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### 4. Flere logiske endringer

Hvis staged changes inneholder flere logiske endringer:
1. Foreslå å splitte i separate commits
2. Bruk `git add -p` for å stage delvis
3. Én commit per logisk endring

## Sikkerhetsprotokoll

Før commit, verifiser at staged changes **IKKE** inneholder:
- Tokens, API-nøkler, eller credentials
- Passord eller secrets (selv i kommentarer)
- PII (personnummer, e-poster, navn i testdata)
- `.env`-filer med sensitive verdier

Hvis sensitiv data oppdages: **STOPP** og varsle brukeren.

## Sjekkliste

- [ ] Type og scope er korrekt valgt
- [ ] Beskrivelse er kort og presis (maks 72 tegn)
- [ ] Ingen sensitiv data i staged changes
- [ ] Co-authored-by trailer inkludert
- [ ] Én logisk endring per commit
