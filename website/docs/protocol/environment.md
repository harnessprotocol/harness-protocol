---
sidebar_position: 6
---

# Environment

Environment variable declarations document what the harness needs from the runtime environment.

## Format

```yaml
env:
  - name: DB_CONNECTION_STRING
    description: "PostgreSQL connection string. Example: postgresql://user:pass@localhost:5432/mydb"
    required: true
    sensitive: true

  - name: LOG_LEVEL
    description: Logging verbosity for the data pipeline scripts.
    required: false
    sensitive: false
    default: info

  - name: ANALYTICS_API_KEY
    description: API key for the analytics MCP server.
    required: false
    sensitive: true
    when: When using the analytics MCP server.
```

## Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `name` | ✓ | — | Variable name |
| `description` | — | — | Human-readable explanation |
| `required` | — | `false` | Whether absence should fail harness apply |
| `sensitive` | — | `true` | Whether the value is a secret |
| `default` | — | — | Default value. **Forbidden when `sensitive: true`** |
| `when` | — | — | Conditional note for optional vars |

## Sensitive defaults are forbidden

The schema structurally prevents `default` values on sensitive variables:

```yaml
# INVALID — schema will reject this
- name: API_KEY
  sensitive: true
  default: my-secret-key  # ← forbidden
```

This prevents secrets from being committed to harness files. Sensitive values must always be provided by the user at apply time.

## Non-sensitive variables

```yaml
- name: LOG_LEVEL
  sensitive: false     # opt out of default-sensitive behavior
  default: info        # allowed because sensitive: false
```

`sensitive: true` is the default — you must explicitly set `sensitive: false` to allow a default value.
