---
description: REST API-design — URL-konvensjoner, feilhåndtering (RFC 7807), paginering og OpenAPI
---
<!-- Managed by esyfo-cli. Do not edit manually. Changes will be overwritten. -->

# API Design — REST

Standarder for REST API-design i Nav-applikasjoner.

## URL-konvensjoner

```
GET    /api/v1/vedtak              → List vedtak
GET    /api/v1/vedtak/{id}         → Hent enkelt vedtak
POST   /api/v1/vedtak              → Opprett vedtak
PUT    /api/v1/vedtak/{id}         → Oppdater vedtak (full)
PATCH  /api/v1/vedtak/{id}         → Oppdater vedtak (delvis)
DELETE /api/v1/vedtak/{id}         → Slett vedtak
```

### Regler

- Bruk **flertall** for ressursnavn: `/vedtak`, `/saker`, `/brukere`
- Bruk **kebab-case** for sammensatte navn: `/sykmeldinger`, `/oppfolgingsplaner`
- Bruk **path params** for identifikatorer: `/vedtak/{id}`
- Bruk **query params** for filtrering: `/vedtak?status=AKTIV&side=2`
- Maks **3 nivåer** nesting: `/saker/{id}/vedtak` (ikke dypere)

## HTTP-statuskoder

| Kode | Bruksområde |
|------|-------------|
| 200 | Vellykket henting/oppdatering |
| 201 | Ressurs opprettet (med `Location`-header) |
| 204 | Vellykket sletting (ingen body) |
| 400 | Ugyldig request (validering) |
| 401 | Ikke autentisert |
| 403 | Ikke autorisert (mangler tilgang) |
| 404 | Ressurs ikke funnet |
| 409 | Konflikt (duplikat, utdatert versjon) |
| 422 | Ugyldig input som er syntaktisk korrekt |
| 500 | Intern feil |

## Feilhåndtering — RFC 7807 ProblemDetail

```kotlin
// ✅ Strukturert feilrespons
@ExceptionHandler(VedtakNotFoundException::class)
fun handleNotFound(ex: VedtakNotFoundException): ProblemDetail =
    ProblemDetail.forStatusAndDetail(
        HttpStatus.NOT_FOUND,
        ex.message ?: "Vedtak ikke funnet"
    ).apply {
        title = "Vedtak ikke funnet"
        type = URI("https://api.nav.no/problems/vedtak-not-found")
    }
```

```json
{
  "type": "https://api.nav.no/problems/vedtak-not-found",
  "title": "Vedtak ikke funnet",
  "status": 404,
  "detail": "Vedtak med id 550e8400-e29b-41d4-a716-446655440000 finnes ikke"
}
```

## Paginering

```kotlin
// ✅ Offset-basert paginering
@GetMapping("/api/v1/vedtak")
fun listVedtak(
    @RequestParam(defaultValue = "0") side: Int,
    @RequestParam(defaultValue = "20") antall: Int,
): Page<VedtakDTO> {
    require(antall <= 100) { "Maks 100 per side" }
    return vedtakService.findAll(PageRequest.of(side, antall))
}
```

```json
{
  "innhold": [...],
  "side": 0,
  "antallPerSide": 20,
  "totaltAntall": 142,
  "totaltAntallSider": 8
}
```

## Input-validering

```kotlin
// ✅ Valider input med Bean Validation
data class CreateVedtakRequest(
    @field:NotBlank val brukerId: String,
    @field:Size(max = 500) val beskrivelse: String?,
    @field:NotNull val type: VedtakType,
)

@PostMapping("/api/v1/vedtak")
fun create(@RequestBody @Valid request: CreateVedtakRequest): ResponseEntity<VedtakDTO> {
    val vedtak = vedtakService.create(request)
    return ResponseEntity
        .created(URI("/api/v1/vedtak/${vedtak.id}"))
        .body(vedtak.toDTO())
}
```

## OpenAPI / Swagger

```kotlin
// ✅ Dokumenter endepunkter med OpenAPI-annotasjoner
@Operation(summary = "Hent vedtak", description = "Henter et vedtak basert på ID")
@ApiResponse(responseCode = "200", description = "Vedtak funnet")
@ApiResponse(responseCode = "404", description = "Vedtak ikke funnet")
@GetMapping("/api/v1/vedtak/{id}")
fun getVedtak(@PathVariable id: UUID): VedtakDTO
```

## Versjonering

- Bruk URL-versjonering: `/api/v1/...`
- Bump versjon kun ved breaking changes
- Støtt gammel versjon i overgangsperiode
- Dokumenter endringer i changelog

## Grenser

### ✅ Alltid
- Flertall for ressursnavn
- RFC 7807 ProblemDetail for feilresponser
- Valider all input
- Dokumenter med OpenAPI
- Location-header ved 201

### ⚠️ Spør først
- Nye API-versjoner (breaking changes)
- Endring av eksisterende kontrakt
- Asynkrone operasjoner (202 Accepted)

### 🚫 Aldri
- Verb i URL-er (`/getVedtak`, `/createSak`)
- PII i URL-er eller query params (FNR, navn)
- 200 med feilmelding i body
- Ukonsistent navngiving mellom endepunkter
