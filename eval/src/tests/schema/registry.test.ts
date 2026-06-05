import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { validateRegistry } from '../../lib/schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// eval/src/tests/schema -> repo root
const repoRoot = join(__dirname, '../../../../')

function loadRegistryExample(filename: string): unknown {
  return JSON.parse(readFileSync(join(repoRoot, 'examples', 'registry', filename), 'utf-8'))
}

function loadNdjson(filename: string): unknown[] {
  return readFileSync(join(repoRoot, 'examples', 'registry', filename), 'utf-8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line))
}

const indexEvent = {
  seq: 1042,
  timestamp: '2026-03-09T14:30:22Z',
  event: 'index',
  id: 'harnessprotocol/harness-kit@v1.2.0',
  sha256: 'a'.repeat(64),
  kind: 'profile',
  'schema-version': '1',
}

describe('Schema — Registry documents (HEP-8)', () => {
  describe('valid', () => {
    it('register-request.json example passes', () => {
      const result = validateRegistry(loadRegistryExample('register-request.json'))
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('register-response.json example passes', () => {
      const result = validateRegistry(loadRegistryExample('register-response.json'))
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('every line of transparency-log.ndjson passes', () => {
      const entries = loadNdjson('transparency-log.ndjson')
      expect(entries.length).toBeGreaterThan(0)
      for (const entry of entries) {
        const result = validateRegistry(entry)
        expect(result.valid, `${JSON.stringify(entry)}\n${result.errors.join('\n')}`).toBe(true)
      }
    })

    it('index event passes', () => {
      expect(validateRegistry(indexEvent).valid).toBe(true)
    })

    it('delist event passes', () => {
      const doc = {
        seq: 1099,
        timestamp: '2026-03-10T09:00:00Z',
        event: 'delist',
        id: 'bad-actor/malware-harness@v1.0.0',
        reason: 'manifest-malicious-intent',
      }
      expect(validateRegistry(doc).valid).toBe(true)
    })

    it('minimal registration request (repo only) passes', () => {
      expect(validateRegistry({ repo: 'alice/my-harness' }).valid).toBe(true)
    })

    it('plugin kind passes in an index event', () => {
      expect(validateRegistry({ ...indexEvent, kind: 'plugin' }).valid).toBe(true)
    })
  })

  describe('invalid', () => {
    it('index event missing sha256 fails', () => {
      const doc: Record<string, unknown> = { ...indexEvent }
      delete doc.sha256
      expect(validateRegistry(doc).valid).toBe(false)
    })

    it('unknown event type fails', () => {
      expect(validateRegistry({ ...indexEvent, event: 'purge' }).valid).toBe(false)
    })

    it('delist event missing reason fails', () => {
      const doc = {
        seq: 1,
        timestamp: '2026-03-10T09:00:00Z',
        event: 'delist',
        id: 'x/y@v1',
      }
      expect(validateRegistry(doc).valid).toBe(false)
    })

    it('delist reason outside the enum fails', () => {
      const doc = {
        seq: 1,
        timestamp: '2026-03-10T09:00:00Z',
        event: 'delist',
        id: 'x/y@v1',
        reason: 'reviewer-disliked-it',
      }
      expect(validateRegistry(doc).valid).toBe(false)
    })

    it('non-hex sha256 fails', () => {
      expect(validateRegistry({ ...indexEvent, sha256: 'NOTHEX' }).valid).toBe(false)
    })

    it('registration request with a malformed repo fails', () => {
      expect(validateRegistry({ repo: 'not-a-repo' }).valid).toBe(false)
    })

    it('registration response missing indexed-at fails', () => {
      const doc = {
        id: 'a/b@v1',
        url: 'https://harnessprotocol.io/profiles/a/b',
        sha256: 'a'.repeat(64),
      }
      expect(validateRegistry(doc).valid).toBe(false)
    })

    it('unknown property on an index event fails', () => {
      expect(validateRegistry({ ...indexEvent, downloads: 5 }).valid).toBe(false)
    })

    it('an empty object matches no shape and fails', () => {
      expect(validateRegistry({}).valid).toBe(false)
    })

    it('schema-version must be a string', () => {
      expect(validateRegistry({ ...indexEvent, 'schema-version': 1 }).valid).toBe(false)
    })
  })
})
