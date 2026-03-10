---
sidebar_position: 2
---

# Data Engineer Profile

A complete profile exercising every v1 section: metadata, plugins, mcp-servers, env, instructions, permissions, and extends.

**Scenario:** Working with PostgreSQL databases, dbt models, and data pipelines.

```yaml
$schema: https://harnessprotocol.ai/schema/v1/harness.schema.json
version: "1"

metadata:
  name: data-engineer
  description: Harness for SQL database work, dbt model development, and data pipeline debugging.
  author:
    name: John Siracusa
    url: https://github.com/siracusa5
  version: 1.0.0
  license: Apache-2.0
  tags:
    - data-engineering
    - sql
    - dbt
    - analytics
    - postgresql

plugins:
  - name: data-lineage
    source: siracusa5/harness-kit
    version: ">=0.3.0"
    description: Trace column-level lineage across dbt models and raw tables.

  - name: explain
    source: siracusa5/harness-kit
    description: Explain SQL query plans and dbt model dependencies.

  - name: research
    source: siracusa5/harness-kit

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

env:
  - name: DB_CONNECTION_STRING
    description: "PostgreSQL connection string. Example: postgresql://user:pass@localhost:5432/mydb"
    required: true
    sensitive: true

  - name: ANALYTICS_API_KEY
    description: API key for the analytics MCP server endpoint.
    required: false
    sensitive: true
    when: When using the analytics MCP server.

instructions:
  operational: |
    This harness is configured for data engineering work with PostgreSQL and dbt.
    Prefer set-based SQL rewrites over row-by-row loops, and always check the dbt
    model DAG before modifying a shared source model.
  behavioral: |
    When debugging slow queries, start with EXPLAIN ANALYZE before suggesting
    schema changes. Propose incremental dbt model refactors rather than full rewrites.
  import-mode: merge

permissions:
  tools:
    allow:
      - Read
      - Glob
      - Bash
      - mcp__postgres__*
    deny:
      - mcp__*__drop_*
      - mcp__*__delete_*
    ask:
      - mcp__postgres__execute_migration

  paths:
    writable:
      - models/
      - seeds/
    readonly:
      - prod_config/

  network:
    allowed-hosts:
      - "*.github.com"
      - "pypi.org"
      - "hub.getdbt.com"
      - "analytics.example.com"

extends:
  - source: harnessprotocol/profiles/base
    version: ">=1.0.0"
```

## Notes

- `DB_CONNECTION_STRING` is required and sensitive — you'll be prompted for it at apply time
- `ANALYTICS_API_KEY` is optional — only needed if you use the analytics MCP server
- The `deny` rules block destructive DDL even if the postgres MCP server exposes it
- `prod_config/` is readonly — the agent can read production configs but not modify them
