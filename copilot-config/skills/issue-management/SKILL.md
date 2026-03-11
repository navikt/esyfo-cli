---
description: Create and manage GitHub Issues linked to the Team eSyfo GitHub Projects board
---

# Issue Management — Team eSyfo

Opprett og håndter GitHub Issues knyttet til Team eSyfo sitt GitHub Projects-board i `navikt`-organisasjonen.

## Workflow

### 1. Sjekk om issue allerede finnes

Før du oppretter et nytt issue, sjekk om brukeren allerede har referert til et issue (f.eks. `#123` eller en GitHub-URL). Hvis ja, bruk det eksisterende issuet.

### 2. Velg type

| Type | Bruk |
|------|------|
| **Epic** | Store oppgaver som brytes ned i flere issues |
| **Feature** | Ny funksjonalitet |
| **Story** | Brukerhistorie / use case |
| **Task** | Teknisk oppgave, vedlikehold, chore |
| **Bug** | Feil som må fikses |

### 3. Opprett issue med standardisert beskrivelse

#### Feature / Story / Task

```markdown
## Beskrivelse

[Kort og presis beskrivelse av hva som skal gjøres]

## Bakgrunn

[Hvorfor er dette nødvendig? Kontekst og motivasjon]

## Akseptansekriterier

- [ ] [Kriterium 1]
- [ ] [Kriterium 2]
- [ ] [Kriterium 3]

## Teknisk kontekst

[Valgfritt: Relevante filer, API-er, avhengigheter, lenker]
```

#### Bug

```markdown
## Beskrivelse

[Kort beskrivelse av feilen]

## Steg for å reprodusere

1. [Steg 1]
2. [Steg 2]

## Forventet oppførsel

[Hva burde skje]

## Faktisk oppførsel

[Hva skjer i dag]

## Teknisk kontekst

[Stacktrace, logger, relevante filer]
```

#### Epic

```markdown
## Mål

[Overordnet mål for epicen]

## Bakgrunn

[Kontekst og motivasjon]

## Omfang

[Hva er inkludert og hva er utenfor scope]

## Deloppgaver

Lenkes til underliggende issues etterhvert som de opprettes.
```

### 4. Opprett issue med `gh` CLI

```bash
gh issue create \
  --repo navikt/REPO_NAVN \
  --title "Kort, beskrivende tittel" \
  --body "BODY_FRA_MAL_OVER" \
  --project "Team eSyfo"
```

Issuet legges automatisk til Team eSyfo-prosjektet via `--project`-flagget.

### 5. Sett project-felter

Etter opprettelse, sett riktig type og status i prosjektet:

```bash
# Finn prosjektnummer
gh project list --owner navikt --format json --jq '.projects[] | select(.title == "Team eSyfo") | .number'

# Sett type og status (krever project item ID)
# Bruk gh project item-list og item-edit for å oppdatere felter
```

**Statuser:**
| Status | Bruk |
|--------|------|
| **Backlog** | Nyopprettede issues (default) |
| **Plukk meg! 🙌** | Klar til å plukkes opp |
| **Jeg jobbes med! ⚒️** | Under arbeid |
| **Monday epics 🎯** | Epics som er aktive i nåværende sprint |
| **Done** | Ferdig |

**Typer:** Bug, Epic, Feature, Story, Task

### 6. Epic-håndtering

For store oppgaver som brytes ned:

1. Opprett epic-issuet først (type: Epic)
2. Opprett underliggende issues (type: Task/Story/Feature)
3. Referer til epicen i hvert underliggende issue sin beskrivelse
4. Sett epicen til **Monday epics 🎯** hvis den skal jobbes med nå
5. Underliggende issues starter i **Backlog** eller **Plukk meg! 🙌**

### 7. Knytt PR til issue

Når arbeidet resulterer i en PR, knytt den til issuet:

```bash
# I PR-beskrivelsen eller commit-meldingen:
Closes #ISSUE_NUMMER

# Eller for delvis arbeid (holder issuet åpent):
Relates to #ISSUE_NUMMER
```

## Beslutningstre

```
Er oppgaven stor nok for en epic?
├── Ja → Opprett Epic + underliggende issues
│   └── Skal jobbes med nå? → Sett epic til "Monday epics 🎯"
└── Nei → Opprett frittstående issue
    └── Type? → Feature / Story / Task / Bug
```

## Sjekkliste

- [ ] Issue opprettet med standardisert beskrivelse
- [ ] Lagt til i Team eSyfo-prosjektet
- [ ] Riktig type satt
- [ ] Status satt (default: Backlog)
- [ ] PR knyttet til issue (når arbeidet er ferdig)
- [ ] Epic-kobling satt opp (hvis relevant)
