import fs from 'node:fs'
import path from 'node:path'

import chalk from 'chalk'

import { log } from '../common/log.ts'

import { RepoProfile } from './sync-config.ts'

export interface RepoStackInfo {
    type: RepoProfile
    repoName?: string
    language?: 'kotlin' | 'typescript'
    framework?: string
    hasDatabase?: boolean
    hasKafka?: boolean
    hasNais?: boolean
    databaseLib?: string
    testingLib?: string
    bundler?: string
    /** For monorepos: all detected sub-profiles (e.g. ['backend', 'frontend']) */
    subProfiles?: RepoProfile[]
}

export async function detectRepoStack(repoPath: string): Promise<RepoStackInfo> {
    const stack: RepoStackInfo = { type: 'other' }

    const [hasGradle, hasPackageJson, hasNais] = await Promise.all([
        fileExists(path.join(repoPath, 'build.gradle.kts')),
        fileExists(path.join(repoPath, 'package.json')),
        directoryHasNaisConfig(repoPath),
    ])

    stack.hasNais = hasNais

    // Check for monorepo first (root package.json with workspaces)
    if (hasPackageJson) {
        const monorepoProfiles = await detectMonorepoProfiles(repoPath)
        if (monorepoProfiles.length > 1) {
            stack.subProfiles = monorepoProfiles
            stack.type = monorepoProfiles[0]
            // Enrich stack with details from root for template vars
            stack.language = 'typescript'
            await detectTypeScriptStack(repoPath, stack)
            return stack
        }
    }

    if (hasGradle) {
        stack.language = 'kotlin'
        await detectKotlinStack(repoPath, stack)
    } else if (hasPackageJson) {
        stack.language = 'typescript'
        await detectTypeScriptStack(repoPath, stack)
    }

    return stack
}

async function detectKotlinStack(repoPath: string, stack: RepoStackInfo): Promise<void> {
    const gradleFile = Bun.file(path.join(repoPath, 'build.gradle.kts'))
    if (!(await gradleFile.exists())) return

    const content = await gradleFile.text()

    // Framework detection
    if (content.includes('ktor')) {
        stack.framework = 'Ktor'
    } else if (content.includes('spring-boot') || content.includes('org.springframework')) {
        stack.framework = 'Spring Boot'
    }

    // Database detection
    stack.hasDatabase = content.includes('postgresql') || content.includes('flyway') || content.includes('hikari')
    if (content.includes('exposed')) {
        stack.databaseLib = 'Exposed'
    } else if (content.includes('kotliquery')) {
        stack.databaseLib = 'Kotliquery'
    }

    // Kafka detection
    stack.hasKafka = content.includes('kafka') || content.includes('rapids-and-rivers')

    // Testing
    if (content.includes('kotest')) {
        stack.testingLib = 'Kotest, MockK'
    } else if (content.includes('junit')) {
        stack.testingLib = 'JUnit 5'
    }

    stack.type = 'backend'
}

async function detectTypeScriptStack(repoPath: string, stack: RepoStackInfo): Promise<void> {
    const pkgFile = Bun.file(path.join(repoPath, 'package.json'))
    if (!(await pkgFile.exists())) return

    const content = await pkgFile.text()
    let pkg: Record<string, unknown>
    try {
        pkg = JSON.parse(content)
    } catch {
        return
    }

    const allDeps = {
        ...(pkg.dependencies as Record<string, string> | undefined),
        ...(pkg.devDependencies as Record<string, string> | undefined),
    }

    // Framework detection
    if (allDeps['next']) {
        stack.framework = 'Next.js'
        stack.type = 'frontend'
    } else if (allDeps['@tanstack/react-router'] || allDeps['@tanstack/start']) {
        stack.framework = 'TanStack Start'
        stack.type = 'frontend'
    } else if (allDeps['vite']) {
        stack.bundler = 'Vite'
        // Check if microfrontend (has @navikt/decorator-* or is named *-mikrofrontend)
        const name = (pkg.name as string) ?? ''
        if (name.includes('mikrofrontend') || name.includes('microfrontend')) {
            stack.type = 'microfrontend'
            stack.framework = 'Vite (microfrontend)'
        } else {
            stack.type = 'frontend'
            stack.framework = 'Vite'
        }
    }

    // Testing
    if (allDeps['vitest']) {
        stack.testingLib = 'Vitest, Testing Library'
    } else if (allDeps['jest']) {
        stack.testingLib = 'Jest, Testing Library'
    }

    // Bundler
    if (allDeps['vite']) stack.bundler = 'Vite'
    else if (allDeps['next']) stack.bundler = 'Next.js (built-in)'
}

async function detectMonorepoProfiles(repoPath: string): Promise<RepoProfile[]> {
    const pkgFile = Bun.file(path.join(repoPath, 'package.json'))
    if (!(await pkgFile.exists())) return []

    let pkg: Record<string, unknown>
    try {
        pkg = JSON.parse(await pkgFile.text())
    } catch {
        return []
    }

    const workspaces = normalizeWorkspaces(pkg.workspaces)
    if (workspaces.length === 0) return []

    // Resolve workspace patterns to actual directories
    const appDirs = new Set<string>()
    for (const ws of workspaces) {
        if (ws.includes('*')) {
            const baseDir = path.join(repoPath, ws.replace('/*', ''))
            if (dirExists(baseDir)) {
                for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
                    if (entry.isDirectory()) appDirs.add(path.join(baseDir, entry.name))
                }
            }
        } else {
            const dir = path.join(repoPath, ws)
            if (dirExists(dir)) appDirs.add(dir)
        }
    }

    // Also scan apps/ for non-workspace sub-projects (e.g. Gradle backends alongside npm frontends)
    const appsDir = path.join(repoPath, 'apps')
    if (dirExists(appsDir)) {
        for (const entry of fs.readdirSync(appsDir, { withFileTypes: true })) {
            if (entry.isDirectory()) appDirs.add(path.join(appsDir, entry.name))
        }
    }

    const profiles = new Set<RepoProfile>()
    for (const dir of appDirs) {
        if (await fileExists(path.join(dir, 'build.gradle.kts'))) {
            profiles.add('backend')
        } else if (await fileExists(path.join(dir, 'package.json'))) {
            profiles.add('frontend')
        }
    }

    return [...profiles]
}

async function directoryHasNaisConfig(repoPath: string): Promise<boolean> {
    const naisDir = path.join(repoPath, '.nais')
    const naisYaml = path.join(repoPath, 'nais.yaml')
    const naisYml = path.join(repoPath, 'nais.yml')

    const [hasDir, hasYaml, hasYml] = await Promise.all([
        fileExists(naisDir),
        fileExists(naisYaml),
        fileExists(naisYml),
    ])

    return hasDir || hasYaml || hasYml
}

async function fileExists(filePath: string): Promise<boolean> {
    return Bun.file(filePath).exists()
}

function dirExists(dirPath: string): boolean {
    try {
        return fs.statSync(dirPath).isDirectory()
    } catch {
        return false
    }
}

function normalizeWorkspaces(workspaces: unknown): string[] {
    if (Array.isArray(workspaces)) return workspaces as string[]
    if (workspaces && typeof workspaces === 'object' && 'packages' in workspaces) {
        return (workspaces as { packages: string[] }).packages ?? []
    }
    return []
}

export function logStackInfo(repoName: string, stack: RepoStackInfo): void {
    const parts = [chalk.cyan(repoName), chalk.yellow(stack.type)]
    if (stack.framework) parts.push(chalk.green(stack.framework))
    if (stack.databaseLib) parts.push(`DB: ${stack.databaseLib}`)
    if (stack.hasKafka) parts.push('Kafka')
    log(`  ${parts.join(' · ')}`)
}
