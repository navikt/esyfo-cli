import { getOctokitClient } from '../common/octokit.ts'

export const ORG = 'navikt'
export const TEAM = 'team-esyfo'
export const COPILOT_TOPIC = 'team-esyfo-copilot'

export interface RepoNode {
    name: string
    description?: string
    defaultBranch: string
    topics: string[]
}

export interface TeamRepo {
    name: string
    topics: string[]
}

export async function fetchReposByTopic(repoFilter?: string): Promise<RepoNode[]> {
    const octokit = getOctokitClient()
    const repos: RepoNode[] = []

    let page = 1
    while (true) {
        const { data } = await octokit.rest.search.repos({
            q: `org:${ORG} topic:${COPILOT_TOPIC} archived:false`,
            per_page: 100,
            page,
        })

        for (const item of data.items) {
            if (!item.permissions?.push) continue
            repos.push({
                name: item.name,
                description: item.description ?? undefined,
                defaultBranch: item.default_branch,
                topics: item.topics ?? [],
            })
        }

        if (data.items.length < 100) break
        page++
    }

    if (repoFilter) {
        return repos.filter((r) => r.name === repoFilter)
    }

    return repos
}

export async function fetchAllTeamRepos(): Promise<TeamRepo[]> {
    const octokit = getOctokitClient()
    const repos: TeamRepo[] = []

    let page = 1
    while (true) {
        const { data } = await octokit.rest.teams.listReposInOrg({
            org: ORG,
            team_slug: TEAM,
            per_page: 100,
            page,
        })

        for (const item of data) {
            if (item.archived) continue
            repos.push({
                name: item.name,
                topics: item.topics ?? [],
            })
        }

        if (data.length < 100) break
        page++
    }

    return repos.sort((a, b) => a.name.localeCompare(b.name))
}
