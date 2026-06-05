import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { validateExchange, validateHarness } from '../../lib/schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// eval/src/tests/schema -> repo root
const repoRoot = join(__dirname, '../../../../')

function loadExchangeExample(filename: string): Record<string, unknown> {
  const content = readFileSync(join(repoRoot, 'examples', 'exchange', filename), 'utf-8')
  return JSON.parse(content)
}

// A minimal well-formed plaintext offer, used as a base for invalid-case mutation.
function offer(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: '1',
    type: 'offer',
    sender: { key: 'a'.repeat(64), display: 'alice' },
    fragment: {
      version: '1',
      kind: 'fragment',
      metadata: { name: 'postgres-mcp', description: 'PostgreSQL MCP server' },
    },
    'suggested-import-mode': 'merge',
    expires: '2026-07-01T00:00:00Z',
    signature: 'b'.repeat(128),
    ...overrides,
  }
}

describe('Schema — Exchange offer envelope (HEP-7)', () => {
  describe('valid', () => {
    it('example postgres-offer.json (plaintext) passes', () => {
      const result = validateExchange(loadExchangeExample('postgres-offer.json'))
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('example postgres-offer.encrypted.json passes', () => {
      const result = validateExchange(loadExchangeExample('postgres-offer.encrypted.json'))
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('minimal plaintext offer passes', () => {
      const result = validateExchange(offer())
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('encrypted offer with recipient passes', () => {
      const doc = {
        version: '1',
        type: 'offer',
        sender: { key: 'a'.repeat(64) },
        recipient: { key: 'c'.repeat(64) },
        'encrypted-fragment': {
          algorithm: 'x25519-xsalsa20-poly1305',
          nonce: 'T3hQc2V1ZG9Ob25jZQ==',
          ciphertext: 'U29tZUNpcGhlcnRleHQ=',
        },
        expires: '2026-07-01T00:00:00Z',
        signature: 'b'.repeat(128),
      }
      const result = validateExchange(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('x- extension field is tolerated', () => {
      expect(validateExchange(offer({ 'x-relay-hint': 'exchange.harnessprotocol.io' })).valid).toBe(true)
    })
  })

  describe('invalid', () => {
    it('missing signature fails', () => {
      const doc = offer()
      delete doc.signature
      expect(validateExchange(doc).valid).toBe(false)
    })

    it('both fragment and encrypted-fragment fails (oneOf)', () => {
      const doc = offer({
        'encrypted-fragment': {
          algorithm: 'x25519-xsalsa20-poly1305',
          nonce: 'T3hQ',
          ciphertext: 'U29tZQ==',
        },
      })
      expect(validateExchange(doc).valid).toBe(false)
    })

    it('neither fragment nor encrypted-fragment fails (oneOf)', () => {
      const doc = offer()
      delete doc.fragment
      expect(validateExchange(doc).valid).toBe(false)
    })

    it('encrypted-fragment without recipient fails', () => {
      const doc = offer()
      delete doc.fragment
      doc['encrypted-fragment'] = {
        algorithm: 'x25519-xsalsa20-poly1305',
        nonce: 'T3hQ',
        ciphertext: 'U29tZQ==',
      }
      expect(validateExchange(doc).valid).toBe(false)
    })

    it('unrecognized version fails', () => {
      expect(validateExchange(offer({ version: '2' })).valid).toBe(false)
    })

    it('unknown envelope type fails', () => {
      expect(validateExchange(offer({ type: 'push' })).valid).toBe(false)
    })

    it('sender without key fails', () => {
      expect(validateExchange(offer({ sender: { display: 'alice' } })).valid).toBe(false)
    })

    it('non-hex sender key fails', () => {
      expect(validateExchange(offer({ sender: { key: 'XYZ' } })).valid).toBe(false)
    })

    it('signature of wrong length fails', () => {
      expect(validateExchange(offer({ signature: 'b'.repeat(64) })).valid).toBe(false)
    })

    it('expires that is not a date-time fails', () => {
      expect(validateExchange(offer({ expires: 'next week' })).valid).toBe(false)
    })

    it('unknown top-level property fails', () => {
      expect(validateExchange(offer({ apply: true })).valid).toBe(false)
    })

    it('bad encryption algorithm fails', () => {
      const doc = offer()
      delete doc.fragment
      doc.recipient = { key: 'c'.repeat(64) }
      doc['encrypted-fragment'] = {
        algorithm: 'rot13',
        nonce: 'T3hQ',
        ciphertext: 'U29tZQ==',
      }
      expect(validateExchange(doc).valid).toBe(false)
    })
  })

  // The envelope schema treats the wrapped fragment as opaque. The spec requires
  // implementations to ALSO validate it against the harness schema with fragment
  // semantics. These tests assert that second, independent check.
  describe('wrapped fragment — independent harness validation', () => {
    it('the example envelope wraps a fragment that validates against the harness schema', () => {
      const env = loadExchangeExample('postgres-offer.json')
      const result = validateHarness(env.fragment)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('an envelope can be well-formed while its wrapped fragment is not a valid harness doc', () => {
      // sensitive: true + default is forbidden by the harness schema, but the
      // envelope schema does not look inside the fragment.
      const doc = offer({
        fragment: {
          version: '1',
          kind: 'fragment',
          env: [{ name: 'TOKEN', description: 'x', sensitive: true, default: 'leaked' }],
        },
      })
      expect(validateExchange(doc).valid).toBe(true)
      expect(validateHarness(doc.fragment).valid).toBe(false)
    })
  })
})
