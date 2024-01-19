import { execSync } from 'node:child_process'

import prompts from 'prompts'

import { config } from '../config/config'
import { log } from '../common/log.ts'
import { GIT_CACHE_DIR } from '../common/cache.ts'

export async function branchCommitPush(cache: boolean = false) {
    const commit = await prompts([
        {
            type: 'text',
            name: 'melding',
            message: 'What should commit message be?',
        },
    ])

    if (!commit.melding) {
        process.exit(1)
    }
    const branchNavn = await prompts([
        {
            type: 'text',
            name: 'branch',
            message: 'What branch name do you want to use?',
        },
    ])

    if (!branchNavn.branch) {
        process.exit(1)
    }
    await branchCommitPushAuto(
        branchNavn.branch,
        commit.melding,
        config.repos.map((it) => it.name),
        cache,
    )
}

export async function branchCommitPushAuto(
    branchNavn: string,
    commitmelding: string,
    repoer: string[],
    cache: boolean = false,
) {
    const repoerMedEndringer: string[] = []
    for (const r of repoer) {
        log(r)
        if (r == 'esyfo-cli') {
            // skipper dette repoet
        } else {
            let endringer = false
            const cwd = cache ? `${GIT_CACHE_DIR}/${r}` : `../${r}`
            log(cwd)
            try {
                execSync('git diff-index --quiet HEAD', {
                    cwd: cwd,
                })
            } catch (e: any) {
                endringer = true
            }
            if (endringer) {
                log('Found changes in ' + r)
                execSync(`git checkout -b ${branchNavn}`, {
                    cwd: cwd,
                })
                execSync('git add .', {
                    cwd: cwd,
                })
                execSync(`git commit -m "${commitmelding}"`, {
                    cwd: cwd,
                })
                execSync(`git push --set-upstream origin ${branchNavn}`, {
                    cwd: cwd,
                })
                repoerMedEndringer.push(r)
            } else {
                log('Didnt find any changes in ' + r)
            }
        }
    }

    if (repoerMedEndringer.length == 0) {
        log('No changes to make PR of')
        process.exit(1)
    }

    const lagPr = await prompts([
        {
            type: 'confirm',
            name: 'ok',
            message: `Do you want to create a Pull Request for the changes in ${repoerMedEndringer.join(', ')}?`,
        },
    ])

    if (!lagPr.ok) {
        process.exit(1)
    }

    async function sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    async function lagPR(repo: string, cache: boolean = false) {
        try {
            log('Creating Pull Request for ' + repo)
            const cwd = cache ? `${GIT_CACHE_DIR}/${repo}` : `../${repo}`
            execSync(`gh pr create --title "${commitmelding}" --body "Fra esyfo-cli"`, {
                cwd: cwd,
            })

            execSync(`git checkout main`, {
                cwd: cwd,
            })
        } catch (e: any) {
            log('retry in 10 seconds')
            await sleep(10000)
            await lagPR(repo)
        }
    }

    for (const r of repoerMedEndringer) {
        await lagPR(r, cache)
    }

    const automerge = await prompts([
        {
            type: 'confirm',
            name: 'ok',
            message: `Do you want to automatically merge the changes in ${repoerMedEndringer.join(
                ', ',
            )} to main (will deploy to production)?`,
        },
    ])

    if (!automerge.ok) {
        process.exit(1)
    }

    async function automergePr(r: string) {
        try {
            log('Automatically merge pull request for ' + r)
            const cwd = cache ? `${GIT_CACHE_DIR}/${r}` : `../${r}`
            execSync('gh pr merge --auto -s', {
                cwd: cwd,
            })
        } catch (e: any) {
            log('retry in 10 seconds')
            await sleep(10000)
            await automergePr(r)
        }
    }

    for (const r of repoerMedEndringer) {
        await automergePr(r)
    }
}
