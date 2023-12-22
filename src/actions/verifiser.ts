import chalk from 'chalk'

import { config } from '../config/config'
import { log } from '../common/log'
import { getAllRepos } from '../common/get-all-repos'

import { verifiserRepo } from './verifiserRepo'

export async function verifiserRepoer(patch: boolean) {
    log('\n\nVerifiserer alle repoer ')

    const githubrepos = (await getAllRepos()).map((it) => it.name)
    for (const r of config.repos) {
        log(chalk.blueBright.underline(`\n\nVerifiserer innstillinger for ${r.name}`))
        await verifiserRepo({ name: r.name, patch: patch })
        if (!githubrepos.includes(r.name)) {
            log(`Repo ${r.name} finnes ikke på github`)
        }
    }

    log('\n\n')

    for (const r of githubrepos) {
        if (!config.repos.find((it) => it.name === r)) {
            log(`Repo ${r} finnes ikke i config`)
        }
    }

    log('\n\nFerdig')
}

export async function verifiserRepoet(repo: string, patch: boolean) {
    log(chalk.blueBright.underline(`\n\nVerifiserer innstillinger for ${repo}`))

    await verifiserRepo({ name: repo, patch })

    log('\n\nFerdig')
}
