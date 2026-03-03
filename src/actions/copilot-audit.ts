import path from 'node:path'

import chalk from 'chalk'

import { log } from '../common/log.ts'
import { Gitter } from '../common/git.ts'
import { GIT_CACHE_DIR } from '../common/cache.ts'
import { extractTypeFromTopics } from '../common/get-all-repos.ts'
import { detectRepoStack } from '../copilot-config/detector.ts'
import { auditRepo, formatAuditReport, AuditReport, RepoAuditResult } from '../copilot-config/auditor.ts'

import { loadSyncConfig, fetchCopilotRepos, repoTypeToProfile } from './copilot-sync.ts'

export async function copilotAudit(options: { repo?: string; verbose?: boolean; json?: boolean }): Promise<void> {
    const isJson = !!options.json
    const originalLog = console.log
    if (isJson) {
        // Redirect all log output to stderr in JSON mode to keep stdout clean
        console.log = (...args: unknown[]) => process.stderr.write(args.map(String).join(' ') + '\n')
    }

    const config = loadSyncConfig()
    const repos = await fetchCopilotRepos(config, options.repo)
    if (repos.length === 0) {
        if (isJson) console.log = originalLog
        return
    }

    const logProgress = isJson ? (...args: unknown[]) => process.stderr.write(args.join(' ') + '\n') : log

    logProgress(`Found ${chalk.yellow(repos.length)} repos to audit\n`)

    // Clone/pull
    logProgress(chalk.green('Cloning/pulling repositories...'))
    const gitter = new Gitter('cache')
    const cloneResults = await Promise.allSettled(
        repos.map((r) => gitter.cloneOrPull(r.name, r.defaultBranchRef.name, true)),
    )

    const failedClones: string[] = []
    const succeededRepos = repos.filter((repo, i) => {
        const result = cloneResults[i]
        if (result.status === 'rejected') {
            failedClones.push(repo.name)
            logProgress(chalk.red(`  ✗ ${repo.name}: ${(result.reason as Error).message ?? result.reason}`))
            return false
        }
        if (typeof result.value === 'object' && result.value.type === 'error') {
            failedClones.push(repo.name)
            logProgress(chalk.red(`  ✗ ${repo.name}: ${result.value.message}`))
            return false
        }
        return true
    })

    if (failedClones.length > 0) {
        logProgress(chalk.red(`\n  ${failedClones.length} repo(s) feilet clone/pull: ${failedClones.join(', ')}`))
    }

    if (succeededRepos.length === 0) {
        logProgress(chalk.red('\nAlle repos feilet clone/pull. Avbryter.'))
        return
    }
    logProgress('')

    logProgress(chalk.green('Auditing repositories...\n'))

    const results: RepoAuditResult[] = []

    for (const repo of succeededRepos) {
        const repoPath = path.join(GIT_CACHE_DIR, repo.name)
        try {
            const topicType = extractTypeFromTopics(repo)
            const profile = repoTypeToProfile(topicType)

            const stack = await detectRepoStack(repoPath)
            stack.repoName = repo.name
            stack.repoDescription = repo.description ?? undefined
            if (stack.type === 'other' && profile !== 'other') {
                stack.type = profile
            }

            const effectiveProfile = stack.type
            const result = await auditRepo(repoPath, repo.name, effectiveProfile, stack, config)
            results.push(result)
        } catch (e) {
            logProgress(chalk.red(`  ✗ Failed to audit ${repo.name}: ${(e as Error).message}`))
        }
    }

    // Build report
    const allFindings = results.flatMap((r) => r.findings)
    const report: AuditReport = {
        results,
        summary: {
            errors: allFindings.filter((f) => f.severity === 'error').length,
            warnings: allFindings.filter((f) => f.severity === 'warning').length,
            infos: allFindings.filter((f) => f.severity === 'info').length,
            repos: results.length,
        },
        generatedAt: new Date().toISOString(),
    }

    if (isJson) {
        console.log = originalLog
        process.stdout.write(JSON.stringify(report, null, 2) + '\n')
    } else {
        log(formatAuditReport(report, { verbose: options.verbose }))
    }
}
