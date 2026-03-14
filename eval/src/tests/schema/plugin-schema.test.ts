import { describe, it, expect } from 'vitest'
import { validatePlugin } from '../../lib/schema.js'

// Helper: valid base plugin manifest to build on
function basePlugin(overrides: Record<string, unknown> = {}): unknown {
  return {
    name: 'my-plugin',
    description: 'A test plugin',
    version: '1.0.0',
    ...overrides,
  }
}

describe('Schema Conformance — Plugin Manifest', () => {
  describe('valid plugin manifests', () => {
    it('minimal valid plugin passes', () => {
      const result = validatePlugin({
        name: 'my-plugin',
        description: 'A minimal plugin',
        version: '1.0.0',
      })
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('full plugin with all optional fields passes', () => {
      const result = validatePlugin({
        name: 'full-plugin',
        description: 'A fully-specified plugin',
        version: '2.3.1',
        author: { name: 'Test Author', url: 'https://example.com' },
        license: 'MIT',
        skills: ['code-review', 'test-gen'],
        agents: ['test-agent'],
        requires: {
          env: [
            {
              name: 'API_KEY',
              description: 'API key for the service',
              required: true,
              sensitive: true,
            },
            {
              name: 'BASE_URL',
              description: 'Base URL override',
              required: false,
              sensitive: false,
              default: 'https://api.example.com',
            },
          ],
          'min-protocol': '1',
        },
        'config-schema': {
          type: 'object',
          properties: {
            timeout: { type: 'number' },
          },
        },
        'x-custom': { someKey: 'value' },
      })
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })
  })

  describe('invalid plugin manifests', () => {
    it('missing name rejected', () => {
      const result = validatePlugin({
        description: 'Missing name',
        version: '1.0.0',
      })
      expect(result.valid).toBe(false)
    })

    it('missing description rejected', () => {
      const result = validatePlugin({
        name: 'my-plugin',
        version: '1.0.0',
      })
      expect(result.valid).toBe(false)
    })

    it('missing version rejected', () => {
      const result = validatePlugin({
        name: 'my-plugin',
        description: 'Missing version',
      })
      expect(result.valid).toBe(false)
    })

    it('invalid semver version "v1.0" rejected', () => {
      const result = validatePlugin(basePlugin({ version: 'v1.0' }))
      expect(result.valid).toBe(false)
    })

    it('name with uppercase "MyPlugin" rejected', () => {
      const result = validatePlugin(basePlugin({ name: 'MyPlugin' }))
      expect(result.valid).toBe(false)
    })

    it('description > 256 chars rejected', () => {
      const result = validatePlugin(basePlugin({ description: 'a'.repeat(257) }))
      expect(result.valid).toBe(false)
    })

    it('requires.env with lowercase name "db_url" rejected', () => {
      const result = validatePlugin(basePlugin({
        requires: {
          env: [{ name: 'db_url', description: 'Database URL' }],
        },
      }))
      expect(result.valid).toBe(false)
    })
  })
})
