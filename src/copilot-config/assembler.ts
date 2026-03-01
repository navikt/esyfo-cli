import fs from 'node:fs'
import path from 'node:path'

import chalk from 'chalk'

import { log } from '../common/log.ts'

import { CopilotSyncConfig, getFilesForProfile, RepoProfile } from './sync-config.ts'
import { RepoStackInfo } from './detector.ts'

const MANAGED_HEADER = '<!-- Managed by esyfo-cli. Do not edit manually. Changes will be overwritten. -->\n'
const CONFIG_BASE = path.resolve(import.meta.dir, '../../copilot-config')

export interface AssemblyResult {
    filesWritten: string[]
    filesUnchanged: string[]
}

export async function assembleForRepo(
    repoPath: string,
    profile: RepoProfile,
    stack: RepoStackInfo,
    config: CopilotSyncConfig,
): Promise<AssemblyResult> {
    const files = getFilesForProfile(config, profile)
    const result: AssemblyResult = { filesWritten: [], filesUnchanged: [] }

    // Ensure target directories exist
    const githubDir = path.join(repoPath, '.github')
    const agentsDir = path.join(githubDir, 'agents')
    const instructionsDir = path.join(githubDir, 'instructions')
    const promptsDir = path.join(githubDir, 'prompts')
    const skillsDir = path.join(githubDir, 'skills')

    for (const dir of [agentsDir, instructionsDir, promptsDir, skillsDir]) {
        fs.mkdirSync(dir, { recursive: true })
    }

    // 1. Assemble copilot-instructions.md
    const instructionsContent = assembleCopilotInstructions(files.copilotInstructions, stack)
    await writeIfChanged(path.join(githubDir, 'copilot-instructions.md'), MANAGED_HEADER + instructionsContent, result)

    // 2. Copy team agent (renamed to esyfo.agent.md in target)
    if (files.teamAgent) {
        const agentContent = await readConfigFile('agents', files.teamAgent)
        await writeIfChanged(path.join(agentsDir, 'esyfo.agent.md'), MANAGED_HEADER + agentContent, result)
    }

    // 3. Copy domain agents
    for (const agent of files.agents) {
        const agentContent = await readConfigFile('agents', agent)
        await writeIfChanged(path.join(agentsDir, agent), MANAGED_HEADER + agentContent, result)
    }

    // 4. Copy instructions
    for (const instruction of files.instructions) {
        const content = await readConfigFile('instructions', instruction)
        await writeIfChanged(path.join(instructionsDir, instruction), MANAGED_HEADER + content, result)
    }

    // 5. Copy prompts
    for (const prompt of files.prompts) {
        const content = await readConfigFile('prompts', prompt)
        await writeIfChanged(path.join(promptsDir, prompt), MANAGED_HEADER + content, result)
    }

    // 6. Copy skills
    for (const skill of files.skills) {
        const skillDir = path.join(skillsDir, skill)
        fs.mkdirSync(skillDir, { recursive: true })
        const content = await readConfigFile(`skills/${skill}`, 'SKILL.md')
        await writeIfChanged(path.join(skillDir, 'SKILL.md'), MANAGED_HEADER + content, result)
    }

    return result
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
    return content
        .replace(/\{\{repo_name\}\}/g, stack.repoName ?? 'unknown')
        .replace(/\{\{framework\}\}/g, stack.framework ?? 'unknown')
        .replace(/\{\{database_details\}\}/g, stack.databaseLib ? ` (via ${stack.databaseLib})` : '')
        .replace(/\{\{messaging\}\}/g, stack.hasKafka ? 'Apache Kafka' : 'N/A')
        .replace(/\{\{testing\}\}/g, stack.testingLib ?? 'check package.json/build.gradle.kts')
        .replace(/\{\{bundler\}\}/g, stack.bundler ?? 'N/A')
}

async function readConfigFile(subdir: string, filename: string): Promise<string> {
    const filePath = path.join(CONFIG_BASE, subdir, filename)
    const file = Bun.file(filePath)
    if (!(await file.exists())) {
        log(chalk.red(`  Config file not found: ${filePath}`))
        return ''
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
            log(chalk.yellow(`  ⚠ Skipping ${relativePath} — not managed by esyfo-cli`))
            return
        }
    }

    await Bun.write(targetPath, content)
    result.filesWritten.push(relativePath)
}
