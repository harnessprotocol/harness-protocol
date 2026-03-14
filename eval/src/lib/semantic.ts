import type { HarnessDocument, McpServerStdio, McpServerRemote } from './types.js'

export interface SemanticValidationResult {
  valid: boolean
  errors: string[]
}

const VAR_PATTERN_SOURCE = /\$\{([A-Z_][A-Z0-9_]*)\}/g.source

function extractVars(s: string): string[] {
  const vars: string[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(VAR_PATTERN_SOURCE, 'g')
  while ((match = re.exec(s)) !== null) {
    vars.push(match[1])
  }
  return vars
}

function checkVarReferences(doc: HarnessDocument, errors: string[]): void {
  const servers = doc['mcp-servers']
  if (!servers) return

  const declaredNames = new Set((doc.env ?? []).map((e) => e.name))

  for (const [serverName, server] of Object.entries(servers)) {
    const candidates: string[] = []

    if (server.transport === 'stdio') {
      const stdio = server as McpServerStdio
      candidates.push(stdio.command)
      for (const arg of stdio.args ?? []) {
        candidates.push(arg)
      }
      for (const val of Object.values(stdio.env ?? {})) {
        candidates.push(val)
      }
    } else {
      const remote = server as McpServerRemote
      candidates.push(remote.url)
      for (const val of Object.values(remote.headers ?? {})) {
        candidates.push(val)
      }
    }

    for (const str of candidates) {
      for (const varName of extractVars(str)) {
        if (!declaredNames.has(varName)) {
          errors.push(
            `mcp-servers["${serverName}"] references \${${varName}} but env[] has no entry with name "${varName}"`
          )
        }
      }
    }
  }
}

function checkPluginNameUniqueness(doc: HarnessDocument, errors: string[]): void {
  const plugins = doc.plugins ?? []
  const seen = new Set<string>()
  for (const plugin of plugins) {
    if (seen.has(plugin.name)) {
      errors.push(`plugins[].name "${plugin.name}" is not unique`)
    } else {
      seen.add(plugin.name)
    }
  }
}

function checkEnvNameUniqueness(doc: HarnessDocument, errors: string[]): void {
  const entries = doc.env ?? []
  const seen = new Set<string>()
  for (const entry of entries) {
    if (seen.has(entry.name)) {
      errors.push(`env[].name "${entry.name}" is not unique`)
    } else {
      seen.add(entry.name)
    }
  }
}

/**
 * Run semantic validation on a HarnessDocument.
 * These are cross-field constraints that JSON Schema can't express:
 * 1. ${VAR_NAME} references in mcp-servers must have matching env[] declarations
 * 2. plugins[].name must be unique
 * 3. env[].name must be unique
 */
export function validateSemantics(doc: HarnessDocument): SemanticValidationResult {
  const errors: string[] = []

  checkVarReferences(doc, errors)
  checkPluginNameUniqueness(doc, errors)
  checkEnvNameUniqueness(doc, errors)

  return { valid: errors.length === 0, errors }
}
