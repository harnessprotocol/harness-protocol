/**
 * Source parsing and version resolution for the Harness Protocol.
 *
 * Handles the `source` field in `plugins[]` and `extends[]` entries:
 * - Remote sources: `owner/repo`, `owner/repo/path/to/file.yaml`
 * - Local sources: `./relative`, `../parent`
 *
 * Version resolution matches git tags against semver ranges.
 */

export interface ParsedSource {
  type: 'remote' | 'local'
  owner?: string
  repo?: string
  path?: string
  localPath?: string
}

/**
 * Parse a source string into its constituent parts.
 *
 * - `./` or `../` prefix → local source with `localPath`
 * - Two segments (`owner/repo`) → remote source
 * - Three+ segments (`owner/repo/path/...`) → remote source with `path`
 * - One segment or empty → throws (invalid format)
 */
export function parseSource(source: string): ParsedSource {
  if (source === '') {
    throw new Error('Invalid source format: source string must not be empty')
  }

  // Local sources
  if (source.startsWith('./') || source.startsWith('../')) {
    return {
      type: 'local',
      localPath: source,
    }
  }

  const segments = source.split('/')

  if (segments.length < 2) {
    throw new Error(
      `Invalid source format: expected "owner/repo" but got "${source}"`
    )
  }

  // Validate that owner and repo segments are non-empty
  if (segments[0] === '' || segments[1] === '') {
    throw new Error(
      `Invalid source format: owner and repo must not be empty in "${source}"`
    )
  }

  const result: ParsedSource = {
    type: 'remote',
    owner: segments[0],
    repo: segments[1],
  }

  if (segments.length > 2) {
    result.path = segments.slice(2).join('/')
  }

  return result
}

// ---------------------------------------------------------------------------
// Semver parsing and range matching
// ---------------------------------------------------------------------------

interface SemVer {
  major: number
  minor: number
  patch: number
  prerelease: string | null
}

function parseSemVer(version: string): SemVer | null {
  // Strip leading 'v' if present
  const raw = version.startsWith('v') ? version.slice(1) : version

  // Split off pre-release
  const [core, ...preParts] = raw.split('-')
  const prerelease = preParts.length > 0 ? preParts.join('-') : null

  const parts = core.split('.')
  if (parts.length !== 3) return null

  const major = parseInt(parts[0], 10)
  const minor = parseInt(parts[1], 10)
  const patch = parseInt(parts[2], 10)

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) return null

  return { major, minor, patch, prerelease }
}

function compareSemVer(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major
  if (a.minor !== b.minor) return a.minor - b.minor
  if (a.patch !== b.patch) return a.patch - b.patch

  // No prerelease > prerelease (1.0.0 > 1.0.0-beta)
  if (a.prerelease === null && b.prerelease !== null) return 1
  if (a.prerelease !== null && b.prerelease === null) return -1
  if (a.prerelease !== null && b.prerelease !== null) {
    return a.prerelease < b.prerelease ? -1 : a.prerelease > b.prerelease ? 1 : 0
  }

  return 0
}

function semVerGte(v: SemVer, floor: SemVer): boolean {
  return compareSemVer(v, floor) >= 0
}

function semVerLt(v: SemVer, ceiling: SemVer): boolean {
  return compareSemVer(v, ceiling) < 0
}

interface ParsedRange {
  operator: 'exact' | 'gte' | 'caret' | 'tilde'
  version: SemVer
}

function parseRange(range: string): ParsedRange | null {
  const trimmed = range.trim()

  if (trimmed.startsWith('>=')) {
    const ver = parseSemVer(trimmed.slice(2).trim())
    if (!ver) return null
    return { operator: 'gte', version: ver }
  }

  if (trimmed.startsWith('^')) {
    const ver = parseSemVer(trimmed.slice(1).trim())
    if (!ver) return null
    return { operator: 'caret', version: ver }
  }

  if (trimmed.startsWith('~')) {
    const ver = parseSemVer(trimmed.slice(1).trim())
    if (!ver) return null
    return { operator: 'tilde', version: ver }
  }

  // Exact match
  const ver = parseSemVer(trimmed)
  if (!ver) return null
  return { operator: 'exact', version: ver }
}

function matchesRange(v: SemVer, range: ParsedRange): boolean {
  const rangeHasPrerelease = range.version.prerelease !== null
  const vHasPrerelease = v.prerelease !== null

  // Pre-release versions are only matched when the range explicitly includes
  // a pre-release identifier.
  if (vHasPrerelease && !rangeHasPrerelease) {
    return false
  }

  switch (range.operator) {
    case 'exact':
      return (
        v.major === range.version.major &&
        v.minor === range.version.minor &&
        v.patch === range.version.patch &&
        v.prerelease === range.version.prerelease
      )

    case 'gte':
      return semVerGte(v, range.version)

    case 'caret': {
      // ^major.minor.patch: >=major.minor.patch, <next-major (if major > 0)
      //   ^0.minor.patch: >=0.minor.patch, <0.(minor+1).0 (if minor > 0)
      //   ^0.0.patch: >=0.0.patch, <0.0.(patch+1)
      if (!semVerGte(v, range.version)) return false
      if (range.version.major > 0) {
        return semVerLt(v, { major: range.version.major + 1, minor: 0, patch: 0, prerelease: null })
      }
      if (range.version.minor > 0) {
        return semVerLt(v, { major: 0, minor: range.version.minor + 1, patch: 0, prerelease: null })
      }
      return semVerLt(v, { major: 0, minor: 0, patch: range.version.patch + 1, prerelease: null })
    }

    case 'tilde': {
      // ~major.minor.patch: >=major.minor.patch, <major.(minor+1).0
      if (!semVerGte(v, range.version)) return false
      return semVerLt(v, {
        major: range.version.major,
        minor: range.version.minor + 1,
        patch: 0,
        prerelease: null,
      })
    }

    default:
      return false
  }
}

/**
 * Resolve the best matching version from a list of tag names.
 *
 * @param available - List of git tag names (e.g., `['v1.0.0', 'v1.1.0', 'v2.0.0']`)
 * @param range    - A semver range string (e.g., `^1.0.0`, `~1.2.0`, `>=0.2.0`, `1.2.3`)
 * @returns The original tag string of the highest matching version, or `null` if no match.
 */
export function resolveVersion(available: string[], range: string): string | null {
  const parsedRange = parseRange(range)
  if (!parsedRange) return null

  let bestTag: string | null = null
  let bestVer: SemVer | null = null

  for (const tag of available) {
    const ver = parseSemVer(tag)
    if (!ver) continue

    if (!matchesRange(ver, parsedRange)) continue

    if (bestVer === null || compareSemVer(ver, bestVer) > 0) {
      bestVer = ver
      bestTag = tag
    }
  }

  return bestTag
}
