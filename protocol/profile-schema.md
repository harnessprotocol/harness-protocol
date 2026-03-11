# Profile Schema

This document specifies the complete `harness.yaml` format for Harness Protocol v1. Every field, constraint, and validation rule is defined here. The JSON Schema at `https://harnessprotocol.ai/schema/v1/harness.schema.json` is the machine-readable complement to this document.

---

## Document Structure

A `harness.yaml` file is a single YAML document. Top-level keys are defined in the sections below. Unknown top-level keys (other than those prefixed with `x-`) are a validation error.

```yaml
$schema: https://harnessprotocol.ai/schema/v1/harness.schema.json
version: "1"
kind: profile

metadata:
  name: my-harness
  description: "..."

plugins: [...]
mcp-servers: { ... }
env: [...]
instructions: { ... }
permissions: { ... }
extends: [...]
```

---

## `$schema`

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `$schema` | string (URI) | No | — |

A URI identifying the JSON Schema this document validates against. Including `$schema` enables schema-aware editors to provide validation and autocompletion.

**Recommended value:**
```yaml
$schema: https://harnessprotocol.ai/schema/v1/harness.schema.json
```

The presence or absence of `$schema` does not affect runtime validation. Implementations validate against the version-appropriate schema regardless.

---

## `version`

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `version` | string | Yes | — |

The Harness Protocol version. For v1, this must be the string `"1"` — not the integer `1`.

```yaml
version: "1"   # CORRECT: string
version: 1     # INCORRECT: integer (legacy format, pre-protocol)
```

**Backward compatibility.** The legacy harness-kit format used `version: 1` (integer) alongside `marketplaces:` and list-form `plugins:`. Implementations that need to support both formats should branch on `typeof version`: string signals Harness Protocol format; integer signals legacy format. Legacy format behavior is outside this specification.

**Validation rule:** If `version` is present and is not the string `"1"`, validation fails with a clear error indicating the unsupported version.

---

## `kind`

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `kind` | enum | No | `profile` |

**Accepted values:** `profile`, `fragment`

Declares the document type:

- `profile` — A complete harness document. All required fields are enforced. Suitable for direct application.
- `fragment` — A partial harness document. Required-field validation is relaxed. Used as a building block for composition via the `extends` mechanism or the v2 Exchange layer.

**Validation behavior:**

| kind | Required fields enforced | Structural validation | Co-constraints enforced |
|------|--------------------------|----------------------|------------------------|
| `profile` | Yes | Yes | Yes |
| `fragment` | No | Yes | Yes |

A fragment that is referenced in `extends` must be structurally valid (correct types, valid enums, no forbidden field combinations) even though it may be incomplete.

---

## `metadata`

`metadata` is required for `kind: profile` documents and optional for fragments.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes (profile) | Identifier for this harness. Lowercase letters, digits, hyphens only. Max 64 characters. |
| `description` | string | No | Human-readable description of the harness's purpose. |
| `author` | object | No | Author information. |
| `author.name` | string | Yes (if author present) | Author's display name. |
| `author.url` | string (URI) | No | URL for the author (GitHub profile, personal site, etc.). |
| `version` | string | No | Semantic version of this harness profile (e.g., `"1.0.0"`). Not the same as the protocol `version` field. |
| `license` | string | No | SPDX license identifier (e.g., `Apache-2.0`, `MIT`). |
| `tags` | array of strings | No | Search tags for registry discoverability. Each tag: lowercase, max 32 characters. Max 10 tags. |

### Constraints

- `metadata.name` must match the pattern `^[a-z0-9-]{1,64}$`.
- `metadata.version`, if present, must be a valid semver string.
- `metadata.license`, if present, must be a valid SPDX expression.

### Example

```yaml
metadata:
  name: data-engineer
  description: "Harness for data engineering workflows: SQL, lineage, dbt."
  author:
    name: John Siracusa
    url: https://github.com/siracusa5
  version: "1.0.0"
  license: Apache-2.0
  tags: [data-engineering, sql, dbt]
```

---

## `plugins`

`plugins` is an array of plugin declarations. Each entry references a plugin by source and version.

### Plugin Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Local name for this plugin within the harness. Used for override targeting in team overlays. |
| `source` | string | Yes | Plugin source in `owner/repo` format (e.g., `harnessprotocol/harness-kit`). |
| `version` | string | Yes | Semver range specifying the required plugin version (e.g., `">=0.2.0"`, `"^1.0.0"`). |
| `description` | string | No | Human-readable note about why this plugin is included. Informational only. |
| `config` | object | No | Plugin-specific configuration. Schema is defined by the individual plugin's `plugin.json`. |
| `integrity` | object | No | Content verification. |
| `integrity.sha256` | string | No | SHA-256 hash of the resolved plugin archive. Hex-encoded, lowercase. 64 characters. |

### Constraints

- `source` must match the pattern `^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$`.
- `version` must be a valid semver range expression.
- `integrity.sha256`, if present, must be a 64-character lowercase hex string.
- Plugin `name` values must be unique within the `plugins` array.
- If `integrity.sha256` is declared, implementations must verify the resolved plugin archive against this hash before loading. A mismatch is a fatal error.

### Inheritance (via `extends`)

When a child harness extends a parent, plugin lists are **unioned**. If both declare a plugin with the same `name`, the child's declaration takes precedence (including its `version` and `config`).

### Example

```yaml
plugins:
  - name: data-lineage
    source: harnessprotocol/harness-kit
    version: ">=0.2.0"
    description: "SQL lineage tracking and impact analysis"
    config:
      default-schema: public
    integrity:
      sha256: "a3f1e2b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2"

  - name: sql-assist
    source: harnessprotocol/plugins
    version: "^2.0.0"
```

---

## `mcp-servers`

`mcp-servers` is a map (YAML object) from server name to server declaration. Keys are the server names as exposed to the agent at runtime.

### Transport: stdio

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transport` | string | Yes | Must be `"stdio"`. |
| `command` | string | Yes | Executable to run (e.g., `uvx`, `npx`, `node`). |
| `args` | array of strings | No | Arguments to pass to the command. |
| `env` | object | No | Environment variable map passed to the process. Values may reference harness env declarations via `${VAR_NAME}` syntax. |

### Transport: http

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transport` | string | Yes | Must be `"http"`. |
| `url` | string (URI) | Yes | HTTP(S) URL of the MCP server endpoint. |
| `headers` | object | No | HTTP headers to include in requests. Values may reference harness env declarations via `${VAR_NAME}` syntax. |

### Environment Variable References

Values in `env` (for stdio) and `headers` (for http) may use `${VAR_NAME}` syntax to reference variables declared in the harness `env` array.

**Validation rule:** Every `${VAR_NAME}` reference in `mcp-servers` must correspond to a declared entry in the top-level `env` array. Referencing an undeclared variable name is a validation error. This rule ensures that all variable dependencies are visible in the harness document and that implementations can prompt for missing values before attempting to start servers.

### Inheritance (via `extends`)

When a child harness extends a parent, MCP server maps are **unioned** by server name. If both declare a server with the same name, the child's declaration takes precedence entirely (no field-level merge — the child's full server object wins).

### Example

```yaml
mcp-servers:
  postgres:
    transport: stdio
    command: uvx
    args:
      - mcp-server-postgres
      - --connection-string
      - "${DB_CONNECTION_STRING}"
    env:
      PGAPPNAME: my-harness

  data-api:
    transport: http
    url: "https://api.example.com/mcp"
    headers:
      Authorization: "Bearer ${DATA_API_TOKEN}"
      X-Client-Version: "1.0"
```

---

## `env`

`env` is an array of environment variable declarations. Each entry describes a variable that the harness requires or optionally uses at runtime.

### Env Entry Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | Variable name. Uppercase letters, digits, underscores. |
| `description` | string | No | — | Human-readable description of the variable's purpose and expected format. |
| `required` | boolean | No | `false` | If `true`, the implementation must verify the variable is set before applying the harness. Missing required variables are a fatal error. |
| `sensitive` | boolean | No | `true` | If `true`, the variable contains secret data. See security constraints below. |
| `when` | string | No | — | Conditional expression. If the condition evaluates to false, the variable is not required even if `required: true`. Condition syntax is implementation-defined in v1. |
| `default` | string | No | — | Default value used when the variable is not set in the environment. **Forbidden when `sensitive: true`.** |

### Security Constraints

- **`sensitive: true` + `default` is FORBIDDEN.** A harness with both `sensitive: true` and a `default` value on the same env entry must fail validation. Providing a default for a sensitive variable defeats the purpose of keeping it out of the harness file.
- Sensitive variable values must not appear in logs, error messages, or stored configuration.
- Implementations must treat env entries as `sensitive: true` by default. A variable is only non-sensitive when explicitly declared `sensitive: false`.

### Constraint: Declaration Coverage

Every variable referenced via `${VAR_NAME}` in `mcp-servers` must have a corresponding entry in `env`. The reverse is not required — `env` may declare variables that are not used in `mcp-servers` (they may be used by plugins or instructions).

### Inheritance (via `extends`)

When a child harness extends a parent, env arrays are **unioned** by variable name. If both declare the same variable name, the child's declaration takes precedence.

### Example

```yaml
env:
  - name: DB_CONNECTION_STRING
    description: "PostgreSQL connection string (e.g., postgresql://user:pass@host/db)"
    required: true
    sensitive: true

  - name: DATA_API_TOKEN
    description: "API token for the data service"
    required: true
    sensitive: true

  - name: DEFAULT_SCHEMA
    description: "Default schema to use for SQL operations"
    required: false
    sensitive: false
    default: "public"

  - name: ENABLE_LINEAGE
    description: "Enable automatic lineage tracking (true/false)"
    required: false
    sensitive: false
    default: "true"
    when: "plugins contains 'data-lineage'"
```

---

## `instructions`

`instructions` maps the three Claude-convention instruction scopes and controls how they combine with inherited instructions.

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `operational` | string or null | No | — | Instructions for how to work: build commands, architecture, gotchas. Maps to `CLAUDE.md`. Value is inline text, a `file://` path, or an `https://` URL. |
| `behavioral` | string or null | No | — | Instructions for how to behave: tone, autonomy level, workflow conventions. Maps to `AGENT.md`. Same value formats. |
| `identity` | string or null | No | — | Identity context for the agent. Maps to `SOUL.md`. Same value formats. Set to `null` to explicitly declare no identity instructions. |
| `import-mode` | enum | No | `merge` | How child instructions combine with parent instructions. Values: `merge`, `replace`, `skip`. |

### Value Formats

Each instruction field accepts three content formats:

| Format | Example | Description |
|--------|---------|-------------|
| Inline text | `"Always use conventional commits."` | Literal string content included directly. |
| File reference | `file://./instructions/operational.md` | Path relative to the harness file. Resolved at apply time. |
| URL reference | `https://example.com/instructions.md` | Fetched at apply time. Must be HTTPS. |

### Import Mode Semantics

**`merge` (default):** The child's instruction content is appended after the parent's instruction content for each field. Both sets of instructions are active. This is the safe default — it never silently discards parent instructions.

**`replace`:** The child's instruction content replaces the parent's entirely for fields the child declares. Fields the child does not declare pass through unchanged from the parent. Because `replace` discards parent instructions — which may include safety or policy constraints — conformant implementations **must require explicit user confirmation** before applying a profile that uses `import-mode: replace`.

**`skip`:** The child declares no instructions. The parent's instructions pass through to the session unchanged. Useful for fragments that are purely additive (plugins, MCP servers) and intentionally defer to whatever instructions the consuming profile uses.

### Inheritance Interaction

`import-mode` governs how this harness's instructions relate to the instructions inherited from `extends`. It does not affect how a child of this harness inherits from this harness — that is governed by the child's own `import-mode`.

### Example

```yaml
instructions:
  operational: file://./instructions/operational.md
  behavioral: |
    Prioritize correctness over speed. Always explain SQL query plans
    when writing new queries. Prefer CTEs over subqueries for readability.
  identity: null
  import-mode: merge
```

---

## `permissions`

`permissions` defines the tool access, filesystem access, and network access boundaries for the agent session.

### `permissions.tools`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `allow` | array of strings | No | Tool names or glob patterns the agent is permitted to use. |
| `deny` | array of strings | No | Tool names or glob patterns the agent is explicitly forbidden from using. Deny takes precedence over allow. |
| `ask` | array of strings | No | Tool names or glob patterns that require user confirmation before each use. |

Tool name patterns support `*` as a wildcard. Examples:
- `"Read"` — the Read tool by exact name
- `"mcp__*__delete_*"` — any MCP tool whose name contains "delete"
- `"Bash"` — the Bash tool

**Inheritance rules for tools:**
- `allow`: **Intersected** across the inheritance chain. A tool is allowed only if every ancestor that defines a `permissions.tools.allow` list includes it (or uses a matching pattern). Most restrictive wins.
- `deny`: **Unioned** across the inheritance chain. A tool is denied if any ancestor denies it. One ancestor's denial propagates to all children.
- `ask`: **Unioned** across the inheritance chain. If any ancestor requires confirmation for a tool, confirmation is required.

### `permissions.paths`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `writable` | array of strings | No | Paths (relative to project root) the agent may write to. Glob patterns supported. |
| `readonly` | array of strings | No | Paths the agent may read but not write. |

Path entries are relative to the project root unless they begin with `/`. Both `writable` and `readonly` support glob patterns.

**Inheritance rules for paths:** Path lists are unioned across the inheritance chain. A child can add writable/readonly paths but cannot remove paths that a parent has restricted. To remove a path restriction, use the team overlay syntax (v2 Exchange layer).

### `permissions.network`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `allowed-hosts` | array of strings | No | Hostnames or hostname patterns (supporting `*` wildcard) that the agent may make network requests to. |

If `allowed-hosts` is not declared, network permission behavior is implementation-defined.

**Inheritance rules for network:** `allowed-hosts` lists are unioned across the inheritance chain.

### Example

```yaml
permissions:
  tools:
    allow:
      - Read
      - Glob
      - Grep
      - Write
      - Edit
      - Bash
    deny:
      - "mcp__*__delete_*"
      - "mcp__*__drop_*"
    ask:
      - Bash
      - Write

  paths:
    writable:
      - src/
      - tests/
      - migrations/
    readonly:
      - config/
      - "*.lock"

  network:
    allowed-hosts:
      - "*.github.com"
      - "api.example.com"
```

---

## `extends`

`extends` is an ordered array of parent harness references. The current document is the child. Parents are resolved and applied before the child's fields are merged on top.

### Extends Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | string | Yes | Parent harness source. `owner/repo` format or a registry path (when Registry layer is available). |
| `version` | string | Yes | Semver range for the parent harness version. |

### Resolution Order

When multiple parents are listed, they are applied left to right. Later entries take precedence over earlier entries in the case of conflicts, before the child's own fields are applied. The child always takes final precedence.

For a harness with `extends: [A, B]`:
1. A is resolved and applied.
2. B is merged on top of A (B wins on conflicts).
3. The child's own fields are merged on top (child wins on conflicts).

### Section-Specific Merge Semantics

| Section | Merge behavior |
|---------|----------------|
| `plugins` | Union by `name`. Child/later wins on conflict. |
| `mcp-servers` | Union by server name. Child/later wins on conflict (full object, not field-level). |
| `env` | Union by `name`. Child/later wins on conflict. |
| `instructions` | Governed by `import-mode` (child's setting). |
| `permissions.tools.allow` | Intersection (most restrictive). |
| `permissions.tools.deny` | Union (any ancestor's denial propagates). |
| `permissions.tools.ask` | Union (any ancestor's ask propagates). |
| `permissions.paths` | Union (additive only). |
| `permissions.network` | Union (additive only). |
| `metadata` | Child's metadata is used as-is; parent metadata is not merged. |
| `kind` | Child's kind is used. |

### Circular Dependency

A harness must not extend itself directly or transitively. Implementations must detect circular `extends` chains and fail validation with a clear error.

### Example

```yaml
extends:
  - source: harnessprotocol/profiles/backend
    version: ">=1.0.0"
  - source: my-org/shared-harness
    version: "^2.1.0"
```

---

## `x-` Extension Fields

Any top-level key or nested key prefixed with `x-` is an implementation extension field. The core schema does not define their structure. Conformant implementations must:

1. **Not reject** a harness document solely because it contains unrecognized `x-` fields.
2. **Ignore** `x-` fields they do not support.
3. **Not allow** `x-` fields to shadow or override core schema fields.

Extension fields are not portable. Authors who use `x-` fields must document which implementation(s) support them.

```yaml
# Example: Claude Code-specific model hint (ignored by other implementations)
x-claude-model: claude-opus-4
x-claude-thinking-budget: 10000
```

---

## Full Example

```yaml
$schema: https://harnessprotocol.ai/schema/v1/harness.schema.json
version: "1"
kind: profile

metadata:
  name: data-engineer
  description: "Harness for data engineering: PostgreSQL, lineage, dbt."
  author:
    name: John Siracusa
    url: https://github.com/siracusa5
  version: "1.2.0"
  license: Apache-2.0
  tags: [data-engineering, postgresql, sql, dbt]

plugins:
  - name: data-lineage
    source: harnessprotocol/harness-kit
    version: ">=0.2.0"
    config:
      default-schema: public
    integrity:
      sha256: "a3f1e2b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2"

mcp-servers:
  postgres:
    transport: stdio
    command: uvx
    args: [mcp-server-postgres, --connection-string, "${DB_CONNECTION_STRING}"]

env:
  - name: DB_CONNECTION_STRING
    description: "PostgreSQL connection string"
    required: true
    sensitive: true

instructions:
  operational: file://./instructions/operational.md
  behavioral: "Prioritize query correctness. Explain plans for new queries."
  import-mode: merge

permissions:
  tools:
    allow: [Read, Glob, Grep, Write, Edit, Bash]
    deny: ["mcp__postgres__drop_*"]
    ask: [Bash]
  paths:
    writable: [sql/, migrations/, dbt/]
    readonly: [config/]
  network:
    allowed-hosts: ["*.github.com"]

extends:
  - source: harnessprotocol/profiles/backend
    version: ">=1.0.0"
```
