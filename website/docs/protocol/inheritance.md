---
sidebar_position: 8
---

# Inheritance

A harness profile can extend a base profile using the `extends` field. Child values override parent values.

## Declaring inheritance

```yaml
extends:
  - source: harnessprotocol/profiles/base
    version: ">=1.0.0"
```

Multiple base profiles are supported. They are applied left-to-right — later entries override earlier ones.

## Merge semantics

| Section | Merge behavior |
|---------|----------------|
| `plugins` | Lists are merged. Duplicate `name` entries: child wins. |
| `mcp-servers` | Maps are merged. Duplicate keys: child wins. |
| `env` | Lists are merged. Duplicate `name` entries: child wins. |
| `instructions` | Governed by `import-mode`. `merge` appends; `replace` overwrites. |
| `permissions` | Maps are merged deeply. Allow/deny/ask lists are concatenated. |
| `metadata` | Scalar fields: child wins. |

## Example

Base profile at `harnessprotocol/profiles/base`:

```yaml
version: "1"
metadata:
  name: base
instructions:
  operational: |
    Use conventional commits. Keep PRs small and focused.
  import-mode: merge
```

Child profile:

```yaml
extends:
  - source: harnessprotocol/profiles/base

metadata:
  name: data-engineer

plugins:
  - name: data-lineage
    source: harnessprotocol/harness-kit

instructions:
  operational: |
    This harness adds: prefer set-based SQL over row-by-row loops.
  import-mode: merge
```

Effective instructions after merge:

```
Use conventional commits. Keep PRs small and focused.
This harness adds: prefer set-based SQL over row-by-row loops.
```
