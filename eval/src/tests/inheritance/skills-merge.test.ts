import { describe, it, expect } from 'vitest'
import { resolveInheritance, mergeSkills } from '../../lib/resolver.js'
import type { HarnessDocument, Skill } from '../../lib/types.js'

function makeDoc(overrides: Partial<HarnessDocument> = {}): HarnessDocument {
  return { version: '1', ...overrides }
}

function registry(entries: Record<string, HarnessDocument>): Map<string, HarnessDocument> {
  return new Map(Object.entries(entries))
}

describe('mergeSkills (HEP-4 inheritance)', () => {
  it('union with no overlap: both skills appear', () => {
    const base: Skill[] = [{ name: 'a', source: 'org/skills/a' }]
    const overlay: Skill[] = [{ name: 'b', source: 'org/skills/b' }]
    const result = mergeSkills(base, overlay)
    expect(result.map((s) => s.name).sort()).toEqual(['a', 'b'])
  })

  it('name conflict: overlay/child wins entirely', () => {
    const base: Skill[] = [{ name: 'fmt', source: 'org/skills/fmt', version: '>=1.0.0' }]
    const overlay: Skill[] = [{ name: 'fmt', source: 'org/skills/fmt', version: '>=2.0.0' }]
    const result = mergeSkills(base, overlay)
    expect(result).toHaveLength(1)
    expect(result[0].version).toBe('>=2.0.0')
  })

  it('enabled: false child entry suppresses the inherited skill (entry retained as disabled)', () => {
    const base: Skill[] = [{ name: 'fmt', source: 'org/skills/fmt' }]
    const overlay: Skill[] = [{ name: 'fmt', source: 'org/skills/fmt', enabled: false }]
    const result = mergeSkills(base, overlay)
    expect(result).toHaveLength(1)
    expect(result[0].enabled).toBe(false)
  })
})

describe('resolveInheritance carries skills (HEP-4)', () => {
  it('child inherits parent skills and adds its own', () => {
    const reg = registry({
      'org/base': makeDoc({
        metadata: { name: 'base', description: 'base' },
        skills: [{ name: 'house-style', source: 'org/skills/house-style' }],
      }),
    })
    const child = makeDoc({
      metadata: { name: 'child', description: 'child' },
      extends: [{ source: 'org/base' }],
      skills: [{ name: 'pdf-forms', source: 'org/skills/pdf-forms' }],
    })
    const eff = resolveInheritance(child, reg)
    expect(eff.skills.map((s) => s.name).sort()).toEqual(['house-style', 'pdf-forms'])
  })

  it('child overrides an inherited skill by name', () => {
    const reg = registry({
      'org/base': makeDoc({
        metadata: { name: 'base', description: 'base' },
        skills: [{ name: 'fmt', source: 'org/skills/fmt', version: '>=1.0.0' }],
      }),
    })
    const child = makeDoc({
      metadata: { name: 'child', description: 'child' },
      extends: [{ source: 'org/base' }],
      skills: [{ name: 'fmt', source: 'org/skills/fmt', version: '>=2.0.0' }],
    })
    const eff = resolveInheritance(child, reg)
    expect(eff.skills).toHaveLength(1)
    expect(eff.skills[0].version).toBe('>=2.0.0')
  })
})
