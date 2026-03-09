import path from 'node:path'

import * as YAML from 'yaml'

import { Config, RepoConfig } from './types.ts'

function resolveConfigPath(filename: string): string {
    if (process.env.COMPILED_BINARY === 'true') {
        // Installed via npm: binary is at esyfo-cli/bin/ecli, config files at esyfo-cli/
        return path.resolve(import.meta.dir, '..', filename)
    }
    // Development: config.ts is in src/config/, config files are in project root
    return path.resolve(import.meta.dir, '../..', filename)
}

async function loadConfig(): Promise<Config> {
    const file = await Bun.file(resolveConfigPath('config.yml')).text()
    return multirepoTilConfig(YAML.parse(file) as BaseConfig)
}

async function loadSkipEnforceAdmin(): Promise<string[]> {
    const file = await Bun.file(resolveConfigPath('skip-enforce-admins.yml')).text()
    return (YAML.parse(file) as { repo: string[] }).repo
}

function multirepoTilConfig(baseConfig: BaseConfig): Config {
    const repos: RepoConfig[] = []

    baseConfig.repos.forEach((a) => {
        a.reponame.forEach((n) => {
            repos.push({ name: n, checks: a.checks, patch: false })
        })
    })
    return {
        owner: baseConfig.owner,
        repos,
    }
}

interface BaseConfig {
    owner: string
    repos: MultiRepoConfig[]
}

interface MultiRepoConfig {
    reponame: string[]
    checks: string[]
}

export const config = await loadConfig()
export const skipEnforceAdmin = await loadSkipEnforceAdmin()
