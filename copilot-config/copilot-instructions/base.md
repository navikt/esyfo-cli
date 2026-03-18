# {{repo_name}}

{{description}}

## Team
- **Team**: team-esyfo, Nav IT
- **Org**: navikt

## Commands

{{commands}}

## Nav Principles
- **Team First**: Autonomous teams with circles of autonomy
- **Product Development**: Continuous development over ad hoc approaches
- **Essential Complexity**: Focus on essential, avoid accidental complexity
- **DORA Metrics**: Measure and improve team performance

## Platform & Auth
- **Platform**: NAIS (Kubernetes on GCP)
- **Auth**: Azure AD (internal users), TokenX (on-behalf-of token exchange), ID-porten (citizens), Maskinporten (machine-to-machine)
- **Observability**: Prometheus metrics, Grafana Loki logs, Tempo tracing (OpenTelemetry)

## Conventions
- English code and comments — Norwegian for user-facing text and domain terms (e.g. dialogmote, sykmelding, oppfolgingsplan)
- **Documentation lookup strategy** (prioritert rekkefølge):
  1. **Repo first**: Sjekk eksisterende kode og custom instructions (`.github/instructions/`)
  2. **NAV-docs ved behov**: Slå opp aksel.nav.no (UI-komponenter, design tokens) og doc.nais.io (plattform, deploy, observability) når du lager eller endrer noe i disse domenene
  3. **Ekstern docs ved usikkerhet**: Bruk web search for eksterne biblioteker kun når du er usikker på API-korrekthet — ikke rutinemessig
- Check existing code patterns in the repository before writing new code
- Follow the ✅ Always / ⚠️ Ask First / 🚫 Never boundaries in agent and instruction files

## Documentation and Working Notes

| Tier | Location | Purpose | Persists | Checked in |
|------|----------|---------|----------|------------|
| **Session** | `~/.copilot/session-state/` | Scratch work for one task | No | No |
| **Local notes** | `.local-notes/` | Plans, architecture drafts, research, AI reviews | Yes | No |
| **Permanent docs** | `docs/` | Finalized documentation (ADRs, API docs) | Yes | Yes |

**Defaults**: Planning/research/drafts → `.local-notes/`. Finalized docs → `docs/`. Task tracking → session state.

## Keeping Copilot Config in Sync

When making changes that affect patterns described in `.github/` config files (instructions, prompts, skills), **suggest** updating — but do not update automatically.

Examples: upgrading frameworks, changing test patterns, adding auth mechanisms, changing DB access patterns, adding Kafka topics, modifying build tooling.

**Check the file header first** to determine where changes belong:

- **Managed files** (header: `<!-- Managed by esyfo-cli …-->`) — Do NOT edit locally. Changes will be overwritten by the next sync.
  Format: *"This change affects patterns in `.github/instructions/<file>`, which is managed by esyfo-cli. The source should be updated in the esyfo-cli repo under `copilot-config/`."*

- **Locally owned files** (no managed header) — Suggest updating the file directly in this repo.
  Format: *"This change affects patterns in `.github/instructions/<file>` — want me to update it?"*
