import { describe, it, expect } from 'vitest'
import {
  resolveInheritance,
  mergePlugins,
  mergeMcpServers,
  mergeEnv,
  mergeInstructions,
  mergeToolsAllow,
  mergeToolsDeny,
  mergeToolsAsk,
  mergePaths,
  mergeNetworkHosts,
  InheritanceError,
} from '../../lib/resolver.js'
import type { HarnessDocument, Plugin, McpServerStdio, McpServerRemote, EnvEntry } from '../../lib/types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDoc(overrides: Partial<HarnessDocument> = {}): HarnessDocument {
  return { version: '1', ...overrides }
}

function registry(entries: Record<string, HarnessDocument>): Map<string, HarnessDocument> {
  return new Map(Object.entries(entries))
}

// ---------------------------------------------------------------------------
// Rule 1: plugins
// ---------------------------------------------------------------------------

describe('mergePlugins', () => {
  it('union with no overlap: both plugins appear', () => {
    const base: Plugin[] = [{ name: 'a', source: 'org/a', version: '1.0.0' }]
    const overlay: Plugin[] = [{ name: 'b', source: 'org/b', version: '2.0.0' }]
    const result = mergePlugins(base, overlay)
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.name)).toContain('a')
    expect(result.map((p) => p.name)).toContain('b')
  })

  it('name conflict: overlay/child wins (version updated)', () => {
    const base: Plugin[] = [{ name: 'data-lineage', source: 'org/kit', version: '>=0.2.0' }]
    const overlay: Plugin[] = [{ name: 'data-lineage', source: 'org/kit', version: '>=0.3.0' }]
    const result = mergePlugins(base, overlay)
    expect(result).toHaveLength(1)
    expect(result[0].version).toBe('>=0.3.0')
  })

  it('empty parent plugins: overlay plugins returned', () => {
    const base: Plugin[] = []
    const overlay: Plugin[] = [{ name: 'my-plugin', source: 'org/p', version: '1.0.0' }]
    const result = mergePlugins(base, overlay)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('my-plugin')
  })

  it('order preserved: base plugins come before overlay in result', () => {
    const base: Plugin[] = [{ name: 'a', source: 'o/a' }]
    const overlay: Plugin[] = [{ name: 'b', source: 'o/b' }]
    const result = mergePlugins(base, overlay)
    // base first, then overlay
    expect(result[0].name).toBe('a')
    expect(result[1].name).toBe('b')
  })
})

// ---------------------------------------------------------------------------
// Rule 2: mcp-servers
// ---------------------------------------------------------------------------

describe('mergeMcpServers', () => {
  const pgBase: McpServerStdio = { transport: 'stdio', command: 'uvx', args: ['mcp-server-postgres'] }
  const pgOverlay: McpServerStdio = { transport: 'stdio', command: 'uvx', args: ['mcp-server-postgres', '--schema', 'public'] }
  const search: McpServerStdio = { transport: 'stdio', command: 'npx', args: ['-y', '@mcp/search'] }

  it('union with no overlap: all servers present', () => {
    const result = mergeMcpServers({ postgres: pgBase }, { search })
    expect(Object.keys(result)).toContain('postgres')
    expect(Object.keys(result)).toContain('search')
  })

  it('name conflict: overlay replaces entire object (not field-merge)', () => {
    const result = mergeMcpServers({ postgres: pgBase }, { postgres: pgOverlay })
    expect(Object.keys(result)).toHaveLength(1)
    // The entire object is replaced — overlay's args should be present
    const pg = result['postgres'] as McpServerStdio
    expect(pg.args).toEqual(['mcp-server-postgres', '--schema', 'public'])
  })

  it('empty base: overlay returned as-is', () => {
    const result = mergeMcpServers({}, { postgres: pgBase })
    expect(result['postgres']).toEqual(pgBase)
  })
})

// ---------------------------------------------------------------------------
// Rule 3: env
// ---------------------------------------------------------------------------

describe('mergeEnv', () => {
  it('union: both entries present when no overlap', () => {
    const base: EnvEntry[] = [{ name: 'DB_URL', description: 'db', required: true, sensitive: true }]
    const overlay: EnvEntry[] = [{ name: 'LOCAL_PATH', description: 'local', required: false }]
    const result = mergeEnv(base, overlay)
    expect(result).toHaveLength(2)
    expect(result.map((e) => e.name)).toContain('DB_URL')
    expect(result.map((e) => e.name)).toContain('LOCAL_PATH')
  })

  it('child overrides parent entry for same name', () => {
    const base: EnvEntry[] = [{ name: 'API_KEY', description: 'key', required: false, sensitive: false }]
    const overlay: EnvEntry[] = [{ name: 'API_KEY', description: 'key (required)', required: true, sensitive: true }]
    const result = mergeEnv(base, overlay)
    expect(result).toHaveLength(1)
    expect(result[0].required).toBe(true)
    expect(result[0].sensitive).toBe(true)
  })

  it('child can strengthen constraints (required: false → true)', () => {
    const base: EnvEntry[] = [{ name: 'VAR', description: 'd', required: false }]
    const overlay: EnvEntry[] = [{ name: 'VAR', description: 'd', required: true }]
    const result = mergeEnv(base, overlay)
    expect(result[0].required).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Rule 4: instructions / import-mode
// ---------------------------------------------------------------------------

describe('mergeInstructions', () => {
  const parentBase = { operational: 'parent ops', behavioral: 'parent behavior', identity: null }

  it('merge (default): child content appended after parent', () => {
    const result = mergeInstructions(parentBase, {
      operational: 'child ops',
      behavioral: null,
      identity: null,
      'import-mode': 'merge',
    })
    expect(result.operational).toBe('parent ops\nchild ops')
    // parent behavioral only — no child contribution
    expect(result.behavioral).toBe('parent behavior')
    expect(result.identity).toBeNull()
  })

  it('merge: only child content when parent has none', () => {
    const result = mergeInstructions(
      { operational: null, behavioral: null, identity: null },
      { operational: 'child ops', behavioral: null, identity: null, 'import-mode': 'merge' }
    )
    expect(result.operational).toBe('child ops')
  })

  it('merge: only parent content when child has none', () => {
    const result = mergeInstructions(parentBase, {
      operational: null,
      behavioral: null,
      identity: null,
      'import-mode': 'merge',
    })
    expect(result.operational).toBe('parent ops')
    expect(result.behavioral).toBe('parent behavior')
  })

  it('replace: child replaces parent for declared slots', () => {
    const result = mergeInstructions(parentBase, {
      operational: 'replacement ops',
      behavioral: null,
      identity: null,
      'import-mode': 'replace',
    })
    expect(result.operational).toBe('replacement ops')
    // behavioral was explicitly null in child — replaces parent's value with null (clears the slot)
    expect(result.behavioral).toBeNull()
  })

  it('skip: parent passes through unchanged', () => {
    const result = mergeInstructions(parentBase, {
      operational: 'ignored',
      behavioral: 'also ignored',
      identity: null,
      'import-mode': 'skip',
    })
    expect(result.operational).toBe('parent ops')
    expect(result.behavioral).toBe('parent behavior')
    expect(result.identity).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Rule 5: permissions.tools.allow (intersection)
// ---------------------------------------------------------------------------

describe('mergeToolsAllow', () => {
  it('both lists: only tools in both appear', () => {
    const result = mergeToolsAllow(['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash'], ['Read', 'Glob', 'Grep', 'Write'])
    expect(result).toEqual(expect.arrayContaining(['Read', 'Glob', 'Grep', 'Write']))
    expect(result).not.toContain('Bash')
    expect(result).not.toContain('Edit')
  })

  it('parent without allow list imposes no restriction', () => {
    const result = mergeToolsAllow(null, ['Read', 'Write'])
    expect(result).toEqual(['Read', 'Write'])
  })

  it('child without allow list imposes no restriction', () => {
    const result = mergeToolsAllow(['Read', 'Write'], null)
    expect(result).toEqual(['Read', 'Write'])
  })

  it('both null: returns null (no restriction)', () => {
    const result = mergeToolsAllow(null, null)
    expect(result).toBeNull()
  })

  it('child cannot grant a tool the parent did not allow', () => {
    // Parent allows Read, Write; child adds Bash — Bash should NOT appear
    const result = mergeToolsAllow(['Read', 'Write'], ['Read', 'Write', 'Bash'])
    expect(result).not.toContain('Bash')
    expect(result).toContain('Read')
    expect(result).toContain('Write')
  })
})

// ---------------------------------------------------------------------------
// Rule 6: permissions.tools.deny (union)
// ---------------------------------------------------------------------------

describe('mergeToolsDeny', () => {
  it('parent denial propagates', () => {
    const result = mergeToolsDeny(['mcp__postgres__drop_*'], [])
    expect(result).toContain('mcp__postgres__drop_*')
  })

  it('child cannot remove parent denial', () => {
    // Even if child tries to not include parent's denial, union ensures it stays
    const result = mergeToolsDeny(['dangerous-tool'], ['other-tool'])
    expect(result).toContain('dangerous-tool')
    expect(result).toContain('other-tool')
  })

  it('union deduplicated', () => {
    const result = mergeToolsDeny(['a', 'b'], ['b', 'c'])
    expect(result).toHaveLength(3)
    expect(result).toContain('a')
    expect(result).toContain('b')
    expect(result).toContain('c')
  })
})

// ---------------------------------------------------------------------------
// Rule 7: permissions.tools.ask (union)
// ---------------------------------------------------------------------------

describe('mergeToolsAsk', () => {
  it('parent ask propagates', () => {
    const result = mergeToolsAsk(['Bash'], [])
    expect(result).toContain('Bash')
  })

  it('union of both lists', () => {
    const result = mergeToolsAsk(['Bash'], ['Write'])
    expect(result).toContain('Bash')
    expect(result).toContain('Write')
  })

  it('deduplicated', () => {
    const result = mergeToolsAsk(['Bash', 'Edit'], ['Edit', 'Write'])
    expect(result).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// Rules 8 & 9: permissions.paths (union)
// ---------------------------------------------------------------------------

describe('mergePaths', () => {
  it('writable: additive', () => {
    const result = mergePaths(
      { writable: ['sql/', 'migrations/'], readonly: [] },
      { writable: ['dbt/'], readonly: [] }
    )
    expect(result.writable).toContain('sql/')
    expect(result.writable).toContain('migrations/')
    expect(result.writable).toContain('dbt/')
  })

  it('readonly: additive', () => {
    const result = mergePaths(
      { writable: [], readonly: ['config/'] },
      { writable: [], readonly: ['secrets/'] }
    )
    expect(result.readonly).toContain('config/')
    expect(result.readonly).toContain('secrets/')
  })

  it('both writable and readonly additive together', () => {
    const result = mergePaths(
      { writable: ['src/'], readonly: ['config/'] },
      { writable: ['tests/'], readonly: ['docs/'] }
    )
    expect(result.writable).toHaveLength(2)
    expect(result.readonly).toHaveLength(2)
  })

  it('deduplicates overlapping paths', () => {
    const result = mergePaths(
      { writable: ['src/'], readonly: [] },
      { writable: ['src/', 'tests/'], readonly: [] }
    )
    expect(result.writable).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Rule 10: permissions.network.allowed-hosts (union)
// ---------------------------------------------------------------------------

describe('mergeNetworkHosts', () => {
  it('hosts additive', () => {
    const result = mergeNetworkHosts(['api.example.com'], ['db.internal.com'])
    expect(result).toContain('api.example.com')
    expect(result).toContain('db.internal.com')
  })

  it('deduplicated', () => {
    const result = mergeNetworkHosts(['a.com', 'b.com'], ['b.com', 'c.com'])
    expect(result).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// Rule 11: metadata — child only, parent discarded
// ---------------------------------------------------------------------------

describe('metadata rule', () => {
  it('child metadata used; parent metadata discarded', () => {
    const parent = makeDoc({
      metadata: { name: 'parent-meta', description: 'parent desc' },
    })
    const child = makeDoc({
      extends: [{ source: 'parent' }],
      metadata: { name: 'child-meta', description: 'child desc' },
    })
    const result = resolveInheritance(child, registry({ parent }))
    expect(result.metadata?.name).toBe('child-meta')
  })

  it('no child metadata: metadata is undefined', () => {
    const parent = makeDoc({
      metadata: { name: 'parent-meta', description: 'parent desc' },
    })
    const child = makeDoc({ extends: [{ source: 'parent' }] })
    const result = resolveInheritance(child, registry({ parent }))
    expect(result.metadata).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Multi-level tests
// ---------------------------------------------------------------------------

describe('multi-level inheritance', () => {
  it('two parents: left-to-right, later wins on conflict, child wins over all', () => {
    const parentA = makeDoc({
      plugins: [{ name: 'plugin-a', source: 'org/a', version: '1.0.0' }],
      'mcp-servers': { shared: { transport: 'stdio', command: 'cmd-a', args: [] } },
    })
    const parentB = makeDoc({
      plugins: [{ name: 'plugin-b', source: 'org/b' }],
      'mcp-servers': {
        shared: { transport: 'stdio', command: 'cmd-b', args: [] }, // B wins over A
        extra: { transport: 'stdio', command: 'cmd-extra', args: [] },
      },
    })
    const child = makeDoc({
      extends: [{ source: 'parentA' }, { source: 'parentB' }],
      plugins: [{ name: 'plugin-a', source: 'org/a', version: '2.0.0' }], // child wins over A's version
    })
    const result = resolveInheritance(child, registry({ parentA, parentB }))

    // plugin-a: child wins (version 2.0.0)
    const pluginA = result.plugins.find((p) => p.name === 'plugin-a')
    expect(pluginA?.version).toBe('2.0.0')

    // plugin-b: from parentB
    expect(result.plugins.some((p) => p.name === 'plugin-b')).toBe(true)

    // shared server: parentB wins over parentA
    const shared = result['mcp-servers']['shared'] as McpServerStdio
    expect(shared.command).toBe('cmd-b')

    // extra server: from parentB
    expect(result['mcp-servers']['extra']).toBeDefined()
  })

  it('three-level chain: grandparent → parent → child with tools.allow intersection', () => {
    const grandparent = makeDoc({
      permissions: {
        tools: { allow: ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash'] },
      },
    })
    const parent = makeDoc({
      extends: [{ source: 'grandparent' }],
      permissions: {
        tools: { allow: ['Read', 'Glob', 'Grep', 'Write'] }, // removes Bash, Edit
      },
    })
    const child = makeDoc({
      extends: [{ source: 'parent' }],
      // child doesn't specify allow → null → no additional restriction
    })
    const result = resolveInheritance(child, registry({ grandparent, parent }))

    // Intersection: grandparent∩parent = Read,Glob,Grep,Write; child has null → no further restriction
    expect(result.permissions.tools.allow).toEqual(
      expect.arrayContaining(['Read', 'Glob', 'Grep', 'Write'])
    )
    expect(result.permissions.tools.allow).not.toContain('Bash')
    expect(result.permissions.tools.allow).not.toContain('Edit')
  })

  it('fragment chain: fragment extending fragment, composed into profile', () => {
    const fragmentA = makeDoc({
      kind: 'fragment',
      env: [{ name: 'VAR_A', description: 'from fragment A' }],
      permissions: { tools: { deny: ['dangerous-tool'] } },
    })
    const fragmentB = makeDoc({
      kind: 'fragment',
      extends: [{ source: 'fragmentA' }],
      env: [{ name: 'VAR_B', description: 'from fragment B' }],
    })
    const profile = makeDoc({
      kind: 'profile',
      extends: [{ source: 'fragmentB' }],
      env: [{ name: 'VAR_C', description: 'from profile' }],
    })
    const result = resolveInheritance(
      profile,
      registry({ fragmentA, fragmentB })
    )

    expect(result.env.map((e) => e.name)).toContain('VAR_A')
    expect(result.env.map((e) => e.name)).toContain('VAR_B')
    expect(result.env.map((e) => e.name)).toContain('VAR_C')
    expect(result.permissions.tools.deny).toContain('dangerous-tool')
  })
})

// ---------------------------------------------------------------------------
// Circular detection
// ---------------------------------------------------------------------------

describe('circular dependency detection', () => {
  it('A → A (self-reference) fails', () => {
    const a = makeDoc({ extends: [{ source: 'a' }] })
    expect(() => resolveInheritance(a, registry({ a }))).toThrowError(InheritanceError)
    expect(() => resolveInheritance(a, registry({ a }))).toThrowError(/circular/)
  })

  it('A → B → A fails', () => {
    const a = makeDoc({ extends: [{ source: 'b' }] })
    const b = makeDoc({ extends: [{ source: 'a' }] })
    expect(() => resolveInheritance(a, registry({ a, b }))).toThrowError(InheritanceError)
    expect(() => resolveInheritance(a, registry({ a, b }))).toThrowError(/circular/)
  })
})

// ---------------------------------------------------------------------------
// Depth limit
// ---------------------------------------------------------------------------

describe('depth limit', () => {
  function buildChain(depth: number): Map<string, HarnessDocument> {
    const reg: Record<string, HarnessDocument> = {}
    // Build chain: doc0 ← doc1 ← doc2 ← ... ← doc(depth-1)
    // doc0 has no extends
    reg['doc0'] = makeDoc({ env: [{ name: 'ROOT', description: 'root' }] })
    for (let i = 1; i < depth; i++) {
      reg[`doc${i}`] = makeDoc({ extends: [{ source: `doc${i - 1}` }] })
    }
    return registry(reg)
  }

  it('depth 5 (maxDepth=5, chain of 5) passes', () => {
    // Chain: doc4 → doc3 → doc2 → doc1 → doc0 (depth = 4 levels deep, within limit)
    const reg = buildChain(5)
    const leaf = reg.get('doc4')!
    expect(() => resolveInheritance(leaf, reg, { maxDepth: 5 })).not.toThrow()
  })

  it('depth 6 (maxDepth=5, chain of 6) fails', () => {
    // Chain: doc5 → doc4 → doc3 → doc2 → doc1 → doc0 (depth = 5 levels, exceeds limit)
    const reg = buildChain(6)
    const leaf = reg.get('doc5')!
    expect(() => resolveInheritance(leaf, reg, { maxDepth: 5 })).toThrowError(InheritanceError)
    expect(() => resolveInheritance(leaf, reg, { maxDepth: 5 })).toThrowError(/inheritance depth limit exceeded/)
  })
})

// ---------------------------------------------------------------------------
// Missing registry entry
// ---------------------------------------------------------------------------

describe('missing registry entry', () => {
  it('throws InheritanceError when parent not found', () => {
    const child = makeDoc({ extends: [{ source: 'nonexistent' }] })
    expect(() => resolveInheritance(child, registry({}))).toThrowError(InheritanceError)
    expect(() => resolveInheritance(child, registry({}))).toThrowError(/not found/)
  })
})

// ---------------------------------------------------------------------------
// End-to-end: three-level example from protocol/inheritance.md
// ---------------------------------------------------------------------------

describe('end-to-end: org-base → data-team → alice-data-engineer', () => {
  const orgBase: HarnessDocument = {
    version: '1',
    kind: 'profile',
    metadata: { name: 'org-base', description: 'Baseline harness for all my-org engineering projects' },
    plugins: [
      {
        name: 'code-review',
        source: 'my-org/harness-plugins',
        version: '^1.0.0',
      },
    ],
    permissions: {
      tools: {
        allow: ['Read', 'Glob', 'Grep', 'Write', 'Edit'],
        deny: ['mcp__*__drop_*', 'mcp__*__delete_*'],
        ask: ['Bash'],
      },
    },
    instructions: {
      operational:
        '## my-org Engineering Standards\n- All database migrations must be backward-compatible.\n- Never hardcode environment-specific values.\n- Follow the my-org contribution guide at https://wiki.my-org.com/contributing',
      'import-mode': 'merge',
    },
  }

  const dataTeam: HarnessDocument = {
    version: '1',
    kind: 'fragment',
    metadata: { name: 'data-team', description: 'Data team additions: postgres MCP, lineage plugin' },
    extends: [{ source: 'my-org/base', version: '^1.0.0' }],
    plugins: [
      {
        name: 'data-lineage',
        source: 'harnessprotocol/harness-kit',
        version: '>=0.2.0',
      },
    ],
    'mcp-servers': {
      postgres: {
        transport: 'stdio',
        command: 'uvx',
        args: ['mcp-server-postgres', '--connection-string', '${DB_CONNECTION_STRING}'],
      },
    },
    env: [
      {
        name: 'DB_CONNECTION_STRING',
        description: 'PostgreSQL connection string for the data team replica',
        required: true,
        sensitive: true,
      },
    ],
    permissions: {
      paths: {
        writable: ['sql/', 'migrations/', 'dbt/'],
        readonly: ['config/'],
      },
    },
  }

  const aliceDataEngineer: HarnessDocument = {
    version: '1',
    kind: 'profile',
    metadata: {
      name: 'alice-data-engineer',
      description: 'Personal data engineering harness',
      author: { name: 'alice', url: 'https://github.com/alice' },
    },
    extends: [{ source: 'my-org/data-team', version: '^1.2.0' }],
    instructions: {
      operational: 'file://./instructions/local-ops.md',
      'import-mode': 'merge',
    },
    'mcp-servers': {
      'local-search': {
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '${LOCAL_NOTES_PATH}'],
      },
    },
    env: [
      {
        name: 'LOCAL_NOTES_PATH',
        description: 'Path to local notes directory',
        required: false,
        sensitive: false,
        default: '~/notes',
      },
    ],
  }

  const reg = new Map<string, HarnessDocument>([
    ['my-org/base', orgBase],
    ['my-org/data-team', dataTeam],
  ])

  it('plugins: code-review (org) + data-lineage (team)', () => {
    const result = resolveInheritance(aliceDataEngineer, reg)
    expect(result.plugins.some((p) => p.name === 'code-review')).toBe(true)
    expect(result.plugins.some((p) => p.name === 'data-lineage')).toBe(true)
  })

  it('mcp-servers: postgres (team) + local-search (personal)', () => {
    const result = resolveInheritance(aliceDataEngineer, reg)
    expect(result['mcp-servers']['postgres']).toBeDefined()
    expect(result['mcp-servers']['local-search']).toBeDefined()
  })

  it('env: DB_CONNECTION_STRING (team) + LOCAL_NOTES_PATH (personal)', () => {
    const result = resolveInheritance(aliceDataEngineer, reg)
    expect(result.env.some((e) => e.name === 'DB_CONNECTION_STRING')).toBe(true)
    expect(result.env.some((e) => e.name === 'LOCAL_NOTES_PATH')).toBe(true)
  })

  it('permissions.tools.allow: org set passes through (personal adds no allow list)', () => {
    const result = resolveInheritance(aliceDataEngineer, reg)
    const allow = result.permissions.tools.allow
    // org allows Read, Glob, Grep, Write, Edit
    // data-team adds no allow list (null → no additional restriction)
    // personal adds no allow list → effective = org's set
    expect(allow).toEqual(expect.arrayContaining(['Read', 'Glob', 'Grep', 'Write', 'Edit']))
    expect(allow).not.toContain('Bash')
    expect(allow).toHaveLength(5)
  })

  it('permissions.tools.deny: mcp__*__drop_* and mcp__*__delete_* propagate from org', () => {
    const result = resolveInheritance(aliceDataEngineer, reg)
    expect(result.permissions.tools.deny).toContain('mcp__*__drop_*')
    expect(result.permissions.tools.deny).toContain('mcp__*__delete_*')
  })

  it('permissions.tools.ask: Bash propagates from org', () => {
    const result = resolveInheritance(aliceDataEngineer, reg)
    expect(result.permissions.tools.ask).toContain('Bash')
  })

  it('permissions.paths.writable: sql/, migrations/, dbt/ (from team)', () => {
    const result = resolveInheritance(aliceDataEngineer, reg)
    expect(result.permissions.paths.writable).toContain('sql/')
    expect(result.permissions.paths.writable).toContain('migrations/')
    expect(result.permissions.paths.writable).toContain('dbt/')
  })

  it('permissions.paths.readonly: config/ from team', () => {
    const result = resolveInheritance(aliceDataEngineer, reg)
    expect(result.permissions.paths.readonly).toContain('config/')
  })

  it('instructions.operational: org + team (none) + alice (merged)', () => {
    const result = resolveInheritance(aliceDataEngineer, reg)
    const ops = result.instructions.operational
    // Org's standard appended with alice's local-ops reference
    expect(ops).toContain('my-org Engineering Standards')
    expect(ops).toContain('local-ops.md')
  })

  it('metadata: alice only, org/team metadata discarded', () => {
    const result = resolveInheritance(aliceDataEngineer, reg)
    expect(result.metadata?.name).toBe('alice-data-engineer')
  })
})

// ---------------------------------------------------------------------------
// No-extends document produces its own effective configuration
// ---------------------------------------------------------------------------

describe('document with no extends', () => {
  it('returns own config as effective configuration', () => {
    const doc = makeDoc({
      plugins: [{ name: 'my-plugin', source: 'org/p' }],
      permissions: {
        tools: { allow: ['Read'], deny: ['Bash'], ask: ['Write'] },
      },
    })
    const result = resolveInheritance(doc, registry({}))
    expect(result.plugins).toHaveLength(1)
    expect(result.permissions.tools.allow).toEqual(['Read'])
    expect(result.permissions.tools.deny).toEqual(['Bash'])
    expect(result.permissions.tools.ask).toEqual(['Write'])
  })
})
