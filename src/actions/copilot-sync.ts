import path from 'node:path'
import { execSync } from 'node:child_process'

import chalk from 'chalk'

import { log } from '../common/log.ts'
import { Gitter } from '../common/git.ts'
import { GIT_CACHE_DIR } from '../common/cache.ts'
import { resolveTypeFromTopics, RepoType } from '../common/get-all-repos.ts'
import inquirer from '../common/inquirer.ts'
import { loadCopilotSyncConfig, CopilotSyncConfig, RepoProfile } from '../copilot-config/sync-config.ts'
import { COPILOT_CONFIG_BASE } from '../copilot-config/paths.ts'
import { detectRepoStack, logStackInfo } from '../copilot-config/detector.ts'
import { assembleForRepo, AssemblyResult } from '../copilot-config/assembler.ts'
import { fetchCopilotRepos } from '../copilot-config/copilot-repos.ts'

export function repoTypeToProfile(type: RepoType): RepoProfile {
    if (type === 'monorepo') return 'other'
    return type
}

export function loadSyncConfig(): CopilotSyncConfig {
    const configPath = path.resolve(COPILOT_CONFIG_BASE, 'copilot-sync-config.yml')
    return loadCopilotSyncConfig(configPath)
}

interface SyncResult {
    repo: string
    profile: RepoProfile
    assembly: AssemblyResult
    hasChanges: boolean
}

function spawnOrThrow(cmd: string[], cwd: string): void {
    const result = Bun.spawnSync(cmd, { cwd, stdio: ['pipe', 'pipe', 'pipe'] })
    if (!result.success) {
        const stderr = result.stderr?.toString().trim() ?? ''
        throw new Error(`Command failed: ${cmd.join(' ')}${stderr ? ` — ${stderr}` : ''}`)
    }
}

export async function copilotSync(options: { repo?: string; all?: boolean; dryRun?: boolean }): Promise<void> {
    // Require explicit --repo or --all
    if (!options.repo && !options.all) {
        log(chalk.yellow('Spesifiser --repo <navn> for ett repo, eller --all for alle repos.'))
        log(chalk.dim('  Eksempler:'))
        log(chalk.dim('    ecli copilot sync -r mitt-repo'))
        log(chalk.dim('    ecli copilot sync --all --dry-run'))
        log(chalk.dim('    ecli copilot sync --all'))
        return
    }

    const config = loadSyncConfig()

    log(chalk.green('Henter copilot-repos...'))
    const repos = await fetchCopilotRepos(options.repo)
    if (repos.length === 0) {
        if (options.repo) {
            log(chalk.red(`Repo '${options.repo}' ikke funnet blant teamets repos.`))
        } else {
            log(chalk.yellow('Ingen repos funnet.'))
        }
        return
    }

    // Confirm before bulk sync (unless dry-run)
    if (!options.repo && repos.length > 1 && !options.dryRun) {
        const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
            type: 'confirm',
            name: 'confirm',
            message: `Synce ${repos.length} repos og opprette PRer?`,
            default: false,
        })
        if (!confirm) {
            log(chalk.dim('Avbrutt.'))
            return
        }
    }

    log(`Found ${chalk.yellow(repos.length)} repos to process\n`)

    // Clone/pull all repos
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

    // Process each repo
    const results: SyncResult[] = []
    log(chalk.green('Detecting stacks and assembling config...\n'))

    for (const repo of succeededRepos) {
        try {
            const repoPath = path.join(GIT_CACHE_DIR, repo.name)
            const topicType = resolveTypeFromTopics(repo.topics)
            const profile = repoTypeToProfile(topicType)

            if (profile === 'other') {
                log(chalk.yellow(`  [WARN] ${repo.name} mangler topics. Faller tilbake til 'other'-profil.`))
            }

            // Detect stack
            const stack = await detectRepoStack(repoPath)
            stack.repoName = repo.name
            stack.repoDescription = repo.description ?? undefined
            // Fall back to topic-based stack hint (backend/frontend/etc.) if detector found 'other'
            if (stack.type === 'other' && profile !== 'other') {
                stack.type = profile
            }

            const effectiveProfile = stack.type
            const isMonorepo = stack.subProfiles && stack.subProfiles.length > 1
            if (isMonorepo) {
                log(chalk.magenta(`  [MONOREPO] ${repo.name} → profiles: ${stack.subProfiles!.join(', ')}`))
            }
            logStackInfo(repo.name, stack)

            if (options.dryRun) {
                // Assemble into cached repo, then diff to detect real changes
                const assembly = await assembleForRepo(repoPath, effectiveProfile, stack, config)

                let hasChanges = false
                try {
                    execSync('git diff-index --quiet HEAD -- .github/', { cwd: repoPath, stdio: 'pipe' })
                } catch {
                    hasChanges = true
                }
                try {
                    const untracked = execSync('git ls-files --others --exclude-standard .github/', {
                        cwd: repoPath,
                        encoding: 'utf8',
                    }).trim()
                    if (untracked.length > 0) hasChanges = true
                } catch {
                    // ignore
                }

                // Reset cached repo back to clean state
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

                const totalFiles = assembly.filesWritten.length + assembly.filesUnchanged.length
                if (hasChanges) {
                    log(chalk.yellow(`    Would change: ${assembly.filesWritten.length} files`))
                } else {
                    log(chalk.dim(`    Already in sync (${totalFiles} files)`))
                }

                results.push({
                    repo: repo.name,
                    profile: effectiveProfile,
                    assembly,
                    hasChanges,
                })
                continue
            }

            // Assemble files
            const assembly = await assembleForRepo(repoPath, effectiveProfile, stack, config)

            // Check for actual git changes
            let hasChanges = false
            try {
                execSync('git diff-index --quiet HEAD -- .github/', { cwd: repoPath, stdio: 'pipe' })
            } catch {
                hasChanges = true
            }

            // Also check for untracked files in .github
            try {
                const untracked = execSync('git ls-files --others --exclude-standard .github/', {
                    cwd: repoPath,
                    encoding: 'utf8',
                }).trim()
                if (untracked.length > 0) hasChanges = true
            } catch {
                // ignore
            }

            if (assembly.filesWritten.length > 0) {
                log(chalk.green(`    ✓ ${assembly.filesWritten.length} files written`))
            }
            if (assembly.filesRemoved.length > 0) {
                log(chalk.red(`    🗑 ${assembly.filesRemoved.length} stale files removed`))
            }
            if (assembly.filesUnchanged.length > 0) {
                log(chalk.dim(`    - ${assembly.filesUnchanged.length} files unchanged`))
            }
            if (assembly.filesSkipped.length > 0) {
                log(chalk.yellow(`    ⚠ ${assembly.filesSkipped.length} files skipped (not managed by esyfo-cli)`))
            }

            results.push({ repo: repo.name, profile: effectiveProfile, assembly, hasChanges })
        } catch (e) {
            log(chalk.red(`  ✗ Failed to process ${repo.name}: ${(e as Error).message}`))
            continue
        }
    }

    // Summary
    const changed = results.filter((r) => r.hasChanges)
    const unchanged = results.filter((r) => !r.hasChanges)

    log(`\n${chalk.green('Summary:')}`)
    log(`  ${chalk.yellow(changed.length)} repos with changes`)
    log(`  ${chalk.dim(`${unchanged.length} repos unchanged`)}`)
    if (failedClones.length > 0) {
        log(`  ${chalk.red(`${failedClones.length} repos feilet clone/pull`)}`)
    }

    if (options.dryRun) {
        log(chalk.cyan('\n  Dry run — no changes made.'))
        return
    }

    if (changed.length === 0) {
        log(chalk.green('\n  All repos are up to date!'))
        return
    }

    // Branch, commit, push, PR for changed repos
    log(chalk.green(`\nCreating PRs for ${changed.length} repos...\n`))

    const branchName = 'copilot-config-sync'
    const commitMessage = 'chore: sync copilot config from esyfo-cli [docs]'

    for (const { repo } of changed) {
        const repoPath = path.join(GIT_CACHE_DIR, repo)
        try {
            // Ensure we're on default branch
            const repoData = repos.find((r) => r.name === repo)
            const defaultBranch = repoData?.defaultBranch ?? 'main'

            spawnOrThrow(['git', 'checkout', defaultBranch], repoPath)

            // Delete existing branch if it exists (optional — may not exist)
            Bun.spawnSync(['git', 'branch', '-D', branchName], { cwd: repoPath, stdio: ['pipe', 'pipe', 'pipe'] })

            spawnOrThrow(['git', 'checkout', '-b', branchName], repoPath)
            spawnOrThrow(['git', 'add', '.github/'], repoPath)
            spawnOrThrow(['git', 'commit', '-m', commitMessage], repoPath)
            spawnOrThrow(['git', 'push', '--force', '--set-upstream', 'origin', branchName], repoPath)

            log(chalk.green(`  ✓ Pushed ${repo}`))

            // Create PR (optional — may already exist)
            const prBody =
                'Automatisk sync av GitHub Copilot-konfigurasjon fra esyfo-cli.\n\nEndringer inkluderer agenter, instruksjoner, prompts og skills tilpasset dette repoets stack.'
            const prResult = Bun.spawnSync(
                ['gh', 'pr', 'create', '--title', commitMessage, '--body', prBody, '--head', branchName],
                { cwd: repoPath, stdio: ['pipe', 'pipe', 'pipe'] },
            )
            if (prResult.success) {
                log(chalk.green(`  ✓ PR created for ${repo}`))
            } else {
                log(chalk.yellow(`  ⚠ PR already exists or could not be created for ${repo}`))
            }

            // Auto-merge (optional — may not be available)
            const mergeResult = Bun.spawnSync(['gh', 'pr', 'merge', '--auto', '-s'], {
                cwd: repoPath,
                stdio: ['pipe', 'pipe', 'pipe'],
            })
            if (mergeResult.success) {
                log(chalk.green(`  ✓ Auto-merge enabled for ${repo}`))
            } else {
                log(chalk.yellow(`  ⚠ Could not enable auto-merge for ${repo}`))
            }

            // Switch back to default branch
            spawnOrThrow(['git', 'checkout', defaultBranch], repoPath)
        } catch (e) {
            log(chalk.red(`  ✗ Failed to process ${repo}: ${(e as Error).message}`))
        }
    }

    log(chalk.green('\nDone! 🎉'))
}
