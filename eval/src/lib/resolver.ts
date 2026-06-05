import type {
  HarnessDocument,
  EffectiveConfiguration,
  Plugin,
  Skill,
  McpServerStdio,
  McpServerRemote,
  EnvEntry,
  Instructions,
} from './types.js'

const DEFAULT_MAX_DEPTH = 5

export class InheritanceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InheritanceError'
  }
}

// ---------------------------------------------------------------------------
// Individual merge functions (each independently testable)
// ---------------------------------------------------------------------------

/**
 * Rule 1: plugins — union by `name`; child/later wins on conflict.
 */
export function mergePlugins(base: Plugin[], overlay: Plugin[]): Plugin[] {
  const map = new Map<string, Plugin>()
  for (const p of base) map.set(p.name, p)
  for (const p of overlay) map.set(p.name, p) // overlay wins
  return Array.from(map.values())
}

/**
 * Rule 1b: skills — union by `name`; child/later wins on conflict.
 * A child entry with `enabled: false` replaces (and thereby suppresses) the
 * inherited entry of the same name.
 */
export function mergeSkills(base: Skill[], overlay: Skill[]): Skill[] {
  const map = new Map<string, Skill>()
  for (const s of base) map.set(s.name, s)
  for (const s of overlay) map.set(s.name, s) // overlay wins
  return Array.from(map.values())
}

/**
 * Rule 2: mcp-servers — union by name; child/later wins (full object replacement).
 */
export function mergeMcpServers(
  base: Record<string, McpServerStdio | McpServerRemote>,
  overlay: Record<string, McpServerStdio | McpServerRemote>
): Record<string, McpServerStdio | McpServerRemote> {
  return { ...base, ...overlay } // overlay keys win, no field-level merge
}

/**
 * Rule 3: env — union by `name`; child/later wins on conflict.
 */
export function mergeEnv(base: EnvEntry[], overlay: EnvEntry[]): EnvEntry[] {
  const map = new Map<string, EnvEntry>()
  for (const e of base) map.set(e.name, e)
  for (const e of overlay) map.set(e.name, e) // overlay wins
  return Array.from(map.values())
}

/**
 * Rule 4: instructions — governed by child's import-mode.
 *
 * `merge`   (default): child content appended after parent's
 * `replace`           : child content replaces parent's (for declared slots)
 * `skip`              : parent passes through unchanged; child contributes nothing
 */
export function mergeInstructions(
  base: { operational: string | null; behavioral: string | null; identity: string | null },
  child: Required<Instructions>
): { operational: string | null; behavioral: string | null; identity: string | null } {
  const mode = child['import-mode'] ?? 'merge'

  if (mode === 'skip') {
    // Parent passes through unchanged; child contributes nothing.
    return { ...base }
  }

  if (mode === 'replace') {
    // Child's content replaces parent's for declared slots.
    return {
      operational: child.operational !== undefined ? (child.operational ?? null) : base.operational,
      behavioral: child.behavioral !== undefined ? (child.behavioral ?? null) : base.behavioral,
      identity: child.identity !== undefined ? (child.identity ?? null) : base.identity,
    }
  }

  // merge (default): child content appended after parent's
  const mergeSlot = (parentVal: string | null, childVal: string | null | undefined): string | null => {
    const hasParent = parentVal !== null && parentVal !== undefined
    const hasChild = childVal !== null && childVal !== undefined
    if (hasParent && hasChild) return `${parentVal}\n${childVal}`
    if (hasChild) return childVal as string
    if (hasParent) return parentVal
    return null
  }

  return {
    operational: mergeSlot(base.operational, child.operational),
    behavioral: mergeSlot(base.behavioral, child.behavioral),
    identity: mergeSlot(base.identity, child.identity),
  }
}

/**
 * Rule 5: permissions.tools.allow — intersection.
 * null means "no restriction declared at this level" and imposes no constraint.
 */
export function mergeToolsAllow(base: string[] | null, overlay: string[] | null): string[] | null {
  if (base === null && overlay === null) return null
  if (base === null) return overlay
  if (overlay === null) return base
  // Both have lists: return intersection
  return base.filter((tool) => overlay.includes(tool))
}

/**
 * Rule 6: permissions.tools.deny — union.
 */
export function mergeToolsDeny(base: string[], overlay: string[]): string[] {
  return Array.from(new Set([...base, ...overlay]))
}

/**
 * Rule 7: permissions.tools.ask — union.
 */
export function mergeToolsAsk(base: string[], overlay: string[]): string[] {
  return Array.from(new Set([...base, ...overlay]))
}

/**
 * Rules 8 & 9: permissions.paths — union (additive).
 */
export function mergePaths(
  base: { writable: string[]; readonly: string[] },
  overlay: { writable: string[]; readonly: string[] }
): { writable: string[]; readonly: string[] } {
  return {
    writable: Array.from(new Set([...base.writable, ...overlay.writable])),
    readonly: Array.from(new Set([...base.readonly, ...overlay.readonly])),
  }
}

/**
 * Rule 10: permissions.network.allowed-hosts — union (additive).
 */
export function mergeNetworkHosts(base: string[], overlay: string[]): string[] {
  return Array.from(new Set([...base, ...overlay]))
}

// ---------------------------------------------------------------------------
// Conversion helper: HarnessDocument → EffectiveConfiguration (no parents)
// ---------------------------------------------------------------------------

function documentToEffective(doc: HarnessDocument): EffectiveConfiguration {
  const instr = doc.instructions ?? {}
  const perms = doc.permissions ?? {}
  const tools = perms.tools ?? {}
  const paths = perms.paths ?? {}
  const network = perms.network ?? {}

  return {
    metadata: doc.metadata,
    plugins: doc.plugins ?? [],
    skills: doc.skills ?? [],
    'mcp-servers': doc['mcp-servers'] ?? {},
    env: doc.env ?? [],
    instructions: {
      operational: instr.operational ?? null,
      behavioral: instr.behavioral ?? null,
      identity: instr.identity ?? null,
      'import-mode': instr['import-mode'] ?? 'merge',
    },
    permissions: {
      tools: {
        allow: tools.allow !== undefined ? tools.allow : null,
        deny: tools.deny ?? [],
        ask: tools.ask ?? [],
      },
      paths: {
        writable: paths.writable ?? [],
        readonly: paths.readonly ?? [],
      },
      network: {
        'allowed-hosts': network['allowed-hosts'] ?? [],
      },
    },
  }
}

// ---------------------------------------------------------------------------
// Core merge: apply child EffectiveConfiguration on top of accumulated base
// ---------------------------------------------------------------------------

/**
 * Merge `overlay` (an EffectiveConfiguration) on top of `base`.
 * The `overlay`'s import-mode governs how instructions are combined.
 */
function mergeEffective(
  base: EffectiveConfiguration,
  overlay: EffectiveConfiguration
): EffectiveConfiguration {
  // Build the Required<Instructions> for the overlay so mergeInstructions
  // can inspect import-mode.
  const overlayInstructions: Required<Instructions> = {
    operational: overlay.instructions.operational,
    behavioral: overlay.instructions.behavioral,
    identity: overlay.instructions.identity,
    'import-mode': overlay.instructions['import-mode'],
  }

  const mergedInstructions = mergeInstructions(
    {
      operational: base.instructions.operational,
      behavioral: base.instructions.behavioral,
      identity: base.instructions.identity,
    },
    overlayInstructions
  )

  return {
    // Rules 11 & 12: metadata and kind from child/overlay; parent discarded.
    // When merging two effective configs (parent-on-parent), the overlay's
    // metadata wins. The final child's metadata is applied last.
    metadata: overlay.metadata,
    plugins: mergePlugins(base.plugins, overlay.plugins),
    skills: mergeSkills(base.skills, overlay.skills),
    'mcp-servers': mergeMcpServers(base['mcp-servers'], overlay['mcp-servers']),
    env: mergeEnv(base.env, overlay.env),
    instructions: {
      ...mergedInstructions,
      'import-mode': overlay.instructions['import-mode'],
    },
    permissions: {
      tools: {
        allow: mergeToolsAllow(base.permissions.tools.allow, overlay.permissions.tools.allow),
        deny: mergeToolsDeny(base.permissions.tools.deny, overlay.permissions.tools.deny),
        ask: mergeToolsAsk(base.permissions.tools.ask, overlay.permissions.tools.ask),
      },
      paths: mergePaths(base.permissions.paths, overlay.permissions.paths),
      network: {
        'allowed-hosts': mergeNetworkHosts(
          base.permissions.network['allowed-hosts'],
          overlay.permissions.network['allowed-hosts']
        ),
      },
    },
  }
}

// ---------------------------------------------------------------------------
// Empty effective configuration (used as the left-identity for folding)
// ---------------------------------------------------------------------------

function emptyEffective(): EffectiveConfiguration {
  return {
    metadata: undefined,
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
      tools: {
        allow: null,
        deny: [],
        ask: [],
      },
      paths: {
        writable: [],
        readonly: [],
      },
      network: {
        'allowed-hosts': [],
      },
    },
  }
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

/**
 * Full recursive resolver. Returns the effective configuration after
 * applying all inheritance rules.
 *
 * @param child    - The child document to resolve
 * @param registry - Map from source string to HarnessDocument
 * @param options  - Optional configuration (maxDepth defaults to 5)
 */
export function resolveInheritance(
  child: HarnessDocument,
  registry: Map<string, HarnessDocument>,
  options?: { maxDepth?: number }
): EffectiveConfiguration {
  const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH
  return resolveInheritanceInternal(child, registry, maxDepth, new Set<string>(), 0)
}

function resolveInheritanceInternal(
  child: HarnessDocument,
  registry: Map<string, HarnessDocument>,
  maxDepth: number,
  visited: Set<string>,
  depth: number
): EffectiveConfiguration {
  if (depth >= maxDepth) {
    throw new InheritanceError(`inheritance depth limit exceeded (${maxDepth})`)
  }

  // If no extends, this document is its own effective config.
  const extendsEntries = child.extends ?? []
  if (extendsEntries.length === 0) {
    return documentToEffective(child)
  }

  // Resolve each parent and collect their effective configurations.
  const parentEffectives: EffectiveConfiguration[] = []

  for (const entry of extendsEntries) {
    const source = entry.source

    // Circular dependency check
    if (visited.has(source)) {
      const cycle = [...Array.from(visited), source].join(' → ')
      throw new InheritanceError(`circular extends chain detected. Cycle: ${cycle}`)
    }

    const parentDoc = registry.get(source)
    if (!parentDoc) {
      throw new InheritanceError(`parent harness not found in registry: "${source}"`)
    }

    // Resolve parent recursively
    const newVisited = new Set(visited)
    newVisited.add(source)
    const parentEffective = resolveInheritanceInternal(
      parentDoc,
      registry,
      maxDepth,
      newVisited,
      depth + 1
    )
    parentEffectives.push(parentEffective)
  }

  // Merge all parent effective configurations left-to-right (later wins).
  const mergedParents = parentEffectives.reduce(
    (acc, parentEff) => mergeEffective(acc, parentEff),
    emptyEffective()
  )

  // Apply child's own fields on top of the merged parents.
  const childEffective = documentToEffective(child)

  // For the final merge, use the child's import-mode to combine instructions.
  // But first, we need to handle metadata specially (rule 11): child metadata wins.
  const result = mergeEffective(mergedParents, childEffective)

  // Ensure child metadata is preserved (rule 11)
  result.metadata = child.metadata

  return result
}
