import { describe, it, expect } from 'vitest'
import { substituteVars } from '../../lib/substitute.js'
import type { EffectiveConfiguration } from '../../lib/types.js'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<EffectiveConfiguration> = {}): EffectiveConfiguration {
  return {
    plugins: [],
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
// Variable Substitution
// ---------------------------------------------------------------------------

describe('Variable Substitution', () => {
  it('substitutes ${VAR_NAME} in stdio args correctly', () => {
    const config = makeConfig({
      'mcp-servers': {
        pg: {
          transport: 'stdio',
          command: 'uvx',
          args: ['--connection-string', '${DB_URL}'],
        },
      },
      env: [{ name: 'DB_URL', description: 'Database URL', required: true }],
    })

    const result = substituteVars(config, { DB_URL: 'postgres://localhost/mydb' })

    const server = result.config['mcp-servers']['pg'] as { args?: string[] }
    expect(server.args).toEqual(['--connection-string', 'postgres://localhost/mydb'])
    expect(result.errors.filter((e) => e.category === 'fatal')).toHaveLength(0)
  })

  it('substitutes ${VAR_NAME} in stdio command correctly', () => {
    const config = makeConfig({
      'mcp-servers': {
        pg: {
          transport: 'stdio',
          command: '${TOOL_PATH}',
          args: [],
        },
      },
      env: [{ name: 'TOOL_PATH', description: 'Path to tool binary', required: true, sensitive: false }],
    })

    const result = substituteVars(config, { TOOL_PATH: '/usr/local/bin/mcp-server' })

    const server = result.config['mcp-servers']['pg'] as { command: string }
    expect(server.command).toBe('/usr/local/bin/mcp-server')
    expect(result.errors.filter((e) => e.category === 'fatal')).toHaveLength(0)
  })

  it('substitutes ${VAR_NAME} in stdio env values correctly', () => {
    const config = makeConfig({
      'mcp-servers': {
        pg: {
          transport: 'stdio',
          command: 'uvx',
          args: [],
          env: { DATABASE_URL: '${DB_URL}' },
        },
      },
      env: [{ name: 'DB_URL', description: 'Database URL', required: true }],
    })

    const result = substituteVars(config, { DB_URL: 'postgres://localhost/mydb' })

    const server = result.config['mcp-servers']['pg'] as { env?: Record<string, string> }
    expect(server.env).toEqual({ DATABASE_URL: 'postgres://localhost/mydb' })
  })

  it('substitutes ${VAR_NAME} in http url correctly', () => {
    const config = makeConfig({
      'mcp-servers': {
        remote: {
          transport: 'http',
          url: 'https://${API_HOST}/mcp',
        },
      },
      env: [{ name: 'API_HOST', description: 'API host', required: true }],
    })

    const result = substituteVars(config, { API_HOST: 'api.example.com' })

    const server = result.config['mcp-servers']['remote'] as { url: string }
    expect(server.url).toBe('https://api.example.com/mcp')
  })

  it('substitutes ${VAR_NAME} in http headers values correctly', () => {
    const config = makeConfig({
      'mcp-servers': {
        remote: {
          transport: 'http',
          url: 'https://api.example.com/mcp',
          headers: { Authorization: 'Bearer ${API_TOKEN}' },
        },
      },
      env: [{ name: 'API_TOKEN', description: 'API token', required: true }],
    })

    const result = substituteVars(config, { API_TOKEN: 'secret123' })

    const server = result.config['mcp-servers']['remote'] as { headers?: Record<string, string> }
    expect(server.headers).toEqual({ Authorization: 'Bearer secret123' })
  })

  it('handles multiple variables in a single string', () => {
    const config = makeConfig({
      'mcp-servers': {
        pg: {
          transport: 'stdio',
          command: 'uvx',
          args: ['--host', '${DB_HOST}:${DB_PORT}'],
        },
      },
      env: [
        { name: 'DB_HOST', description: 'host', required: true },
        { name: 'DB_PORT', description: 'port', required: true },
      ],
    })

    const result = substituteVars(config, { DB_HOST: 'localhost', DB_PORT: '5432' })

    const server = result.config['mcp-servers']['pg'] as { args?: string[] }
    expect(server.args).toEqual(['--host', 'localhost:5432'])
  })

  it('uses default when variable not in env but has default', () => {
    const config = makeConfig({
      'mcp-servers': {
        pg: {
          transport: 'stdio',
          command: 'uvx',
          args: ['--port', '${DB_PORT}'],
        },
      },
      env: [{ name: 'DB_PORT', description: 'port', default: '5432' }],
    })

    const result = substituteVars(config, {})

    const server = result.config['mcp-servers']['pg'] as { args?: string[] }
    expect(server.args).toEqual(['--port', '5432'])
    // Should produce an informational note, not a fatal error
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].category).toBe('informational')
    expect(result.errors[0].variable).toBe('DB_PORT')
  })

  it('produces fatal error for missing required variable', () => {
    const config = makeConfig({
      'mcp-servers': {
        pg: {
          transport: 'stdio',
          command: 'uvx',
          args: ['--connection-string', '${DB_URL}'],
        },
      },
      env: [{ name: 'DB_URL', description: 'Database URL', required: true }],
    })

    const result = substituteVars(config, {})

    const fatal = result.errors.filter((e) => e.category === 'fatal')
    expect(fatal).toHaveLength(1)
    expect(fatal[0].variable).toBe('DB_URL')
  })

  it('produces informational note for missing optional variable (no default)', () => {
    const config = makeConfig({
      'mcp-servers': {
        pg: {
          transport: 'stdio',
          command: 'uvx',
          args: ['--tag', '${OPTIONAL_TAG}'],
        },
      },
      env: [{ name: 'OPTIONAL_TAG', description: 'optional tag' }],
    })

    const result = substituteVars(config, {})

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].category).toBe('informational')
    expect(result.errors[0].variable).toBe('OPTIONAL_TAG')
    // Value should be substituted with empty string
    const server = result.config['mcp-servers']['pg'] as { args?: string[] }
    expect(server.args).toEqual(['--tag', ''])
  })
})

// ---------------------------------------------------------------------------
// Substitution Scope
// ---------------------------------------------------------------------------

describe('Substitution Scope', () => {
  it('does NOT substitute in env entry names', () => {
    const config = makeConfig({
      'mcp-servers': {
        pg: {
          transport: 'stdio',
          command: 'uvx',
          args: [],
          env: { '${SHOULD_NOT_CHANGE}': 'value' },
        },
      },
      env: [{ name: 'SHOULD_NOT_CHANGE', description: 'test' }],
    })

    const result = substituteVars(config, { SHOULD_NOT_CHANGE: 'replaced' })

    const server = result.config['mcp-servers']['pg'] as { env?: Record<string, string> }
    // The key should remain as-is — only values are substituted
    expect(Object.keys(server.env!)).toContain('${SHOULD_NOT_CHANGE}')
    expect(Object.keys(server.env!)).not.toContain('replaced')
  })

  it('does NOT substitute in server names (map keys stay as-is)', () => {
    const config = makeConfig({
      'mcp-servers': {
        '${SERVER_NAME}': {
          transport: 'stdio',
          command: 'npx',
          args: [],
        },
      },
      env: [{ name: 'SERVER_NAME', description: 'test' }],
    })

    const result = substituteVars(config, { SERVER_NAME: 'replaced' })

    expect(result.config['mcp-servers']).toHaveProperty('${SERVER_NAME}')
    expect(result.config['mcp-servers']).not.toHaveProperty('replaced')
  })

  it('does NOT substitute in metadata fields', () => {
    const config = makeConfig({
      metadata: {
        name: '${PROJECT_NAME}',
        description: 'A project called ${PROJECT_NAME}',
      },
      'mcp-servers': {},
      env: [{ name: 'PROJECT_NAME', description: 'test' }],
    })

    const result = substituteVars(config, { PROJECT_NAME: 'replaced' })

    expect(result.config.metadata?.name).toBe('${PROJECT_NAME}')
    expect(result.config.metadata?.description).toBe('A project called ${PROJECT_NAME}')
  })
})

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe('Edge Cases', () => {
  it('empty env map with no variables referenced → clean pass', () => {
    const config = makeConfig({
      'mcp-servers': {
        pg: {
          transport: 'stdio',
          command: 'uvx',
          args: ['mcp-server-postgres'],
        },
      },
    })

    const result = substituteVars(config, {})

    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
    const server = result.config['mcp-servers']['pg'] as { args?: string[] }
    expect(server.args).toEqual(['mcp-server-postgres'])
  })

  it('config with no mcp-servers → clean pass', () => {
    const config = makeConfig()

    const result = substituteVars(config, {})

    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
    expect(Object.keys(result.config['mcp-servers'])).toHaveLength(0)
  })
})
