import { BaseRepoNode, ghGqlQuery, removeIgnoredArchivedAndNonAdmin } from '../common/octokit.ts'

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

async function fetchAllTeamRepoNodes(): Promise<BaseRepoNode<RepoWithTopics>[]> {
    const allRepoNodes: BaseRepoNode<RepoWithTopics>[] = []
    let cursor: string | null = null
    let hasNextPage = true

    while (hasNextPage) {
        const result: OrgTeamRepoPageResult<RepoWithTopics> = await ghGqlQuery(teamReposQuery, { team: TEAM, cursor })
        allRepoNodes.push(...result.organization.team.repositories.nodes)

        hasNextPage = result.organization.team.repositories.pageInfo.hasNextPage
        cursor = result.organization.team.repositories.pageInfo.endCursor
    }

    return allRepoNodes
}

function hasPushAccess(viewerPermission: string): boolean {
    return viewerPermission === 'WRITE' || viewerPermission === 'MAINTAIN' || viewerPermission === 'ADMIN'
}

export async function fetchReposByTopic(repoFilter?: string): Promise<RepoNode[]> {
    const repos = (await fetchAllTeamRepoNodes())
        .filter((repo) => !repo.isArchived)
        .filter((repo) => hasPushAccess(repo.viewerPermission))
        .map((repo) => ({
            name: repo.name,
            description: repo.description,
            defaultBranch: repo.defaultBranchRef.name,
            topics: repo.repositoryTopics.nodes.map((it) => it.topic.name),
        }))
        .filter((repo) => repo.topics.includes(COPILOT_TOPIC))

    if (repoFilter) {
        return repos.filter((repo) => repo.name === repoFilter)
    }

    return repos
}

export async function fetchAllTeamRepos(): Promise<TeamRepo[]> {
    const repos = removeIgnoredArchivedAndNonAdmin(await fetchAllTeamRepoNodes()).map((repo) => ({
        name: repo.name,
        topics: repo.repositoryTopics.nodes.map((it) => it.topic.name),
    }))

    return repos.sort((a, b) => a.name.localeCompare(b.name))
}
