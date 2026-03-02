import path from 'node:path'
import { execSync } from 'node:child_process'

import chalk from 'chalk'

import { BaseRepoNode, ghGqlQuery, OrgTeamRepoResult, removeIgnoredArchivedAndNonAdmin } from '../common/octokit.ts'
import { log } from '../common/log.ts'
import { Gitter } from '../common/git.ts'
import { GIT_CACHE_DIR } from '../common/cache.ts'
import { extractTypeFromTopics, RepoWithBranchAndTopics, RepoType } from '../common/get-all-repos.ts'
import inquirer from '../common/inquirer.ts'
import {
    loadCopilotSyncConfig,
    CopilotSyncConfig,
    isRepoSkipped,
    getFilesForProfile,
    getFilesForProfiles,
    RepoProfile,
} from '../copilot-config/sync-config.ts'
import { detectRepoStack, logStackInfo } from '../copilot-config/detector.ts'
import {
    assembleForRepo,
    AssemblyResult,
    resolveConditionalFiles,
    logStackChanges,
} from '../copilot-config/assembler.ts'

const reposQuery = /* GraphQL */ `
    query ($team: String!) {
        organization(login: "navikt") {
            team(slug: $team) {
                repositories(orderBy: { field: PUSHED_AT, direction: DESC }) {
                    nodes {
                        name
                        isArchived
                        pushedAt
                        url
                        defaultBranchRef {
                            name
                        }
                        viewerPermission
                        repositoryTopics(first: 20) {
                            nodes {
                                topic {
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
    }
`

export type RepoNode = BaseRepoNode<RepoWithBranchAndTopics>

export function repoTypeToProfile(type: RepoType): RepoProfile {
    if (type === 'monorepo') return 'other'
    return type
}

export function loadSyncConfig(): CopilotSyncConfig {
    const configPath = path.resolve(import.meta.dir, '../../copilot-config/copilot-sync-config.yml')
    return loadCopilotSyncConfig(configPath)
}

export async function fetchCopilotRepos(config: CopilotSyncConfig, repoFilter?: string): Promise<RepoNode[]> {
    log(chalk.green('Fetching team-esyfo repositories...'))
    const result = await ghGqlQuery<OrgTeamRepoResult<RepoWithBranchAndTopics>>(reposQuery, {
        team: 'team-esyfo',
    })

    let repos = removeIgnoredArchivedAndNonAdmin(result.organization.team.repositories.nodes) as RepoNode[]

    if (repoFilter) {
        repos = repos.filter((r) => r.name === repoFilter)
        if (repos.length === 0) {
            log(chalk.red(`Repository '${repoFilter}' not found in team-esyfo`))
            return []
        }
    }

    // Filter skipped repos
    repos = repos.filter((r) => {
        if (isRepoSkipped(config, r.name)) {
            log(chalk.dim(`  Skipping ${r.name} (configured to skip)`))
            return false
        }
        return true
    })

    return repos
}

interface SyncResult {
    repo: string
    profile: RepoProfile
    assembly: AssemblyResult
    hasChanges: boolean
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
    const repos = await fetchCopilotRepos(config, options.repo)
    if (repos.length === 0) return

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
    await Promise.all(repos.map((r) => gitter.cloneOrPull(r.name, r.defaultBranchRef.name, true)))
    log('')

    // Process each repo
    const results: SyncResult[] = []
    log(chalk.green('Detecting stacks and assembling config...\n'))

    for (const repo of repos) {
        const repoPath = path.join(GIT_CACHE_DIR, repo.name)
        const topicType = extractTypeFromTopics(repo)
        const profile = repoTypeToProfile(topicType)

        if (profile === 'other') {
            log(chalk.yellow(`  [WARN] ${repo.name} mangler topics. Faller tilbake til 'other'-profil.`))
        }

        // Detect stack
        const stack = await detectRepoStack(repoPath)
        stack.repoName = repo.name
        // Use topic-based type if detector didn't find specific type
        if (stack.type === 'other' && profile !== 'other') {
            stack.type = profile
        }

        const effectiveProfile = stack.type
        const isMonorepo = stack.subProfiles && stack.subProfiles.length > 1
        if (isMonorepo) {
            log(chalk.magenta(`  [MONOREPO] ${repo.name} → profiles: ${stack.subProfiles!.join(', ')}`))
        }
        logStackInfo(repo.name, stack)
        logStackChanges(repoPath, stack)

        if (options.dryRun) {
            const files = isMonorepo
                ? getFilesForProfiles(config, stack.subProfiles!)
                : getFilesForProfile(config, effectiveProfile)
            resolveConditionalFiles(files, stack)
            const parts = ['copilot-instructions.md']
            if (files.agents.length > 0) parts.push(`${files.agents.length} agents`)
            parts.push(`${files.instructions.length} instructions`)
            if (files.prompts.length > 0) parts.push(`${files.prompts.length} prompts`)
            if (files.skills.length > 0) parts.push(`${files.skills.length} skills`)
            log(chalk.dim(`    Would write: ${parts.join(', ')}`))
            if (files.teamAgent) log(chalk.dim(`    + esyfo.agent.md (from ${files.teamAgent})`))
            results.push({
                repo: repo.name,
                profile: effectiveProfile,
                assembly: { filesWritten: [], filesUnchanged: [], filesRemoved: [] },
                hasChanges: false,
            })
            continue
        }

        // Assemble files
        const assembly = await assembleForRepo(repoPath, effectiveProfile, stack, config)

        // Check for actual git changes
        let hasChanges = false
        try {
            execSync('git diff-index --quiet HEAD', { cwd: repoPath })
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

        results.push({ repo: repo.name, profile: effectiveProfile, assembly, hasChanges })
    }

    // Summary
    const changed = results.filter((r) => r.hasChanges)
    const unchanged = results.filter((r) => !r.hasChanges)

    log(`\n${chalk.green('Summary:')}`)
    log(`  ${chalk.yellow(changed.length)} repos with changes`)
    log(`  ${chalk.dim(`${unchanged.length} repos unchanged`)}`)

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
            const defaultBranch = repoData?.defaultBranchRef.name ?? 'main'

            execSync(`git checkout ${defaultBranch}`, { cwd: repoPath, stdio: 'pipe' })

            // Delete existing branch if it exists
            try {
                execSync(`git branch -D ${branchName}`, { cwd: repoPath, stdio: 'pipe' })
            } catch {
                // Branch doesn't exist, that's fine
            }

            execSync(`git checkout -b ${branchName}`, { cwd: repoPath, stdio: 'pipe' })
            execSync('git add .github/', { cwd: repoPath, stdio: 'pipe' })
            execSync(`git commit -m "${commitMessage}"`, { cwd: repoPath, stdio: 'pipe' })
            execSync(`git push --force --set-upstream origin ${branchName}`, { cwd: repoPath, stdio: 'pipe' })

            log(chalk.green(`  ✓ Pushed ${repo}`))

            // Create PR
            try {
                execSync(
                    `gh pr create --title "${commitMessage}" --body "Automatisk sync av GitHub Copilot-konfigurasjon fra esyfo-cli.\n\nEndringer inkluderer agenter, instruksjoner, prompts og skills tilpasset dette repoets stack." --head ${branchName}`,
                    { cwd: repoPath, stdio: 'pipe' },
                )
                log(chalk.green(`  ✓ PR created for ${repo}`))
            } catch {
                // PR might already exist
                log(chalk.yellow(`  ⚠ PR already exists or could not be created for ${repo}`))
            }

            // Auto-merge
            try {
                execSync('gh pr merge --auto -s', { cwd: repoPath, stdio: 'pipe' })
                log(chalk.green(`  ✓ Auto-merge enabled for ${repo}`))
            } catch {
                log(chalk.yellow(`  ⚠ Could not enable auto-merge for ${repo}`))
            }

            // Switch back to default branch
            execSync(`git checkout ${defaultBranch}`, { cwd: repoPath, stdio: 'pipe' })
        } catch (e) {
            log(chalk.red(`  ✗ Failed to process ${repo}: ${(e as Error).message}`))
        }
    }

    log(chalk.green('\nDone! 🎉'))
}
