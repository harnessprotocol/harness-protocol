# Harness Protocol Eval Framework

Automated validation suite for the Harness Protocol v1 spec. Tests schema conformance, cross-field semantics, inheritance resolution, and compiler output — proving the spec is implementable and internally consistent.

## Quick Start

```sh
cd eval
pnpm install
pnpm test
```

## What's Tested

**157 tests** across 7 test files validating 46+ testable claims from the spec.

### Schema Conformance (55 tests)

Validates `harness.schema.json` and `plugin.schema.json` using Ajv 2020-12.

- **Positive** (`harness-valid.test.ts`) — All 5 example files pass, plus edge cases: fragments, empty collections, all 4 transport types, extension fields, import-modes, boundary values.
- **Negative** (`harness-invalid.test.ts`) — Every constraint that should reject: version format, metadata patterns, source format, env naming, integrity hashes, tags limits, sensitive+default interaction, transport requirements, unknown fields.
- **Plugin** (`plugin-schema.test.ts`) — Plugin manifest validation: required fields, version format, name pattern.

### Semantic Validation (11 tests)

Cross-field constraints that JSON Schema can't express (`semantic.ts`):

- `${VAR_NAME}` references in `mcp-servers` must have matching `env[]` declarations
- `plugins[].name` must be unique
- `env[].name` must be unique

### Inheritance Resolution (53 tests)

Reference implementation of all 12 merge rules from `protocol/inheritance.md` (`resolver.ts`):

| Section | Rule |
|---------|------|
| `plugins` | Union by name; child wins |
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

### Compiler — Claude Code Target (19 tests)

Compiles a resolved `EffectiveConfiguration` to Claude Code native config files (`compiler.ts`):

| Output File | Source |
|-------------|--------|
| `CLAUDE.md` | `instructions.operational` with section markers |
| `AGENT.md` | `instructions.behavioral` with section markers |
| `SOUL.md` | `instructions.identity` (omitted when null) |
| `.mcp.json` | `mcp-servers` with `transport` → `type` rename |
| `.claude/settings.json` | `permissions` (allow, deny, additionalDirectories) |

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
│   │   ├── resolver.ts     # Inheritance resolver (12 merge rules)
│   │   └── compiler.ts     # Claude Code compiler prototype
│   └── tests/
│       ├── schema/         # Schema conformance (positive + negative)
│       ├── semantic/       # Cross-field constraint tests
│       ├── inheritance/    # Merge rule + multi-level tests
│       ├── compiler/       # Compiler output verification
│       └── scenarios/      # End-to-end real-world scenarios
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Known Spec Discrepancies

Two prose-schema mismatches documented in test comments (schema is authoritative per `protocol/architecture.md`):

1. **`metadata.name` pattern** — Schema: `^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$` (no leading/trailing hyphen). Prose: `^[a-z0-9-]{1,64}$` (allows them).
2. **`env[].name` pattern** — Schema: `^[A-Z_][A-Z0-9_]*$` (allows leading `_`). Prose: `^[A-Z][A-Z0-9_]*$` (no leading `_`).

## CI

The eval suite runs automatically on pushes and PRs that touch `schema/`, `protocol/`, `examples/`, or `eval/`. See `.github/workflows/eval.yml`.
