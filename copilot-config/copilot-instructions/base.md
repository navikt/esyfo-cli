# {{repo_name}}

## Team
- **Team**: team-esyfo, NAV IT
- **Org**: navikt

## NAV Principles
- **Team First**: Autonomous teams with circles of autonomy
- **Product Development**: Continuous development over ad hoc approaches
- **Essential Complexity**: Focus on essential, avoid accidental complexity
- **DORA Metrics**: Measure and improve team performance

## Platform & Auth
- **Platform**: NAIS (Kubernetes on GCP)
- **Auth**: Azure AD (internal users), TokenX (on-behalf-of token exchange), ID-porten (citizens), Maskinporten (machine-to-machine)
- **Observability**: Prometheus metrics, Grafana Loki logs, Tempo tracing (OpenTelemetry)
- **Required endpoints**: `/isalive`, `/isready`, `/metrics`

## Conventions
- Norwegian user-facing text, English code and comments
- Use Context7 (`context7-resolve-library-id` → `context7-query-docs`) for library-specific patterns
- Use NAV GitHub MCP for cross-repo search and reference
- Check existing code patterns in the repository before writing new code
- Follow the ✅ Always / ⚠️ Ask First / 🚫 Never boundaries in agent and instruction files
