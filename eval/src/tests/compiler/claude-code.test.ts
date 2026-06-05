import { describe, it, expect } from 'vitest'
import { compileToClaudeCode } from '../../lib/compiler.js'
import type { EffectiveConfiguration } from '../../lib/types.js'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<EffectiveConfiguration> = {}): EffectiveConfiguration {
  return {
    plugins: [],
    skills: [],
    'mcp-servers': {},
    env: [],
    instructions: {
      operational: null,
      behavioral: null,
      identity: null,
      'import-mode': 'merge',
    },
    permissions: {
      tools: { allow: null, deny: [], ask: [] },
      paths: { writable: [], readonly: [] },
      network: { 'allowed-hosts': [] },
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// CLAUDE.md — operational instructions
// ---------------------------------------------------------------------------

describe('CLAUDE.md generation', () => {
  it('generates CLAUDE.md with operational content and section markers', () => {
    const config = makeConfig({
      metadata: { name: 'my-project', description: 'test' },
      instructions: {
        operational: '## Commands\n- Build: `npm run build`',
        behavioral: null,
        identity: null,
        'import-mode': 'merge',
      },
    })
    const result = compileToClaudeCode(config)
    const claude = result.files.get('CLAUDE.md')

    expect(claude).toBeDefined()
    expect(claude).toContain('<!-- BEGIN harness:my-project:operational -->')
    expect(claude).toContain('## Commands')
    expect(claude).toContain('<!-- END harness:my-project:operational -->')
  })

  it('omits CLAUDE.md when operational is null', () => {
    const config = makeConfig()
    const result = compileToClaudeCode(config)
    expect(result.files.has('CLAUDE.md')).toBe(false)
  })

  it('uses "unknown" as name when metadata is undefined', () => {
    const config = makeConfig({
      instructions: {
        operational: 'some ops',
        behavioral: null,
        identity: null,
        'import-mode': 'merge',
      },
    })
    const result = compileToClaudeCode(config)
    const claude = result.files.get('CLAUDE.md')

    expect(claude).toContain('<!-- BEGIN harness:unknown:operational -->')
    expect(claude).toContain('<!-- END harness:unknown:operational -->')
  })
})

// ---------------------------------------------------------------------------
// AGENT.md — behavioral instructions
// ---------------------------------------------------------------------------

describe('AGENT.md generation', () => {
  it('generates AGENT.md with behavioral content and section markers', () => {
    const config = makeConfig({
      metadata: { name: 'my-project', description: 'test' },
      instructions: {
        operational: null,
        behavioral: 'Be concise and direct.',
        identity: null,
        'import-mode': 'merge',
      },
    })
    const result = compileToClaudeCode(config)
    const agent = result.files.get('AGENT.md')

    expect(agent).toBeDefined()
    expect(agent).toContain('<!-- BEGIN harness:my-project:behavioral -->')
    expect(agent).toContain('Be concise and direct.')
    expect(agent).toContain('<!-- END harness:my-project:behavioral -->')
  })

  it('omits AGENT.md when behavioral is null', () => {
    const config = makeConfig()
    const result = compileToClaudeCode(config)
    expect(result.files.has('AGENT.md')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// SOUL.md — identity instructions
// ---------------------------------------------------------------------------

describe('SOUL.md generation', () => {
  it('omits SOUL.md when identity is null', () => {
    const config = makeConfig()
    const result = compileToClaudeCode(config)
    expect(result.files.has('SOUL.md')).toBe(false)
  })

  it('generates SOUL.md when identity is present', () => {
    const config = makeConfig({
      metadata: { name: 'personal', description: 'test' },
      instructions: {
        operational: null,
        behavioral: null,
        identity: 'You are a thoughtful engineering partner.',
        'import-mode': 'merge',
      },
    })
    const result = compileToClaudeCode(config)
    const soul = result.files.get('SOUL.md')

    expect(soul).toBeDefined()
    expect(soul).toContain('<!-- BEGIN harness:personal:identity -->')
    expect(soul).toContain('You are a thoughtful engineering partner.')
    expect(soul).toContain('<!-- END harness:personal:identity -->')
  })
})

// ---------------------------------------------------------------------------
// .mcp.json — MCP server declarations
// ---------------------------------------------------------------------------

describe('.mcp.json generation', () => {
  it('generates .mcp.json with transport→type rename', () => {
    const config = makeConfig({
      'mcp-servers': {
        postgres: {
          transport: 'stdio',
          command: 'uvx',
          args: ['mcp-server-postgres'],
        },
      },
    })
    const result = compileToClaudeCode(config)
    const mcp = result.files.get('.mcp.json')

    expect(mcp).toBeDefined()
    const parsed = JSON.parse(mcp!)
    expect(parsed.mcpServers.postgres.type).toBe('stdio')
    // transport key should not appear in the output
    expect(parsed.mcpServers.postgres.transport).toBeUndefined()
  })

  it('stdio server: command + args preserved', () => {
    const config = makeConfig({
      'mcp-servers': {
        postgres: {
          transport: 'stdio',
          command: 'uvx',
          args: ['mcp-server-postgres', '--connection-string', '${DB_URL}'],
        },
      },
    })
    const result = compileToClaudeCode(config)
    const parsed = JSON.parse(result.files.get('.mcp.json')!)

    expect(parsed.mcpServers.postgres.command).toBe('uvx')
    expect(parsed.mcpServers.postgres.args).toEqual([
      'mcp-server-postgres',
      '--connection-string',
      '${DB_URL}',
    ])
  })

  it('stdio server: env preserved when present', () => {
    const config = makeConfig({
      'mcp-servers': {
        postgres: {
          transport: 'stdio',
          command: 'uvx',
          args: ['mcp-server-postgres'],
          env: { DB_URL: 'postgres://localhost/db' },
        },
      },
    })
    const result = compileToClaudeCode(config)
    const parsed = JSON.parse(result.files.get('.mcp.json')!)

    expect(parsed.mcpServers.postgres.env).toEqual({ DB_URL: 'postgres://localhost/db' })
  })

  it('http server: url + headers preserved', () => {
    const config = makeConfig({
      'mcp-servers': {
        'remote-api': {
          transport: 'http',
          url: 'https://api.example.com/mcp',
          headers: { Authorization: 'Bearer ${API_TOKEN}' },
        },
      },
    })
    const result = compileToClaudeCode(config)
    const parsed = JSON.parse(result.files.get('.mcp.json')!)

    expect(parsed.mcpServers['remote-api'].type).toBe('http')
    expect(parsed.mcpServers['remote-api'].url).toBe('https://api.example.com/mcp')
    expect(parsed.mcpServers['remote-api'].headers).toEqual({
      Authorization: 'Bearer ${API_TOKEN}',
    })
  })

  it('omits .mcp.json when no servers declared', () => {
    const config = makeConfig()
    const result = compileToClaudeCode(config)
    expect(result.files.has('.mcp.json')).toBe(false)
  })

  it('multiple servers: all appear in mcpServers object', () => {
    const config = makeConfig({
      'mcp-servers': {
        postgres: { transport: 'stdio', command: 'uvx', args: ['pg'] },
        search: { transport: 'stdio', command: 'npx', args: ['-y', '@mcp/search'] },
        remote: { transport: 'http', url: 'https://mcp.example.com' },
      },
    })
    const result = compileToClaudeCode(config)
    const parsed = JSON.parse(result.files.get('.mcp.json')!)

    expect(Object.keys(parsed.mcpServers)).toHaveLength(3)
    expect(parsed.mcpServers.postgres.type).toBe('stdio')
    expect(parsed.mcpServers.search.type).toBe('stdio')
    expect(parsed.mcpServers.remote.type).toBe('http')
  })
})

// ---------------------------------------------------------------------------
// .claude/settings.json — permissions
// ---------------------------------------------------------------------------

describe('.claude/settings.json generation', () => {
  it('generates settings.json from permissions', () => {
    const config = makeConfig({
      permissions: {
        tools: {
          allow: ['Read', 'Glob', 'Grep', 'Write', 'Edit'],
          deny: ['mcp__postgres__drop_*'],
          ask: ['Bash'],
        },
        paths: {
          writable: ['sql/', 'migrations/'],
          readonly: ['config/'],
        },
        network: { 'allowed-hosts': [] },
      },
    })
    const result = compileToClaudeCode(config)
    const settings = result.files.get('.claude/settings.json')

    expect(settings).toBeDefined()
    const parsed = JSON.parse(settings!)
    expect(parsed.permissions.allow).toEqual(['Read', 'Glob', 'Grep', 'Write', 'Edit'])
    expect(parsed.permissions.deny).toEqual(['mcp__postgres__drop_*'])
    expect(parsed.permissions.additionalDirectories).toEqual(['sql/', 'migrations/'])
  })

  it('omits allow when tools.allow is null', () => {
    const config = makeConfig({
      permissions: {
        tools: { allow: null, deny: ['Bash'], ask: [] },
        paths: { writable: [], readonly: [] },
        network: { 'allowed-hosts': [] },
      },
    })
    const result = compileToClaudeCode(config)
    const parsed = JSON.parse(result.files.get('.claude/settings.json')!)

    expect(parsed.permissions.allow).toBeUndefined()
    expect(parsed.permissions.deny).toEqual(['Bash'])
  })

  it('empty writable produces empty additionalDirectories', () => {
    const config = makeConfig()
    const result = compileToClaudeCode(config)
    const parsed = JSON.parse(result.files.get('.claude/settings.json')!)

    expect(parsed.permissions.additionalDirectories).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

describe('compiler warnings', () => {
  it('warns when network allowed-hosts is non-empty', () => {
    const config = makeConfig({
      permissions: {
        tools: { allow: null, deny: [], ask: [] },
        paths: { writable: [], readonly: [] },
        network: { 'allowed-hosts': ['api.example.com', 'db.internal.com'] },
      },
    })
    const result = compileToClaudeCode(config)

    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('permissions.network.allowed-hosts')
    expect(result.warnings[0]).toContain('api.example.com')
    expect(result.warnings[0]).toContain('db.internal.com')
  })

  it('no warnings when network allowed-hosts is empty', () => {
    const config = makeConfig()
    const result = compileToClaudeCode(config)
    expect(result.warnings).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Full pipeline: end-to-end
// ---------------------------------------------------------------------------

describe('full pipeline', () => {
  it('builds EffectiveConfiguration, compiles, and verifies all output files', () => {
    const config: EffectiveConfiguration = {
      metadata: { name: 'data-engineer', description: 'Full stack data engineering harness' },
      plugins: [{ name: 'lineage', source: 'org/lineage', version: '1.0.0' }],
      skills: [],
      'mcp-servers': {
        postgres: {
          transport: 'stdio',
          command: 'uvx',
          args: ['mcp-server-postgres', '--connection-string', '${DB_URL}'],
          env: { DB_URL: 'postgres://localhost/mydb' },
        },
        analytics: {
          transport: 'http',
          url: 'https://analytics.internal.com/mcp',
          headers: { 'X-API-Key': '${ANALYTICS_KEY}' },
        },
      },
      env: [
        { name: 'DB_URL', description: 'Database URL', required: true, sensitive: true },
        { name: 'ANALYTICS_KEY', description: 'Analytics API key', required: true, sensitive: true },
      ],
      instructions: {
        operational: '## Commands\n- Build: `dbt run`\n- Test: `dbt test`',
        behavioral: 'Be concise. Prefer SQL over Python for data transformations.',
        identity: 'You are a senior data engineering partner.',
        'import-mode': 'merge',
      },
      permissions: {
        tools: {
          allow: ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash'],
          deny: ['mcp__postgres__drop_*', 'mcp__postgres__delete_*'],
          ask: ['Bash'],
        },
        paths: {
          writable: ['sql/', 'migrations/', 'dbt/'],
          readonly: ['config/'],
        },
        network: {
          'allowed-hosts': ['analytics.internal.com'],
        },
      },
    }

    const result = compileToClaudeCode(config)

    // CLAUDE.md
    const claude = result.files.get('CLAUDE.md')
    expect(claude).toBeDefined()
    expect(claude).toContain('<!-- BEGIN harness:data-engineer:operational -->')
    expect(claude).toContain('## Commands')
    expect(claude).toContain('`dbt run`')
    expect(claude).toContain('<!-- END harness:data-engineer:operational -->')

    // AGENT.md
    const agent = result.files.get('AGENT.md')
    expect(agent).toBeDefined()
    expect(agent).toContain('<!-- BEGIN harness:data-engineer:behavioral -->')
    expect(agent).toContain('Be concise.')
    expect(agent).toContain('<!-- END harness:data-engineer:behavioral -->')

    // SOUL.md
    const soul = result.files.get('SOUL.md')
    expect(soul).toBeDefined()
    expect(soul).toContain('<!-- BEGIN harness:data-engineer:identity -->')
    expect(soul).toContain('senior data engineering partner')
    expect(soul).toContain('<!-- END harness:data-engineer:identity -->')

    // .mcp.json
    const mcp = result.files.get('.mcp.json')
    expect(mcp).toBeDefined()
    const mcpParsed = JSON.parse(mcp!)
    // stdio server
    expect(mcpParsed.mcpServers.postgres.type).toBe('stdio')
    expect(mcpParsed.mcpServers.postgres.command).toBe('uvx')
    expect(mcpParsed.mcpServers.postgres.args).toContain('mcp-server-postgres')
    expect(mcpParsed.mcpServers.postgres.env).toEqual({ DB_URL: 'postgres://localhost/mydb' })
    // http server
    expect(mcpParsed.mcpServers.analytics.type).toBe('http')
    expect(mcpParsed.mcpServers.analytics.url).toBe('https://analytics.internal.com/mcp')
    expect(mcpParsed.mcpServers.analytics.headers).toEqual({ 'X-API-Key': '${ANALYTICS_KEY}' })

    // .claude/settings.json
    const settings = result.files.get('.claude/settings.json')
    expect(settings).toBeDefined()
    const settingsParsed = JSON.parse(settings!)
    expect(settingsParsed.permissions.allow).toEqual(['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash'])
    expect(settingsParsed.permissions.deny).toEqual(['mcp__postgres__drop_*', 'mcp__postgres__delete_*'])
    expect(settingsParsed.permissions.additionalDirectories).toEqual(['sql/', 'migrations/', 'dbt/'])

    // Verify all expected files were generated (5 total)
    expect(result.files.size).toBe(5)
    expect(Array.from(result.files.keys()).sort()).toEqual([
      '.claude/settings.json',
      '.mcp.json',
      'AGENT.md',
      'CLAUDE.md',
      'SOUL.md',
    ])

    // Warnings (ask, readonly, and network are not enforceable via settings.json)
    expect(result.warnings).toHaveLength(3)
    expect(result.warnings[0]).toContain('permissions.tools.ask')
    expect(result.warnings[0]).toContain('Bash')
    expect(result.warnings[1]).toContain('permissions.paths.readonly')
    expect(result.warnings[1]).toContain('config/')
    expect(result.warnings[2]).toContain('analytics.internal.com')
  })
})
