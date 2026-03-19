---
description: Opprett en Flyway-databasemigrering etter riktige konvensjoner
---

# Flyway-migrering

Opprett en ny Flyway-migreringsfil etter team-esyfos konvensjoner.

## Steg

1. Finn migreringsmappen ved å søke etter eksisterende `V*__*.sql`-filer under `src/main/resources/db/` (eller ved å sjekke `flyway.locations` i applikasjonskonfigurasjonen), og list deretter eksisterende migreringer for å finne neste versjonsnummer
2. Les den nyeste migreringen for å forstå navngivings- og stilkonvensjonene
3. Opprett den nye migreringsfilen med riktig navn: `V{next}__{description}.sql`

## Konvensjoner

- Foretrekk fail-fast i versjonerte migreringer — bruk `IF NOT EXISTS` / `IF EXISTS` bare når idempotency er bevisst
- Bruk `TIMESTAMPTZ` for tidsstempler (med `DEFAULT NOW()`)
- Bruk `UUID` med `gen_random_uuid()` for primærnøkler der det passer
- Bruk `TEXT` i stedet for `VARCHAR`
- Legg til indekser for kolonner det søkes ofte på
- Én fokusert endring per migrering

## Mal

```sql
-- V{number}__{description}.sql
CREATE TABLE table_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_table_name_field ON table_name(field);
```
