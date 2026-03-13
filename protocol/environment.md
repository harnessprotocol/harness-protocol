# Environment Declarations

This document specifies the `env:` section of `harness.yaml`. Environment declarations serve three purposes: documentation (what variables does this harness need and why), user prompting (implementations surface missing required variables before starting), and security validation (sensitive variables are never stored as defaults).

---

## Overview

A harness that uses environment variables — in MCP server arguments, in headers, in plugin configuration — must declare every one of them in the top-level `env` array. The declaration is not optional for referenced variables: any `${VAR_NAME}` reference in `mcp-servers` without a matching `env` entry is a validation error.

Beyond the cross-reference requirement, `env` declarations give implementations the information they need to:

- Prompt the user for required variables during install or import of a new profile.
- Warn at session start when required variables are absent from the environment.
- Distinguish secrets from non-secrets so they can handle values appropriately (masking logs, not displaying in UI, etc.).
- Skip prompting for optional variables that are not applicable in the current scenario.

The `env` array may also declare variables that no `mcp-servers` entry references directly — for example, variables consumed by plugins at runtime or referenced in instruction content. The coverage requirement is one-directional: every `${VAR_NAME}` in `mcp-servers` must be declared; not every declared variable must be referenced in `mcp-servers`.

---

## Field Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | The environment variable name. Must match `^[A-Z][A-Z0-9_]*$` — uppercase letters, digits, and underscores, starting with a letter. |
| `description` | string | Yes | — | Human-readable explanation of the variable's purpose, expected format, and where to obtain a value. Shown to users during prompting. |
| `required` | boolean | No | `false` | If `true`, the implementation must verify the variable is present in the environment before completing the apply step. A missing required variable is a fatal error — the harness must not be partially applied. |
| `sensitive` | boolean | No | `true` | If `true`, the variable contains secret or personally sensitive data. See security constraints below. The default is `true`, meaning variables are treated as sensitive unless explicitly declared otherwise. |
| `when` | string | No | — | Human-readable description of when this variable is needed (e.g., `"When accessing private GitHub repositories"`). Implementations MAY evaluate it as a condition expression but are not required to do so; when not evaluated, it is displayed as informational text. |
| `default` | string | No | — | Default value used when the variable is not present in the environment. **Forbidden when `sensitive` is `true` (or absent, since the default for `sensitive` is `true`).** This constraint is schema-enforced. |

---

## The `sensitive` + `default` Prohibition

**A harness entry with `sensitive: true` (or no `sensitive` field, since `true` is the default) must not include a `default` value.** This is a schema-level hard error.

```yaml
# INVALID: sensitive variable with a default
env:
  - name: API_TOKEN
    description: "API bearer token"
    required: true
    sensitive: true
    default: "dev-token-placeholder"  # FORBIDDEN — validation error
```

```yaml
# VALID: sensitive variable, no default
env:
  - name: API_TOKEN
    description: "API bearer token"
    required: true
    sensitive: true
```

```yaml
# VALID: non-sensitive variable with a default
env:
  - name: LOG_LEVEL
    description: "Logging verbosity (debug, info, warn, error)"
    required: false
    sensitive: false
    default: "info"
```

### Rationale

Providing a default for a sensitive variable defeats the purpose of keeping secrets out of the harness file. A default value is stored in `harness.yaml`, which may be committed to version control, shared with teammates, or published to the Registry. A bearer token or database password stored as a default becomes a secret committed in plaintext.

The prohibition is intentional, schema-enforced, and has no bypass. Authors who want to provide example values for documentation purposes should put them in the `description` field, not `default`.

---

## Sensitive Variable Handling Requirements

Implementations must apply the following rules to all variables declared `sensitive: true` (or with no `sensitive` declaration, since the default is `true`):

- **Never log sensitive values.** Log entries must not contain the resolved value of a sensitive variable. If a command line is logged for debugging, sensitive argument values must be redacted.
- **Never display sensitive values in UI.** Prompts asking the user for a sensitive variable must use a password-style input (characters obscured). Values must not be echoed.
- **Never include sensitive values in error messages.** If an MCP server fails to start, the error message must not include the values of sensitive environment variables — even if those values appear in the command line or environment of the failed process.
- **Never write sensitive values to disk** as part of harness state, session logs, or debug output.

---

## The `when` Field

The `when` field is a human-readable description of when a variable is needed. Its primary purpose is display: implementations show it to users when prompting for or listing variables, so users understand which variables apply to their specific use of the harness.

Implementations MAY also evaluate `when` as a condition expression — for example, `"plugins contains 'data-lineage'"` — to suspend the `required` constraint when the condition is false. When an implementation evaluates `when` as a condition and the condition is false, the variable is treated as entirely optional: the implementation does not prompt for it and does not fail if it is absent. When an implementation does not evaluate `when` programmatically, it is displayed as informational text alongside the variable name and description. Either behavior is conformant in v1.

Examples:

```yaml
env:
  - name: LINEAGE_DB_URL
    description: "Separate database URL for lineage metadata storage"
    required: true
    sensitive: true
    when: "plugins contains 'data-lineage'"

  - name: SENTRY_DSN
    description: "Sentry DSN for error reporting"
    required: false
    sensitive: true
    when: "When ENVIRONMENT is set to 'production'"
```

When `when` is absent, normal `required` enforcement applies unconditionally.

---

## How Implementations Use Env Declarations

### At Install / Import Time

When a user imports a harness profile for the first time, the implementation should scan the `env` array and:

1. Identify all entries where `required: true` and no current environment value exists.
2. Present the user with a summary of missing required variables, including their `description` and `name`.
3. Prompt the user to supply values for sensitive variables through a secure input method.
4. For non-sensitive variables with no value, offer to set them in the environment or use a `default` if one is present.

This install-time prompting prevents the common failure mode of a harness silently failing at apply time because a variable is unset.

### At Session Start

At the start of each session where a harness is active, the implementation should:

1. Verify all `required: true` variables (subject to `when` evaluation) are present in the environment.
2. If any required variable is absent, surface a warning that identifies the variable by name and description.
3. Fail the harness apply if any required variable is absent — do not start MCP servers or apply permissions with a partially resolved configuration.

### Never Log or Display Sensitive Values

As noted in the sensitivity requirements, implementations must ensure that the resolved values of sensitive variables never appear in any output that could be captured, shared, or stored.

---

## Cross-Field Validation: Declaration Coverage

Every `${VAR_NAME}` reference in the `mcp-servers` section must have a matching `env` entry. This is a behavioral constraint enforced during validation. It is not fully expressible as a JSON Schema constraint (which operates on structure, not cross-field semantics), so conformant implementations must implement it as an additional validation pass after JSON Schema validation.

The algorithm:

1. Scan all string values in `mcp-servers` (including nested `env` values, `args` elements, `url`, `headers` values, and `command`) for `${VAR_NAME}` patterns.
2. Build a set of all referenced variable names.
3. Build a set of all declared variable names from the top-level `env` array.
4. If any referenced name is not in the declared set, fail validation with a message identifying the undeclared reference and its location in the document.

```
Validation error: mcp-servers.postgres.args[2] references "${DB_PASSWORD}"
but no env entry declares DB_PASSWORD.
```

---

## Inheritance

When a child harness extends a parent via `extends`, env arrays are **unioned** by variable name.

Resolution order follows the general inheritance rule: parents merge left-to-right, then the child's declarations override. For env:

- If a variable name appears in both parent and child, **the child's declaration entirely replaces the parent's** for that variable. There is no field-level merge within a single env entry.
- If a variable appears in a parent but not the child, the parent's declaration is inherited as-is.
- If a variable appears in the child but not any parent, it is added to the effective env set.

```yaml
# Parent declares DB_CONNECTION_STRING as required
env:
  - name: DB_CONNECTION_STRING
    description: "PostgreSQL connection string"
    required: true
    sensitive: true

# Child overrides it to add a more specific description
env:
  - name: DB_CONNECTION_STRING
    description: "PostgreSQL connection string for the billing service replica (read-only)"
    required: true
    sensitive: true
  - name: BILLING_SCHEMA
    description: "Schema name for billing tables"
    required: false
    sensitive: false
    default: "billing"
```

The effective env for the child is: child's `DB_CONNECTION_STRING` declaration, plus child's `BILLING_SCHEMA`. The parent's `DB_CONNECTION_STRING` declaration is discarded in favor of the child's.

---

## Examples

### Required sensitive variable (API key)

```yaml
env:
  - name: OPENAI_API_KEY
    description: "OpenAI API key. Obtain at https://platform.openai.com/api-keys"
    required: true
    sensitive: true
```

`sensitive` defaults to `true`, so it could be omitted here — but explicit declaration is clearer for harnesses intended for sharing.

### Optional sensitive variable (conditional token)

```yaml
env:
  - name: DATADOG_API_KEY
    description: "Datadog API key for metrics export. Only required in production environments."
    required: true
    sensitive: true
    when: "env.ENVIRONMENT == 'production'"
```

In development (where `ENVIRONMENT` is not `production`), this variable is not required and the implementation does not prompt for it.

### Non-sensitive variable with a default (log level)

```yaml
env:
  - name: LOG_LEVEL
    description: "Logging verbosity. One of: debug, info, warn, error"
    required: false
    sensitive: false
    default: "info"
```

`sensitive: false` must be explicit here — omitting `sensitive` would default it to `true`, and `true` + `default` is forbidden.

### Full env section for a data engineering harness

```yaml
env:
  - name: DB_CONNECTION_STRING
    description: "PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/mydb)"
    required: true
    sensitive: true

  - name: DATA_API_TOKEN
    description: "Bearer token for the data platform API. Generate at https://data.example.com/settings/tokens"
    required: true
    sensitive: true

  - name: DEFAULT_SCHEMA
    description: "Default schema for SQL operations"
    required: false
    sensitive: false
    default: "public"

  - name: LINEAGE_ENABLED
    description: "Enable automatic lineage tracking (true/false)"
    required: false
    sensitive: false
    default: "true"
    when: "plugins contains 'data-lineage'"
```
