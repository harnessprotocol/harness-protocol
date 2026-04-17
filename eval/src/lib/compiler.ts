import type { EffectiveConfiguration, McpServerStdio, McpServerRemote } from './types.js'

export interface CompilerOutput {
  files: Map<string, string>
  warnings: string[]
}

/**
 * Compile an EffectiveConfiguration to Claude Code native config files.
 *
 * Output files:
 * - CLAUDE.md — from instructions.operational, wrapped in section markers
 * - AGENT.md — from instructions.behavioral
 * - SOUL.md — from instructions.identity (omit when null)
 * - .mcp.json — from mcp-servers, transport → type rename
 * - .claude/settings.json — from permissions
 */
export function compileToClaudeCode(config: EffectiveConfiguration): CompilerOutput {
  const files = new Map<string, string>()
  const warnings: string[] = []
  const name = config.metadata?.name ?? 'unknown'

  // CLAUDE.md — operational instructions
  if (config.instructions.operational !== null) {
    const content = wrapWithMarkers(name, 'operational', config.instructions.operational)
    files.set('CLAUDE.md', content)
  }

  // AGENT.md — behavioral instructions
  if (config.instructions.behavioral !== null) {
    const content = wrapWithMarkers(name, 'behavioral', config.instructions.behavioral)
    files.set('AGENT.md', content)
  }

  // SOUL.md — identity instructions (omit entirely when null)
  if (config.instructions.identity !== null) {
    const content = wrapWithMarkers(name, 'identity', config.instructions.identity)
    files.set('SOUL.md', content)
  }

  // .mcp.json — MCP server declarations with transport → type rename
  const serverEntries = Object.entries(config['mcp-servers'])
  if (serverEntries.length > 0) {
    const mcpServers: Record<string, Record<string, unknown>> = {}

    for (const [serverName, serverConfig] of serverEntries) {
      if (serverConfig.transport === 'stdio') {
        const stdio = serverConfig as McpServerStdio
        const entry: Record<string, unknown> = {
          type: 'stdio',
          command: stdio.command,
        }
        if (stdio.args !== undefined) {
          entry.args = stdio.args
        }
        if (stdio.env !== undefined) {
          entry.env = stdio.env
        }
        mcpServers[serverName] = entry
      } else {
        // http | sse | ws — remote transport
        const remote = serverConfig as McpServerRemote
        const entry: Record<string, unknown> = {
          type: remote.transport,
          url: remote.url,
        }
        if (remote.headers !== undefined) {
          entry.headers = remote.headers
        }
        mcpServers[serverName] = entry
      }
    }

    files.set('.mcp.json', JSON.stringify({ mcpServers }, null, 2))
  }

  // .claude/settings.json — permissions
  const perms = config.permissions
  const settings: Record<string, unknown> = {}
  const permissionsObj: Record<string, unknown> = {}

  // tools.allow → allow (omit when null)
  if (perms.tools.allow !== null) {
    permissionsObj.allow = perms.tools.allow
  }

  // tools.deny → deny
  permissionsObj.deny = perms.tools.deny

  // paths.writable → additionalDirectories
  permissionsObj.additionalDirectories = perms.paths.writable

  settings.permissions = permissionsObj
  files.set('.claude/settings.json', JSON.stringify(settings, null, 2))

  // Warnings for fields not directly enforceable via settings.json
  if (perms.tools.ask.length > 0) {
    warnings.push(
      `permissions.tools.ask requires an approval hook and is not directly enforceable via settings.json. ` +
        `Tools: ${perms.tools.ask.join(', ')}`
    )
  }

  if (perms.paths.readonly.length > 0) {
    warnings.push(
      `permissions.paths.readonly has no settings.json equivalent — readonly intent is not enforced. ` +
        `Paths: ${perms.paths.readonly.join(', ')}`
    )
  }

  if (perms.network['allowed-hosts'].length > 0) {
    warnings.push(
      `permissions.network.allowed-hosts is not enforceable via settings.json. ` +
        `Hosts: ${perms.network['allowed-hosts'].join(', ')}`
    )
  }

  return { files, warnings }
}

function wrapWithMarkers(name: string, slot: string, content: string): string {
  return `<!-- BEGIN harness:${name}:${slot} -->\n${content}\n<!-- END harness:${name}:${slot} -->`
}
