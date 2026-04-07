# Kodeeksempler — Tilgjengelighet (UU)

Disse eksemplene viser korrekte og feilaktige mønstre for tilgjengelig frontend-kode med Aksel-komponenter.

## Semantisk HTML

```tsx
// ✅ Semantiske elementer
<main>
  <nav aria-label="Hovednavigasjon">...</nav>
  <article>
    <Heading size="large" level="1">Tittel</Heading>
    <section aria-labelledby="seksjon-id">...</section>
  </article>
</main>

// ❌ Div-suppe uten semantikk
<div className="main">
  <div className="nav">...</div>
  <div className="content">
    <div className="title">Tittel</div>
  </div>
</div>
```

## Heading-hierarki

```tsx
// ✅ Sammenhengende nivåer
<Heading size="large" level="1">Sidetittel</Heading>
  <Heading size="medium" level="2">Seksjon</Heading>
    <Heading size="small" level="3">Underseksjon</Heading>

// ❌ Hopper fra h1 til h3
<Heading size="large" level="1">Sidetittel</Heading>
  <Heading size="small" level="3">Underseksjon</Heading>
```

## Skjemaer

```tsx
import { TextField, Select, ErrorSummary } from "@navikt/ds-react";

// ✅ Aksel-skjemaelementer har innebygd label-kobling
<TextField
  label="Fødselsnummer"
  description="11 siffer"
  error={errors.fnr}
  autoComplete="off"
/>

// ✅ Feiloppsummering øverst i skjemaet
<ErrorSummary heading="Du må rette disse feilene før du kan sende inn">
  <ErrorSummary.Item href="#fnr">Fødselsnummer er påkrevd</ErrorSummary.Item>
</ErrorSummary>
```

## Bilder og ikoner

```tsx
// ✅ Meningsbærende bilder
<img src="/chart.png" alt="Bruksstatistikk siste 30 dager: 450 aktive brukere" />

// ✅ Dekorative bilder
<img src="/decoration.svg" alt="" />

// ✅ Ikoner med mening
<Button variant="tertiary" icon={<TrashIcon title="Slett element" />} />

// ❌ Ikonknapp uten tilgjengelig navn
<Button variant="tertiary" icon={<TrashIcon />} />
```

## Interaktive elementer

```tsx
// ✅ Synlig fokusindikator, tilgjengelig navn
<Button variant="primary">Send inn</Button>

// ✅ Lenkebeskrivelse med kontekst
<Link href={`/sak/${id}`}>Se detaljer for sak {saksnummer}</Link>

// ❌ Generisk lenketekst
<Link href={`/sak/${id}`}>Klikk her</Link>

// ❌ onClick på div uten rolle/keyboard
<div onClick={handleClick}>Klikk meg</div>
```

## ARIA-attributter

Bruk kun ARIA når HTML-semantikk ikke er tilstrekkelig:

```tsx
// ✅ Navigasjonslandemerker
<nav aria-label="Brødsmulesti">...</nav>

// ✅ Live-regioner for dynamisk innhold
<Alert variant="success" role="status">Skjemaet ble sendt inn</Alert>

// ✅ Expanding/collapsing
<Button aria-expanded={isOpen} aria-controls="panel-id" onClick={() => setIsOpen(!isOpen)}>
  Vis detaljer
</Button>

// ✅ Loading-tilstander
<div aria-busy={isLoading} aria-live="polite">
  {isLoading ? <Loader title="Laster" /> : <DataTable data={data} />}
</div>
```

## Modal med fokusfelle

```tsx
// ✅ Fokusfelle i modal — Aksel Modal håndterer dette
<Modal open={isOpen} onClose={() => setIsOpen(false)} header={{ heading: "Bekreft sletting" }}>
  <Modal.Body>Er du sikker?</Modal.Body>
  <Modal.Footer>
    <Button onClick={handleDelete}>Slett</Button>
    <Button variant="secondary" onClick={() => setIsOpen(false)}>Avbryt</Button>
  </Modal.Footer>
</Modal>
```
