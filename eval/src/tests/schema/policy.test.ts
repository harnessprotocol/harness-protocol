import { describe, it, expect } from 'vitest'
import { validateHarness } from '../../lib/schema.js'

function profile(policy: Record<string, unknown>) {
  return {
    version: '1',
    metadata: { name: 'policy-test', description: 'Policy test profile' },
    policy,
  }
}

describe('Schema — policy section (HEP-6)', () => {
  describe('valid', () => {
    it('full policy passes', () => {
      const doc = profile({
        'mcp-servers': { 'allowed-sources': ['io.github.acme/*'], 'denied-sources': ['*/experimental-*'] },
        plugins: { 'allowed-sources': ['acme/*'], 'allowed-marketplaces': ['acme/internal'] },
        skills: { 'allowed-sources': ['acme/*'] },
        permissions: {
          tools: { allow: ['Read', 'mcp__*'], deny: ['mcp__*__drop_*'] },
          network: { 'allowed-hosts': ['*.acme.internal'] },
        },
        'require-integrity': true,
      })
      const result = validateHarness(doc)
      expect(result.valid, result.errors.join('\n')).toBe(true)
    })

    it('empty policy passes', () => {
      expect(validateHarness(profile({})).valid).toBe(true)
    })

    it('require-integrity alone passes', () => {
      expect(validateHarness(profile({ 'require-integrity': true })).valid).toBe(true)
    })
  })

  describe('invalid', () => {
    it('unknown top-level policy key fails', () => {
      expect(validateHarness(profile({ 'allow-everything': true })).valid).toBe(false)
    })

    it('require-integrity must be a boolean', () => {
      expect(validateHarness(profile({ 'require-integrity': 'yes' })).valid).toBe(false)
    })

    it('unknown key under policy.permissions fails', () => {
      const doc = profile({ permissions: { paths: { writable: ['src/'] } } })
      expect(validateHarness(doc).valid).toBe(false)
    })

    it('allowed-sources must be an array of strings', () => {
      const doc = profile({ 'mcp-servers': { 'allowed-sources': 'io.github.acme/*' } })
      expect(validateHarness(doc).valid).toBe(false)
    })
  })
})
