import { describe, it, expect } from 'vitest'
import { validateHarness } from '../../lib/schema.js'

function profile(servers: Record<string, unknown>) {
  return {
    version: '1',
    metadata: { name: 'mcp-test', description: 'MCP modernization test profile' },
    'mcp-servers': servers,
  }
}

const HASH = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'

describe('Schema — MCP modernization (HEP-5)', () => {
  describe('transport', () => {
    it('streamable-http transport passes', () => {
      const doc = profile({ s: { transport: 'streamable-http', url: 'https://example.com/mcp' } })
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('http alias still passes', () => {
      const doc = profile({ s: { transport: 'http', url: 'https://example.com/mcp' } })
      expect(validateHarness(doc).valid).toBe(true)
    })

    it('sse (legacy) still passes', () => {
      const doc = profile({ s: { transport: 'sse', url: 'https://example.com/sse' } })
      expect(validateHarness(doc).valid).toBe(true)
    })

    it('unknown transport value fails', () => {
      const doc = profile({ s: { transport: 'grpc', url: 'https://example.com/mcp' } })
      expect(validateHarness(doc).valid).toBe(false)
    })
  })

  describe('provenance + integrity', () => {
    it('stdio with source, version, integrity passes', () => {
      const doc = profile({
        pg: {
          transport: 'stdio',
          command: 'uvx',
          args: ['mcp-server-postgres'],
          source: 'io.github.example/postgres',
          version: '1.4.2',
          integrity: { sha256: HASH },
        },
      })
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('remote with source and version passes', () => {
      const doc = profile({
        api: {
          transport: 'streamable-http',
          url: 'https://example.com/mcp',
          source: 'io.github.example/api',
          version: '>=2.0.0',
        },
      })
      expect(validateHarness(doc).valid).toBe(true)
    })

    it('integrity on a remote transport fails (stdio-only field)', () => {
      const doc = profile({
        api: {
          transport: 'streamable-http',
          url: 'https://example.com/mcp',
          integrity: { sha256: HASH },
        },
      })
      expect(validateHarness(doc).valid).toBe(false)
    })

    it('malformed sha256 fails', () => {
      const doc = profile({
        pg: { transport: 'stdio', command: 'uvx', integrity: { sha256: 'not-a-hash' } },
      })
      expect(validateHarness(doc).valid).toBe(false)
    })
  })
})
