import fs from 'node:fs'
import path from 'node:path'

import chalk from 'chalk'

import { log } from '../common/log.ts'

import { CopilotSyncConfig, getFilesForProfile, getFilesForProfiles, RepoProfile } from './sync-config.ts'
import { RepoStackInfo } from './detector.ts'
import { COPILOT_CONFIG_BASE } from './paths.ts'

const MANAGED_HEADER =
    '<!-- Managed by esyfo-cli. Do not edit manually. Changes will be overwritten.\n' +
    '     For repo-specific customizations, create your own files without this header. -->\n'
const CONFIG_BASE = COPILOT_CONFIG_BASE

export interface AssemblyResult {
    filesWritten: string[]
    filesUnchanged: string[]
    filesRemoved: string[]
    filesSkipped: string[]
}

export async function assembleForRepo(
    repoPath: string,
    profile: RepoProfile,
    stack: RepoStackInfo,
    config: CopilotSyncConfig,
): Promise<AssemblyResult> {
    const files =
        stack.subProfiles && stack.subProfiles.length > 1
            ? getFilesForProfiles(config, stack.subProfiles)
            : getFilesForProfile(config, profile)

    // Augment with conditional files based on detected stack
    resolveConditionalFiles(files, stack)

    const result: AssemblyResult = { filesWritten: [], filesUnchanged: [], filesRemoved: [], filesSkipped: [] }

    // Track all files we intend to write (for stale cleanup)
    const managedFiles = new Set<string>()

    // Ensure target directories exist
    const githubDir = path.join(repoPath, '.github')
    const agentsDir = path.join(githubDir, 'agents')
    const instructionsDir = path.join(githubDir, 'instructions')
    const promptsDir = path.join(githubDir, 'prompts')
    const skillsDir = path.join(githubDir, 'skills')

    const hasAgents = files.agents.length > 0 || files.teamAgent !== null
    const dirsToCreate = [instructionsDir, promptsDir, skillsDir]
    if (hasAgents) dirsToCreate.unshift(agentsDir)
    for (const dir of dirsToCreate) {
        fs.mkdirSync(dir, { recursive: true })
    }

    // 1. Scaffold copilot-instructions.md (repo-owned, not CLI-managed)
    // Only created if the file doesn't exist. Never overwritten — developers own this file.
    const copilotInstructionsPath = path.join(githubDir, 'copilot-instructions.md')
    const instructionsContent = assembleCopilotInstructions(files.copilotInstructions, stack)
    await scaffoldIfMissing(copilotInstructionsPath, instructionsContent, result)

    // 2. Copy team agent (renamed to esyfo.agent.md in target)
    if (files.teamAgent) {
        const agentPath = path.join(agentsDir, 'esyfo.agent.md')
        managedFiles.add(agentPath)
        const agentContent = await readConfigFile('user-agents/agents', files.teamAgent)
        await writeIfChanged(agentPath, MANAGED_HEADER + agentContent, result)
    }

    // 3. Copy agents (if any configured in profile — currently agents are delivered via plugin only)
    for (const agent of files.agents) {
        const agentPath = path.join(agentsDir, agent)
        managedFiles.add(agentPath)
        const agentContent = await readConfigFile('user-agents/agents', agent)
        await writeIfChanged(agentPath, MANAGED_HEADER + agentContent, result)
    }

    // 4. Copy instructions
    for (const instruction of files.instructions) {
        const instructionPath = path.join(instructionsDir, instruction)
        managedFiles.add(instructionPath)
        const content = await readConfigFile('instructions', instruction)
        await writeIfChanged(instructionPath, MANAGED_HEADER + content, result)
    }

    // 5. Copy prompts
    for (const prompt of files.prompts) {
        const promptPath = path.join(promptsDir, prompt)
        managedFiles.add(promptPath)
        const content = await readConfigFile('prompts', prompt)
        await writeIfChanged(promptPath, MANAGED_HEADER + content, result)
    }

    // 6. Copy skills
    for (const skill of files.skills) {
        const skillDir = path.join(skillsDir, skill)
        fs.mkdirSync(skillDir, { recursive: true })
        const skillPath = path.join(skillDir, 'SKILL.md')
        managedFiles.add(skillPath)
        const content = await readConfigFile(`skills/${skill}`, 'SKILL.md')
        await writeIfChanged(skillPath, MANAGED_HEADER + content, result)
    }

    // 7. Clean up stale managed files (files we previously managed but no longer need)
    const dirsToClean = [instructionsDir, promptsDir, skillsDir]
    if (fs.existsSync(agentsDir)) dirsToClean.unshift(agentsDir)
    await cleanStaleManagedFiles(dirsToClean, managedFiles, result)

    return result
}

/**
 * Augment file lists with conditional files based on detected stack.
 * Handles framework-specific instructions, database/kafka-conditional prompts and skills.
 */
export function resolveConditionalFiles(
    files: { instructions: string[]; prompts: string[]; skills: string[] },
    stack: RepoStackInfo,
): void {
    // Database-related
    if (stack.hasDatabase) {
        files.instructions.push('sql.instructions.md')
        files.skills.push('flyway-migration')
    }

    // Framework-specific Kotlin instructions
    const ktFramework = stack.kotlinFramework ?? (stack.language === 'kotlin' ? stack.framework : undefined)
    if (ktFramework) {
        if (ktFramework === 'Spring Boot') {
            files.instructions.push('kotlin-spring.instructions.md')
        } else if (ktFramework === 'Ktor') {
            files.instructions.push('kotlin-ktor.instructions.md')
        }
    }

    // Kafka-related
    if (stack.hasKafka) {
        if (stack.kafkaLib === 'spring-kafka') {
            files.instructions.push('kafka-spring.instructions.md')
        } else {
            files.instructions.push('kafka.instructions.md')
        }
        files.prompts.push('kafka-topic.prompt.md')
    }
}

function assembleCopilotInstructions(templates: string[], stack: RepoStackInfo): string {
    const parts: string[] = []

    for (const template of templates) {
        const templatePath = path.join(CONFIG_BASE, 'copilot-instructions', template)
        let content = fs.readFileSync(templatePath, 'utf8')
        content = replaceTemplateVars(content, stack)
        parts.push(content)
    }

    return parts.join('\n')
}

function replaceTemplateVars(content: string, stack: RepoStackInfo): string {
    const buildCmd = resolveBuildCommand(stack)
    // Use function-style replacements to avoid $ being interpreted as special replacement patterns
    return content
        .replace(/\{\{repo_name}}/g, () => stack.repoName ?? 'unknown')
        .replace(/\{\{description}}/g, () => stack.repoDescription ?? '')
        .replace(/\{\{commands}}/g, () => buildCmd)
        .replace(/\{\{framework}}/g, () => stack.framework ?? 'unknown')
        .replace(/\{\{database}}/g, () =>
            stack.hasDatabase ? `PostgreSQL${stack.databaseLib ? ` (via ${stack.databaseLib})` : ''}` : 'N/A',
        )
        .replace(/\{\{database_details}}/g, () => (stack.databaseLib ? ` (via ${stack.databaseLib})` : ''))
        .replace(/\{\{messaging}}/g, () => (stack.hasKafka ? 'Apache Kafka' : 'N/A'))
        .replace(/\{\{testing}}/g, () => stack.testingLib ?? 'check package.json/build.gradle.kts')
        .replace(/\{\{bundler}}/g, () => stack.bundler ?? 'N/A')
}

function resolveBuildCommand(stack: RepoStackInfo): string {
    if (stack.language === 'kotlin') {
        return ['```bash', './gradlew build   # Build + test + lint', './gradlew test    # Tests only', '```'].join(
            '\n',
        )
    }
    if (stack.language === 'typescript') {
        return [
            '```bash',
            'npm run build     # Build',
            'npm run test      # Tests',
            'npm run lint      # Lint',
            '```',
        ].join('\n')
    }
    return 'Check `package.json` or `build.gradle.kts` for available commands.'
}

async function readConfigFile(subdir: string, filename: string): Promise<string> {
    const filePath = path.join(CONFIG_BASE, subdir, filename)
    const file = Bun.file(filePath)
    if (!(await file.exists())) {
        throw new Error(`Template file not found: ${filePath}`)
    }
    return file.text()
}

async function writeIfChanged(targetPath: string, content: string, result: AssemblyResult): Promise<void> {
    const relativePath = targetPath.split('.github/').pop() ?? targetPath
    const existingFile = Bun.file(targetPath)

    if (await existingFile.exists()) {
        const existing = await existingFile.text()
        if (existing === content) {
            result.filesUnchanged.push(relativePath)
            return
        }
        // Only overwrite files we manage (have our header)
        if (!existing.startsWith('<!-- Managed by esyfo-cli')) {
            result.filesSkipped.push(relativePath)
            return
        }
    }

    await Bun.write(targetPath, content)
    result.filesWritten.push(relativePath)
}

/**
 * Create a scaffold file only if it doesn't exist yet.
 * No managed header — the file is repo-owned from the start.
 */
async function scaffoldIfMissing(targetPath: string, content: string, result: AssemblyResult): Promise<void> {
    const relativePath = targetPath.split('.github/').pop() ?? targetPath
    const existingFile = Bun.file(targetPath)

    if (await existingFile.exists()) {
        result.filesSkipped.push(relativePath)
        return
    }

    await Bun.write(targetPath, content)
    result.filesWritten.push(relativePath)
}

async function cleanStaleManagedFiles(
    dirs: string[],
    currentManagedFiles: Set<string>,
    result: AssemblyResult,
): Promise<void> {
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) continue

        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name)

            if (entry.isDirectory()) {
                // Check SKILL.md inside skill directories
                const skillMd = path.join(fullPath, 'SKILL.md')
                if (fs.existsSync(skillMd) && !currentManagedFiles.has(skillMd)) {
                    const content = await Bun.file(skillMd).text()
                    if (content.startsWith('<!-- Managed by esyfo-cli')) {
                        fs.unlinkSync(skillMd)
                        try {
                            fs.rmdirSync(fullPath)
                        } catch {
                            /* not empty, that's fine */
                        }
                        const relativePath = fullPath.split('.github/').pop() ?? fullPath
                        result.filesRemoved.push(relativePath)
                        log(chalk.red(`  🗑 Removed stale: ${relativePath}`))
                    }
                }
                continue
            }

            if (!currentManagedFiles.has(fullPath)) {
                const content = await Bun.file(fullPath).text()
                if (content.startsWith('<!-- Managed by esyfo-cli')) {
                    fs.unlinkSync(fullPath)
                    const relativePath = fullPath.split('.github/').pop() ?? fullPath
                    result.filesRemoved.push(relativePath)
                    log(chalk.red(`  🗑 Removed stale: ${relativePath}`))
                }
            }
        }
    }
}
