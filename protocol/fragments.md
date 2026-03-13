# Fragments

This document specifies the `kind: fragment` feature of the Harness Protocol. Fragments are partial harness documents designed for sharing and composition — the building block layer beneath complete profiles.

---

## What Is a Fragment?

A fragment is a `harness.yaml` document with `kind: fragment`. It is structurally valid but intentionally incomplete: it may omit fields that would be required in a full profile. A fragment is not directly applicable as a harness configuration — it is a reusable piece of configuration meant to be composed into one.

The most common fragment shapes are:

- A single MCP server declaration, packaged for sharing.
- A bundle of related plugins (e.g., all the tools needed for a specific workflow).
- A reusable instruction block (e.g., organizational coding standards).
- A permissions baseline (e.g., read-only tool restrictions for a security-conscious team).

The distinction in one sentence: **a profile can be applied; a fragment cannot be applied directly but can be composed into profiles.**

---

## How Fragments Differ from Profiles

The only behavioral difference between `kind: fragment` and `kind: profile` is **required-field validation**:

| Validation rule | `kind: profile` | `kind: fragment` |
|-----------------|-----------------|------------------|
| Required fields enforced (`version`, `metadata.name`, etc.) | Yes | No |
| Structural validity (correct types, valid enums) | Yes | Yes |
| Co-constraints (e.g., `sensitive: true` + `default` forbidden) | Yes | Yes |
| Cross-field validation (all `${VAR_NAME}` refs declared in `env`) | Yes | Yes |

A fragment that is structurally invalid — wrong types, invalid enum values, forbidden field combinations — fails validation even without required-field checks. `kind: fragment` relaxes only required-field presence, not structural correctness.

The `metadata` block is optional in fragments. A fragment may include metadata for identification purposes, or it may omit it entirely. If `metadata` is present in a fragment, the same naming constraints apply as in a profile (`metadata.name` MUST match `^[a-z0-9-]{1,64}$` if present).

---

## What Fragments Are For

### Sharing a Single MCP Server Configuration

The most granular fragment: one developer configures a PostgreSQL MCP server, packages it as a fragment, and shares it with a teammate. The teammate adds it to their profile via `extends`. The MCP server declaration, its env requirements, and any notes travel together as a unit.

Without fragments, sharing an MCP server configuration means sharing a snippet of YAML and hoping the recipient integrates it correctly. A fragment is a complete, validated unit that compositions can reference by version.

### Distributing a Plugin Bundle

A team maintains a fragment that declares the set of plugins every team member's harness should include. Individual developer profiles extend this fragment. When the team adds a new plugin to the fragment, everyone who extends it picks it up at their next update.

```yaml
# my-org/data-team-plugins (fragment)
kind: fragment
metadata:
  name: data-team-plugins

plugins:
  - name: data-lineage
    source: harnessprotocol/harness-kit
    version: ">=0.2.0"
  - name: sql-formatter
    source: my-org/sql-tools
    version: "^1.0.0"
  - name: dbt-assist
    source: my-org/dbt-tools
    version: "^2.1.0"
```

### Sharing a Reusable Instruction Block

A team's security team publishes a fragment with operational instructions about security-sensitive patterns to avoid. Developers extend it to pull in those instructions without duplicating them.

```yaml
# my-org/security-instructions (fragment)
kind: fragment
metadata:
  name: security-instructions

instructions:
  operational: |
    ## Security Constraints
    - Do not write code that logs authentication tokens or credentials.
    - Do not suggest storing secrets in source code.
    - When writing database queries, always use parameterized queries.
    - SQL migrations that drop columns must be reviewed before execution.
  import-mode: merge
```

---

## Fragment Identification

A conformant fragment **MUST** declare `kind: fragment`. A document without a `kind` field defaults to `kind: profile` and is subject to all profile validation rules, including required fields.

Implementations **MUST** reject attempts to apply a fragment directly as if it were a profile. If a user runs `harness apply` on a file with `kind: fragment`, the implementation MUST surface a clear error:

```
Error: harness.yaml declares kind: fragment.
Fragments cannot be applied directly. Reference this fragment via the 'extends'
field in a profile, or change kind to 'profile' and add required fields.
```

This protection prevents the accidental application of an incomplete document, which would produce an undefined (and potentially unsafe) partial configuration.

---

## Composing Fragments into Profiles

In v1, fragments are composed into profiles manually via the `extends` mechanism. A profile lists fragments in its `extends` array; the implementation resolves, merges, and applies the result.

```yaml
$schema: https://harnessprotocol.ai/schema/v1/harness.schema.json
version: "1"
kind: profile

metadata:
  name: data-engineer

extends:
  - source: my-org/data-team-plugins
    version: "^1.0.0"
  - source: my-org/postgres-mcp
    version: ">=0.1.0"
  - source: my-org/security-instructions
    version: "^2.0.0"

instructions:
  operational: file://./instructions/local-ops.md
  import-mode: merge
```

The profile declares its own metadata and instructions, and imports plugin, MCP server, and instruction fragments from the team's shared repositories. The result is a complete harness that passes full profile validation.

Fragment composition follows the same merge semantics as profile inheritance. See [Inheritance](./inheritance.md) for the per-section resolution rules.

---

## Valid Fields in Fragments

All fields valid in a profile are valid in a fragment. There is no restricted set of fields for fragments. Any combination of `plugins`, `mcp-servers`, `env`, `instructions`, `permissions`, and `extends` may appear in a fragment.

The only difference is that required fields (`version`, `metadata.name` in a profile) may be absent in a fragment without causing a validation error.

A fragment may itself use `extends` to compose from other fragments. The full inheritance resolution applies.

---

## Relationship to the v2 Exchange Layer

*Non-normative:* Fragments are the foundational concept for the v2 Exchange layer. The Exchange layer will define a transport protocol (push/pull commands) and tooling for sharing fragments between developers, teams, and the public registry — an "AirDrop for harnesses."

In v2, a developer will be able to:

- `harness fragment publish my-org/postgres-mcp` — publish a fragment to the registry.
- `harness fragment pull my-org/postgres-mcp@^1.0.0` — fetch a fragment and add it to their profile.
- Browse and search published fragments at `harnessprotocol.ai`.

The v1 fragment format is designed to require no changes when v2 ships. A fragment authored today will be directly publishable to the v2 registry. The schema is stable; v2 adds the transport, not new document concepts.

---

## Example: PostgreSQL MCP Server Fragment

A standalone fragment that any profile can extend to get a PostgreSQL MCP server without writing the configuration from scratch.

```yaml
$schema: https://harnessprotocol.ai/schema/v1/harness.schema.json
version: "1"
kind: fragment

metadata:
  name: postgres-mcp
  description: "PostgreSQL MCP server via uvx mcp-server-postgres"
  author:
    name: alice
    url: https://github.com/alice
  version: "0.1.0"
  license: Apache-2.0

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

instructions:
  import-mode: skip
```

A profile that uses this fragment:

```yaml
$schema: https://harnessprotocol.ai/schema/v1/harness.schema.json
version: "1"
kind: profile

metadata:
  name: backend-service

extends:
  - source: my-org/postgres-mcp
    version: "^0.1.0"

instructions:
  operational: file://./CLAUDE.md
  import-mode: merge

permissions:
  tools:
    allow: [Read, Glob, Grep, Write, Edit, Bash]
    deny: ["mcp__postgres__drop_*"]
```

The profile inherits the `postgres` MCP server declaration and the `DB_CONNECTION_STRING` env entry from the fragment, and adds its own operational instructions and permissions on top.
