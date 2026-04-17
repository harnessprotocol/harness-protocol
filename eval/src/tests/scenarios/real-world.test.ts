import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { parseYaml } from '../../lib/yaml.js'
import { validateHarness } from '../../lib/schema.js'
import { validateSemantics } from '../../lib/semantic.js'
import { resolveInheritance } from '../../lib/resolver.js'
import { compileToClaudeCode } from '../../lib/compiler.js'
import type { HarnessDocument } from '../../lib/types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const examplesDir = join(__dirname, '../../../../examples')

// ---------------------------------------------------------------------------
// Scenario 1: Data engineering workflow (end-to-end from YAML file)
// ---------------------------------------------------------------------------

describe('Scenario 1: Data engineering workflow', () => {
  const yamlContent = readFileSync(join(examplesDir, 'data-engineer.harness.yaml'), 'utf-8')
  const parsed = parseYaml(yamlContent) as HarnessDocument

  it('parses the YAML without error', () => {
    expect(parsed).toBeDefined()
    expect(parsed.version).toBe('1')
    expect(parsed.metadata?.name).toBe('data-engineer')
  })

  it('passes schema validation', () => {
    const result = validateHarness(parsed)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('passes semantic validation', () => {
    const result = validateSemantics(parsed)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('resolves inheritance with a mock base profile', () => {
    const baseProfile: HarnessDocument = {
      version: '1',
      kind: 'profile',
      metadata: { name: 'base', description: 'Base profile' },
      permissions: {
        tools: { allow: ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash'] },
      },
    }

    const registry = new Map<string, HarnessDocument>([
      ['harnessprotocol/profiles/base', baseProfile],
    ])

    const effective = resolveInheritance(parsed, registry)

    // Child metadata wins
    expect(effective.metadata?.name).toBe('data-engineer')

    // tools.allow is intersection of base [Read,Glob,Grep,Write,Edit,Bash]
    // and child [Read,Glob,Bash,mcp__postgres__*]
    // => [Read, Glob, Bash]
    expect(effective.permissions.tools.allow).toEqual(
      expect.arrayContaining(['Read', 'Glob', 'Bash'])
    )
    expect(effective.permissions.tools.allow).toHaveLength(3)

    // tools.deny propagates from child
    expect(effective.permissions.tools.deny).toContain('mcp__*__drop_*')
    expect(effective.permissions.tools.deny).toContain('mcp__*__delete_*')

    // tools.ask propagates from child
    expect(effective.permissions.tools.ask).toContain('mcp__postgres__execute_migration')

    // plugins from child
    expect(effective.plugins.map((p) => p.name)).toEqual(
      expect.arrayContaining(['data-lineage', 'explain', 'research'])
    )

    // mcp-servers from child
    expect(effective['mcp-servers']).toHaveProperty('postgres')
    expect(effective['mcp-servers']).toHaveProperty('analytics-api')

    // instructions merged (base has none, so child's content passes through)
    expect(effective.instructions.operational).toContain('data engineering')
    expect(effective.instructions.behavioral).toContain('EXPLAIN ANALYZE')
  })

  it('compiles to Claude Code and produces expected output files', () => {
    const baseProfile: HarnessDocument = {
      version: '1',
      kind: 'profile',
      metadata: { name: 'base', description: 'Base profile' },
      permissions: {
        tools: { allow: ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash'] },
      },
    }

    const registry = new Map<string, HarnessDocument>([
      ['harnessprotocol/profiles/base', baseProfile],
    ])

    const effective = resolveInheritance(parsed, registry)
    const compiled = compileToClaudeCode(effective)

    // .mcp.json has postgres server
    const mcpJson = compiled.files.get('.mcp.json')
    expect(mcpJson).toBeDefined()
    const mcpParsed = JSON.parse(mcpJson!)
    expect(mcpParsed.mcpServers.postgres).toBeDefined()
    expect(mcpParsed.mcpServers.postgres.type).toBe('stdio')
    expect(mcpParsed.mcpServers.postgres.command).toBe('uvx')

    // .mcp.json has analytics-api server
    expect(mcpParsed.mcpServers['analytics-api']).toBeDefined()
    expect(mcpParsed.mcpServers['analytics-api'].type).toBe('http')

    // CLAUDE.md has operational instructions about data engineering / PostgreSQL
    const claudeMd = compiled.files.get('CLAUDE.md')
    expect(claudeMd).toBeDefined()
    expect(claudeMd).toContain('data engineering')
    expect(claudeMd).toContain('PostgreSQL')

    // AGENT.md has behavioral instructions
    const agentMd = compiled.files.get('AGENT.md')
    expect(agentMd).toBeDefined()
    expect(agentMd).toContain('EXPLAIN ANALYZE')

    // .claude/settings.json has permissions
    const settings = compiled.files.get('.claude/settings.json')
    expect(settings).toBeDefined()
    const settingsParsed = JSON.parse(settings!)
    expect(settingsParsed.permissions.deny).toContain('mcp__*__drop_*')
    expect(settingsParsed.permissions.additionalDirectories).toContain('models/')
  })
})

// ---------------------------------------------------------------------------
// Scenario 2: Team hierarchy (3-level inheritance)
// ---------------------------------------------------------------------------

describe('Scenario 2: Team hierarchy', () => {
  const orgBase: HarnessDocument = {
    version: '1',
    kind: 'profile',
    metadata: { name: 'org-base', description: 'Org base' },
    permissions: {
      tools: {
        allow: ['Read', 'Glob', 'Grep', 'Write', 'Edit'],
        deny: ['mcp__*__drop_*'],
        ask: ['Bash'],
      },
      paths: { writable: ['src/'] },
    },
  }

  const teamFragment: HarnessDocument = {
    version: '1',
    kind: 'fragment',
    metadata: { name: 'team-data', description: 'Data team fragment' },
    extends: [{ source: 'org/base' }],
    permissions: {
      tools: {
        allow: ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash', 'mcp__postgres__*'],
        deny: ['mcp__*__delete_*'],
      },
      paths: { writable: ['sql/', 'models/'], readonly: ['config/'] },
    },
  }

  const individual: HarnessDocument = {
    version: '1',
    kind: 'profile',
    metadata: { name: 'alice', description: 'Alice profile' },
    extends: [{ source: 'org/team-data' }],
    permissions: {
      paths: { writable: ['notebooks/'] },
    },
  }

  const reg = new Map<string, HarnessDocument>([
    ['org/base', orgBase],
    ['org/team-data', teamFragment],
  ])

  it('resolves 3-level hierarchy correctly', () => {
    const effective = resolveInheritance(individual, reg)

    // tools.allow: intersection across all levels
    // org-base: [Read, Glob, Grep, Write, Edit]
    // team-data: [Read, Glob, Grep, Write, Edit, Bash, mcp__postgres__*]
    // intersection of org-base and team-data: [Read, Glob, Grep, Write, Edit]
    // individual: no tools.allow (null) => no further restriction
    // final: [Read, Glob, Grep, Write, Edit]
    expect(effective.permissions.tools.allow).toEqual(
      expect.arrayContaining(['Read', 'Glob', 'Grep', 'Write', 'Edit'])
    )
    expect(effective.permissions.tools.allow).toHaveLength(5)
    expect(effective.permissions.tools.allow).not.toContain('Bash')
    expect(effective.permissions.tools.allow).not.toContain('mcp__postgres__*')
  })

  it('propagates tools.deny as union across levels', () => {
    const effective = resolveInheritance(individual, reg)

    // deny: union of org-base [mcp__*__drop_*] and team-data [mcp__*__delete_*]
    expect(effective.permissions.tools.deny).toContain('mcp__*__drop_*')
    expect(effective.permissions.tools.deny).toContain('mcp__*__delete_*')
  })

  it('propagates tools.ask from org level', () => {
    const effective = resolveInheritance(individual, reg)

    // ask: union — org-base has [Bash], others have none
    expect(effective.permissions.tools.ask).toContain('Bash')
  })

  it('accumulates paths.writable across all levels', () => {
    const effective = resolveInheritance(individual, reg)

    // writable: union of all levels: src/ + sql/ + models/ + notebooks/
    expect(effective.permissions.paths.writable).toContain('src/')
    expect(effective.permissions.paths.writable).toContain('sql/')
    expect(effective.permissions.paths.writable).toContain('models/')
    expect(effective.permissions.paths.writable).toContain('notebooks/')
  })

  it('accumulates paths.readonly across levels', () => {
    const effective = resolveInheritance(individual, reg)

    // readonly: only team-data declares config/
    expect(effective.permissions.paths.readonly).toContain('config/')
  })

  it('preserves child metadata (alice)', () => {
    const effective = resolveInheritance(individual, reg)
    expect(effective.metadata?.name).toBe('alice')
    expect(effective.metadata?.description).toBe('Alice profile')
  })
})

// ---------------------------------------------------------------------------
// Scenario 3: Fragment composition (profile extending 3 fragments)
// ---------------------------------------------------------------------------

describe('Scenario 3: Fragment composition', () => {
  const pluginFragment: HarnessDocument = {
    version: '1',
    kind: 'fragment',
    plugins: [{ name: 'research', source: 'org/kit' }],
  }

  const mcpFragment: HarnessDocument = {
    version: '1',
    kind: 'fragment',
    'mcp-servers': {
      postgres: { transport: 'stdio', command: 'uvx', args: ['mcp-server-postgres'] },
    },
  }

  const instructionsFragment: HarnessDocument = {
    version: '1',
    kind: 'fragment',
    instructions: { operational: 'Follow TDD.', 'import-mode': 'merge' },
  }

  const profile: HarnessDocument = {
    version: '1',
    kind: 'profile',
    metadata: { name: 'composed', description: 'Composed profile' },
    extends: [
      { source: 'frags/plugins' },
      { source: 'frags/mcp' },
      { source: 'frags/instructions' },
    ],
    instructions: { operational: 'Also run linter.', 'import-mode': 'merge' },
  }

  const reg = new Map<string, HarnessDocument>([
    ['frags/plugins', pluginFragment],
    ['frags/mcp', mcpFragment],
    ['frags/instructions', instructionsFragment],
  ])

  it('plugins from fragment appear in effective config', () => {
    const effective = resolveInheritance(profile, reg)
    expect(effective.plugins.map((p) => p.name)).toContain('research')
  })

  it('mcp-servers from fragment appear in effective config', () => {
    const effective = resolveInheritance(profile, reg)
    expect(effective['mcp-servers']).toHaveProperty('postgres')
    expect(effective['mcp-servers'].postgres.transport).toBe('stdio')
  })

  it('instructions merge from fragment and profile', () => {
    const effective = resolveInheritance(profile, reg)
    expect(effective.instructions.operational).toContain('Follow TDD.')
    expect(effective.instructions.operational).toContain('Also run linter.')
  })

  it('compiles composed config to Claude Code with all contributions', () => {
    const effective = resolveInheritance(profile, reg)
    const compiled = compileToClaudeCode(effective)

    // CLAUDE.md has both instruction strings
    const claudeMd = compiled.files.get('CLAUDE.md')
    expect(claudeMd).toBeDefined()
    expect(claudeMd).toContain('Follow TDD.')
    expect(claudeMd).toContain('Also run linter.')

    // .mcp.json has postgres
    const mcpJson = compiled.files.get('.mcp.json')
    expect(mcpJson).toBeDefined()
    const mcpParsed = JSON.parse(mcpJson!)
    expect(mcpParsed.mcpServers.postgres).toBeDefined()
    expect(mcpParsed.mcpServers.postgres.type).toBe('stdio')
  })
})

// ---------------------------------------------------------------------------
// Scenario 4: Minimal viable profile
// ---------------------------------------------------------------------------

describe('Scenario 4: Minimal viable profile', () => {
  const yamlContent = readFileSync(join(examplesDir, 'minimal.harness.yaml'), 'utf-8')
  const parsed = parseYaml(yamlContent) as HarnessDocument

  it('parses the YAML without error', () => {
    expect(parsed).toBeDefined()
    expect(parsed.version).toBe('1')
    expect(parsed.metadata?.name).toBe('minimal')
  })

  it('passes schema validation', () => {
    const result = validateHarness(parsed)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('compiles to Claude Code with minimal output', () => {
    // Resolve with no parents (no extends)
    const effective = resolveInheritance(parsed, new Map())
    const compiled = compileToClaudeCode(effective)

    // No CLAUDE.md since no instructions
    expect(compiled.files.has('CLAUDE.md')).toBe(false)

    // No .mcp.json since no servers
    expect(compiled.files.has('.mcp.json')).toBe(false)

    // No AGENT.md since no behavioral instructions
    expect(compiled.files.has('AGENT.md')).toBe(false)

    // No SOUL.md since no identity instructions
    expect(compiled.files.has('SOUL.md')).toBe(false)

    // Only .claude/settings.json should exist (always generated for permissions)
    expect(compiled.files.has('.claude/settings.json')).toBe(true)
    expect(compiled.files.size).toBe(1)

    // Settings should have empty/default permissions
    const settings = JSON.parse(compiled.files.get('.claude/settings.json')!)
    expect(settings.permissions.deny).toEqual([])
    expect(settings.permissions.additionalDirectories).toEqual([])
  })

  it('no warnings for minimal profile', () => {
    const effective = resolveInheritance(parsed, new Map())
    const compiled = compileToClaudeCode(effective)
    expect(compiled.warnings).toHaveLength(0)
  })
})
