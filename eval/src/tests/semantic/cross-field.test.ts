import { describe, it, expect } from 'vitest'
import { validateSemantics } from '../../lib/semantic.js'
import type { HarnessDocument } from '../../lib/types.js'

function makeDoc(overrides: Partial<HarnessDocument> = {}): HarnessDocument {
  return { version: '1', ...overrides }
}

describe('Semantic Validation — Cross-Field Constraints', () => {
  it('all refs have matching env entries → valid', () => {
    const doc = makeDoc({
      'mcp-servers': {
        myserver: {
          transport: 'stdio',
          command: 'npx',
          args: ['--token', '${API_TOKEN}'],
          env: { TOKEN: '${API_TOKEN}' },
        },
      },
      env: [
        { name: 'API_TOKEN', description: 'API token', required: true },
      ],
    })
    const result = validateSemantics(doc)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('undeclared var in args → invalid', () => {
    const doc = makeDoc({
      'mcp-servers': {
        myserver: {
          transport: 'stdio',
          command: 'npx',
          args: ['--token', '${MISSING_TOKEN}'],
        },
      },
      env: [],
    })
    const result = validateSemantics(doc)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('MISSING_TOKEN'))).toBe(true)
  })

  it('undeclared var in mcp-servers env values → invalid', () => {
    const doc = makeDoc({
      'mcp-servers': {
        myserver: {
          transport: 'stdio',
          command: 'npx',
          args: [],
          env: { MY_KEY: '${UNDECLARED_VAR}' },
        },
      },
      env: [],
    })
    const result = validateSemantics(doc)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('UNDECLARED_VAR'))).toBe(true)
  })

  it('undeclared var in url → invalid', () => {
    const doc = makeDoc({
      'mcp-servers': {
        remote: {
          transport: 'http',
          url: 'https://api.example.com/${MISSING_PATH}',
        },
      },
      env: [],
    })
    const result = validateSemantics(doc)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('MISSING_PATH'))).toBe(true)
  })

  it('multiple ${VAR} in one string, one missing → invalid', () => {
    const doc = makeDoc({
      'mcp-servers': {
        myserver: {
          transport: 'stdio',
          command: 'npx',
          args: ['--host', '${DECLARED_HOST}:${MISSING_PORT}'],
        },
      },
      env: [{ name: 'DECLARED_HOST', description: 'host' }],
    })
    const result = validateSemantics(doc)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('MISSING_PORT'))).toBe(true)
    // DECLARED_HOST should not appear in errors
    expect(result.errors.some((e) => e.includes('DECLARED_HOST'))).toBe(false)
  })

  it('unreferenced env entry (declared but not used) → valid', () => {
    const doc = makeDoc({
      'mcp-servers': {
        myserver: {
          transport: 'stdio',
          command: 'npx',
          args: [],
        },
      },
      env: [{ name: 'UNUSED_VAR', description: 'not used anywhere' }],
    })
    const result = validateSemantics(doc)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('duplicate plugin names → invalid', () => {
    const doc = makeDoc({
      plugins: [
        { name: 'my-plugin', source: 'registry:my-plugin@1.0.0' },
        { name: 'other-plugin', source: 'registry:other-plugin@1.0.0' },
        { name: 'my-plugin', source: 'registry:my-plugin@2.0.0' },
      ],
    })
    const result = validateSemantics(doc)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('my-plugin'))).toBe(true)
  })

  it('duplicate env names → invalid', () => {
    const doc = makeDoc({
      env: [
        { name: 'API_KEY', description: 'first' },
        { name: 'OTHER_VAR', description: 'other' },
        { name: 'API_KEY', description: 'duplicate' },
      ],
    })
    const result = validateSemantics(doc)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('API_KEY'))).toBe(true)
  })

  it('no mcp-servers → valid', () => {
    const doc = makeDoc({
      env: [{ name: 'SOME_VAR', description: 'some var' }],
    })
    const result = validateSemantics(doc)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('undeclared var in command → fail', () => {
    const doc = makeDoc({
      'mcp-servers': {
        myserver: {
          transport: 'stdio',
          command: '${MISSING_COMMAND}',
          args: [],
        },
      },
      env: [],
    })
    const result = validateSemantics(doc)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('MISSING_COMMAND'))).toBe(true)
  })

  it('undeclared var in headers → fail', () => {
    const doc = makeDoc({
      'mcp-servers': {
        remote: {
          transport: 'http',
          url: 'https://api.example.com',
          headers: { Authorization: 'Bearer ${MISSING_TOKEN}' },
        },
      },
      env: [],
    })
    const result = validateSemantics(doc)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('MISSING_TOKEN'))).toBe(true)
  })
})
