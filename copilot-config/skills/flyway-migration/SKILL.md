---
description: Create a Flyway database migration with proper conventions
---

# Flyway Migration

Create a new Flyway migration file following team-esyfo conventions.

## Steps

1. Find the migration directory by searching for existing `V*__*.sql` files under `src/main/resources/db/` (or checking `flyway.locations` in application config), then list existing migrations to determine next version number
2. Read the most recent migration to understand naming and style conventions
3. Create the new migration file with proper naming: `V{next}__{description}.sql`

## Conventions

- Prefer fail-fast in versioned migrations — use `IF NOT EXISTS` / `IF EXISTS` only when idempotency is intentional
- Use `TIMESTAMPTZ` for timestamps (with `DEFAULT NOW()`)
- Use `UUID` with `gen_random_uuid()` for primary keys where appropriate
- Use `TEXT` instead of `VARCHAR`
- Add indexes for frequently queried columns
- One focused change per migration

## Template

```sql
-- V{number}__{description}.sql
CREATE TABLE table_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_table_name_field ON table_name(field);
```
