import { describe, it, expect } from 'vitest'
import { validateHarness } from '../../lib/schema.js'

// Helper: valid base profile to build invalid variants on
function baseProfile(overrides: Record<string, unknown> = {}): unknown {
  return {
    version: '1',
    metadata: { name: 'test', description: 'Test profile' },
    ...overrides,
  }
}

describe('Schema Conformance — Invalid Documents', () => {
  describe('version', () => {
    it('integer 1 rejected', () => {
      const result = validateHarness({ version: 1, metadata: { name: 'test', description: 'desc' } })
      expect(result.valid).toBe(false)
    })

    it('string "2" rejected', () => {
      const result = validateHarness({ version: '2', metadata: { name: 'test', description: 'desc' } })
      expect(result.valid).toBe(false)
    })

    it('missing version rejected', () => {
      const result = validateHarness({ metadata: { name: 'test', description: 'desc' } })
      expect(result.valid).toBe(false)
    })
  })

  describe('kind', () => {
    it('invalid enum value "workspace" rejected', () => {
      const result = validateHarness(baseProfile({ kind: 'workspace' }))
      expect(result.valid).toBe(false)
    })
  })

  describe('metadata.name', () => {
    // Note: Schema pattern ^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$ is authoritative;
    // prose in profile-schema.md says ^[a-z0-9-]{1,64}$ (allows leading/trailing hyphen),
    // but the SCHEMA rejects leading and trailing hyphens.

    it('uppercase "MyProfile" rejected', () => {
      const result = validateHarness({ version: '1', metadata: { name: 'MyProfile', description: 'desc' } })
      expect(result.valid).toBe(false)
    })

    it('leading hyphen "-my-profile" rejected', () => {
      const result = validateHarness({ version: '1', metadata: { name: '-my-profile', description: 'desc' } })
      expect(result.valid).toBe(false)
    })

    it('trailing hyphen "my-profile-" rejected', () => {
      const result = validateHarness({ version: '1', metadata: { name: 'my-profile-', description: 'desc' } })
      expect(result.valid).toBe(false)
    })

    it('>64 chars rejected', () => {
      // Pattern: ^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$ allows max 1 + 62 + 1 = 64 chars
      // 65 chars exceeds the max
      const name = 'a' + 'b'.repeat(63) + 'c' // 65 chars
      expect(name.length).toBe(65)
      const result = validateHarness({ version: '1', metadata: { name, description: 'desc' } })
      expect(result.valid).toBe(false)
    })
  })

  describe('plugins[].source', () => {
    it('bare "repo" rejected (no slash)', () => {
      const result = validateHarness(baseProfile({
        plugins: [{ name: 'my-plugin', source: 'repo' }],
      }))
      expect(result.valid).toBe(false)
    })

    it('"a/b/c" rejected (extra slash)', () => {
      const result = validateHarness(baseProfile({
        plugins: [{ name: 'my-plugin', source: 'a/b/c' }],
      }))
      expect(result.valid).toBe(false)
    })
  })

  describe('env[].name', () => {
    // Note: The prose says ^[A-Z][A-Z0-9_]*$ (no leading underscore),
    // but the SCHEMA pattern ^[A-Z_][A-Z0-9_]*$ allows leading underscore —
    // schema is authoritative, so only test cases the schema actually rejects.

    it('lowercase "db_url" rejected', () => {
      const result = validateHarness(baseProfile({
        env: [{ name: 'db_url', description: 'Database URL' }],
      }))
      expect(result.valid).toBe(false)
    })

    it('leading digit "1VAR" rejected', () => {
      const result = validateHarness(baseProfile({
        env: [{ name: '1VAR', description: 'A variable' }],
      }))
      expect(result.valid).toBe(false)
    })
  })

  describe('integrity.sha256', () => {
    it('uppercase hex rejected', () => {
      const sha = 'A'.repeat(64)
      const result = validateHarness(baseProfile({
        plugins: [{
          name: 'my-plugin',
          source: 'owner/repo',
          integrity: { sha256: sha },
        }],
      }))
      expect(result.valid).toBe(false)
    })

    it('63-char hex rejected', () => {
      const sha = 'a'.repeat(63)
      const result = validateHarness(baseProfile({
        plugins: [{
          name: 'my-plugin',
          source: 'owner/repo',
          integrity: { sha256: sha },
        }],
      }))
      expect(result.valid).toBe(false)
    })

    it('65-char hex rejected', () => {
      const sha = 'a'.repeat(65)
      const result = validateHarness(baseProfile({
        plugins: [{
          name: 'my-plugin',
          source: 'owner/repo',
          integrity: { sha256: sha },
        }],
      }))
      expect(result.valid).toBe(false)
    })
  })

  describe('metadata.version', () => {
    it('"v1.0.0" rejected (semver does not allow v prefix)', () => {
      const result = validateHarness({ version: '1', metadata: { name: 'test', description: 'desc', version: 'v1.0.0' } })
      expect(result.valid).toBe(false)
    })

    it('"1.0" rejected (semver requires major.minor.patch)', () => {
      const result = validateHarness({ version: '1', metadata: { name: 'test', description: 'desc', version: '1.0' } })
      expect(result.valid).toBe(false)
    })
  })

  describe('metadata.tags', () => {
    it('11 tags rejected (maxItems: 10)', () => {
      const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`)
      const result = validateHarness({ version: '1', metadata: { name: 'test', description: 'desc', tags } })
      expect(result.valid).toBe(false)
    })

    it('tag >32 chars rejected', () => {
      const tags = ['a'.repeat(33)]
      const result = validateHarness({ version: '1', metadata: { name: 'test', description: 'desc', tags } })
      expect(result.valid).toBe(false)
    })

    it('duplicate tags rejected (uniqueItems: true)', () => {
      const tags = ['typescript', 'typescript']
      const result = validateHarness({ version: '1', metadata: { name: 'test', description: 'desc', tags } })
      expect(result.valid).toBe(false)
    })
  })

  describe('metadata.description', () => {
    it('>256 chars rejected', () => {
      const description = 'a'.repeat(257)
      const result = validateHarness({ version: '1', metadata: { name: 'test', description } })
      expect(result.valid).toBe(false)
    })
  })

  describe('sensitive + default constraint', () => {
    it('sensitive: true + default rejected', () => {
      const result = validateHarness(baseProfile({
        env: [{
          name: 'API_KEY',
          description: 'API key',
          sensitive: true,
          default: 'my-default',
        }],
      }))
      expect(result.valid).toBe(false)
    })

    it('omitted sensitive + default rejected (default sensitive is true)', () => {
      const result = validateHarness(baseProfile({
        env: [{
          name: 'API_KEY',
          description: 'API key',
          default: 'my-default',
        }],
      }))
      expect(result.valid).toBe(false)
    })
  })

  describe('transport', () => {
    it('stdio without command rejected', () => {
      const result = validateHarness(baseProfile({
        'mcp-servers': {
          myserver: { transport: 'stdio' },
        },
      }))
      expect(result.valid).toBe(false)
    })

    it('http without url rejected', () => {
      const result = validateHarness(baseProfile({
        'mcp-servers': {
          myserver: { transport: 'http' },
        },
      }))
      expect(result.valid).toBe(false)
    })
  })

  describe('unknown fields', () => {
    it('non-x- top-level key "unknownField" rejected', () => {
      const result = validateHarness({
        version: '1',
        metadata: { name: 'test', description: 'desc' },
        unknownField: 'value',
      })
      expect(result.valid).toBe(false)
    })
  })

  describe('import-mode', () => {
    it('"append" rejected (not in enum [merge, replace, skip])', () => {
      const result = validateHarness(baseProfile({
        instructions: {
          'import-mode': 'append',
        },
      }))
      expect(result.valid).toBe(false)
    })
  })
})
