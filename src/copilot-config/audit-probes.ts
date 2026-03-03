import path from 'node:path'

import { Glob } from 'bun'

import { AssemblyPlan, PlannedFile } from './assembler.ts'
import { RepoStackInfo } from './detector.ts'

export type AuditSeverity = 'error' | 'warning' | 'info'

export interface AuditFinding {
    probe: string
    severity: AuditSeverity
    file?: string
    message: string
    detail?: string
}

export interface ProbeContext {
    repoPath: string
    repoName: string
    stack: RepoStackInfo
    plan: AssemblyPlan
    /** Cached set of relative file paths in the repo (populated lazily) */
    repoFiles: Set<string>
}

/** Build a cached set of all files in the repo (relative paths, excluding .git and node_modules). */
export async function buildRepoFileSet(repoPath: string): Promise<Set<string>> {
    const files = new Set<string>()
    const glob = new Glob('**/*')
    for await (const entry of glob.scan({
        cwd: repoPath,
        dot: false,
        onlyFiles: true,
    })) {
        if (entry.startsWith('.git/') || entry.includes('node_modules/') || entry.includes('build/')) continue
        files.add(entry)
    }
    return files
}

// --- Probe 1: Relevance ---

const PROFILE_FILE_MARKERS: Record<string, { language?: string; framework?: string; keywords: string[] }> = {
    'kotlin.instructions.md': { language: 'kotlin', keywords: ['kotlin', '.kt'] },
    'kotlin-spring.instructions.md': { language: 'kotlin', framework: 'Spring Boot', keywords: ['spring'] },
    'kotlin-ktor.instructions.md': { language: 'kotlin', framework: 'Ktor', keywords: ['ktor'] },
    'typescript.instructions.md': { language: 'typescript', keywords: ['typescript', '.ts', '.tsx'] },
    'frontend.instructions.md': { language: 'typescript', keywords: ['.tsx', 'react'] },
    'sql.instructions.md': { keywords: ['flyway', '.sql', 'migration'] },
    'kafka.instructions.md': { keywords: ['kafka'] },
    'kafka-spring.instructions.md': { keywords: ['kafka', 'spring'] },
}

export function probeRelevance(ctx: ProbeContext): AuditFinding[] {
    const findings: AuditFinding[] = []
    const { stack, plan } = ctx

    for (const file of plan.files) {
        if (file.scaffoldOnly || file.category === 'agent') continue

        const markers = PROFILE_FILE_MARKERS[file.sourceTemplate]
        if (!markers) continue

        // Check language mismatch
        if (markers.language && stack.language && markers.language !== stack.language) {
            findings.push({
                probe: 'relevance',
                severity: 'warning',
                file: file.relativePath,
                message: `Instruction for ${markers.language} delivered to ${stack.language} repo`,
                detail: `Source: ${file.sourceTemplate}`,
            })
        }

        // Check framework mismatch
        if (markers.framework && stack.framework && markers.framework !== stack.framework) {
            findings.push({
                probe: 'relevance',
                severity: 'warning',
                file: file.relativePath,
                message: `Instruction for ${markers.framework} delivered to ${stack.framework} repo`,
                detail: `Source: ${file.sourceTemplate}`,
            })
        }
    }

    // Check for missing expected instructions based on stack
    const expectedInstructions = new Set<string>()
    if (stack.language === 'kotlin') expectedInstructions.add('kotlin.instructions.md')
    if (stack.language === 'typescript') expectedInstructions.add('typescript.instructions.md')
    if (stack.hasDatabase) expectedInstructions.add('sql.instructions.md')
    if (stack.hasKafka) expectedInstructions.add('kafka.instructions.md')

    const deliveredTemplates = new Set(plan.files.map((f) => f.sourceTemplate))
    for (const expected of expectedInstructions) {
        // kafka-spring is a valid substitute for kafka
        if (expected === 'kafka.instructions.md' && deliveredTemplates.has('kafka-spring.instructions.md')) continue
        if (!deliveredTemplates.has(expected)) {
            findings.push({
                probe: 'relevance',
                severity: 'warning',
                file: expected,
                message: `Expected instruction ${expected} not in plan (stack has ${stack.language ?? 'unknown'})`,
            })
        }
    }

    return findings
}

// --- Probe 2: ApplyTo Coverage ---

function matchGlob(pattern: string, filePath: string): boolean {
    const glob = new Glob(pattern)
    return glob.match(filePath)
}

export function probeApplyToCoverage(ctx: ProbeContext): AuditFinding[] {
    const findings: AuditFinding[] = []
    const { plan, repoFiles } = ctx

    for (const file of plan.files) {
        if (file.scaffoldOnly) continue
        // Skip files with the catch-all glob
        if (file.applyTo.length === 1 && file.applyTo[0] === '**/*') continue

        const hasMatch = file.applyTo.some((pattern) => [...repoFiles].some((repoFile) => matchGlob(pattern, repoFile)))

        if (!hasMatch) {
            findings.push({
                probe: 'applyTo-coverage',
                severity: 'warning',
                file: file.relativePath,
                message: `applyTo globs match 0 files in repo`,
                detail: `Globs: ${file.applyTo.join(', ')}`,
            })
        }
    }

    return findings
}

// --- Probe 3: Convention Alignment ---

export async function probeConventionAlignment(ctx: ProbeContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = []
    const { repoPath, repoFiles, plan } = ctx

    // Only run convention checks if relevant instructions are in the plan
    const deliveredTemplates = new Set(plan.files.map((f) => f.sourceTemplate))

    // Check: SQL timestamps — if sql.instructions.md recommends TIMESTAMPTZ, check actual migrations
    if (deliveredTemplates.has('sql.instructions.md')) {
        const sqlFiles = [...repoFiles].filter(
            (f) => f.endsWith('.sql') && (f.includes('migration') || f.includes('db/')),
        )
        for (const sqlFile of sqlFiles.slice(0, 10)) {
            // only check first 10
            try {
                const content = await Bun.file(path.join(repoPath, sqlFile)).text()
                if (/\bTIMESTAMP\b(?!TZ)/i.test(content)) {
                    findings.push({
                        probe: 'convention-alignment',
                        severity: 'info',
                        file: sqlFile,
                        message: 'Uses TIMESTAMP instead of TIMESTAMPTZ',
                        detail: 'sql.instructions.md recommends TIMESTAMPTZ for timezone safety',
                    })
                }
            } catch {
                // skip unreadable
            }
        }
    }

    // Check: Kotlin !! operator — if kotlin.instructions.md is delivered
    if (deliveredTemplates.has('kotlin.instructions.md')) {
        const ktFiles = [...repoFiles].filter((f) => f.endsWith('.kt') && !f.includes('test/'))
        let bangBangCount = 0
        for (const ktFile of ktFiles.slice(0, 20)) {
            try {
                const content = await Bun.file(path.join(repoPath, ktFile)).text()
                const matches = content.match(/!!/g)
                if (matches) bangBangCount += matches.length
            } catch {
                // skip
            }
        }
        if (bangBangCount > 5) {
            findings.push({
                probe: 'convention-alignment',
                severity: 'info',
                message: `Found ${bangBangCount} uses of !! operator in source Kotlin files`,
                detail: 'Consider null-safe alternatives as recommended in kotlin.instructions.md',
            })
        }
    }

    return findings
}

// --- Probe 4: Overlap Detection ---

export function probeOverlapDetection(ctx: ProbeContext): AuditFinding[] {
    const findings: AuditFinding[] = []
    const { plan, repoFiles } = ctx

    // Build a map: repoFile → list of instruction files whose applyTo covers it
    const fileToInstructions = new Map<string, PlannedFile[]>()

    const instructionFiles = plan.files.filter(
        (f) => f.category === 'instruction' && !f.scaffoldOnly && !(f.applyTo.length === 1 && f.applyTo[0] === '**/*'),
    )

    if (instructionFiles.length < 2) return findings

    for (const repoFile of repoFiles) {
        const covering: PlannedFile[] = []
        for (const instr of instructionFiles) {
            if (instr.applyTo.some((pattern) => matchGlob(pattern, repoFile))) {
                covering.push(instr)
            }
        }
        if (covering.length > 1) {
            fileToInstructions.set(repoFile, covering)
        }
    }

    // Group overlapping instructions
    const overlapPairs = new Set<string>()
    for (const [, instructions] of fileToInstructions) {
        for (let i = 0; i < instructions.length; i++) {
            for (let j = i + 1; j < instructions.length; j++) {
                const key = [instructions[i].relativePath, instructions[j].relativePath].sort().join(' ↔ ')
                overlapPairs.add(key)
            }
        }
    }

    for (const pair of overlapPairs) {
        findings.push({
            probe: 'overlap-detection',
            severity: 'info',
            message: `Overlapping applyTo coverage: ${pair}`,
            detail: 'Multiple instruction files target the same source files',
        })
    }

    return findings
}
