import chalk from 'chalk'

import { planAssembly } from './assembler.ts'
import { RepoStackInfo } from './detector.ts'
import { CopilotSyncConfig, RepoProfile } from './sync-config.ts'
import {
    AuditFinding,
    AuditSeverity,
    ProbeContext,
    buildRepoFileSet,
    probeRelevance,
    probeApplyToCoverage,
    probeConventionAlignment,
    probeOverlapDetection,
} from './audit-probes.ts'

export interface RepoAuditResult {
    repo: string
    profile: RepoProfile
    stack: RepoStackInfo
    findings: AuditFinding[]
    stats: { instructions: number; prompts: number; skills: number; agents: number }
}

export interface AuditReport {
    results: RepoAuditResult[]
    summary: { errors: number; warnings: number; infos: number; repos: number }
    generatedAt: string
}

export async function auditRepo(
    repoPath: string,
    repoName: string,
    profile: RepoProfile,
    stack: RepoStackInfo,
    config: CopilotSyncConfig,
): Promise<RepoAuditResult> {
    const plan = await planAssembly(profile, stack, config)
    const repoFiles = await buildRepoFileSet(repoPath)

    const ctx: ProbeContext = { repoPath, repoName, stack, plan, repoFiles }

    // Run probes (convention is async, others are sync)
    const [relevance, coverage, conventions, overlaps] = await Promise.all([
        Promise.resolve(probeRelevance(ctx)),
        Promise.resolve(probeApplyToCoverage(ctx)),
        probeConventionAlignment(ctx),
        Promise.resolve(probeOverlapDetection(ctx)),
    ])

    const findings = [...relevance, ...coverage, ...conventions, ...overlaps]

    const stats = {
        instructions: plan.files.filter((f) => f.category === 'instruction').length,
        prompts: plan.files.filter((f) => f.category === 'prompt').length,
        skills: plan.files.filter((f) => f.category === 'skill').length,
        agents: plan.files.filter((f) => f.category === 'agent').length,
    }

    return { repo: repoName, profile, stack, findings, stats }
}

export function formatAuditReport(report: AuditReport, options?: { verbose?: boolean }): string {
    const verbose = options?.verbose ?? false
    const lines: string[] = []

    lines.push(chalk.bold.underline(`\n🔍 Copilot Audit Report`))
    lines.push(chalk.dim(`Generated: ${report.generatedAt}\n`))

    for (const result of report.results) {
        const stackParts: string[] = [result.profile]
        if (result.stack.framework) stackParts.push(result.stack.framework)

        const findingCounts = countSeverities(result.findings)
        const statusIcon = findingCounts.error > 0 ? '❌' : findingCounts.warning > 0 ? '⚠️ ' : '✅'

        lines.push(`${statusIcon} ${chalk.bold(result.repo)} ${chalk.dim(`(${stackParts.join(' / ')})`)}`)
        lines.push(
            chalk.dim(
                `   ${result.stats.instructions} instructions, ${result.stats.prompts} prompts, ${result.stats.skills} skills, ${result.stats.agents} agents`,
            ),
        )

        if (result.findings.length === 0) {
            lines.push(chalk.green('   No issues found'))
        } else {
            for (let fi = 0; fi < result.findings.length; fi++) {
                const finding = result.findings[fi]
                const icon = severityIcon(finding.severity)
                const fileStr = finding.file ? chalk.dim(` [${finding.file}]`) : ''
                lines.push(`   ${icon} ${finding.message}${fileStr}`)
                if (finding.detail) {
                    lines.push(chalk.dim(`      ${finding.detail}`))
                }

                if (verbose) {
                    if (finding.templateSnippet) {
                        lines.push(chalk.dim(`      📄 Template:`))
                        const snippetLines = finding.templateSnippet.split('\n')
                        const truncated = snippetLines.length > 10
                        for (const line of snippetLines.slice(0, 10)) {
                            lines.push(chalk.dim(`      ${line}`))
                        }
                        if (truncated) {
                            lines.push(chalk.dim(`      ...`))
                        }
                    }

                    if (finding.repoSnippets && finding.repoSnippets.length > 0) {
                        lines.push(chalk.dim(`      📂 Repo:`))
                        for (const snippet of finding.repoSnippets) {
                            const range = `${snippet.lineRange[0]}-${snippet.lineRange[1]}`
                            lines.push(chalk.dim(`      [${snippet.file}:${range}]`))
                            if (snippet.lines) {
                                for (const line of snippet.lines.split('\n')) {
                                    lines.push(chalk.dim(`        ${line}`))
                                }
                            }
                        }
                    }

                    if (fi < result.findings.length - 1) {
                        lines.push(chalk.dim(`      ───`))
                    }
                }
            }
        }
        lines.push('')
    }

    // Summary
    lines.push(chalk.bold('Summary:'))
    lines.push(`  Repos audited: ${chalk.yellow(String(report.summary.repos))}`)
    if (report.summary.errors > 0) lines.push(`  ${chalk.red(`❌ ${report.summary.errors} errors`)}`)
    if (report.summary.warnings > 0) lines.push(`  ${chalk.yellow(`⚠️  ${report.summary.warnings} warnings`)}`)
    if (report.summary.infos > 0) lines.push(`  ${chalk.blue(`ℹ️  ${report.summary.infos} info`)}`)
    if (report.summary.errors === 0 && report.summary.warnings === 0) {
        lines.push(chalk.green('  All clear! No issues found.'))
    }

    return lines.join('\n')
}

function countSeverities(findings: AuditFinding[]): Record<AuditSeverity, number> {
    return {
        error: findings.filter((f) => f.severity === 'error').length,
        warning: findings.filter((f) => f.severity === 'warning').length,
        info: findings.filter((f) => f.severity === 'info').length,
    }
}

function severityIcon(severity: AuditSeverity): string {
    switch (severity) {
        case 'error':
            return chalk.red('❌')
        case 'warning':
            return chalk.yellow('⚠️ ')
        case 'info':
            return chalk.blue('ℹ️ ')
    }
}
