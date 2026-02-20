import { BaseRepoNode, removeIgnoredArchivedAndNonAdmin } from '../common/octokit.ts'
import { getAllRepos } from '../common/get-all-repos'

import { RepoWithBranchAndTopics } from './../common/get-all-repos'

type RepoType = 'backend' | 'frontend' | 'microfrontend' | 'other'

type RepositoryNode = {
    title: string
    description?: string
    url: string
    topics: string[]
    type: RepoType
}

function extractTypeFromTopics(repo: BaseRepoNode<RepoWithBranchAndTopics>): RepoType {
    const topics = repo.repositoryTopics.nodes.map((it) => it.topic.name)
    if (topics.includes('backend')) return 'backend'
    if (topics.includes('frontend')) return 'frontend'
    if (topics.includes('microfrontend')) return 'microfrontend'
    return 'other'
}

function toRepositoryNodes(repos: BaseRepoNode<RepoWithBranchAndTopics>[]): RepositoryNode[] {
    return repos.map((repo) => ({
        title: repo.name,
        description: repo.description ?? undefined,
        url: repo.url,
        topics: repo.repositoryTopics.nodes.map((it) => it.topic.name),
        type: extractTypeFromTopics(repo),
    }))
}

export async function ourRepos(outputFile = 'repos.json'): Promise<void> {
    const githubrepos = (await getAllRepos()) as BaseRepoNode<RepoWithBranchAndTopics>[]
    const repositories = toRepositoryNodes(removeIgnoredArchivedAndNonAdmin(githubrepos))

    const pretty = JSON.stringify(repositories, null, 2)
    await Bun.write(outputFile, `${pretty}\n`)
}
