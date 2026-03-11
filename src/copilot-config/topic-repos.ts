import { BaseRepoNode, getOctokitClient, ghGqlQuery, removeIgnoredArchivedAndNonAdmin } from '../common/octokit.ts'

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

interface RepoWithTopics {
    repositoryTopics: {
        nodes: {
            topic: {
                name: string
            }
        }[]
    }
}

interface OrgTeamRepoPageResult<AdditionalRepoProps> {
    organization: {
        team: {
            repositories: {
                nodes: BaseRepoNode<AdditionalRepoProps>[]
                pageInfo: {
                    hasNextPage: boolean
                    endCursor: string | null
                }
            }
        }
    }
}

const teamReposQuery = /* GraphQL */ `
    query ($team: String!, $cursor: String) {
        organization(login: "navikt") {
            team(slug: $team) {
                repositories(first: 100, after: $cursor, orderBy: { field: PUSHED_AT, direction: ASC }) {
                    nodes {
                        name
                        description
                        isArchived
                        pushedAt
                        url
                        defaultBranchRef {
                            name
                        }
                        viewerPermission
                        repositoryTopics(first: 20) {
                            nodes {
                                topic {
                                    name
                                }
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        }
    }
`

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
    const allRepoNodes: BaseRepoNode<RepoWithTopics>[] = []
    let cursor: string | null = null
    let hasNextPage = true

    while (hasNextPage) {
        const result: OrgTeamRepoPageResult<RepoWithTopics> = await ghGqlQuery(teamReposQuery, { team: TEAM, cursor })
        allRepoNodes.push(...result.organization.team.repositories.nodes)

        hasNextPage = result.organization.team.repositories.pageInfo.hasNextPage
        cursor = result.organization.team.repositories.pageInfo.endCursor
    }

    const repos = removeIgnoredArchivedAndNonAdmin(allRepoNodes).map((repo) => ({
        name: repo.name,
        topics: repo.repositoryTopics.nodes.map((it) => it.topic.name),
    }))

    return repos.sort((a, b) => a.name.localeCompare(b.name))
}
