---
sidebar_position: 4
---

# MCP Servers

MCP servers expose tools to the AI agent. The Harness Protocol supports both local (stdio) and remote (http) servers.

## Declaring servers

```yaml
mcp-servers:
  postgres:
    transport: stdio
    command: uvx
    args:
      - mcp-server-postgres
      - ${DB_CONNECTION_STRING}

  analytics-api:
    transport: http
    url: https://analytics.example.com/mcp/v1
    headers:
      Authorization: Bearer ${ANALYTICS_API_KEY}
```

Each server is identified by a short name (used in tool identifiers like `mcp__postgres__query`) and a transport definition.

## Environment variable references

Server args and headers may reference environment variables using `${VAR_NAME}` syntax. Every referenced variable **must** have a matching entry in the `env` section:

```yaml
env:
  - name: DB_CONNECTION_STRING
    description: PostgreSQL connection string.
    required: true
    sensitive: true
```

The harness runtime substitutes values at apply time. Sensitive values are never written to disk.

## Trust model

Local stdio servers run as subprocesses with the same permissions as the harness runtime. Remote http servers are treated as untrusted — their responses should not be injected directly into the AI context without sanitization.

See [Trust Boundaries](../security/trust-boundaries) for the full trust model.
