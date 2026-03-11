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
pnpm add -g @navikt/esyfo-cli
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
* `prs` - Vis åpne pull requests på tvers av teamets repos
* `sync-file` - Kopier filer på tvers av repos (oppretter branch, commit og PR)
* `repos` - List alle ikke-arkiverte repos for team-esyfo
* `clone-team-repos` - Klon alle repos eid av teamet til en lokal mappe
* `copilot` - Administrer GitHub Copilot-oppsett for teamets repos

<!-- COMPUTER SAYS DON'T TOUCH THIS END -->

## GitHub Copilot for teamet 🍽️

Vi har et automatisert oppsett som gir GitHub Copilot riktig kontekst for alle våre repos. CLI-et detekterer stack (Ktor/Spring Boot, Next.js, TanStack, etc.) og genererer skreddersydde instruksjoner, prompts, skills og agenter.

### Slik fungerer det

```
┌─────────────────────────────────────────────────────────┐
│  ecli copilot sync      → Distribuerer agenter + config  │
│  ecli copilot status    → Sjekker hva som mangler       │
└─────────────────────────────────────────────────────────┘
```

**Lag 1 — Agenter + repo-kontekst (distribuert via `copilot sync`)**
Genereres og distribueres til hvert repo av `ecli copilot sync` basert på detektert stack. Havner i `.github/` i hvert repo:

| Agent | Rolle | Modell |
|-------|-------|--------|
| **@hovmester** 🍽️ | Tar imot bestillingen og delegerer til kjøkkenet | Opus |
| **@kokk** 🔪 | Smeller sammen koden — rask, brutal og effektiv | Codex |
| **@mattilsynet** 🔍 | Uanmeldt inspeksjon — code review og kvalitetssikring | Sonnet |
| *@souschef* 📋 | *(internt)* Planlegger menyen — brukes via hovmester | Opus |
| *@konditor* 🎂 | *(internt)* Pynt og finish — UI/UX med Aksel | Gemini |
| *@inspektør-claude* 🔬 | *(internt)* Inspeksjon med Claude-modell | Claude |
| *@inspektør-gpt* 🔬 | *(internt)* Inspeksjon med GPT-modell | GPT |
| *@inspektør-gemini* 🔬 | *(internt)* Inspeksjon med Gemini-modell | Gemini |

> **Tips**: Start med `@hovmester` for større oppgaver — den planlegger via souschef og delegerer til kokk. Bruk `@kokk` direkte for raske fixes, og `@mattilsynet` for code review.

I tillegg til agenter distribueres:

- `copilot-instructions.md` — Repo-spesifikke regler (scaffold — opprettes én gang, du eier den selv)
- `instructions/*.instructions.md` — Delte team-standarder (Kotlin, TypeScript, sikkerhet, NAIS, etc.)
- `prompts/*.prompt.md` — Gjenbrukbare prompts (f.eks. NAIS-manifest)
- `skills/*/SKILL.md` — Oppskrifter for vanlige oppgaver (f.eks. Flyway-migrering)

**Lag 2 — MCP/plattform-verktøy (lokalt)**
~~[Context7](https://context7.com/) er en MCP-server som gir agentene tilgang til oppdatert API-dokumentasjon for
biblioteker og rammeverk (React, Ktor, Spring, etc.) — rett i kontekstvinduet.~~
**Midlertidig deaktivert** — krever databehandleravtale (DPA) før bruk i NAV.
Koden er beholdt i `copilot-setup.ts` og kan reaktiveres når avtalen er på plass.

### Kom i gang med Copilot

```bash
# 1. Sjekk hvilke repos som mangler konfig
ecli copilot status

# 2. Synkroniser ett spesifikt repo
ecli copilot sync -r mitt-repo

# 3. Forhåndsvis endringer uten å pushe
ecli copilot sync --dry-run -r mitt-repo

# 4. Synkroniser alle repos (krever bekreftelse)
ecli copilot sync --all
```

> **Merk**: `ecli copilot setup` er deprecated — agenter distribueres nå direkte til hvert repo via `copilot sync`.

### Hva skjer under sync?

1. CLI-et kloner/puller alle team-repos
2. Inspiserer `build.gradle.kts`, `package.json`, `nais.yaml` etc. for å detektere stack
3. Setter sammen riktige templates basert på profil (backend/frontend/microfrontend)
4. Oppretter branch, committer endringer og pusher
5. Oppretter PR med auto-merge for hvert repo med endringer

### Tilpasse repo-instruksjoner

`copilot-instructions.md` er **din fil** — CLI-et oppretter den kun første gang. Legg til repo-spesifikk kontekst som:

- Hva appen gjør og hvem den er for
- Lokale konvensjoner som avviker fra teamstandard
- Lenker til relevant dokumentasjon

Filene i `instructions/`, `prompts/` og `skills/` er CLI-managed og oppdateres ved neste sync. Ikke rediger disse manuelt.

### Utvikling

Dette kommandolinje-verktøyet er skrevet i TypeScript og bruker bun.sh. For å kjøre det må du først bygge det:

```bash
bun install
```

Deretter kan du kjøre det med:

```bash
bun run src/index.ts
```
