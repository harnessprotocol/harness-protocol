---
title: Add architectural_constraints section to v1 schema
hep: 3
type: Standards Track
status: Accepted
authors: [siracusa5 <siracusa5>]
sponsor: siracusa5
created: 2026-04-18
---

## Motivation

Production harness systems rely on a hybrid enforcement model combining LLM-based review, deterministic linters, and structural tests. Böckeler's analysis of the OpenAI codebase maintenance project identifies this as the "Architectural Constraints" layer of a mature harness.

Currently, the Harness Protocol has no explicit section for declaring these constraints. Linters and tests are often added ad-hoc via plugins or custom shell scripts, making it difficult for:
- Tools to discover which architectural rules apply to a harness
- Teams to audit what constraints are enforced and at what enforcement level
- Harnesses to express intent: is a linter a hard blocker, a warning, or a suggestion?

This HEP adds a first-class `architectural-constraints` section to v1 that makes constraint enforcement visible, auditable, and portable across implementations.

## Specification

### Schema Addition

Add a new top-level `architectural-constraints` field to `harness.schema.json`:

```json
"architectural-constraints": {
  "type": "object",
  "description": "Declarative constraints enforcing architectural patterns, module boundaries, and structural invariants. Three enforcement levels: deterministic (linters, structural tests — cannot be overridden), review (LLM-based, can request exceptions), advisory (warnings, may be silenced).",
  "properties": {
    "linters": {
      "type": "array",
      "description": "Deterministic enforcement rules: naming conventions, module boundaries, code patterns. Violations block commits or merges.",
      "items": {
        "type": "object",
        "required": ["name", "description"],
        "properties": {
          "name": {
            "type": "string",
            "description": "Linter identifier (e.g., 'module-boundary-checker', 'naming-convention')."
          },
          "description": {
            "type": "string",
            "description": "What invariant this linter enforces."
          },
          "enforcement": {
            "type": "string",
            "enum": ["block", "warn"],
            "default": "block",
            "description": "'block' = violations prevent merge. 'warn' = violations logged but don't prevent merge."
          },
          "config": {
            "type": "object",
            "description": "Tool-specific linter configuration (keys are tool-dependent; e.g., eslint-compatible rules, ArchUnit assertions).",
            "additionalProperties": true
          },
          "source": {
            "type": "string",
            "description": "Where this linter is defined: 'custom' (in this harness), or a GitHub path (e.g., 'owner/repo/path/to/linter.md')."
          }
        },
        "additionalProperties": false
      }
    },
    "structural-tests": {
      "type": "array",
      "description": "Programmatic tests verifying architectural invariants (e.g., ArchUnit, layered architecture tests, module isolation). Failures block deployment.",
      "items": {
        "type": "object",
        "required": ["name", "description"],
        "properties": {
          "name": {
            "type": "string",
            "description": "Test identifier (e.g., 'module-isolation', 'layered-architecture')."
          },
          "description": {
            "type": "string",
            "description": "What architectural invariant this test verifies."
          },
          "entrypoint": {
            "type": "string",
            "description": "Command to run the test (e.g., 'gradle architectureTest', 'python -m pytest tests/architecture/')."
          },
          "enforcement": {
            "type": "string",
            "enum": ["block", "warn"],
            "default": "block",
            "description": "'block' = test failures prevent merge. 'warn' = failures logged but don't prevent merge."
          },
          "source": {
            "type": "string",
            "description": "Where this test is defined: 'custom' (in this harness), or a GitHub path."
          }
        },
        "additionalProperties": false
      }
    },
    "review-policy": {
      "type": "object",
      "description": "LLM-based review policies: what patterns agents should watch for, when to flag for human review.",
      "properties": {
        "enabled": {
          "type": "boolean",
          "default": true,
          "description": "Whether LLM review is active for this harness."
        },
        "model": {
          "type": "string",
          "description": "Model to use for review (implementation-specific; e.g., 'gpt-4', 'claude-opus')."
        },
        "patterns": {
          "type": "array",
          "description": "Architectural patterns to verify. Each pattern is a prose guideline for the review agent.",
          "items": {
            "type": "object",
            "required": ["name", "rule"],
            "properties": {
              "name": {
                "type": "string",
                "description": "Pattern name (e.g., 'module-cohesion', 'circular-dependency-prevention')."
              },
              "rule": {
                "type": "string",
                "description": "Prose description of what the pattern enforces and why."
              },
              "severity": {
                "type": "string",
                "enum": ["error", "warning", "info"],
                "default": "warning",
                "description": "'error' = blocks merge if reviewer detects violation. 'warning' = flagged but merge allowed. 'info' = noted but non-blocking."
              }
            },
            "additionalProperties": false
          }
        },
        "guidance": {
          "type": "string",
          "description": "Optional prose guidance document describing the harness's architectural philosophy. Agents use this to calibrate reviews."
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

### Specification Prose

Add a new section to `protocol/specification.md` (after the plugins section):

---

## Architectural Constraints

A harness declares architectural constraints to enforce structural rules, naming conventions, and design patterns. Constraints operate at three enforcement levels:

- **Deterministic** (linters, structural tests): Cannot be overridden; violations block commits or merges.
- **Review** (LLM-based): Probabilistic; may request exceptions or suggest alternatives.
- **Advisory**: Warnings or suggestions that do not block progress.

### Motivation

Production AI-maintained codebases require defense-in-depth enforcement: LLM reviewers catch semantic issues but can be "convinced" to accept technically sound but architecturally inconsistent code. Deterministic linters and structural tests provide guarantees that reviewers cannot. Together, they form a hybrid enforcement model that scales.

The harness declares these constraints explicitly so:
- Tools can discover and apply them uniformly
- Teams audit what rules apply to their codebase
- Harnesses remain portable across implementations

### Structure

`architectural-constraints` is an optional object with three sub-sections:

#### Linters

A linter is a deterministic rule enforcer. Each linter:
- Has a name (e.g., `module-boundary-checker`)
- Declares what invariant it enforces
- Specifies enforcement level: `block` (violations prevent merge) or `warn` (violations logged)
- Provides configuration (tool-specific rules, patterns, thresholds)
- Declares source: `custom` (defined in this harness) or a GitHub path

Example:

```yaml
architectural-constraints:
  linters:
    - name: module-boundary-checker
      description: Enforces that agents do not import across module boundaries
      enforcement: block
      config:
        boundaries:
          - module: /src/auth
            may_import_from: [/src/common, /src/types]
          - module: /src/database
            may_import_from: [/src/common, /src/types]
      source: custom
```

#### Structural Tests

A structural test verifies an architectural invariant programmatically (similar to ArchUnit or Layered Architecture tests). Each test:
- Has a name (e.g., `layered-architecture`)
- Declares what invariant it verifies
- Provides an entrypoint (command to run the test)
- Specifies enforcement: `block` or `warn`
- Declares source

Example:

```yaml
architectural-constraints:
  structural-tests:
    - name: layered-architecture
      description: Verifies that each layer only depends on layers below it
      entrypoint: gradle architectureTest
      enforcement: block
      source: custom
```

#### Review Policy

A review policy declares LLM-based architectural review rules. Unlike linters (deterministic), review policies allow for exception requests and are calibrated to the harness's design philosophy.

Each policy includes:
- `enabled`: Whether LLM review is active
- `model`: Which model to use for review (implementation-specific)
- `patterns`: An array of architectural patterns to verify, each with a name, prose rule, and severity level
- `guidance`: Optional document describing the harness's architectural principles (agents read this to calibrate reviews)

Example:

```yaml
architectural-constraints:
  review-policy:
    enabled: true
    model: claude-opus
    patterns:
      - name: module-cohesion
        rule: Ensure each module has a single, clear responsibility. Modules with more than 3 public APIs should be reconsidered.
        severity: warning
      - name: dependency-direction
        rule: Dependency flow is strictly one direction. Circular dependencies are never acceptable.
        severity: error
    guidance: |
      This harness follows a layered architecture:
      - api/: HTTP handlers and request validation
      - service/: Business logic and orchestration
      - repository/: Data access
      - types/: Shared data types
      Dependencies flow: api → service → repository. types is imported by all layers.
```

### Validation

- All linter and structural-test names must be unique within their respective arrays
- At least one constraint (linter, structural test, or review policy) must be declared if the section is present
- `source: custom` constraints must have supporting files or documentation in the harness
- Review policy patterns are validated for completeness (name, rule, severity all present)

### Portability

Tools must:
1. Discover and apply all linters and structural tests declared in the harness
2. Use the review policy to configure LLM-based architectural review (if supported)
3. Report violations of deterministic constraints (linters, structural tests) that block merges
4. Report review-level findings separately from deterministic violations

A harness using only `source: custom` constraints is fully portable. Harnesses referencing external sources (GitHub paths) depend on tool support for fetching those sources.

---

## Rationale

**Evidence basis.** The architectural constraints model is drawn from Böckeler's analysis of OpenAI's harness engineering approach, which combines LLM review, deterministic linters, and structural tests into a three-layer defense system.

**Type: Standards Track.** This HEP modifies the schema and adds a normative specification section. Implementations must validate the `architectural-constraints` field according to this spec.

**Optional field.** A harness without `architectural-constraints` remains fully valid; the field is optional to avoid breaking existing harnesses.

**Hybrid enforcement model.** The three enforcement levels (deterministic, review, advisory) reflect production practice: deterministic rules are non-negotiable, review-level findings support architectural guidance, and advisory constraints allow teams to record emerging patterns without breaking automation.

## Backward Compatibility

The field is optional; all existing `harness.yaml` files remain valid. Adding `architectural-constraints` to a profile or fragment is purely additive.

## Security Considerations

Constraints declared in a harness must be validated before enforcement. A malicious harness could declare expensive deterministic linters or structural tests with high runtime overhead; tools should apply reasonable limits on linter and test count (suggested: ≤20 linters, ≤10 structural tests).

Review policies that reference external GitHub sources introduce a dependency on external systems; tools should validate source URLs and use reasonable cache/timeout strategies.
