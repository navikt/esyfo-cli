import { Octokit } from '@octokit/rest'

import { getGithubCliToken } from '../common/octokit.ts'

export const octokit = new Octokit({
    auth: getGithubCliToken(),
    request: {
        timeout: 10000, // Timeout i millisekunder
    },
})
