import { config } from '../config/config.ts'
import { log } from '../common/log.ts'
import { getAllRepos } from '../common/get-all-repos.ts'

import { verifiserRepo } from './verifiserRepo'

export async function verifiserRepoer(patch: boolean) {
    log('\n\nVerifiserer alle repoer ')

    const githubrepos = (await getAllRepos()).map((it) => it.name)
    for (const r of config.repos) {
        await verifiserRepo({ name: r.name, patch: patch })
        if (!githubrepos.includes(r.name)) {
            log(`Repo ${r.name} finnes ikke på github`)
        }
    }

    for (const r of githubrepos) {
        if (!config.repos.find((it) => it.name === r)) {
            log(`Repo ${r} finnes ikke i config`)
        }
    }

    log('\n\nFerdig')
}

export async function verifiserRepoet(repo: string, patch: boolean) {
    await verifiserRepo({ name: repo, patch })

    log('\n\nFerdig')
}
