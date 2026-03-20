import * as fs from "fs";

import * as YAML from "yaml";

export interface CopilotSyncProfile {
  copilot_instructions: string[];
  agents?: string[];
  instructions?: string[];
  skills?: string[];
}

export interface CopilotSyncConfig {
  common: {
    agents?: string[];
    instructions?: string[];
    skills?: string[];
    issue_templates?: string[];
    pull_request_template?: string;
  };
  profiles: Record<string, CopilotSyncProfile>;
}

export type RepoProfile = "backend" | "frontend" | "other";

interface RawConfig {
  common: {
    agents?: string[];
    instructions?: string[];
    skills?: string[];
    issue_templates?: string[];
    pull_request_template?: string;
  };
  profiles: Record<string, CopilotSyncProfile>;
}

export function loadCopilotSyncConfig(configPath: string): CopilotSyncConfig {
  const file = fs.readFileSync(configPath, "utf8");
  const raw = YAML.parse(file) as RawConfig;

  return {
    common: raw.common,
    profiles: raw.profiles,
  };
}

export function getFilesForProfile(
  config: CopilotSyncConfig,
  profile: RepoProfile,
): {
  copilotInstructions: string[];
  agents: string[];
  instructions: string[];
  skills: string[];
  issueTemplates: string[];
  pullRequestTemplate: string | null;
} {
  const profileConfig = config.profiles[profile];

  if (!profileConfig) {
    return {
      copilotInstructions: ["base.md"],
      agents: [...(config.common.agents ?? [])],
      instructions: [...(config.common.instructions ?? [])],
      skills: [...(config.common.skills ?? [])],
      issueTemplates: [...(config.common.issue_templates ?? [])],
      pullRequestTemplate: config.common.pull_request_template ?? null,
    };
  }

  return {
    copilotInstructions: profileConfig.copilot_instructions,
    agents: [...(config.common.agents ?? []), ...(profileConfig.agents ?? [])],
    instructions: [
      ...(config.common.instructions ?? []),
      ...(profileConfig.instructions ?? []),
    ],
    skills: [...(config.common.skills ?? []), ...(profileConfig.skills ?? [])],
    issueTemplates: [...(config.common.issue_templates ?? [])],
    pullRequestTemplate: config.common.pull_request_template ?? null,
  };
}

/**
 * Merge files from multiple profiles (for monorepos), deduplicating.
 * copilot_instructions are concatenated in order; other files are unioned.
 */
export function getFilesForProfiles(
  config: CopilotSyncConfig,
  profiles: RepoProfile[],
): ReturnType<typeof getFilesForProfile> {
  if (profiles.length === 0) return getFilesForProfile(config, "other");
  if (profiles.length === 1) return getFilesForProfile(config, profiles[0]);

  const instructionTemplates: string[] = ["base.md"];
  const agents = new Set<string>(config.common.agents ?? []);
  const instructions = new Set<string>(config.common.instructions ?? []);
  const skills = new Set<string>(config.common.skills ?? []);

  for (const profile of profiles) {
    const profileConfig = config.profiles[profile];
    if (!profileConfig) continue;

    // Append profile-specific instruction templates (skip base.md, already added)
    for (const t of profileConfig.copilot_instructions) {
      if (t !== "base.md" && !instructionTemplates.includes(t)) {
        instructionTemplates.push(t);
      }
    }

    for (const a of profileConfig.agents ?? []) agents.add(a);
    for (const i of profileConfig.instructions ?? []) instructions.add(i);
    for (const s of profileConfig.skills ?? []) skills.add(s);
  }

  return {
    copilotInstructions: instructionTemplates,
    agents: [...agents],
    instructions: [...instructions],
    skills: [...skills],
    issueTemplates: [...(config.common.issue_templates ?? [])],
    pullRequestTemplate: config.common.pull_request_template ?? null,
  };
}
