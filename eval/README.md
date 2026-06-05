# Harness Protocol Eval Framework

Automated validation suite for the Harness Protocol v1 spec. Tests schema conformance, cross-field semantics, inheritance resolution, and compiler output — proving the spec is implementable and internally consistent.

## Quick Start

```sh
cd eval
pnpm install
pnpm test
```

## What's Tested

**253 tests** across 14 test files validating the testable claims from the spec.

### Schema Conformance (83 tests)

Validates `harness.schema.json` and `plugin.schema.json` using Ajv 2020-12.

- **Positive** (`harness-valid.test.ts`) — All 5 example files pass, plus edge cases: fragments, empty collections, all 4 transport types, extension fields, import-modes, boundary values.
- **Negative** (`harness-invalid.test.ts`) — Every constraint that should reject: version format, metadata patterns, source format, env naming, integrity hashes, tags limits, sensitive+default interaction, transport requirements, unknown fields.
- **Plugin** (`plugin-schema.test.ts`) — Plugin manifest validation: required fields, version format, name pattern.
- **Skills** (`skills.test.ts`) — First-class `skills` section (HEP-4): required fields, name pattern, loading enum, integrity hash, `additionalProperties`.
- **MCP modernization** (`mcp-modernization.test.ts`) — `streamable-http` transport, `http` alias, legacy `sse`, server `source`/`version`/`integrity` provenance, integrity rejected on remote transports (HEP-5).
- **Policy** (`policy.test.ts`) — Governance `policy` section (HEP-6): allow/deny source lists, permission ceilings, `require-integrity`, structural rejections.

### Semantic Validation (12 tests)

Cross-field constraints that JSON Schema can't express (`semantic.ts`):

- `${VAR_NAME}` references in `mcp-servers` must have matching `env[]` declarations
- `plugins[].name` must be unique
- `skills[].name` must be unique
- `env[].name` must be unique

### Inheritance Resolution (59 tests)

Reference implementation of the merge rules from `protocol/inheritance.md` (`resolver.ts`):

| Section | Rule |
|---------|------|
| `plugins` | Union by name; child wins |
| `skills` | Union by name; child wins (`enabled: false` suppresses) |
| `mcp-servers` | Union by name; full object replacement |
| `env` | Union by name; child wins |
| `instructions` | Governed by `import-mode` (merge/replace/skip) |
| `tools.allow` | Intersection (most restrictive wins) |
| `tools.deny` | Union (any denial propagates) |
| `tools.ask` | Union (any ask propagates) |
| `paths` | Union (writable + readonly additive) |
| `network` | Union (hosts additive) |
| `metadata` | Child only; parent discarded |

Also tests: multi-parent resolution, 3-level chains, fragment composition, circular dependency detection, and depth limits.

Includes an end-to-end test reproducing the 3-level inheritance example from the spec (org-base → data-team → alice-data-engineer) and verifying every row of the expected effective configuration table.

### Compiler — Claude Code Target (20 tests)

Compiles a resolved `EffectiveConfiguration` to Claude Code native config files (`compiler.ts`):

| Output File | Source |
|-------------|--------|
| `CLAUDE.md` | `instructions.operational` with section markers |
| `AGENT.md` | `instructions.behavioral` with section markers |
| `SOUL.md` | `instructions.identity` (omitted when null) |
| `.mcp.json` | `mcp-servers` with `transport` → `type` rename |
| `.claude/settings.json` | `permissions` (allow, deny, additionalDirectories) |

### Source Resolution (29 tests)

Source format parsing and version resolution (`source.ts`):

- Source string parsing: remote (`owner/repo`), remote with path, local (`./`, `../`), invalid formats
- Version resolution: exact match, caret (`^`), tilde (`~`), gte (`>=`), pre-release handling, edge cases

### Application Semantics (30 tests)

Variable substitution and error categorization (`substitute.ts`):

- **Effective configuration** (`effective-config.test.ts`) — Variable substitution in all MCP server transport fields, default value fallback, missing required variable errors, substitution scope boundaries
- **Error categories** (`error-categories.test.ts`) — Classification of all 16 error types into fatal/warning/informational tiers

### Real-World Scenarios (19 tests)

End-to-end pipelines proving the spec works in practice:

1. **Data engineering workflow** — Load `data-engineer.harness.yaml`, validate, resolve inheritance, compile, verify output
2. **Team hierarchy** — 3-level org → team → individual with permission intersection/propagation
3. **Fragment composition** — Profile extending 3 independent fragments
4. **Minimal viable profile** — Smallest valid config through the full pipeline

## Architecture

```
eval/
├── src/
│   ├── lib/
│   │   ├── schema.ts      # Ajv 2020-12 schema validators
│   │   ├── yaml.ts         # YAML parser (documents integer coercion trap)
│   │   ├── types.ts        # TypeScript interfaces matching JSON schemas
│   │   ├── semantic.ts     # Cross-field validation rules
│   │   ├── resolver.ts     # Inheritance resolver (13 merge rules)
│   │   ├── compiler.ts     # Claude Code compiler prototype
│   │   ├── source.ts       # Source string parsing + version resolution
│   │   └── substitute.ts   # Variable substitution + error categorization
│   └── tests/
│       ├── schema/         # Schema conformance (positive + negative)
│       ├── semantic/       # Cross-field constraint tests
│       ├── inheritance/    # Merge rule + multi-level tests
│       ├── compiler/       # Compiler output verification
│       ├── resolution/     # Source format parsing + version resolution
│       ├── application/    # Effective config + error categories
│       └── scenarios/      # End-to-end real-world scenarios
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## CI

The eval suite runs automatically on pushes and PRs that touch `schema/`, `protocol/`, `examples/`, or `eval/`. See `.github/workflows/eval.yml`.
