---
sidebar_position: 2
---

# Profile Schema

Full field reference for `harness.yaml`. This is the normative specification for the Schema layer.

## Top-level fields

### `$schema`

```yaml
$schema: https://harnessprotocol.ai/schema/v1/harness.schema.json
```

Optional but strongly recommended. Enables editor autocomplete and inline validation in VS Code and other JSON Schema-aware editors.

### `version`

```yaml
version: "1"
```

**Required.** Must be the string `"1"` (quoted). The integer `1` is recognized as the legacy format for backward compatibility but is not valid protocol v1.

### `kind`

```yaml
kind: profile   # default
kind: fragment
```

Profiles are complete documents subject to required-field validation. Fragments are partial documents intended for composition — they skip required-field checks and can declare a subset of fields.

### `metadata`

```yaml
metadata:
  name: data-engineer          # required
  description: SQL and dbt workflows.
  author:
    name: John Siracusa
    url: https://github.com/siracusa5
  version: 1.0.0               # semver
  license: Apache-2.0
  tags:
    - data-engineering
    - sql
```

`metadata.name` is required for profiles. All other fields are optional.

---

## `plugins`

```yaml
plugins:
  - name: data-lineage
    source: harnessprotocol/harness-kit
    version: ">=0.3.0"
    description: Trace column-level lineage across dbt models and raw tables.
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✓ | Plugin identifier — the skill name used in `/plugin install` commands |
| `source` | ✓ | `owner/repo` path resolved via GitHub by default |
| `version` | — | Semver range (e.g. `">=0.3.0"`, `"^1.0.0"`) |
| `description` | — | Human-readable description for import wizards |

---

## `mcp-servers`

MCP servers are declared as a mapping of short name → server definition.

### stdio server

```yaml
mcp-servers:
  postgres:
    transport: stdio
    command: uvx
    args:
      - mcp-server-postgres
      - ${DB_CONNECTION_STRING}
```

| Field | Required | Description |
|-------|----------|-------------|
| `transport` | ✓ | `stdio` — harness launches a local subprocess |
| `command` | ✓ | Executable name |
| `args` | — | Argument list. `${VAR}` references must have matching `env` entries |

### http server

```yaml
mcp-servers:
  analytics-api:
    transport: http
    url: https://analytics.example.com/mcp/v1
    headers:
      Authorization: Bearer ${ANALYTICS_API_KEY}
```

| Field | Required | Description |
|-------|----------|-------------|
| `transport` | ✓ | `http` — harness connects to a remote endpoint |
| `url` | ✓ | Full endpoint URL |
| `headers` | — | HTTP headers. Use `${VAR}` for secrets |

---

## `env`

```yaml
env:
  - name: DB_CONNECTION_STRING
    description: PostgreSQL connection string.
    required: true
    sensitive: true

  - name: LOG_LEVEL
    description: Logging verbosity.
    required: false
    sensitive: false
    default: info
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✓ | Environment variable name |
| `description` | — | Explains what the variable is for |
| `required` | — | Whether the harness will fail without it. Default: `false` |
| `sensitive` | — | Whether the value is a secret. Default: `true` |
| `default` | — | Default value. **Forbidden when `sensitive: true`** |
| `when` | — | Human-readable condition string (e.g. "When using the analytics MCP server") |

`sensitive: true` is the default to prevent accidental secret exposure. Set `sensitive: false` only for genuinely non-secret values.

---

## `instructions`

```yaml
instructions:
  operational: |
    Prefer set-based SQL over row-by-row loops.
    Check the dbt DAG before modifying shared source models.
  behavioral: |
    When debugging slow queries, start with EXPLAIN ANALYZE.
  import-mode: merge
```

| Field | Description |
|-------|-------------|
| `operational` | Injected into the AI context as system-level guidance |
| `behavioral` | Injected as behavioral preferences |
| `import-mode` | `merge` (append to existing instructions) or `replace` (overwrite). Default: `merge` |

`merge` is the default to preserve the user's existing safety rules and conventions.

---

## `permissions`

```yaml
permissions:
  tools:
    allow:
      - Read
      - Glob
      - Bash
      - mcp__postgres__*
    deny:
      - mcp__*__drop_*
    ask:
      - mcp__postgres__execute_migration

  paths:
    writable:
      - models/
    readonly:
      - prod_config/

  network:
    allowed-hosts:
      - "*.github.com"
      - "pypi.org"
```

Permissions express declarative capability intent. Conforming implementations enforce their own permission model — the spec does not mandate a specific enforcement mechanism.

---

## `extends`

```yaml
extends:
  - source: harnessprotocol/profiles/base
    version: ">=1.0.0"
```

Inherits from a base profile. Child values override parent values. See [Inheritance](./inheritance) for merge semantics.
