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

Du må ha en PAT (Personal Access Token) for å kunne laste ned pakker fra Github Package Registry. Denne kan
du lage [her](https://github.com/settings/tokens). Du må gi den `read:packages` scope, bruk PAT typen "classic"

Legg til denne i din `~/.bashrc` eller `~/.zshrc` fil:

```bash
export NPM_AUTH_TOKEN=<din token>
```

### Installer CLI

```bash
npm i -g @navikt/esyfo-cli
```

Nå er du klar til å bruke `ecli`!

Vi har også noen mise tasks for forenkle enkelte operasjoner
Kjør

```bash
mise tasks
```

for å få oversikt over tilgjengelige tasks.

### Automatisk generert dokumentasjon

<!-- COMPUTER SAYS DON'T TOUCH THIS START -->

* `verifiser` - Verifiserer at repo har riktig innstillinger i GitHub
* `prs` - get all open pull requests
* `sync-file` - sync files across specified repos
* `repos` - get all non-archived repos for team-esyfo
* `clone-team-repos` - git clone all repositories owned by team
* `copilot` - Synkroniser GitHub Copilot-konfigurasjon (agenter, instruksjoner, prompts, skills) til team-repos

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
