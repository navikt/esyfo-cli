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
const MANAGED_HEADER_YAML = '# Managed by esyfo-cli. Do not edit manually. Changes will be overwritten.\n'
const CONFIG_BASE = COPILOT_CONFIG_BASE

const FRONTMATTER_RE = /^(---\n[\s\S]*?\n---\n)/
const MANAGED_MARKER = '<!-- Managed by esyfo-cli'
const MANAGED_MARKER_YAML = '# Managed by esyfo-cli'

/** Prepend managed header after YAML frontmatter so Copilot still parses applyTo/description. */
function withManagedHeader(content: string): string {
    const match = content.match(FRONTMATTER_RE)
    if (match) {
        return match[1] + MANAGED_HEADER + content.slice(match[1].length)
    }
    return MANAGED_HEADER + content
}

/** Check if file content has the managed header at the expected position (line 1 or right after frontmatter). */
function isManagedContent(content: string): boolean {
    if (content.startsWith(MANAGED_MARKER)) return true
    if (content.startsWith(MANAGED_MARKER_YAML)) return true
    const match = content.match(FRONTMATTER_RE)
    return !!match && content.slice(match[1].length).startsWith(MANAGED_MARKER)
}

/** Prepend managed YAML header to content. */
function withManagedYamlHeader(content: string): string {
    return MANAGED_HEADER_YAML + content
}

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
    const issueTemplatesDir = path.join(githubDir, 'ISSUE_TEMPLATE')

    const hasAgents = files.agents.length > 0
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

    // 2. Copy agents
    for (const agent of files.agents) {
        const agentPath = path.join(agentsDir, agent)
        managedFiles.add(agentPath)
        const agentContent = await readConfigFile('agents', agent)
        await writeIfChanged(agentPath, withManagedHeader(agentContent), result)
    }

    // 3. Copy instructions
    for (const instruction of files.instructions) {
        const instructionPath = path.join(instructionsDir, instruction)
        managedFiles.add(instructionPath)
        const content = await readConfigFile('instructions', instruction)
        await writeIfChanged(instructionPath, withManagedHeader(content), result)
    }

    // 4. Copy prompts
    for (const prompt of files.prompts) {
        const promptPath = path.join(promptsDir, prompt)
        managedFiles.add(promptPath)
        const content = await readConfigFile('prompts', prompt)
        await writeIfChanged(promptPath, withManagedHeader(content), result)
    }

    // 5. Copy skills (including references)
    for (const skill of files.skills) {
        const skillDir = path.join(skillsDir, skill)
        fs.mkdirSync(skillDir, { recursive: true })
        const skillPath = path.join(skillDir, 'SKILL.md')
        managedFiles.add(skillPath)
        const content = await readConfigFile(`skills/${skill}`, 'SKILL.md')
        await writeIfChanged(skillPath, withManagedHeader(content), result)

        // Copy references/ if they exist
        const refsSourceDir = path.join(CONFIG_BASE, `skills/${skill}`, 'references')
        if (fs.existsSync(refsSourceDir)) {
            const refsTargetDir = path.join(skillDir, 'references')
            fs.mkdirSync(refsTargetDir, { recursive: true })
            for (const ref of fs.readdirSync(refsSourceDir)) {
                if (!ref.endsWith('.md')) continue
                const refPath = path.join(refsTargetDir, ref)
                managedFiles.add(refPath)
                const refContent = await readConfigFile(`skills/${skill}/references`, ref)
                await writeIfChanged(refPath, withManagedHeader(refContent), result)
            }
        }
    }

    // 5b. Copy issue templates
    if (files.issueTemplates.length > 0) {
        fs.mkdirSync(issueTemplatesDir, { recursive: true })
        for (const template of files.issueTemplates) {
            const templatePath = path.join(issueTemplatesDir, template)
            managedFiles.add(templatePath)
            const content = await readConfigFile('issue-templates', template)
            if (template.endsWith('.yml') || template.endsWith('.yaml')) {
                await writeIfChanged(templatePath, withManagedYamlHeader(content), result)
            } else {
                await writeIfChanged(templatePath, withManagedHeader(content), result)
            }
        }
    }

    // 5c. Copy pull request template
    if (files.pullRequestTemplate) {
        const prTemplatePath = path.join(githubDir, 'PULL_REQUEST_TEMPLATE.md')
        managedFiles.add(prTemplatePath)
        const content = await readConfigFile('pull-request-template', files.pullRequestTemplate)
        await writeIfChanged(prTemplatePath, withManagedHeader(content), result)
    }

    // 6. Sync workflow for auto-approving copilot-config-sync PRs (always, regardless of profile)
    const workflowsDir = path.join(githubDir, 'workflows')
    fs.mkdirSync(workflowsDir, { recursive: true })
    const workflowFilename = 'copilot-config-auto-approve.yml'
    const workflowTargetPath = path.join(workflowsDir, workflowFilename)
    managedFiles.add(workflowTargetPath)
    const workflowContent = await readConfigFile('workflows', workflowFilename)
    await writeIfChanged(workflowTargetPath, withManagedYamlHeader(workflowContent), result)

    // 7. Clean up stale managed files (files we previously managed but no longer need)
    // NOTE: workflowsDir is intentionally NOT included — it contains repo-specific workflows we must not touch.
    const dirsToClean = [instructionsDir, promptsDir, skillsDir]
    if (fs.existsSync(issueTemplatesDir)) dirsToClean.push(issueTemplatesDir)
    if (fs.existsSync(agentsDir)) dirsToClean.unshift(agentsDir)
    await cleanStaleManagedFiles(dirsToClean, managedFiles, result)

    // Clean stale PR template
    const prTemplatePath = path.join(githubDir, 'PULL_REQUEST_TEMPLATE.md')
    if (!managedFiles.has(prTemplatePath) && fs.existsSync(prTemplatePath)) {
        const content = await Bun.file(prTemplatePath).text()
        if (isManagedContent(content)) {
            fs.unlinkSync(prTemplatePath)
            result.filesRemoved.push('PULL_REQUEST_TEMPLATE.md')
            log(chalk.red(`  🗑 Removed stale: PULL_REQUEST_TEMPLATE.md`))
        }
    }

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
        files.skills.push('postgresql-review')
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
            'pnpm run build     # Build',
            'pnpm run test      # Tests',
            'pnpm run lint      # Lint',
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
        if (!isManagedContent(existing)) {
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
                let removedSkillMd = false
                if (fs.existsSync(skillMd) && !currentManagedFiles.has(skillMd)) {
                    const content = await Bun.file(skillMd).text()
                    if (isManagedContent(content)) {
                        fs.unlinkSync(skillMd)
                        removedSkillMd = true
                        const skillRelativePath = skillMd.split('.github/').pop() ?? skillMd
                        result.filesRemoved.push(skillRelativePath)
                        log(chalk.red(`  🗑 Removed stale: ${skillRelativePath}`))
                    }
                }

                // Check stale references in skill directories
                const referencesDir = path.join(fullPath, 'references')
                if (fs.existsSync(referencesDir)) {
                    const references = fs.readdirSync(referencesDir, { withFileTypes: true })
                    for (const reference of references) {
                        if (!reference.isFile()) continue
                        const referencePath = path.join(referencesDir, reference.name)
                        if (currentManagedFiles.has(referencePath)) continue

                        const referenceContent = await Bun.file(referencePath).text()
                        if (!isManagedContent(referenceContent)) continue

                        fs.unlinkSync(referencePath)
                        const referenceRelativePath = referencePath.split('.github/').pop() ?? referencePath
                        result.filesRemoved.push(referenceRelativePath)
                        log(chalk.red(`  🗑 Removed stale: ${referenceRelativePath}`))
                    }

                    if (fs.existsSync(referencesDir) && fs.readdirSync(referencesDir).length === 0) {
                        fs.rmdirSync(referencesDir)
                    }
                }

                if (removedSkillMd) {
                    try {
                        fs.rmdirSync(fullPath)
                    } catch {
                        /* not empty, that's fine */
                    }
                }
                continue
            }

            if (!currentManagedFiles.has(fullPath)) {
                const content = await Bun.file(fullPath).text()
                if (isManagedContent(content)) {
                    fs.unlinkSync(fullPath)
                    const relativePath = fullPath.split('.github/').pop() ?? fullPath
                    result.filesRemoved.push(relativePath)
                    log(chalk.red(`  🗑 Removed stale: ${relativePath}`))
                }
            }
        }
    }
}
