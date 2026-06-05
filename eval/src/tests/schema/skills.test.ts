import { describe, it, expect } from 'vitest'
import { validateHarness } from '../../lib/schema.js'

function profile(overrides: Record<string, unknown> = {}) {
  return {
    version: '1',
    metadata: { name: 'skills-test', description: 'Skills test profile' },
    ...overrides,
  }
}

describe('Schema — skills section (HEP-4)', () => {
  describe('valid', () => {
    it('minimal skill (name + source) passes', () => {
      const doc = profile({ skills: [{ name: 'pdf-forms', source: 'org/skills/pdf-forms' }] })
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('full skill with version, description, enabled, loading, integrity passes', () => {
      const doc = profile({
        skills: [
          {
            name: 'sql-style-guide',
            source: 'org/skills/sql-style-guide',
            version: '>=1.0.0',
            description: 'Enforce SQL conventions.',
            enabled: true,
            loading: 'deferred',
            integrity: { sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
          },
        ],
      })
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('local path source passes', () => {
      const doc = profile({ skills: [{ name: 'house-style', source: './skills/house-style', loading: 'eager' }] })
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('enabled: false (suppression) passes', () => {
      const doc = profile({ skills: [{ name: 'pdf-forms', source: 'org/skills/pdf-forms', enabled: false }] })
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('empty skills array passes', () => {
      const doc = profile({ skills: [] })
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })
  })

  describe('invalid', () => {
    it('missing required source fails', () => {
      const doc = profile({ skills: [{ name: 'pdf-forms' }] })
      expect(validateHarness(doc).valid).toBe(false)
    })

    it('missing required name fails', () => {
      const doc = profile({ skills: [{ source: 'org/skills/pdf-forms' }] })
      expect(validateHarness(doc).valid).toBe(false)
    })

    it('uppercase name (pattern violation) fails', () => {
      const doc = profile({ skills: [{ name: 'PDF-Forms', source: 'org/skills/pdf-forms' }] })
      expect(validateHarness(doc).valid).toBe(false)
    })

    it('invalid loading enum value fails', () => {
      const doc = profile({ skills: [{ name: 'pdf-forms', source: 'org/x', loading: 'lazy' }] })
      expect(validateHarness(doc).valid).toBe(false)
    })

    it('uppercase sha256 fails the pattern', () => {
      const doc = profile({
        skills: [{ name: 'pdf-forms', source: 'org/x', integrity: { sha256: 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855' } }],
      })
      expect(validateHarness(doc).valid).toBe(false)
    })

    it('unknown property in a skill entry fails (additionalProperties: false)', () => {
      const doc = profile({ skills: [{ name: 'pdf-forms', source: 'org/x', surprise: true }] })
      expect(validateHarness(doc).valid).toBe(false)
    })
  })
})
