---
description: Create a Flyway database migration with proper conventions
---

# Flyway Migration

Create a new Flyway migration file following team-esyfo conventions.

## Steps

1. List existing migrations in `src/main/resources/db/migration/` to determine next version number
2. Read the most recent migration to understand naming and style conventions
3. Create the new migration file with proper naming: `V{next}__{description}.sql`

## Conventions

- Use `IF NOT EXISTS` / `IF EXISTS` for safety
- Use `TIMESTAMPTZ` for timestamps (with `DEFAULT NOW()`)
- Use `UUID` with `gen_random_uuid()` for primary keys where appropriate
- Use `TEXT` instead of `VARCHAR`
- Add indexes for frequently queried columns
- One focused change per migration

## Template

```sql
-- V{number}__{description}.sql
CREATE TABLE IF NOT EXISTS table_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_table_name_field ON table_name(field);
```
