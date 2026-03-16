import { describe, it, expect } from 'vitest'
import { parseSource, resolveVersion } from '../../lib/source.js'

describe('Source Format Parsing', () => {
  describe('remote sources', () => {
    it('parses owner/repo', () => {
      const result = parseSource('owner/repo')
      expect(result).toEqual({
        type: 'remote',
        owner: 'owner',
        repo: 'repo',
      })
    })

    it('parses owner/repo with hyphens and dots', () => {
      const result = parseSource('my-org/my-plugin')
      expect(result).toEqual({
        type: 'remote',
        owner: 'my-org',
        repo: 'my-plugin',
      })
    })

    it('parses owner/repo/path/to/harness.yaml', () => {
      const result = parseSource('owner/repo/path/to/harness.yaml')
      expect(result).toEqual({
        type: 'remote',
        owner: 'owner',
        repo: 'repo',
        path: 'path/to/harness.yaml',
      })
    })

    it('parses owner/repo with single path segment', () => {
      const result = parseSource('org/configs/teams')
      expect(result).toEqual({
        type: 'remote',
        owner: 'org',
        repo: 'configs',
        path: 'teams',
      })
    })
  })

  describe('local sources', () => {
    it('parses ./local-path', () => {
      const result = parseSource('./local-path')
      expect(result).toEqual({
        type: 'local',
        localPath: './local-path',
      })
    })

    it('parses ../parent/harness.yaml', () => {
      const result = parseSource('../parent/harness.yaml')
      expect(result).toEqual({
        type: 'local',
        localPath: '../parent/harness.yaml',
      })
    })

    it('parses ./deeply/nested/path/harness.yaml', () => {
      const result = parseSource('./deeply/nested/path/harness.yaml')
      expect(result).toEqual({
        type: 'local',
        localPath: './deeply/nested/path/harness.yaml',
      })
    })
  })

  describe('invalid sources', () => {
    it('throws on single segment', () => {
      expect(() => parseSource('repo')).toThrow('Invalid source format')
    })

    it('throws on empty string', () => {
      expect(() => parseSource('')).toThrow('Invalid source format')
    })

    it('throws on leading slash with empty owner', () => {
      expect(() => parseSource('/repo')).toThrow('Invalid source format')
    })

    it('throws on trailing slash with empty repo', () => {
      expect(() => parseSource('owner/')).toThrow('Invalid source format')
    })
  })
})

describe('Version Resolution', () => {
  describe('exact match', () => {
    it('matches exact version with v prefix', () => {
      const result = resolveVersion(['v1.0.0', 'v2.0.0'], '1.0.0')
      expect(result).toBe('v1.0.0')
    })

    it('matches exact version without v prefix', () => {
      const result = resolveVersion(['1.0.0', '2.0.0'], '1.0.0')
      expect(result).toBe('1.0.0')
    })

    it('returns null when exact version not found', () => {
      const result = resolveVersion(['v1.0.0', 'v2.0.0'], '3.0.0')
      expect(result).toBeNull()
    })
  })

  describe('caret range (^)', () => {
    it('selects highest compatible version', () => {
      const result = resolveVersion(['v1.0.0', 'v1.5.0', 'v2.0.0'], '^1.0.0')
      expect(result).toBe('v1.5.0')
    })

    it('does not cross major boundary', () => {
      const result = resolveVersion(['v1.0.0', 'v1.9.9', 'v2.0.0'], '^1.0.0')
      expect(result).toBe('v1.9.9')
    })

    it('selects the floor version when it is the only match', () => {
      const result = resolveVersion(['v1.0.0', 'v2.0.0'], '^1.0.0')
      expect(result).toBe('v1.0.0')
    })

    it('handles 0.x caret range (minor-locked)', () => {
      const result = resolveVersion(['v0.1.0', 'v0.1.5', 'v0.2.0'], '^0.1.0')
      expect(result).toBe('v0.1.5')
    })
  })

  describe('tilde range (~)', () => {
    it('selects highest patch version', () => {
      const result = resolveVersion(['v1.2.0', 'v1.2.5', 'v1.3.0'], '~1.2.0')
      expect(result).toBe('v1.2.5')
    })

    it('does not cross minor boundary', () => {
      const result = resolveVersion(['v1.2.0', 'v1.2.9', 'v1.3.0'], '~1.2.0')
      expect(result).toBe('v1.2.9')
    })
  })

  describe('gte range (>=)', () => {
    it('selects highest available version at or above floor', () => {
      const result = resolveVersion(['v0.1.0', 'v0.2.0', 'v0.3.0'], '>=0.2.0')
      expect(result).toBe('v0.3.0')
    })

    it('excludes versions below the floor', () => {
      const result = resolveVersion(['v0.1.0'], '>=0.2.0')
      expect(result).toBeNull()
    })
  })

  describe('pre-release handling', () => {
    it('does not match pre-release tags with normal ranges', () => {
      const result = resolveVersion(
        ['v1.0.0-alpha', 'v1.0.0-beta', 'v1.0.0'],
        '^1.0.0'
      )
      expect(result).toBe('v1.0.0')
    })

    it('matches pre-release when range explicitly targets it', () => {
      const result = resolveVersion(
        ['v1.0.0-alpha', 'v1.0.0-beta', 'v1.0.0'],
        '1.0.0-beta'
      )
      expect(result).toBe('v1.0.0-beta')
    })

    it('excludes pre-release from gte range', () => {
      const result = resolveVersion(
        ['v1.0.0-alpha', 'v1.0.0'],
        '>=1.0.0'
      )
      expect(result).toBe('v1.0.0')
    })
  })

  describe('edge cases', () => {
    it('returns null for empty available list', () => {
      const result = resolveVersion([], '^1.0.0')
      expect(result).toBeNull()
    })

    it('returns null for unrecognized range format', () => {
      const result = resolveVersion(['v1.0.0'], '>=1.0.0 <2.0.0')
      expect(result).toBeNull()
    })

    it('skips tags that are not valid semver', () => {
      const result = resolveVersion(
        ['latest', 'nightly', 'v1.0.0', 'not-a-version'],
        '^1.0.0'
      )
      expect(result).toBe('v1.0.0')
    })

    it('handles mixed v-prefixed and bare tags', () => {
      const result = resolveVersion(['v1.0.0', '1.1.0', 'v1.2.0'], '^1.0.0')
      expect(result).toBe('v1.2.0')
    })
  })
})
