import * as fs from 'fs'

import * as YAML from 'yaml'

export interface CopilotSyncProfile {
    copilot_instructions: string[]
    team_agent: string | null
    agents?: string[]
    instructions?: string[]
    prompts?: string[]
    skills?: string[]
}

export interface CopilotSyncOverride {
    skip?: boolean
    profile?: string
}

export interface CopilotSyncConfig {
    common: {
        agents: string[]
        prompts?: string[]
        skills?: string[]
    }
    profiles: Record<string, CopilotSyncProfile>
    overrides: Record<string, CopilotSyncOverride>
}

export type RepoProfile = 'backend' | 'frontend' | 'microfrontend' | 'other'

interface RawConfig {
    common: {
        agents: string[]
        prompts?: string[]
        skills?: string[]
    }
    profiles: Record<string, CopilotSyncProfile>
    overrides?: Record<string, CopilotSyncOverride>
}

export function loadCopilotSyncConfig(configPath: string): CopilotSyncConfig {
    const file = fs.readFileSync(configPath, 'utf8')
    const raw = YAML.parse(file) as RawConfig

    return {
        common: raw.common,
        profiles: raw.profiles,
        overrides: raw.overrides ?? {},
    }
}

export function getFilesForProfile(
    config: CopilotSyncConfig,
    profile: RepoProfile,
): {
    copilotInstructions: string[]
    agents: string[]
    instructions: string[]
    prompts: string[]
    skills: string[]
    teamAgent: string | null
} {
    const profileConfig = config.profiles[profile]

    if (!profileConfig) {
        return {
            copilotInstructions: ['base.md'],
            agents: [...config.common.agents],
            instructions: [],
            prompts: [...(config.common.prompts ?? [])],
            skills: [...(config.common.skills ?? [])],
            teamAgent: null,
        }
    }

    return {
        copilotInstructions: profileConfig.copilot_instructions,
        agents: [...config.common.agents, ...(profileConfig.agents ?? [])],
        instructions: profileConfig.instructions ?? [],
        prompts: [...(config.common.prompts ?? []), ...(profileConfig.prompts ?? [])],
        skills: [...(config.common.skills ?? []), ...(profileConfig.skills ?? [])],
        teamAgent: profileConfig.team_agent,
    }
}

export function isRepoSkipped(config: CopilotSyncConfig, repoName: string): boolean {
    return config.overrides[repoName]?.skip === true
}
