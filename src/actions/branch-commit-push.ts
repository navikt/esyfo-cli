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
            message: 'Hvilken commit melding vil du gi?',
        },
    ])

    if (!commit.melding) {
        process.exit(1)
    }
    const branchNavn = await prompts([
        {
            type: 'text',
            name: 'branch',
            message: 'Hva skal branchnavnet være?',
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
                log('Fant endringer i ' + r)
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
                log('Fant ingen endringer i ' + r)
            }
        }
    }

    if (repoerMedEndringer.length == 0) {
        log('Ingen endringer å lage PR for')
        process.exit(1)
    }

    const lagPr = await prompts([
        {
            type: 'confirm',
            name: 'ok',
            message: `Vil du lage PR for endringene i ${repoerMedEndringer.join(', ')}?`,
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
            log('Lager PR for ' + repo)
            const cwd = cache ? `${GIT_CACHE_DIR}/${repo}` : `../${repo}`
            execSync(`gh pr create --title "${commitmelding}" --body "Fra esyfo-cli"`, {
                cwd: cwd,
            })

            execSync(`git checkout main`, {
                cwd: cwd,
            })
        } catch (e: any) {
            log('retry om 10 sekunder')
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
            message: `Vil du automerge endringene i ${repoerMedEndringer.join(
                ', ',
            )} til master slik at det går i produksjon?`,
        },
    ])

    if (!automerge.ok) {
        process.exit(1)
    }

    async function automergePr(r: string) {
        try {
            log('Automerger PR for ' + r)
            const cwd = cache ? `${GIT_CACHE_DIR}/${r}` : `../${r}`
            execSync('gh pr merge --auto -s', {
                cwd: cwd,
            })
        } catch (e: any) {
            log('retry om 10 sekunder')
            await sleep(10000)
            await automergePr(r)
        }
    }

    for (const r of repoerMedEndringer) {
        await automergePr(r)
    }
}
