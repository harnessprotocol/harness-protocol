# Plugin Manifest

This document specifies the `plugin.json` format that plugin authors use to declare what their plugin provides and requires. The manifest is the plugin's contract with the Harness Protocol ecosystem.

---

## Overview

A plugin is a repository that conforms to the plugin manifest format. When a harness declares a plugin via `plugins[].source: owner/repo`, a conformant implementation fetches the `plugin.json` from that repository at the resolved version and reads it to understand what the plugin contains.

The manifest serves four purposes:

1. **Declaration** — tells the implementation what skills and agents the plugin provides, so they can be registered for the session.
2. **Requirements** — declares the environment variables the plugin needs, so the harness can validate them before starting.
3. **Compatibility** — specifies the minimum Harness Protocol version the plugin is written against.
4. **Discovery** — provides category and tags for search, browsing, and marketplace organization.

The `plugin.json` is for plugin **authors**. Harness authors reference plugins via `harness.yaml`; they do not write `plugin.json` files. If you are writing a harness configuration, see [Profile Schema](./profile-schema.md).

---

## File Location

The `plugin.json` manifest MUST be located at the repository root. An implementation resolves a plugin by:

1. Resolving the `source: owner/repo` to a repository.
2. Checking out the ref that satisfies the `version` semver range.
3. Reading `plugin.json` from the repository root.

If `plugin.json` is absent from the repository root, the plugin cannot be loaded and the implementation MUST surface an error.

---

## Top-Level Fields

### `name`

| Field | Type | Required |
|-------|------|----------|
| `name` | string | **Yes** |

The canonical name of the plugin. Must be lowercase letters, digits, and hyphens only. Max 64 characters. Pattern: `^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$`. Must start and end with a lowercase letter or digit.

The `name` in `plugin.json` does not need to match the `name` the harness author uses in their `plugins[]` entry — the harness `name` is a local alias. However, by convention, they SHOULD match for clarity.

```json
"name": "data-lineage"
```

---

### `description`

| Field | Type | Required |
|-------|------|----------|
| `description` | string | **Yes** |

A concise human-readable description of what the plugin does. Used in registry listings and tool discovery. Max 256 characters.

```json
"description": "SQL data lineage tracking: traces column-level lineage and impact analysis for PostgreSQL schemas."
```

---

### `version`

| Field | Type | Required |
|-------|------|----------|
| `version` | string | **Yes** |

The plugin's own semantic version. Must be a valid semver string (e.g., `"0.2.0"`, `"1.0.0-beta.1"`). This is the version that harness authors target in their `plugins[].version` semver range.

```json
"version": "0.2.0"
```

---

### `author`

| Field | Type | Required |
|-------|------|----------|
| `author` | object | No |
| `author.name` | string | Yes (if author present) |
| `author.url` | string (URI) | No |

The plugin author's name and optional URL.

```json
"author": {
  "name": "alice",
  "url": "https://github.com/alice"
}
```

---

### `license`

| Field | Type | Required |
|-------|------|----------|
| `license` | string | No |

An [SPDX](https://spdx.org/licenses/) license identifier. Strongly recommended for any publicly distributed plugin.

```json
"license": "Apache-2.0"
```

---

### `category`

| Field | Type | Required |
|-------|------|----------|
| `category` | string | No |

A classification label for discovery and marketplace organization. Must be lowercase kebab-case. Max 32 characters. Pattern: `^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$`.

```json
"category": "data-engineering"
```

Categories are conventional, not a closed set. The following are recommended starting points:

| Category | Description |
|----------|-------------|
| `productivity` | Workflow and session management |
| `code-quality` | Code review, explanation, analysis |
| `devops` | CI/CD, PR workflows, deployment |
| `research-knowledge` | Research and knowledge management |
| `documentation` | Doc generation and maintenance |
| `design` | Frontend design, UI/UX |
| `data-engineering` | Data pipelines, SQL, lineage |

A future registry (v2) MAY maintain a recommended category list. Plugin authors SHOULD use an existing category when one fits, but MAY define new ones.

---

### `tags`

| Field | Type | Required |
|-------|------|----------|
| `tags` | array of strings | No |

Discovery and classification tags that complement `category` with fine-grained descriptors. Max 10 tags, each max 32 characters. Tags MUST be unique within the array.

Tags use the same semantics as `harness.yaml` `metadata.tags` — free-form strings for search and filtering.

```json
"tags": ["sql", "data-lineage", "column-level", "postgresql"]
```

---

### `skills`

| Field | Type | Required |
|-------|------|----------|
| `skills` | array of strings | No |

An array of skill names this plugin provides. Each string is a skill identifier — lowercase, hyphens allowed. Skills are invocable as slash commands at runtime (e.g., a skill named `"research"` is invoked as `/research`).

The skill implementation files (prompt templates, context files) are located within the plugin repository. The manifest declares the names; the implementation resolves the files by convention.

```json
"skills": ["lineage-trace", "impact-analysis", "schema-diff"]
```

If a plugin declares no skills, omit this field or provide an empty array.

---

### `agents`

| Field | Type | Required |
|-------|------|----------|
| `agents` | array of strings | No |

An array of agent names this plugin provides. Each string is an agent identifier. Agents are specialized sub-agents with their own system prompts, tool permissions, and scope definitions.

```json
"agents": ["lineage-explorer"]
```

If a plugin declares no agents, omit this field or provide an empty array.

---

### `requires`

| Field | Type | Required |
|-------|------|----------|
| `requires` | object | No |

Declares the plugin's runtime requirements. If absent, the plugin has no declared requirements.

#### `requires.env`

| Field | Type | Required |
|-------|------|----------|
| `requires.env` | array | No |

An array of environment variable declarations using the same schema as the `env[]` entries in `harness.yaml`. See [Profile Schema: env](./profile-schema.md#env) for the full field reference.

When an implementation loads a plugin, it merges `requires.env` into the harness's effective env list. If the harness already declares a variable with the same name, the harness's declaration takes precedence. If the harness does not declare the variable, the plugin's declaration is added and the implementation validates accordingly.

```json
"requires": {
  "env": [
    {
      "name": "DB_CONNECTION_STRING",
      "description": "PostgreSQL connection string for lineage tracking",
      "required": true,
      "sensitive": true
    },
    {
      "name": "LINEAGE_SCHEMA",
      "description": "Schema to write lineage tables into",
      "required": false,
      "sensitive": false,
      "default": "_lineage"
    }
  ]
}
```

**Security rule:** The `sensitive: true` + `default` prohibition applies here identically to harness.yaml. A `plugin.json` with both `sensitive: true` and a `default` on the same env entry is invalid.

#### `requires.min-protocol`

| Field | Type | Required |
|-------|------|----------|
| `requires.min-protocol` | string | No |

The minimum Harness Protocol version this plugin is compatible with. Implementations MUST check this against the protocol version they implement and MUST refuse to load the plugin if the requirement is not met.

```json
"requires": {
  "min-protocol": "1"
}
```

In v1, the only valid value is `"1"`. Future protocol versions will add valid values as they are released.

---

### `loading`

| Field | Type | Required |
|-------|------|----------|
| `loading` | enum | No |

**Accepted values:** `eager` (default), `deferred`

The plugin author's recommended loading mode. This tells harness authors and implementations how the plugin is best consumed:

- `eager` — load all tools and context at session start. Appropriate for plugins whose tools are used frequently throughout a session.
- `deferred` — load on first invocation. Appropriate for plugins with large tool schemas or specialized tools that are only needed occasionally. Reduces initial context window size.

The harness author may override this recommendation in their `plugins[]` declaration. The `loading` field in `harness.yaml` takes precedence over the plugin manifest's recommendation.

```json
"loading": "deferred"
```

---

## Config Schema (Optional Convention)

If a plugin accepts `config` values (via `plugins[].config` in the consuming harness), plugin authors are encouraged to document the config schema either inline in the `plugin.json` or as a separate JSON Schema file at `config.schema.json` in the repository root. The Harness Protocol does not mandate a specific format for config schemas in v1, but the `config.schema.json` convention is recommended.

---

## Bundled MCP Server

A plugin MAY bundle its own MCP server by declaring an `mcp` field. This allows plugins to provide tool implementations that run as local subprocesses alongside the agent session.

### `mcp`

| Field | Type | Required |
|-------|------|----------|
| `mcp` | object | No |
| `mcp.server` | object | Yes (if `mcp` present) |

### `mcp.server` fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transport` | string | **Yes** | Must be `"stdio"`. Plugin-bundled servers run as local subprocesses. |
| `command` | string | **Yes** | Executable to launch. Supports `${CLAUDE_PLUGIN_ROOT}` for plugin-relative paths. |
| `args` | array of strings | No | Command-line arguments. Values may reference `${CLAUDE_PLUGIN_ROOT}`. |
| `env` | object | No | Additional environment variables for the server process. Values are strings. |

```json
"mcp": {
  "server": {
    "transport": "stdio",
    "command": "node",
    "args": ["${CLAUDE_PLUGIN_ROOT}/dist/server.js"],
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

### Server lifecycle

The implementation starts the bundled MCP server when the plugin is loaded and stops it when the plugin is unloaded or the session ends. Tools provided by the server are namespaced as `mcp__<plugin-name>__<tool>` to avoid collisions with other plugins and profile-level MCP servers.

### Variable substitution

The `${CLAUDE_PLUGIN_ROOT}` variable is substituted in `command` and `args` values. It resolves to the absolute path of the plugin's installation directory, allowing the plugin to reference its own files without hardcoding paths.

### Relationship to profile-level MCP servers

Plugin-bundled MCP servers and profile-level MCP servers (declared in `harness.yaml` → `mcp-servers`) operate in separate namespaces and do not conflict:

| Aspect | Plugin-bundled MCP | Profile-level MCP |
|--------|--------------------|-------------------|
| Declared in | `plugin.json` → `mcp` | `harness.yaml` → `mcp-servers` |
| Transport | `stdio` only | `stdio`, `http`, `sse`, `ws` |
| Namespace | `mcp__<plugin-name>__<tool>` | `mcp__<server-name>__<tool>` |
| Lifecycle | Starts/stops with plugin | Starts/stops with session |
| Variable substitution | `${CLAUDE_PLUGIN_ROOT}` | `${VAR_NAME}` from `env[]` |

---

## Full Example

```json
{
  "name": "data-lineage",
  "description": "SQL data lineage tracking: column-level lineage, impact analysis, and schema diff for PostgreSQL.",
  "version": "0.2.0",
  "author": {
    "name": "alice",
    "url": "https://github.com/alice"
  },
  "license": "Apache-2.0",
  "category": "data-engineering",
  "tags": ["sql", "data-lineage", "column-level", "postgresql"],
  "loading": "deferred",
  "skills": [
    "lineage-trace",
    "impact-analysis",
    "schema-diff"
  ],
  "agents": [
    "lineage-explorer"
  ],
  "requires": {
    "env": [
      {
        "name": "DB_CONNECTION_STRING",
        "description": "PostgreSQL connection string (e.g., postgresql://user:pass@host/db)",
        "required": true,
        "sensitive": true
      },
      {
        "name": "LINEAGE_SCHEMA",
        "description": "Schema name for lineage metadata tables",
        "required": false,
        "sensitive": false,
        "default": "_lineage"
      }
    ],
    "min-protocol": "1"
  }
}
```

---

## Validation Rules Summary

| Rule | Severity |
|------|----------|
| `name` is required and MUST match `^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$` — must start and end with a lowercase letter or digit | Error |
| `description` is required | Error |
| `version` is required and MUST be valid semver | Error |
| `category`, if present, MUST match `^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$` and be max 32 characters | Error |
| `tags`, if present, MUST have at most 10 unique items, each max 32 characters | Error |
| `requires.env[].sensitive: true` + `default` is forbidden | Error |
| `requires.min-protocol` MUST be a known protocol version string | Error |
| `author.name` is required if `author` object is present | Error |
| `license` MUST be a valid SPDX expression if present | Warning |
| Skill and agent name strings MUST be lowercase, hyphens allowed | Error |
| `loading`, if present, MUST be `"eager"` or `"deferred"` | Error |
| `mcp.server.transport`, if `mcp` present, MUST be `"stdio"` | Error |
| `mcp.server.command` is required if `mcp` is present | Error |
| Unknown top-level fields (not `x-` prefixed) | Warning (implementations SHOULD surface but not fail) |

---

## Relationship to `harness.yaml`

The plugin manifest and the harness profile are complementary documents authored by different people for different purposes:

| Concern | Where it lives |
|---------|---------------|
| What plugins a harness uses | `harness.yaml` → `plugins[]` |
| What a plugin provides | `plugin.json` → `skills`, `agents` |
| What env vars a harness needs | `harness.yaml` → `env[]` |
| What env vars a plugin needs | `plugin.json` → `requires.env[]` |
| Plugin version being requested | `harness.yaml` → `plugins[].version` |
| Plugin's own version | `plugin.json` → `version` |
| Plugin loading preference | `plugin.json` → `loading` |
| Plugin loading override | `harness.yaml` → `plugins[].loading` |
| Plugin content integrity | `harness.yaml` → `plugins[].integrity.sha256` |
| Plugin discovery metadata | `plugin.json` → `category`, `tags` |
| Plugin-bundled MCP server | `plugin.json` → `mcp` |
| Profile-level MCP servers | `harness.yaml` → `mcp-servers` |
