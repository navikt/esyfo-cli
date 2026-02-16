import { BaseRepoNode, removeIgnoredArchivedAndNonAdmin } from '../common/octokit.ts'
import { getAllRepos } from '../common/get-all-repos'

import { RepoWithBranch } from './../common/get-all-repos'

type RepositoryNode = {
    title: string
    url: string
    viewerPermission: string
}

function toRepositoryNodes(repos: BaseRepoNode<RepoWithBranch>[]): RepositoryNode[] {
    return repos.map((repo) => ({
        title: repo.name,
        url: repo.url,
        viewerPermission: repo.viewerPermission,
    }))
}

export async function ourRepos(): Promise<void> {
    const githubrepos = (await getAllRepos()) as BaseRepoNode<RepoWithBranch>[]
    const repositories = toRepositoryNodes(removeIgnoredArchivedAndNonAdmin(githubrepos))

    const pretty = JSON.stringify(repositories, null, 2)
    console.log(pretty)
}
