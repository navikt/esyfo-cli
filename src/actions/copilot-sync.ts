import path from 'node:path'
import { execSync } from 'node:child_process'

import chalk from 'chalk'

import { BaseRepoNode, ghGqlQuery, OrgTeamRepoResult, removeIgnoredAndArchived } from '../common/octokit.ts'
import { log } from '../common/log.ts'
import { Gitter } from '../common/git.ts'
import { GIT_CACHE_DIR } from '../common/cache.ts'
import { extractTypeFromTopics, RepoWithBranchAndTopics, RepoType } from '../common/get-all-repos.ts'
import { loadCopilotSyncConfig, isRepoSkipped, getFilesForProfile, RepoProfile } from '../copilot-config/sync-config.ts'
import { detectRepoStack, logStackInfo } from '../copilot-config/detector.ts'
import { assembleForRepo, AssemblyResult } from '../copilot-config/assembler.ts'

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

type RepoNode = BaseRepoNode<RepoWithBranchAndTopics>

function repoTypeToProfile(type: RepoType): RepoProfile {
    if (type === 'monorepo') return 'other'
    return type
}

interface SyncResult {
    repo: string
    profile: RepoProfile
    assembly: AssemblyResult
    hasChanges: boolean
}

export async function copilotSync(options: { repo?: string; all?: boolean; dryRun?: boolean }): Promise<void> {
    const configPath = path.resolve(import.meta.dir, '../../copilot-config/copilot-sync-config.yml')
    const config = loadCopilotSyncConfig(configPath)

    // Fetch repos
    log(chalk.green('Fetching team-esyfo repositories...'))
    const result = await ghGqlQuery<OrgTeamRepoResult<RepoWithBranchAndTopics>>(reposQuery, {
        team: 'team-esyfo',
    })

    let repos = removeIgnoredAndArchived(result.organization.team.repositories.nodes) as RepoNode[]

    if (options.repo) {
        repos = repos.filter((r) => r.name === options.repo)
        if (repos.length === 0) {
            log(chalk.red(`Repository '${options.repo}' not found in team-esyfo`))
            return
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
        logStackInfo(repo.name, stack)

        if (options.dryRun) {
            const files = getFilesForProfile(config, effectiveProfile)
            log(
                chalk.dim(
                    `    Would write: copilot-instructions.md, ${files.agents.length} agents, ${files.instructions.length} instructions, ${files.prompts.length} prompts, ${files.skills.length} skills`,
                ),
            )
            if (files.teamAgent) log(chalk.dim(`    + esyfo.agent.md (from ${files.teamAgent})`))
            results.push({
                repo: repo.name,
                profile: effectiveProfile,
                assembly: { filesWritten: [], filesUnchanged: [] },
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
