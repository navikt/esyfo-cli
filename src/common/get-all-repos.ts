import chalk from 'chalk'

import { ghGqlQuery, OrgTeamRepoResult, removeIgnoredAndArchived } from './octokit.ts'
import { log } from './log.ts'

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

export async function getAllRepos() {
    log(chalk.green(`Getting all active repositories for team-esyfo...`))

    const result = await ghGqlQuery<OrgTeamRepoResult<RepoWithBranchAndTopics>>(reposQuery, {
        team: 'team-esyfo',
    })

    return removeIgnoredAndArchived(result.organization.team.repositories.nodes)
}
