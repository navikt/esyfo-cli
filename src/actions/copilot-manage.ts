import chalk from 'chalk'

import { log } from '../common/log.ts'
import { resolveTypeFromTopics } from '../common/get-all-repos.ts'
import { fetchAllTeamRepos, COPILOT_TOPIC, ORG } from '../copilot-config/topic-repos.ts'

export async function copilotManage(options: { add?: string[]; remove?: string[] }): Promise<void> {
    if (options.add && options.add.length > 0) {
        await addTopicToRepos(options.add)
        return
    }
    if (options.remove && options.remove.length > 0) {
        await removeTopicFromRepos(options.remove)
        return
    }
    await listManagedRepos()
}

async function listManagedRepos(): Promise<void> {
    log(chalk.dim('Henter repos...'))
    const allRepos = await fetchAllTeamRepos()

    const withTopic = allRepos.filter((r) => r.topics.includes(COPILOT_TOPIC))
    const withoutTopic = allRepos.filter((r) => !r.topics.includes(COPILOT_TOPIC))

    if (withTopic.length > 0) {
        log(chalk.green.bold('\nManaged repos:'))
        const maxName = Math.max(...withTopic.map((r) => r.name.length))
        for (const repo of withTopic) {
            const profile = resolveTypeFromTopics(repo.topics)
            log(`  ${chalk.green('✅')} ${repo.name.padEnd(maxName)}  ${chalk.dim(profile)}`)
        }
    } else {
        log(chalk.yellow('\nIngen repos med copilot-topic funnet.'))
    }

    log(
        `\n${chalk.bold('Oppsummering:')} ${chalk.green(`${withTopic.length} managed`)} av ${
            allRepos.length
        } team-repos`,
    )

    if (withoutTopic.length > 0) {
        log(chalk.dim(`\nLegg til repos med: ecli copilot manage add <repo...>`))
    }
}

async function addTopicToRepos(repoNames: string[]): Promise<void> {
    log(chalk.green(`Legger til topic '${COPILOT_TOPIC}'...\n`))
    for (const name of repoNames) {
        const result = Bun.spawnSync(['gh', 'repo', 'edit', `${ORG}/${name}`, '--add-topic', COPILOT_TOPIC], {
            stdio: ['pipe', 'pipe', 'pipe'],
        })
        if (result.success) {
            log(chalk.green(`  ✅ ${name}`))
        } else {
            const stderr = result.stderr?.toString().trim() ?? ''
            log(chalk.red(`  ✗ ${name}: ${stderr}`))
        }
    }
}

async function removeTopicFromRepos(repoNames: string[]): Promise<void> {
    log(chalk.yellow(`Fjerner topic '${COPILOT_TOPIC}'...\n`))
    for (const name of repoNames) {
        const result = Bun.spawnSync(['gh', 'repo', 'edit', `${ORG}/${name}`, '--remove-topic', COPILOT_TOPIC], {
            stdio: ['pipe', 'pipe', 'pipe'],
        })
        if (result.success) {
            log(chalk.yellow(`  ⚪ ${name}`))
        } else {
            const stderr = result.stderr?.toString().trim() ?? ''
            log(chalk.red(`  ✗ ${name}: ${stderr}`))
        }
    }
}
