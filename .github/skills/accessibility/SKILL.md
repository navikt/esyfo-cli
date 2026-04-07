---
name: accessibility
description: Universell utforming (UU) — WCAG 2.1 AA med Aksel-komponenter for Nav-frontend
---
# Tilgjengelighet (UU) — WCAG 2.1 AA

Universell utforming er lovpålagt i Norge. All frontend-kode i Nav skal oppfylle WCAG 2.1 AA.

## Aksel-komponenter har innebygd UU

Aksel-komponenter (`@navikt/ds-react`) håndterer mange tilgjengelighetskrav automatisk: roller, ARIA-attributter, tastaturnavigasjon, fokushåndtering og fargekontrast.

**Bruk alltid Aksel-komponenter fremfor egne `<div>`/`<button>`-løsninger.**

## Semantisk HTML

Bruk `<main>`, `<nav>`, `<article>`, `<section>` — ikke generiske `<div>`-er. Se [references/code-examples.md](references/code-examples.md) for mønstre.

## Heading-hierarki

Overskriftsnivåer skal være logiske og uten hopp (h1 → h2 → h3). Se [references/code-examples.md](references/code-examples.md) for mønstre.

## Skjemaer

Bruk Aksel-skjemaelementer (`TextField`, `Select`) — de har innebygd label-kobling. Vis `ErrorSummary` øverst ved feil. Se [references/code-examples.md](references/code-examples.md) for mønstre.

## Bilder og ikoner

Meningsbærende bilder trenger beskrivende `alt`-tekst, dekorative bilder får `alt=""`. Ikonknapper må ha tilgjengelig navn via `title`-prop. Se [references/code-examples.md](references/code-examples.md) for mønstre.

## Interaktive elementer

Alle klikkbare elementer trenger synlig fokusindikator og tilgjengelig navn. Bruk beskrivende lenketekst, aldri «Klikk her». Se [references/code-examples.md](references/code-examples.md) for mønstre.

## ARIA-attributter

Bruk kun ARIA når HTML-semantikk ikke er tilstrekkelig. Relevante mønstre: `aria-label` for landemerker, `aria-live` for dynamisk innhold, `aria-expanded` for utvidbare paneler, `aria-busy` for lastestatus. Se [references/code-examples.md](references/code-examples.md) for mønstre.

## Fargekontrast

- **Tekst**: Minimum 4.5:1 (AA)
- **Stor tekst** (≥18px bold / ≥24px): Minimum 3:1
- **Ikke-tekst UI**: Minimum 3:1
- Bruk Aksel semantiske farger — de oppfyller kontrastkrav automatisk
- Aldri bruk farge alene for å formidle informasjon

## Tastaturnavigasjon

- `Tab` / `Shift+Tab`: Naviger mellom elementer
- `Enter` / `Space`: Aktiver knapper og lenker
- `Escape`: Lukk modaler og menyer
- `Arrow keys`: Naviger i lister, tabs og menyer

Aksel Modal håndterer fokusfelle automatisk. Se [references/code-examples.md](references/code-examples.md) for modal-mønster.

## Testing

Bruk `jest-axe` for enhetstesting, Playwright + `@axe-core/playwright` for E2E, og Lighthouse CLI for CI-sjekker. Se [references/testing.md](references/testing.md) for oppsett og eksempler.

## Sjekkliste

- [ ] Heading-nivåer er logiske (h1 → h2 → h3, ingen hopp)
- [ ] Alle skjema-elementer har synlige labels
- [ ] Alle bilder har meningsfull `alt`-tekst eller `alt=""`
- [ ] Alle interaktive elementer har tilgjengelig navn
- [ ] Ingen informasjon formidles kun med farge
- [ ] Siden er fullt brukbar med kun tastatur
- [ ] Dynamisk innhold annonseres med `aria-live`
- [ ] Feilmeldinger er koblet til rett felt og samlet i en oppsummering

## Grenser

### ✅ Alltid
- Bruk Aksel-komponenter — de har innebygd tilgjengelighet
- Test med tastatur (Tab gjennom hele siden)
- Sjekk heading-hierarki

### ⚠️ Spør først
- Egendefinerte ARIA-roller utover standard HTML-semantikk
- Avvik fra Aksel-mønster for tilgjengelighet

### 🚫 Aldri
- `<div onClick>` uten `role="button"` og `tabIndex`
- Ikonknapper uten tilgjengelig navn
- Fjern fokusindikator (`outline: none`) uten erstatning

## Referansefiler

- [references/code-examples.md](references/code-examples.md) — TSX-mønstre for semantisk HTML, heading, skjema, bilder, ARIA og modal
- [references/testing.md](references/testing.md) — Oppsett for jest-axe, Playwright + axe-core og Lighthouse CLI
