import path from 'node:path'

/**
 * Resolves the root path to copilot-config/ templates.
 * Works both in development (bun run src/index.ts) and when installed from npm (ecli binary).
 */
function resolveCopilotConfigBase(): string {
    if (process.env.COMPILED_BINARY === 'true') {
        // Installed via pnpm: binary is at esyfo-cli/bin/ecli, templates at esyfo-cli/copilot-config/
        return path.resolve(import.meta.dir, '../copilot-config')
    }
    // Development: source files are in src/, templates at project root copilot-config/
    return path.resolve(import.meta.dir, '../../copilot-config')
}

export const COPILOT_CONFIG_BASE = resolveCopilotConfigBase()
