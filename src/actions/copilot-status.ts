import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

import chalk from 'chalk'

import { log } from '../common/log.ts'
import { Gitter } from '../common/git.ts'
import { GIT_CACHE_DIR } from '../common/cache.ts'
import { resolveTypeFromTopics } from '../common/get-all-repos.ts'
import { detectRepoStack } from '../copilot-config/detector.ts'
import { assembleForRepo } from '../copilot-config/assembler.ts'
import { fetchReposByTopic, fetchAllTeamRepos, COPILOT_TOPIC } from '../copilot-config/topic-repos.ts'

import { loadSyncConfig, repoTypeToProfile } from './copilot-sync.ts'

type SyncState = 'synced' | 'outdated' | 'missing'

interface RepoStatus {
    repo: string
    profile: string
    stack: string
    state: SyncState
    detail: string
}

export async function copilotStatus(options: { repo?: string }): Promise<void> {
    const config = loadSyncConfig()

    log(chalk.green(`Søker etter repos med topic ${chalk.cyan(COPILOT_TOPIC)}...`))
    const repos = await fetchReposByTopic(options.repo)
    if (repos.length === 0) {
        if (options.repo) {
            log(chalk.red(`Repo '${options.repo}' ikke funnet med topic ${COPILOT_TOPIC}`))
        } else {
            log(chalk.yellow(`Ingen repos med copilot-topic funnet.`))
            log(chalk.dim(`  Legg til repos med: ecli copilot manage add <repo>`))
        }
        return
    }

    log(`Found ${chalk.yellow(repos.length)} repos to check\n`)

    // Clone/pull
    log(chalk.green('Cloning/pulling repositories...'))
    const gitter = new Gitter('cache')
    const cloneResults = await Promise.allSettled(repos.map((r) => gitter.cloneOrPull(r.name, r.defaultBranch, true)))

    const failedClones: string[] = []
    const succeededRepos = repos.filter((repo, i) => {
        const result = cloneResults[i]
        if (result.status === 'rejected') {
            failedClones.push(repo.name)
            log(chalk.red(`  ✗ ${repo.name}: ${(result.reason as Error).message ?? result.reason}`))
            return false
        }
        if (typeof result.value === 'object' && result.value.type === 'error') {
            failedClones.push(repo.name)
            log(chalk.red(`  ✗ ${repo.name}: ${result.value.message}`))
            return false
        }
        return true
    })

    if (failedClones.length > 0) {
        log(chalk.red(`\n  ${failedClones.length} repo(s) feilet clone/pull: ${failedClones.join(', ')}`))
    }

    if (succeededRepos.length === 0) {
        log(chalk.red('\nAlle repos feilet clone/pull. Avbryter.'))
        return
    }
    log('')

    log(chalk.green('Checking sync status...\n'))

    const statuses: RepoStatus[] = []

    for (const repo of succeededRepos) {
        const repoPath = path.join(GIT_CACHE_DIR, repo.name)
        try {
            const topicType = resolveTypeFromTopics(repo.topics)
            const profile = repoTypeToProfile(topicType)

            const stack = await detectRepoStack(repoPath)
            stack.repoName = repo.name
            if (stack.type === 'other' && profile !== 'other') {
                stack.type = profile
            }

            const effectiveProfile = stack.type

            // Check if copilot config exists BEFORE assembly (to detect truly missing repos)
            const hasCopilotConfig = fs.existsSync(path.join(repoPath, '.github', 'copilot-instructions.md'))

            let assembly: Awaited<ReturnType<typeof assembleForRepo>>
            let hasChanges = false
            let changedCount = 0

            try {
                // Run assembly to compute expected state (writes to cached repo)
                assembly = await assembleForRepo(repoPath, effectiveProfile, stack, config)

                // Use git to detect actual content drift (modified + untracked)
                try {
                    execSync('git diff-index --quiet HEAD -- .github/', { cwd: repoPath, stdio: 'pipe' })
                } catch {
                    hasChanges = true
                    try {
                        const diff = execSync('git diff-index --name-only HEAD -- .github/', {
                            cwd: repoPath,
                            encoding: 'utf8',
                        }).trim()
                        changedCount = diff ? diff.split('\n').length : 0
                    } catch {
                        changedCount = 1
                    }
                }

                // Also check for untracked .github/ files
                try {
                    const untracked = execSync('git ls-files --others --exclude-standard .github/', {
                        cwd: repoPath,
                        encoding: 'utf8',
                    }).trim()
                    if (untracked.length > 0) {
                        hasChanges = true
                        changedCount += untracked.split('\n').length
                    }
                } catch {
                    // ignore
                }
            } finally {
                // Reset cached repo back to clean state — must always run
                try {
                    execSync('git checkout -- .github/', { cwd: repoPath, stdio: 'pipe' })
                } catch {
                    // repo might not have .github/ yet
                }
                try {
                    execSync('git clean -fd .github/', { cwd: repoPath, stdio: 'pipe' })
                } catch {
                    // ignore
                }
            }

            const stackParts: string[] = [effectiveProfile]
            if (stack.subProfiles && stack.subProfiles.length > 1) {
                const frameworks = [stack.framework, stack.kotlinFramework].filter(Boolean)
                stackParts.push(frameworks.length > 0 ? frameworks.join(' + ') : stack.subProfiles.join(' + '))
            } else if (stack.framework) {
                stackParts.push(stack.framework)
            }

            const totalFiles = assembly.filesWritten.length + assembly.filesUnchanged.length

            let state: SyncState
            let detail: string
            if (!hasCopilotConfig) {
                state = 'missing'
                detail = 'no copilot config'
            } else if (hasChanges) {
                state = 'outdated'
                detail = `${changedCount} file${changedCount !== 1 ? 's' : ''} differ`
            } else {
                state = 'synced'
                detail = `${totalFiles} files`
            }

            statuses.push({
                repo: repo.name,
                profile: effectiveProfile,
                stack: stackParts.join(' / '),
                state,
                detail,
            })
        } catch (e) {
            log(chalk.red(`  ✗ Failed to process ${repo.name}: ${(e as Error).message}`))
            continue
        }
    }

    // Print table
    const maxRepo = Math.max(4, ...statuses.map((s) => s.repo.length))
    const maxStack = Math.max(5, ...statuses.map((s) => s.stack.length))

    const header = `  ${'Repo'.padEnd(maxRepo)}  ${'Stack'.padEnd(maxStack)}  ${'Status'.padEnd(10)}  Detail`
    log(chalk.bold(header))
    log(chalk.dim('  ' + '─'.repeat(header.length - 2)))

    for (const s of statuses) {
        const icon = stateIcon(s.state)
        const stateStr = stateLabel(s.state)
        log(
            `  ${s.repo.padEnd(maxRepo)}  ${chalk.dim(s.stack.padEnd(maxStack))}  ${icon} ${stateStr.padEnd(
                8,
            )}  ${chalk.dim(s.detail)}`,
        )
    }

    let allTeamRepos: Awaited<ReturnType<typeof fetchAllTeamRepos>> | null = null
    if (!options.repo) {
        log(chalk.dim('\nHenter alle team-repos...'))
        allTeamRepos = await fetchAllTeamRepos()
    }

    const managedNames = new Set(repos.map((r) => r.name))
    const unmanaged = allTeamRepos ? allTeamRepos.filter((r) => !managedNames.has(r.name)) : []

    // Summary
    const synced = statuses.filter((s) => s.state === 'synced').length
    const missing = statuses.filter((s) => s.state === 'missing').length
    const outdated = statuses.filter((s) => s.state === 'outdated').length

    log('')
    log(chalk.bold('Summary:'))
    if (synced > 0) log(chalk.green(`  ✅ ${synced} synced`))
    if (missing > 0) log(chalk.red(`  ❌ ${missing} missing config`))
    if (outdated > 0) log(chalk.yellow(`  ⚠️  ${outdated} outdated`))
    if (failedClones.length > 0) log(chalk.red(`  ✗ ${failedClones.length} feilet clone/pull`))
    if (allTeamRepos) {
        log(`  Managed: ${chalk.cyan(`${repos.length}/${allTeamRepos.length}`)} team repos`)
    }

    if (missing > 0 || outdated > 0) {
        log(chalk.dim(`\n  Kjør ${chalk.white('ecli copilot sync --all')} for å synkronisere.`))
    }

    // Show unmanaged repos (team repos without copilot-topic)
    if (!options.repo) {
        if (unmanaged.length > 0) {
            log(`\n${chalk.dim.bold('Team-repos uten copilot-topic:')}`)
            for (const repo of unmanaged) {
                log(`  ${chalk.dim('⚪')} ${repo.name}`)
            }
            log(chalk.dim(`\n  Legg til med: ${chalk.white('ecli copilot manage add <repo>')}`))
        }
    }
}

function stateIcon(state: SyncState): string {
    switch (state) {
        case 'synced':
            return chalk.green('✅')
        case 'outdated':
            return chalk.yellow('⚠️ ')
        case 'missing':
            return chalk.red('❌')
    }
}

function stateLabel(state: SyncState): string {
    switch (state) {
        case 'synced':
            return chalk.green('synced')
        case 'outdated':
            return chalk.yellow('outdated')
        case 'missing':
            return chalk.red('missing')
    }
}
