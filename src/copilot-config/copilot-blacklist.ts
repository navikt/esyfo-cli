const blacklist: string[] = ['esyfo-cli', 'teamesyfo-github-actions-workflows']

export function blacklisted<Repo extends { name: string }>(repo: Repo): boolean {
    return !blacklist.includes(repo.name)
}
