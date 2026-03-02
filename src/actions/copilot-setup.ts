import fs from 'node:fs'
import path from 'node:path'

import chalk from 'chalk'

import { log } from '../common/log.ts'

const PLUGIN_SOURCE = path.resolve(import.meta.dir, '../../copilot-config/user-agents')
const HOME = Bun.env.HOME ?? Bun.env.USERPROFILE ?? '~'
const PLUGIN_TARGET = path.join(HOME, '.copilot', 'installed-plugins', '_direct', 'esyfo-agents')
const MCP_CONFIG_PATH = path.join(HOME, '.copilot', 'mcp-config.json')

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

export async function copilotSetup(options: { force?: boolean }): Promise<void> {
    log(chalk.green('🔧 Setting up GitHub Copilot for team-esyfo\n'))

    await installPlugin(options.force ?? false)
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

    // Copy agent files
    const agentFiles = fs.readdirSync(agentsSourceDir).filter((f) => f.endsWith('.agent.md'))
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
        const serversKey = existing.mcpServers ? 'mcpServers' : 'servers'
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
