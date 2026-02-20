import chalk from 'chalk'

import { BaseRepoNode, ghGqlQuery, OrgTeamRepoResult, removeIgnoredAndArchived } from './octokit.ts'
import { log } from './log.ts'

export type RepoType = 'backend' | 'frontend' | 'microfrontend' | 'monorepo' | 'other'

export function extractTypeFromTopics(repo: BaseRepoNode<RepoWithBranchAndTopics>): RepoType {
    const topics = repo.repositoryTopics.nodes.map((it) => it.topic.name)
    if (topics.includes('monorepo')) return 'monorepo'
    if (topics.includes('backend')) return 'backend'
    if (topics.includes('frontend')) return 'frontend'
    if (topics.includes('microfrontend')) return 'microfrontend'
    return 'other'
}

export type RepoWithBranchAndTopics = {
    defaultBranchRef: { name: string }
    repositoryTopics: {
        nodes: {
            topic: {
                name: string
            }
        }[]
    }
}

const reposQuery = /* GraphQL */ `
    query ($team: String!) {
        organization(login: "navikt") {
            team(slug: $team) {
                repositories(orderBy: { field: PUSHED_AT, direction: ASC }) {
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
                }
            }
        }
    }
`

export async function getAllRepos(team: string = 'team-esyfo') {
    log(chalk.green(`Getting all active repositories for ${team}...`))

    const result = await ghGqlQuery<OrgTeamRepoResult<RepoWithBranchAndTopics>>(reposQuery, {
        team: team,
    })

    return removeIgnoredAndArchived(result.organization.team.repositories.nodes)
}
