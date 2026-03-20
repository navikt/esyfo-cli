const blacklist: string[] = [
  "aktivitetskrav-mikrofrontend",
  "dialogmote-mikrofrontend",
  "esyfo-cli",
  "esyfo-dev-tools",
  "esyfo-proxy",
  "isdialogmelding",
  "istilgangskontroll",
  "meroppfolging-mikrofrontend",
  "nav-ekstern-api-dok",
  "oppfolgingsplan-backend",
  "oppfolgingsplan-frontend",
  "syfojanitor-backend",
  "syfojanitor-frontend",
  "syfooppdfgen",
  "syfooppfolgingsplanservice",
  "teamesyfo-github-actions-workflows",
  "team-esyfo",
];

export function blacklisted<Repo extends { name: string }>(
  repo: Repo,
): boolean {
  return !blacklist.includes(repo.name);
}
