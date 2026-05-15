# esyfo-cli

En liten verktøykasse for #team-esyfo

## Kom i gang

### Oppsett

-   Du må ha [Node.js](https://nodejs.org/en/) installert, husk å bruk verktøy som nvm eller asdf for å håndtere versjoner.
-   Du må ha [bun.sh](https://bun.sh) installert, dette kan installeres med curl (`curl -fsSL https://bun.sh/install | bash`)

### Konfigurasjon

Du må ha en `.npmrc` fil på root i home-mappen din med følgende innhold:

```
@navikt:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_AUTH_TOKEN}
```

### Tilgang

Vi bruker `gh` CLI som eneste kilde til tokens — ingen hardkodede PAT-er.

**1. Legg til nødvendige scopes (én gang):**

```bash
gh auth refresh -s read:packages,read:project,project
```

**2. Sett opp automatisk token via mise (én gang):**

Legg til i `~/.config/mise/config.toml` (opprett filen om den ikke finnes):

```toml
[env]
NPM_AUTH_TOKEN = { value = "{{ exec(command='gh auth token', cache_key='NPM_AUTH_TOKEN', cache_duration='1h') | trim }}", redact = true }
```

Dette gir deg `NPM_AUTH_TOKEN` automatisk i alle repos, cachet i 1 time, uten hardkodede tokens.

> **Hvorfor?** Tokenet roteres enkelt med `gh auth refresh`, variabelen er aldri lagret i klartekst, og `redact: true` skjuler verdien i mise-output.

### Installer CLI

```bash
pnpm add -g @navikt/esyfo-cli
```

Nå er du klar til å bruke `ecli`!

Vi har også noen mise tasks for forenkle enkelte operasjoner
Kjør

```bash
mise tasks
```

for å få oversikt over tilgjengelige tasks.

Hver task har også innebygd hjelp. Kjør

```bash
mise run <task> --help
```

for å se argumenter, flagg og standardverdier.

Eksempler:

```bash
mise run clone-repos --help
mise run prs --help
mise run repos --help
mise run repos-md --help
```

For `prs` kan du for eksempel bruke:

```bash
mise run prs --list-view
mise run prs --skip-bots
mise run prs true
```

Den siste varianten inkluderer draft pull requests.

### Automatisk generert dokumentasjon

<!-- COMPUTER SAYS DON'T TOUCH THIS START -->

* `verifiser` - Verifiserer at repo har riktig innstillinger i GitHub
* `prs` - Vis åpne pull requests på tvers av teamets repos
* `sync-file` - Kopier filer på tvers av repos (oppretter branch, commit og PR)
* `repos` - List alle ikke-arkiverte repos for team-esyfo
* `clone-team-repos` - Klon alle repos eid av teamet til en lokal mappe

<!-- COMPUTER SAYS DON'T TOUCH THIS END -->

### Utvikling

Dette kommandolinje-verktøyet er skrevet i TypeScript og bruker bun.sh. For å kjøre det må du først bygge det:

```bash
bun install
```

Deretter kan du kjøre det med:

```bash
bun run src/index.ts
```
