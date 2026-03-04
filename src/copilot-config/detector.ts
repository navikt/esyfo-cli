import fs from 'node:fs'
import path from 'node:path'

import chalk from 'chalk'

import { log } from '../common/log.ts'

import { RepoProfile } from './sync-config.ts'

export interface RepoStackInfo {
    type: RepoProfile
    repoName?: string
    repoDescription?: string
    language?: 'kotlin' | 'typescript'
    framework?: string
    /** For monorepos: Kotlin framework detected in a backend sub-app */
    kotlinFramework?: string
    hasDatabase?: boolean
    hasKafka?: boolean
    hasNais?: boolean
    databaseLib?: string
    kafkaLib?: string
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
        if (monorepoProfiles.length >= 1) {
            stack.subProfiles = monorepoProfiles
            stack.type = monorepoProfiles[0]
            stack.language = 'typescript'
            const hasBackend = monorepoProfiles.includes('backend')
            const hasFrontend = monorepoProfiles.includes('frontend')
            if (hasBackend && !hasFrontend) {
                stack.language = 'kotlin'
            } else if (hasFrontend && !hasBackend) {
                stack.language = 'typescript'
            }
            // Deep-scan sub-apps for framework/DB/Kafka details
            await enrichMonorepoStack(repoPath, stack)
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

    // Framework detection — check Spring Boot FIRST to avoid false positive
    // from test deps like "kotest-assertions-ktor" matching "ktor"
    if (content.includes('org.springframework.boot') || content.includes('spring-boot-starter')) {
        stack.framework = 'Spring Boot'
    } else if (content.includes('io.ktor:ktor') || content.includes('io.ktor')) {
        stack.framework = 'Ktor'
    }

    // Database detection
    stack.hasDatabase = content.includes('postgresql') || content.includes('flyway') || content.includes('hikari')
    if (
        content.includes('spring-data-jdbc') ||
        content.includes('spring-data-jpa') ||
        content.includes('starter-data-jdbc') ||
        content.includes('starter-data-jpa')
    ) {
        stack.databaseLib = 'Spring Data JDBC'
        stack.hasDatabase = true
    } else if (content.includes('exposed')) {
        stack.databaseLib = 'Exposed'
        stack.hasDatabase = true
    } else if (content.includes('kotliquery')) {
        stack.databaseLib = 'Kotliquery'
        stack.hasDatabase = true
    } else if (content.includes('hikari')) {
        stack.databaseLib = 'JDBC (HikariCP)'
        stack.hasDatabase = true
    }

    // Kafka detection
    stack.hasKafka = content.includes('kafka')
    if (stack.hasKafka) {
        if (content.includes('spring-kafka') || content.includes('org.springframework.kafka')) {
            stack.kafkaLib = 'spring-kafka'
        }
    }

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

    const appDirs = resolveMonorepoAppDirs(repoPath)

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

async function enrichMonorepoStack(repoPath: string, stack: RepoStackInfo): Promise<void> {
    const appDirs = resolveMonorepoAppDirs(repoPath)

    for (const dir of appDirs) {
        if (await fileExists(path.join(dir, 'build.gradle.kts'))) {
            const sub: RepoStackInfo = { type: 'backend' }
            await detectKotlinStack(dir, sub)
            stack.kotlinFramework = sub.framework
            if (sub.hasDatabase) {
                stack.hasDatabase = true
                stack.databaseLib = sub.databaseLib
            }
            if (sub.hasKafka) {
                stack.hasKafka = true
                stack.kafkaLib = sub.kafkaLib
            }
            if (!stack.hasNais && (await directoryHasNaisConfig(dir))) {
                stack.hasNais = true
            }
        } else if (await fileExists(path.join(dir, 'package.json'))) {
            const sub: RepoStackInfo = { type: 'frontend' }
            await detectTypeScriptStack(dir, sub)
            if (sub.framework && !stack.framework) stack.framework = sub.framework
            if (sub.testingLib && !stack.testingLib) stack.testingLib = sub.testingLib
            if (sub.bundler && !stack.bundler) stack.bundler = sub.bundler
            if (!stack.hasNais && (await directoryHasNaisConfig(dir))) {
                stack.hasNais = true
            }
        }
    }
}

function resolveMonorepoAppDirs(repoPath: string): Set<string> {
    const pkgPath = path.join(repoPath, 'package.json')
    if (!fs.existsSync(pkgPath)) return new Set()

    let pkg: Record<string, unknown>
    try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    } catch {
        return new Set()
    }

    const workspaces = normalizeWorkspaces(pkg.workspaces)
    const dirs = new Set<string>()

    for (const ws of workspaces) {
        if (ws.includes('*')) {
            const baseDir = path.join(repoPath, ws.replace('/*', ''))
            if (dirExists(baseDir)) {
                for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
                    if (entry.isDirectory()) dirs.add(path.join(baseDir, entry.name))
                }
            }
        } else {
            const dir = path.join(repoPath, ws)
            if (dirExists(dir)) dirs.add(dir)
        }
    }

    const appsDir = path.join(repoPath, 'apps')
    if (dirExists(appsDir)) {
        for (const entry of fs.readdirSync(appsDir, { withFileTypes: true })) {
            if (entry.isDirectory()) dirs.add(path.join(appsDir, entry.name))
        }
    }

    return dirs
}

async function directoryHasNaisConfig(repoPath: string): Promise<boolean> {
    const naisDotDir = path.join(repoPath, '.nais')
    const naisDir = path.join(repoPath, 'nais')
    const naisYaml = path.join(repoPath, 'nais.yaml')
    const naisYml = path.join(repoPath, 'nais.yml')

    const [hasYaml, hasYml] = await Promise.all([fileExists(naisYaml), fileExists(naisYml)])

    return dirExists(naisDotDir) || dirExists(naisDir) || hasYaml || hasYml
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
    if (stack.hasKafka) parts.push(stack.kafkaLib ? `Kafka (${stack.kafkaLib})` : 'Kafka')
    log(`  ${parts.join(' · ')}`)
}
