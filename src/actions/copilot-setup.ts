import fs from 'node:fs'
import path from 'node:path'

import chalk from 'chalk'

import { log } from '../common/log.ts'
import { COPILOT_CONFIG_BASE } from '../copilot-config/paths.ts'

const PLUGIN_SOURCE = path.resolve(COPILOT_CONFIG_BASE, 'user-agents')
const HOME = Bun.env.HOME ?? Bun.env.USERPROFILE
if (!HOME) {
    throw new Error('Could not determine home directory: neither HOME nor USERPROFILE is set')
}
const COPILOT_DIR = path.join(HOME, '.copilot')
const PLUGIN_TARGET = path.join(COPILOT_DIR, 'installed-plugins', '_direct', 'esyfo-agents')
const COPILOT_CONFIG_PATH = path.join(COPILOT_DIR, 'config.json')
const MCP_CONFIG_PATH = path.join(COPILOT_DIR, 'mcp-config.json')

const PLUGIN_NAME = 'esyfo-agents'

interface McpServer {
    command?: string
    type?: string
    url?: string
    args?: string[]
    env?: Record<string, string>
    headers?: Record<string, string>
    tools?: string[]
}

interface McpConfig {
    mcpServers?: Record<string, McpServer>
    servers?: Record<string, McpServer>
}

interface InstalledPlugin {
    name: string
    marketplace: string
    version: string
    installed_at: string
    enabled: boolean
    cache_path: string
}

interface CopilotConfig {
    installed_plugins?: InstalledPlugin[]
    [key: string]: unknown
}

export async function copilotSetup(options: { force?: boolean }): Promise<void> {
    log(chalk.green('🔧 Setting up GitHub Copilot for team-esyfo\n'))

    await installPlugin(options.force ?? false)
    await registerPlugin()
    await configureMcp()

    log(chalk.green('\n✅ Setup complete!'))
    log(chalk.dim('  Plugin installed to: ' + PLUGIN_TARGET))
    log(chalk.dim('  MCP config at: ' + MCP_CONFIG_PATH))
    log(chalk.dim('\n  Restart Copilot CLI for changes to take effect.'))
}

async function installPlugin(force: boolean): Promise<void> {
    log(chalk.cyan('📦 Installing esyfo-agents plugin...'))

    const agentsSourceDir = path.join(PLUGIN_SOURCE, 'agents')
    const agentsTargetDir = path.join(PLUGIN_TARGET, 'agents')
    fs.mkdirSync(agentsTargetDir, { recursive: true })

    // Copy plugin.json
    const pluginJsonSource = path.join(PLUGIN_SOURCE, 'plugin.json')
    const pluginJsonTarget = path.join(PLUGIN_TARGET, 'plugin.json')
    await copyFileIfChanged(pluginJsonSource, pluginJsonTarget, force)

    // Copy agent files — remove stale agents first
    const agentFiles = fs.readdirSync(agentsSourceDir).filter((f) => f.endsWith('.agent.md'))
    const sourceNames = new Set(agentFiles)
    const existingFiles = fs.readdirSync(agentsTargetDir).filter((f) => f.endsWith('.agent.md'))
    for (const file of existingFiles) {
        if (!sourceNames.has(file)) {
            fs.unlinkSync(path.join(agentsTargetDir, file))
            log(chalk.yellow(`  🗑 Removed stale agent: ${file}`))
        }
    }
    for (const file of agentFiles) {
        await copyFileIfChanged(path.join(agentsSourceDir, file), path.join(agentsTargetDir, file), force)
    }
}

async function copyFileIfChanged(source: string, target: string, force: boolean): Promise<void> {
    const fileName = path.basename(source)
    const sourceContent = await Bun.file(source).text()

    if (fs.existsSync(target) && !force) {
        const existing = await Bun.file(target).text()
        if (existing === sourceContent) {
            log(chalk.dim(`  - ${fileName} (unchanged)`))
            return
        }
    }

    await Bun.write(target, sourceContent)
    log(chalk.green(`  ✓ ${fileName}`))
}

async function registerPlugin(): Promise<void> {
    let config: CopilotConfig

    if (fs.existsSync(COPILOT_CONFIG_PATH)) {
        config = JSON.parse(await Bun.file(COPILOT_CONFIG_PATH).text()) as CopilotConfig
    } else {
        fs.mkdirSync(path.dirname(COPILOT_CONFIG_PATH), { recursive: true })
        config = { installed_plugins: [] }
        log(chalk.green('  ✓ Created ~/.copilot/config.json'))
    }
    const plugins = config.installed_plugins ?? []
    const existing = plugins.find((p) => p.name === PLUGIN_NAME)

    if (existing) {
        existing.cache_path = PLUGIN_TARGET
        existing.enabled = true
        log(chalk.dim('  - Plugin already registered'))
    } else {
        plugins.push({
            name: PLUGIN_NAME,
            marketplace: '',
            version: '1.0.0',
            installed_at: new Date().toISOString(),
            enabled: true,
            cache_path: PLUGIN_TARGET,
        })
        log(chalk.green('  ✓ Plugin registered in config.json'))
    }

    config.installed_plugins = plugins
    await Bun.write(COPILOT_CONFIG_PATH, JSON.stringify(config, null, 2) + '\n')
}

async function configureMcp(): Promise<void> {
    log(chalk.cyan('\n🔌 Configuring MCP servers...'))

    const desiredServers: Record<string, McpServer> = {
        context7: {
            command: 'npx',
            args: ['-y', '@upstash/context7-mcp@latest'],
        },
    }

    if (fs.existsSync(MCP_CONFIG_PATH)) {
        const existing = JSON.parse(await Bun.file(MCP_CONFIG_PATH).text()) as McpConfig
        // Support both mcpServers (Copilot CLI) and servers (older format)
        const serversKey = existing.mcpServers ? 'mcpServers' : existing.servers ? 'servers' : 'mcpServers'
        const servers = existing[serversKey] ?? {}
        let changed = false

        for (const [name, server] of Object.entries(desiredServers)) {
            if (!servers[name]) {
                servers[name] = server
                changed = true
                log(chalk.green(`  ✓ Added ${name}`))
            } else {
                log(chalk.dim(`  - ${name} (already configured)`))
            }
        }

        if (changed) {
            existing[serversKey] = servers
            await Bun.write(MCP_CONFIG_PATH, JSON.stringify(existing, null, 2) + '\n')
        }
    } else {
        const config: McpConfig = { mcpServers: desiredServers }
        fs.mkdirSync(path.dirname(MCP_CONFIG_PATH), { recursive: true })
        await Bun.write(MCP_CONFIG_PATH, JSON.stringify(config, null, 2) + '\n')
        for (const name of Object.keys(desiredServers)) {
            log(chalk.green(`  ✓ Added ${name}`))
        }
    }
}
