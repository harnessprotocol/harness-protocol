import type { EffectiveConfiguration, McpServerStdio, McpServerRemote } from './types.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubstitutionResult {
  config: EffectiveConfiguration
  errors: SubstitutionError[]
  warnings: string[]
}

export interface SubstitutionError {
  variable: string
  category: 'fatal' | 'warning' | 'informational'
  message: string
}

// ---------------------------------------------------------------------------
// Error category classification
// ---------------------------------------------------------------------------

const ERROR_CATEGORIES: Record<string, 'fatal' | 'warning' | 'informational'> = {
  'malformed-yaml': 'fatal',
  'schema-validation': 'fatal',
  'semantic-validation': 'fatal',
  'circular-extends': 'fatal',
  'depth-limit-exceeded': 'fatal',
  'source-not-found': 'fatal',
  'entry-point-missing': 'fatal',
  'integrity-mismatch': 'fatal',
  'missing-required-env': 'fatal',
  'mcp-server-start-failure': 'fatal',
  'no-matching-version-tag': 'warning',
  'non-enforceable-permission': 'warning',
  'deprecated-field': 'warning',
  'import-mode-replace': 'warning',
  'cache-hit': 'informational',
  'optional-env-absent': 'informational',
}

export function categorizeError(errorType: string): 'fatal' | 'warning' | 'informational' {
  return ERROR_CATEGORIES[errorType] ?? 'fatal'
}

// ---------------------------------------------------------------------------
// Variable substitution
// ---------------------------------------------------------------------------

const VAR_PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_]*)}/g

/**
 * Resolve a single variable reference against the provided env map and
 * declared env entries.  Returns the resolved value and any errors/warnings
 * produced during resolution.
 */
function resolveVar(
  varName: string,
  env: Record<string, string>,
  declaredEnv: Map<string, { required?: boolean; default?: string }>,
): { value: string; errors: SubstitutionError[] } {
  // Value provided at runtime — use it directly
  if (varName in env) {
    return { value: env[varName], errors: [] }
  }

  const declaration = declaredEnv.get(varName)

  // Required variable not supplied
  if (declaration?.required) {
    return {
      value: `\${${varName}}`, // leave unreplaced
      errors: [
        {
          variable: varName,
          category: 'fatal',
          message: `Required environment variable ${varName} is not set`,
        },
      ],
    }
  }

  // Has a default — use it
  if (declaration?.default !== undefined) {
    return {
      value: declaration.default,
      errors: [
        {
          variable: varName,
          category: 'informational',
          message: `Using default value for ${varName}`,
        },
      ],
    }
  }

  // Optional, no default — resolve to empty string
  return {
    value: '',
    errors: [
      {
        variable: varName,
        category: 'informational',
        message: `Optional variable ${varName} is absent; substituted with empty string`,
      },
    ],
  }
}

/**
 * Substitute all `${VAR_NAME}` patterns in a string.
 */
function substituteString(
  input: string,
  env: Record<string, string>,
  declaredEnv: Map<string, { required?: boolean; default?: string }>,
): { value: string; errors: SubstitutionError[] } {
  const errors: SubstitutionError[] = []
  const value = input.replace(VAR_PATTERN, (_match, varName: string) => {
    const result = resolveVar(varName, env, declaredEnv)
    errors.push(...result.errors)
    return result.value
  })
  return { value, errors }
}

/**
 * Substitute variables in all substitution-eligible fields of an
 * EffectiveConfiguration.  Returns a new configuration (the original is
 * not mutated).
 */
export function substituteVars(
  config: EffectiveConfiguration,
  env: Record<string, string>,
): SubstitutionResult {
  const errors: SubstitutionError[] = []
  const warnings: string[] = []

  // Build lookup for declared env entries
  const declaredEnv = new Map<string, { required?: boolean; default?: string }>()
  for (const entry of config.env) {
    declaredEnv.set(entry.name, { required: entry.required, default: entry.default })
  }

  // Deep-clone mcp-servers so we never mutate the input
  const servers: Record<string, McpServerStdio | McpServerRemote> = {}

  for (const [name, server] of Object.entries(config['mcp-servers'])) {
    if (server.transport === 'stdio') {
      const s = server as McpServerStdio
      // command
      const cmd = substituteString(s.command, env, declaredEnv)
      errors.push(...cmd.errors)

      // args
      const args = s.args?.map((arg) => {
        const r = substituteString(arg, env, declaredEnv)
        errors.push(...r.errors)
        return r.value
      })

      // env values (keys are NOT substituted)
      let serverEnv: Record<string, string> | undefined
      if (s.env) {
        serverEnv = {}
        for (const [key, val] of Object.entries(s.env)) {
          const r = substituteString(val, env, declaredEnv)
          errors.push(...r.errors)
          serverEnv[key] = r.value
        }
      }

      const cloned: McpServerStdio = { transport: 'stdio', command: cmd.value }
      if (args) cloned.args = args
      if (serverEnv) cloned.env = serverEnv
      servers[name] = cloned
    } else {
      const s = server as McpServerRemote
      // url
      const url = substituteString(s.url, env, declaredEnv)
      errors.push(...url.errors)

      // headers values (keys are NOT substituted)
      let headers: Record<string, string> | undefined
      if (s.headers) {
        headers = {}
        for (const [key, val] of Object.entries(s.headers)) {
          const r = substituteString(val, env, declaredEnv)
          errors.push(...r.errors)
          headers[key] = r.value
        }
      }

      const cloned: McpServerRemote = { transport: s.transport, url: url.value }
      if (headers) cloned.headers = headers
      servers[name] = cloned
    }
  }

  return {
    config: {
      ...config,
      'mcp-servers': servers,
    },
    errors,
    warnings,
  }
}
