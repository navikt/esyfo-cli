# Projects V2 felthåndtering

## MCP (primær)

Bruk MCP `projects_write` først for å legge issues i prosjekt og oppdatere felter.

- Krever at `projects`-toolset er aktivert
- Team eSyfo-kontekst: `owner=navikt`, prosjekt: **Team eSyfo**
- Standardverdier som brukes i prosjektet:
  - **Statuser:** `Backlog`, `Plukk meg! 🙌`, `Jeg jobbes med! ⚒️`, `Monday epics 🎯`, `Done`
  - **Typer:** `Bug`, `Epic`, `Feature`, `Story`, `Task`

## Fallback (gh project)

Når MCP ikke er tilgjengelig, bruk `gh project`-kommandoer.

### Komplett workflow

1. Finn prosjektnummer
```bash
gh project list --owner navikt --format json
```

2. Hent field-IDs og option-IDs
```bash
gh project field-list N --owner navikt --format json
```

3. Legg issue inn i prosjektet
```bash
gh project item-add N --owner navikt --url ISSUE_URL --format json
```

4. Sett felt (single select)
```bash
gh project item-edit \
  --id ITEM_ID \
  --field-id FIELD_ID \
  --project-id PROJECT_ID \
  --single-select-option-id OPTION_ID
```

### Notat

`FIELD_ID` og `OPTION_ID` er stabile over tid og kan caches for raskere operasjoner.
