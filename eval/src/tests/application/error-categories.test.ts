import { describe, it, expect } from 'vitest'
import { categorizeError } from '../../lib/substitute.js'

// ---------------------------------------------------------------------------
// Error Category Classification
// ---------------------------------------------------------------------------

describe('Error Category Classification', () => {
  describe('fatal errors', () => {
    it.each([
      'malformed-yaml',
      'schema-validation',
      'semantic-validation',
      'circular-extends',
      'depth-limit-exceeded',
      'source-not-found',
      'entry-point-missing',
      'integrity-mismatch',
      'missing-required-env',
      'mcp-server-start-failure',
    ])('%s → fatal', (errorType) => {
      expect(categorizeError(errorType)).toBe('fatal')
    })
  })

  describe('warning errors', () => {
    it.each([
      'no-matching-version-tag',
      'non-enforceable-permission',
      'deprecated-field',
      'import-mode-replace',
    ])('%s → warning', (errorType) => {
      expect(categorizeError(errorType)).toBe('warning')
    })
  })

  describe('informational errors', () => {
    it.each([
      'cache-hit',
      'optional-env-absent',
    ])('%s → informational', (errorType) => {
      expect(categorizeError(errorType)).toBe('informational')
    })
  })

  it('unknown error type → fatal (conservative default)', () => {
    expect(categorizeError('something-completely-unknown')).toBe('fatal')
    expect(categorizeError('')).toBe('fatal')
    expect(categorizeError('typo-in-error-name')).toBe('fatal')
  })
})
