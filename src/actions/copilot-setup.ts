import fs from 'node:fs'
import path from 'node:path'

import chalk from 'chalk'

import { log } from '../common/log.ts'

const USER_AGENTS_SOURCE = path.resolve(import.meta.dir, '../../copilot-config/user-agents')
const USER_AGENTS_TARGET = path.join(Bun.env.HOME ?? Bun.env.USERPROFILE ?? '~', '.config', 'copilot', 'agents')
const MCP_CONFIG_PATH = path.join(Bun.env.HOME ?? Bun.env.USERPROFILE ?? '~', '.copilot', 'mcp-config.json')

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

    await installUserAgents(options.force ?? false)
    await configureMcp()

    log(chalk.green('\n✅ Setup complete!'))
    log(chalk.dim('  Agents installed to: ' + USER_AGENTS_TARGET))
    log(chalk.dim('  MCP config at: ' + MCP_CONFIG_PATH))
    log(chalk.dim('\n  Restart your editor/CLI for changes to take effect.'))
}

async function installUserAgents(force: boolean): Promise<void> {
    log(chalk.cyan('📦 Installing user-level role agents...'))

    fs.mkdirSync(USER_AGENTS_TARGET, { recursive: true })

    const agentFiles = fs.readdirSync(USER_AGENTS_SOURCE).filter((f) => f.endsWith('.agent.md'))

    for (const file of agentFiles) {
        const sourcePath = path.join(USER_AGENTS_SOURCE, file)
        const targetPath = path.join(USER_AGENTS_TARGET, file)

        if (fs.existsSync(targetPath) && !force) {
            const existing = await Bun.file(targetPath).text()
            const source = await Bun.file(sourcePath).text()
            if (existing === source) {
                log(chalk.dim(`  - ${file} (unchanged)`))
                continue
            }
            log(chalk.yellow(`  ⚠ ${file} exists and differs — use --force to overwrite`))
            continue
        }

        const content = await Bun.file(sourcePath).text()
        await Bun.write(targetPath, content)
        log(chalk.green(`  ✓ ${file}`))
    }
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
