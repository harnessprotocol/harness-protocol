# MCP Declarations

This document specifies how MCP (Model Context Protocol) servers are declared in `harness.yaml` under the `mcp-servers:` key. For the reference field table, see [Profile Schema: mcp-servers](./profile-schema.md#mcp-servers). This document provides expanded detail, security requirements, and practical examples.

---

## Why Harness Profiles Declare MCP Servers

MCP servers are the primary mechanism by which AI coding tools gain access to domain-specific tools: databases, APIs, file systems, search indexes, and more. Without a portable declaration format, a developer who configures a PostgreSQL MCP server in Claude Code must reconfigure it from scratch in Cursor, and again when onboarding a new teammate. The configuration is tied to the tool, not to the project or the developer's workflow.

The `mcp-servers:` section in `harness.yaml` decouples server configuration from any specific AI coding tool. A harness author declares what MCP servers the harness needs — including how to start them and what environment variables they require — and a conformant implementation handles lifecycle management. The same declaration runs in Claude Code, Cursor, Copilot, or any other conformant harness implementation.

This is analogous to how `docker-compose.yml` declares services without tying them to a specific machine: the declaration is portable; the execution is local.

---

## Transport Types

MCP servers communicate over one of several transports. The Harness Protocol supports:

| Transport | Value | Status | Description |
|-----------|-------|--------|-------------|
| `stdio` | `"stdio"` | Recommended (local) | Local process launched by the implementation; communicates via stdin/stdout. |
| `streamable-http` | `"streamable-http"` | Recommended (remote) | Remote server accessed via HTTP(S) using the canonical MCP streamable HTTP transport. |
| `http` | `"http"` | Alias | Accepted alias for `streamable-http`. Implementations MUST treat it identically. |
| `sse` | `"sse"` | Legacy / deprecated | Remote server accessed via the legacy MCP Server-Sent Events transport. Retained for compatibility; not recommended for new servers. |
| `ws` | `"ws"` | Non-standard | WebSocket transport. Implementation-specific; not part of the recommended set. Retained for forward compatibility. |

The `transport` field is required on every MCP server declaration. A declaration without a `transport` field fails validation.

**Transport guidance.** New remote servers SHOULD use `streamable-http`. `http` remains accepted as an alias and existing declarations continue to work unchanged. `sse` is deprecated — implementations MAY warn when it is declared. `ws` is non-standard; an implementation that does not support a transport value SHOULD treat it as unsupported rather than failing the whole document (see the enum-additions guarantee in [Extension Points](../extensions/extension-points.md)).

---

## Transport: `stdio`

The `stdio` transport starts a local process and communicates with it via standard input/output. This is the most common transport for developer-machine MCP servers (database proxies, filesystem tools, CLI wrappers).

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transport` | string | Yes | Must be `"stdio"`. |
| `command` | string | Yes | The executable to invoke. May be an absolute path, a binary on `$PATH`, or a package runner like `uvx` or `npx`. Supports `${VAR_NAME}` substitution. |
| `args` | array of strings | No | Arguments passed to `command` in order. Each element supports `${VAR_NAME}` substitution. |
| `env` | object | No | Key-value pairs added to the process environment. Values support `${VAR_NAME}` substitution. This object is **merged** with the inherited environment — it does not replace it. Keys present in both this object and the parent environment use the value from this object. |
| `source` | string | No | Provenance identifier (reverse-DNS registry identity or `owner/repo`). Records where the server originates; does not change how `command` is invoked. See [Server Provenance and Integrity](#server-provenance-and-integrity). |
| `version` | string | No | Version or semver range for the server package, complementing any version pinned in `args`. |
| `integrity` | object | No | `{ sha256 }` — content verification for the server package, where verifiable. |

### Variable Substitution in `stdio`

`${VAR_NAME}` substitution applies in `command`, `args` elements, and `env` values. It does not apply in `env` keys.

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
      PGAPPNAME: "harness-session"
      PGCONNECT_TIMEOUT: "10"
```

### Security Considerations: stdio

The `command` field specifies an executable that the implementation will run on the user's machine with the user's privileges. Authors sharing harness profiles that declare `stdio` MCP servers should be aware:

- **Users must verify what they are running.** An `stdio` MCP server declaration can cause arbitrary code execution. Conformant implementations SHOULD surface the full command to the user before starting MCP servers declared in a profile that was imported from an external source (as opposed to authored locally).
- **Package runners (`uvx`, `npx`) fetch packages at runtime.** A declaration like `command: uvx` with `args: [mcp-server-postgres]` invokes the published package at the resolved version. Pin versions in args where precision matters (e.g., `mcp-server-postgres==1.2.3` for uvx).
- **`integrity.sha256` for plugins does not cover MCP server binaries.** The integrity field applies to the harness-kit plugin archive, not to the MCP server binary that a `stdio` declaration invokes. Users relying on supply-chain integrity must verify the MCP server package through their package manager's own verification mechanisms.

---

## Transport: `streamable-http` (and the `http` alias)

The `streamable-http` transport connects to a remote MCP server using the canonical MCP streamable HTTP transport over HTTPS. Use this for MCP servers that run as network services rather than local processes. `http` is an accepted alias and behaves identically; new servers SHOULD declare `streamable-http`.

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transport` | string | Yes | `"streamable-http"` (canonical) or `"http"` (alias). |
| `url` | string (URI) | Yes | The endpoint URL. Must be HTTPS in production contexts. Supports `${VAR_NAME}` substitution. |
| `headers` | object | No | HTTP headers sent with every request to the server. Values support `${VAR_NAME}` substitution. Keys do not. |
| `source` | string | No | Provenance identifier (reverse-DNS registry identity or `owner/repo`). See [Server Provenance and Integrity](#server-provenance-and-integrity). |
| `version` | string | No | Version or semver range identifying the remote server build. |

### Variable Substitution in `http`

`${VAR_NAME}` substitution applies in `url` and `headers` values.

```yaml
mcp-servers:
  data-api:
    transport: http
    url: "https://api.example.com/mcp"
    headers:
      Authorization: "Bearer ${DATA_API_TOKEN}"
      X-Workspace-Id: "${WORKSPACE_ID}"
```

---

## Transport: `sse`

The `sse` transport connects to a remote MCP server using the legacy MCP SSE (Server-Sent Events) transport. **This transport is deprecated.** It is retained only for compatibility with older MCP server implementations; new MCP servers SHOULD use `streamable-http`. Implementations MAY warn when `sse` is declared.

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transport` | string | Yes | Must be `"sse"`. |
| `url` | string (URI) | Yes | The SSE endpoint URL. Must be HTTPS in production contexts. Supports `${VAR_NAME}` substitution. |
| `headers` | object | No | HTTP headers sent with requests. Values support `${VAR_NAME}` substitution. |

The field structure is identical to `http`. The difference is the wire protocol: `sse` uses a persistent SSE stream from the server; `http` uses the newer streamable HTTP transport.

---

## Transport: `ws`

The `ws` transport connects to a remote MCP server over a WebSocket connection.

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transport` | string | Yes | Must be `"ws"`. |
| `url` | string (URI) | Yes | The WebSocket URL. Must use `wss://` in production contexts. Supports `${VAR_NAME}` substitution. |
| `headers` | object | No | HTTP headers sent in the WebSocket handshake. Values support `${VAR_NAME}` substitution. |

```yaml
mcp-servers:
  realtime-api:
    transport: ws
    url: "wss://realtime.example.com/mcp"
    headers:
      Authorization: "Bearer ${REALTIME_API_TOKEN}"
```

---

## Variable Substitution: Complete Reference

Any value field in `mcp-servers` that supports substitution uses the `${VAR_NAME}` syntax. The substitution rules are:

1. `VAR_NAME` is resolved from the runtime environment at apply time.
2. If `VAR_NAME` is not set in the environment and has no `default` in the harness `env` declaration, the implementation MUST surface a missing-variable error before attempting to start or connect to the server.
3. Substitution is performed on the full string value. A field may contain multiple references: `"${HOST}:${PORT}"` is valid.
4. References to undeclared variables — those without a corresponding entry in the top-level `env` array — are a validation error. The harness file MUST NOT validate if a `${VAR_NAME}` reference cannot be traced to an `env` entry.

### Declaration Coverage Requirement

**Every `${VAR_NAME}` reference in `mcp-servers` MUST have a matching entry in the top-level `env` array.** This is a behavioral constraint enforced at validation time. It ensures:

- All variable dependencies are visible in the harness document.
- Implementations can prompt for missing values before attempting to start servers.
- Users inspecting a harness can identify all required secrets without reading implementation source code.

```yaml
# CORRECT: every reference has an env declaration
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
```

```yaml
# INVALID: ${DB_PASSWORD} has no env declaration — validation error
mcp-servers:
  postgres:
    transport: stdio
    command: uvx
    args: [mcp-server-postgres, --password, "${DB_PASSWORD}"]

env:
  # DB_PASSWORD is missing — this harness fails validation
```

---

## Security Considerations: Remote Transports

Remote transports (`http`, `sse`, `ws`) connect to network endpoints. Harness profiles from external sources can declare remote MCP server endpoints that route agent traffic through infrastructure the user has not vetted.

### SSRF Prevention

Conformant implementations **MUST** reject `url` values that resolve to RFC 1918 private addresses or localhost, unless the user has explicitly opted in to local-network MCP server connections. This prevents a malicious or compromised harness from using the implementation as a proxy to reach internal services on the user's network (Server-Side Request Forgery).

Blocked address ranges for automatic rejection:

| Range | Description |
|-------|-------------|
| `127.0.0.0/8` | IPv4 loopback |
| `10.0.0.0/8` | RFC 1918 private |
| `172.16.0.0/12` | RFC 1918 private |
| `192.168.0.0/16` | RFC 1918 private |
| `::1/128` | IPv6 loopback |
| `fc00::/7` | IPv6 unique local |
| `169.254.0.0/16` | Link-local |

URL validation MUST resolve hostnames before checking — a hostname that DNS-resolves to a private address MUST be rejected even if the literal URL does not look like a private address (DNS rebinding protection).

### HTTPS Enforcement

`http` and `sse` transports SHOULD require `https://` URLs in non-development contexts. `ws` SHOULD require `wss://`. Implementations MAY warn on `http://` or `ws://` URLs and SHOULD document any development-mode override.

### Header Values and Secrets

Headers in remote transport declarations frequently carry bearer tokens. Header values support `${VAR_NAME}` substitution, and any variable holding a token SHOULD be declared `sensitive: true` in the `env` array. Implementations MUST NOT log resolved header values for sensitive variables.

---

## Server Provenance and Integrity

MCP server declarations may carry optional provenance metadata. These fields make a server's origin auditable and, for local packages, verifiable. They are declarative — they document and enable verification but do not change how a server is launched or contacted.

| Field | Applies to | Description |
|-------|-----------|-------------|
| `source` | all transports | A provenance identifier: a registry identity in reverse-DNS form (e.g., `io.github.owner/server`) or `owner/repo`. Resolves against the MCP registry / `.well-known` server-card discovery. |
| `version` | all transports | A version or semver range identifying the server build. |
| `integrity.sha256` | `stdio` only | Lowercase hex SHA-256 of the server package archive. Implementations SHOULD verify when present and WARN when absent for externally-sourced servers. |

`integrity` is `stdio`-only because remote transports have no fetched archive to hash; remote servers rely on TLS and registry/identity verification instead. This closes the gap noted under [Security Considerations: stdio](#security-considerations-stdio): the plugin `integrity` field never covered MCP server packages, and `mcp-servers[].integrity` now provides per-server verification. When an organization sets `policy.require-integrity: true` (see [Profile Schema: policy](./profile-schema.md#policy)), a missing integrity hash is a fatal validation error rather than a warning.

```yaml
mcp-servers:
  postgres:
    transport: stdio
    command: uvx
    args: [mcp-server-postgres, --connection-string, "${DB_CONNECTION_STRING}"]
    source: "io.github.example/postgres"
    version: "1.4.2"
    integrity:
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
```

## Authorization, Registry, and Discovery

**Authorization.** Remote MCP servers authorize callers with an OAuth 2.1 flow that binds an access token to a specific server (resource indicators), so a token issued for one server cannot be replayed against another. The Harness Protocol does not model this handshake — it is a runtime negotiation between the client and an authorization server. A portable harness supplies only the token *reference*: a `headers` value such as `Authorization: "Bearer ${SERVER_TOKEN}"` referencing a `sensitive` `env` entry. Implementations perform the OAuth flow at runtime and MUST NOT log resolved sensitive header values.

**Registry and discovery.** A server's `source` identity resolves against the MCP registry (reverse-DNS names) and, where published, a `.well-known` server card describing the server's metadata and capabilities. These are resolution targets for `source`; the protocol does not require an implementation to consult them, but a conformant implementation that does SHOULD use them to surface provenance to the user before connecting.

## Inheritance

When a child harness extends a parent via `extends`, MCP server maps are **unioned** by server name. Resolution follows the same order as all other sections: parents merge left-to-right, then the child's declarations override.

Key rules:
- **Same name = child wins, entirely.** If a child and a parent both declare a server named `postgres`, the child's full server object is used. There is no field-level merge within a single server declaration.
- **New names from child are added.** If the child declares a server name not present in any parent, it is added to the effective set.
- **New names from parent are inherited.** If the parent declares a server the child does not mention, the child inherits it as-is.

```yaml
# Parent profile declares two servers
mcp-servers:
  postgres:
    transport: stdio
    command: uvx
    args: [mcp-server-postgres, --connection-string, "${DB_CONNECTION_STRING}"]
  filesystem:
    transport: stdio
    command: npx
    args: [-y, "@modelcontextprotocol/server-filesystem", "/workspace"]

# Child profile: overrides postgres, inherits filesystem, adds redis
mcp-servers:
  postgres:
    transport: stdio
    command: uvx
    args: [mcp-server-postgres, --connection-string, "${DB_CONNECTION_STRING}", --schema, "${DEFAULT_SCHEMA}"]
  redis:
    transport: stdio
    command: uvx
    args: [mcp-server-redis, --url, "${REDIS_URL}"]
```

The effective `mcp-servers` for the child is: child's `postgres`, parent's `filesystem`, child's `redis`.

---

## Practical Examples

### PostgreSQL via uvx

The most common pattern: use `uvx` (a Python package runner) to run a published MCP server package without a global install.

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
      PGAPPNAME: "harness-session"

env:
  - name: DB_CONNECTION_STRING
    description: "PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/mydb)"
    required: true
    sensitive: true
```

### Filesystem MCP Server

Grants the agent read/write access to a specific directory tree through the MCP filesystem server.

```yaml
mcp-servers:
  filesystem:
    transport: stdio
    command: npx
    args:
      - "-y"
      - "@modelcontextprotocol/server-filesystem"
      - "${WORKSPACE_ROOT}"

env:
  - name: WORKSPACE_ROOT
    description: "Absolute path to the workspace directory the agent may access"
    required: true
    sensitive: false
```

### Remote REST API with Bearer Auth

A remote MCP server exposing a domain API, authenticated with a bearer token stored in an environment variable.

```yaml
mcp-servers:
  platform-api:
    transport: http
    url: "https://api.example.com/v2/mcp"
    headers:
      Authorization: "Bearer ${PLATFORM_API_TOKEN}"
      X-API-Version: "2"
      X-Client: "harness-protocol"

env:
  - name: PLATFORM_API_TOKEN
    description: "API bearer token for platform-api. Generate at https://example.com/settings/tokens"
    required: true
    sensitive: true
```

### Multi-Server Harness

A harness connecting to both a local database server and a remote search API.

```yaml
mcp-servers:
  postgres:
    transport: stdio
    command: uvx
    args:
      - mcp-server-postgres
      - --connection-string
      - "${DB_CONNECTION_STRING}"

  search:
    transport: http
    url: "https://search.example.com/mcp"
    headers:
      Authorization: "Bearer ${SEARCH_API_KEY}"

env:
  - name: DB_CONNECTION_STRING
    description: "PostgreSQL connection string"
    required: true
    sensitive: true

  - name: SEARCH_API_KEY
    description: "API key for the search service"
    required: true
    sensitive: true
```
