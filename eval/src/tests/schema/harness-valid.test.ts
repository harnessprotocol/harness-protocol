import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { parse } from 'yaml'
import { validateHarness } from '../../lib/schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// eval/src/tests/schema -> eval/src/tests -> eval/src -> eval -> repo root
const repoRoot = join(__dirname, '../../../../')

function loadExample(filename: string): unknown {
  const content = readFileSync(join(repoRoot, 'examples', filename), 'utf-8')
  return parse(content)
}

describe('Schema Conformance — Valid Documents', () => {
  describe('existing examples', () => {
    it('minimal.harness.yaml passes', () => {
      const doc = loadExample('minimal.harness.yaml')
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('data-engineer.harness.yaml passes', () => {
      const doc = loadExample('data-engineer.harness.yaml')
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('team-overlay.harness.yaml passes', () => {
      const doc = loadExample('team-overlay.harness.yaml')
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('fragment-mcp-server.harness.yaml passes', () => {
      const doc = loadExample('fragment-mcp-server.harness.yaml')
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('fragment-plugin-bundle.harness.yaml passes', () => {
      const doc = loadExample('fragment-plugin-bundle.harness.yaml')
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })
  })

  describe('edge cases — fragments', () => {
    it('fragment without metadata passes', () => {
      const doc = { version: '1', kind: 'fragment' }
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })
  })

  describe('edge cases — empty collections', () => {
    it('empty plugins array passes on a valid profile', () => {
      const doc = {
        version: '1',
        metadata: { name: 'test-profile', description: 'Test profile' },
        plugins: [],
      }
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('empty env array passes on a valid profile', () => {
      const doc = {
        version: '1',
        metadata: { name: 'test-profile', description: 'Test profile' },
        env: [],
      }
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('empty permissions object passes on a valid profile', () => {
      const doc = {
        version: '1',
        metadata: { name: 'test-profile', description: 'Test profile' },
        permissions: {},
      }
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })
  })

  describe('edge cases — transport types', () => {
    it('stdio transport passes', () => {
      const doc = {
        version: '1',
        metadata: { name: 'transport-test', description: 'Transport test profile' },
        'mcp-servers': {
          myserver: {
            transport: 'stdio',
            command: 'uvx',
            args: ['some-mcp-server'],
          },
        },
      }
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('http transport passes', () => {
      const doc = {
        version: '1',
        metadata: { name: 'transport-test', description: 'Transport test profile' },
        'mcp-servers': {
          myserver: {
            transport: 'http',
            url: 'https://example.com/mcp',
          },
        },
      }
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('sse transport passes', () => {
      const doc = {
        version: '1',
        metadata: { name: 'transport-test', description: 'Transport test profile' },
        'mcp-servers': {
          myserver: {
            transport: 'sse',
            url: 'https://example.com/sse',
          },
        },
      }
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('ws transport passes', () => {
      const doc = {
        version: '1',
        metadata: { name: 'transport-test', description: 'Transport test profile' },
        'mcp-servers': {
          myserver: {
            transport: 'ws',
            url: 'ws://example.com/mcp',
          },
        },
      }
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })
  })

  describe('edge cases — extension fields', () => {
    it('x-custom extension field at top level passes', () => {
      const doc = {
        version: '1',
        metadata: { name: 'test-profile', description: 'Test profile' },
        'x-custom': { someKey: 'someValue' },
      }
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })
  })

  describe('edge cases — env sensitive flag', () => {
    it('sensitive: false with default value passes', () => {
      const doc = {
        version: '1',
        metadata: { name: 'test-profile', description: 'Test profile' },
        env: [
          {
            name: 'MY_VAR',
            description: 'A non-sensitive variable with a default',
            sensitive: false,
            default: 'my-default-value',
          },
        ],
      }
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })
  })

  describe('edge cases — metadata name length', () => {
    it('max-length metadata.name (64 chars) passes', () => {
      // Pattern: ^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$
      // Max: 1 leading + 62 middle + 1 trailing = 64 chars
      const name = 'a' + 'b'.repeat(62) + 'c'
      expect(name.length).toBe(64)
      const doc = {
        version: '1',
        metadata: { name, description: 'Profile with max-length name' },
      }
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })
  })

  describe('edge cases — import-modes', () => {
    it('import-mode: merge passes', () => {
      const doc = {
        version: '1',
        metadata: { name: 'test-profile', description: 'Test profile' },
        instructions: {
          'import-mode': 'merge',
          operational: 'Follow best practices.',
        },
      }
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('import-mode: replace passes', () => {
      const doc = {
        version: '1',
        metadata: { name: 'test-profile', description: 'Test profile' },
        instructions: {
          'import-mode': 'replace',
          operational: 'Override instructions.',
        },
      }
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('import-mode: skip passes', () => {
      const doc = {
        version: '1',
        metadata: { name: 'test-profile', description: 'Test profile' },
        instructions: {
          'import-mode': 'skip',
        },
      }
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })
  })
})
