import { Octokit } from '@octokit/rest'

import { getGithubCliToken } from '../common/githubToken.ts'

export const octokit = new Octokit({
    auth: getGithubCliToken(),
    request: {
        timeout: 10000, // Timeout i millisekunder
    },
})
