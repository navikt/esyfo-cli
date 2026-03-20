const blacklist: string[] = [
  "vault-iac",
  "aad-iac",
  "isdialogmote-schema",
  "arbeidsgiver-notifikasjon-produsenter",
  "isoppfolgingstilfelle",
  "syfodok",
  "isdialogmote",
  "isnarmesteleder",
  "isyfomock",
  "syfomodiaperson",
];

export function blacklisted<Repo extends { name: string }>(
  repo: Repo,
): boolean {
  return !blacklist.includes(repo.name);
}
