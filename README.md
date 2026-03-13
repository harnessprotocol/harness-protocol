# Harness Protocol

> **Status:** v1 Schema layer — draft

The Harness Protocol is an open specification for portable AI coding harnesses — a vendor-neutral `harness.yaml` format that captures the complete operational context for an AI coding agent: plugins, MCP servers, environment requirements, behavioral instructions, and permissions. It is to AI coding harnesses what the Model Context Protocol (MCP) is to tool communication.

AI coding tools like Claude Code, Cursor, and GitHub Copilot each have their own proprietary formats for capturing agent context. A developer who crafts a well-tuned configuration for one tool cannot share it with a teammate on a different tool, publish it for their team to reuse, or carry it when they switch tools. The Harness Protocol defines a common format so that harness configurations become portable, shareable artifacts — the same way MCP made tool communication portable.

---

## Protocol Layers

The specification is organized into three layers, each building on the previous.

| Layer | Description | Status |
|-------|-------------|--------|
| **Schema** | The `harness.yaml` format, JSON Schema validation, security model, plugin manifest | v1 — current |
| **Exchange** | Harness-to-harness sharing: publish, fetch, and compose harnesses across tools and teams | v2 — planned |
| **Registry** | Hosted discovery at harnessprotocol.ai: search, publish, version resolution, integrity verification | v2/v3 — planned |

Layers are intentionally decoupled. A tool can implement Schema-layer validation today without any dependency on exchange or registry infrastructure.

---

## harness.yaml

A harness profile is a YAML file validated against the Harness Protocol JSON Schema. The minimal valid profile:

```yaml
$schema: https://harnessprotocol.ai/schema/v1/harness.schema.json
version: "1"
metadata:
  name: my-harness
  description: A minimal valid Harness Protocol v1 profile.
```

A fuller example showing common fields:

```yaml
$schema: https://harnessprotocol.ai/schema/v1/harness.schema.json
version: "1"
metadata:
  name: data-engineer
  description: Harness for data engineering work in Go and SQL.
  author: acme-org

plugins:
  - source: acme-org/sql-explorer
    version: "1.2.0"
    integrity:
      sha256: "abc123..."

mcp-servers:
  - name: filesystem
    transport: stdio
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]

env:
  - name: DATABASE_URL
    description: Primary database connection string
    sensitive: true

instructions:
  - path: .harness/instructions.md
    import-mode: append

permissions:
  allow:
    - read
    - edit
  deny:
    - web-fetch
```

The full field reference is in [protocol/profile-schema.md](protocol/profile-schema.md). The JSON Schema is the authoritative validation source.

---

## Getting Started

[harness-kit](https://github.com/harnessprotocol/harness-kit) is the reference implementation of the Harness Protocol. It provides a parser, validator, plugin loader, MCP server lifecycle manager, and CLI for working with `harness.yaml` profiles. Start there to use the protocol today.

Conformance does not require harness-kit — any implementation that correctly validates and applies `harness.yaml` per this specification is conformant.

---

## Documentation

Full documentation is available at [harnessprotocol.io/spec](https://harnessprotocol.io/spec).

| Document | Content |
|----------|---------|
| [protocol/overview.md](protocol/overview.md) | What the protocol is and how the layers fit together |
| [protocol/terminology.md](protocol/terminology.md) | Glossary of all terms used in the spec |
| [protocol/architecture.md](protocol/architecture.md) | System diagram, layer interactions, trust model |
| [protocol/profile-schema.md](protocol/profile-schema.md) | Full `harness.yaml` field reference |
| [protocol/plugin-manifest.md](protocol/plugin-manifest.md) | `plugin.json` format for plugin authors |
| [protocol/mcp-declarations.md](protocol/mcp-declarations.md) | MCP server transport types, variable substitution, security |
| [protocol/instructions.md](protocol/instructions.md) | Instruction slots, content sources, import modes |
| [protocol/environment.md](protocol/environment.md) | Environment variable declarations and sensitive data handling |
| [protocol/fragments.md](protocol/fragments.md) | `kind: fragment` — partial harness documents for composition |
| [protocol/inheritance.md](protocol/inheritance.md) | `extends` resolution order and per-section merge rules |
| [security/threat-model.md](security/threat-model.md) | Threat model and security design |
| [security/trust-boundaries.md](security/trust-boundaries.md) | Trust boundaries between spec, implementations, profiles, and remote content |
| [security/secrets.md](security/secrets.md) | Sensitive variable handling and secrets patterns |
| [security/permissions.md](security/permissions.md) | Permission model and enforcement |
| [security/integrity.md](security/integrity.md) | Content integrity verification |
| [security/instruction-injection.md](security/instruction-injection.md) | Instruction injection threat and mitigations |

## Where to Start

**Harness authors** (writing `harness.yaml` files):
1. [protocol/profile-schema.md](protocol/profile-schema.md) — the complete field reference
2. [examples/](examples/) — annotated example profiles to copy from
3. [schema/draft/harness.schema.json](schema/draft/harness.schema.json) — validate your file

**Tool implementers** (building a harness implementation):
1. [protocol/overview.md](protocol/overview.md) — what the protocol is and how layers fit together
2. [protocol/architecture.md](protocol/architecture.md) — system model and trust boundaries
3. [protocol/profile-schema.md](protocol/profile-schema.md) — the normative field specification
4. [security/](security/) — security model, sensitive data rules, and threat model

---

## Contributing

Spec changes go through the HEP (Harness Enhancement Proposal) process. Editorial fixes can be submitted directly as pull requests. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full process.

## Security

See [SECURITY.md](SECURITY.md) for the security policy and responsible disclosure process.

## License

Apache License 2.0. See [LICENSE](LICENSE).
