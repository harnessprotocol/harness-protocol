# Harness Protocol Overview

## What Is the Harness Protocol?

AI coding tools like Claude Code, Cursor, and GitHub Copilot each have their own proprietary formats for configuring an agent's context: which tools it can use, what MCP servers are connected, what instructions govern its behavior, what environment variables it needs. A developer who crafts a well-tuned configuration for one tool cannot share it, publish it, or carry it to another team without manual translation. There is no portable unit of "how this agent should work."

The Harness Protocol defines that unit. A **harness** is the complete operational context for an AI coding agent: its plugins, skills, MCP server declarations, environment requirements, behavioral instructions, permissions, governance policy, and inheritance chain. The Harness Protocol specifies a vendor-neutral `harness.yaml` format for describing a harness, a validation model for ensuring it is well-formed and safe, and a layered architecture for exchange and discovery. It is to AI coding harnesses what the Model Context Protocol (MCP) is to tool communication — an open specification that implementations can build against, rather than a product any single vendor owns.

## Notational Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [BCP 14](https://www.rfc-editor.org/info/bcp14) [[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)] [[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)] when, and only when, they appear in all capitals, as shown here.

## Protocol Layers

The Harness Protocol is organized into three layers, each building on the previous. Version 1 delivers the Schema layer. The Exchange layer is accepted for v2 ([HEP-7](../heps/hep-0007-exchange-layer.md), normative spec in [Exchange](./exchange.md)); the Registry layer remains in draft for v2 ([HEP-8](../heps/hep-0008-registry-layer.md), normative draft in [Registry](./registry.md)).

| Layer | Description | Status |
|-------|-------------|--------|
| **Schema** | The `harness.yaml` format: structure, validation rules, security model, inheritance semantics | v1 (current) |
| **Exchange** | Harness-to-harness sharing — a protocol for publishing, fetching, and composing harnesses between tools and teams ("AirDrop for harnesses") | v2 (accepted — HEP-7) |
| **Registry** | Hosted discovery at harnessprotocol.io — search, publish, version resolution, integrity verification for the broader ecosystem | v2/v3 (draft — HEP-8) |

The layers are intentionally decoupled. A tool can implement Schema-layer validation today without any dependency on exchange or registry infrastructure. Exchange has shipped; tools opt in incrementally. Registry will follow the same pattern once accepted.

## What v1 Delivers

Version 1 of the Harness Protocol specifies the **Schema layer**:

- **The `harness.yaml` format** — a structured YAML document with top-level sections for metadata, plugins, skills, architectural constraints, MCP servers, environment declarations, instructions, permissions, governance policy, and inheritance. See [Profile Schema](./profile-schema.md) for the full specification.
- **The JSON Schema** — a machine-readable schema at `https://harnessprotocol.io/schema/v1/harness.schema.json` that implementations use to validate harness files. The JSON Schema is the authoritative source of truth; this documentation is normative prose on top of it.
- **The security model** — rules for sensitive environment variables, permission inheritance, integrity verification, and trust boundaries. See [Security](../security/) for details.
- **The plugin manifest format** — the `plugin.json` format that plugin authors use to declare what their plugin provides and requires. See [Plugin Manifest](./plugin-manifest.md).
- **The `kind: fragment` mechanism** — a partial harness document that intentionally omits required top-level fields, used as a building block for Exchange-layer composition.

## How It Relates to harness-kit

*Non-normative:* [harness-kit](https://github.com/harnessprotocol/harness-kit) is the **reference implementation** of the Harness Protocol. The relationship mirrors MCP and Claude Desktop: the protocol is the open specification; harness-kit is the first complete implementation that exercises and validates it.

harness-kit provides:
- A parser and validator for `harness.yaml` against the v1 JSON Schema
- Plugin resolution and loading via the `source: owner/repo` mechanism
- MCP server lifecycle management
- Instruction file merging with the configured `import-mode`
- Permission enforcement at the tool boundary

Conformance to the Harness Protocol does not require using harness-kit. Any implementation that correctly validates and applies `harness.yaml` according to this specification is a conformant implementation.

## Reading Paths

**For harness authors** (writing `harness.yaml` files): Start with [Profile Schema](./profile-schema.md) for the field reference, then [the examples](../examples/) to see real profiles. Refer to [Environment](./environment.md) and [Instructions](./instructions.md) as needed.

**For tool implementers** (building a conformant implementation): Start with [Architecture](./architecture.md) for the system model, then [Application Semantics](./application.md) for the 7-step pipeline, then [Source Resolution](./source-resolution.md) for how `owner/repo` references resolve, then [Profile Schema](./profile-schema.md) for the normative field spec. The [Security](../security/) docs are essential reading.

---

## Standards & Prior Art

The Harness Protocol builds on established standards:

- **[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) / [BCP 14](https://www.rfc-editor.org/info/bcp14)** — Normative language ("MUST", "SHOULD", etc.)
- **[JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/json-schema-core)** — Machine-readable validation
- **[Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html)** — Version constraints for plugins and extends
- **[SPDX License List](https://spdx.org/licenses/)** — License identifiers in metadata
- **[Model Context Protocol (MCP)](https://modelcontextprotocol.io/)** — Tool communication layer referenced in MCP server declarations
- **[PEP process](https://peps.python.org/pep-0001/)** — Governance model inspiration for the HEP (Harness Enhancement Proposal) process

### Interoperation with the agent standards stack

A harness is the portable description that ties together the standards an engineering team already uses. The Harness Protocol interoperates with — and compiles to — the established formats in the ecosystem:

- **AGENTS.md** — the cross-tool agent-instruction file read natively by most coding tools. The `instructions` section maps to it directly (see [Instructions](./instructions.md)).
- **Agent Skills (`SKILL.md`)** — the portable skill capability format. The `skills` section declares them directly (see [HEP-4](../heps/hep-0004-skills.md)).
- **The MCP registry and server cards** — provenance and discovery for MCP servers, referenced by the optional `source` field on server declarations (see [MCP Declarations](./mcp-declarations.md)).

MCP, AGENTS.md, and Agent Skills are stewarded under the **Agentic AI Foundation** at the Linux Foundation. The Harness Protocol is the vendor-neutral layer that declares which of these an agent uses and how they compose — it does not replace any of them.

---

## Document Map

| Document | Content |
|----------|---------|
| [Terminology](./terminology.md) | Glossary of all terms used in the spec |
| [Architecture](./architecture.md) | System diagram, layer interactions, trust model |
| [Design Principles](./principles.md) | Values that guide protocol decisions and HEP evaluation |
| [Profile Schema](./profile-schema.md) | Full `harness.yaml` field reference |
| [Plugin Manifest](./plugin-manifest.md) | `plugin.json` format for plugin authors |
| [MCP Declarations](./mcp-declarations.md) | MCP server transport types, variable substitution, security |
| [Instructions](./instructions.md) | Instruction slots, content sources, import modes |
| [Environment](./environment.md) | Environment variable declarations, sensitive handling |
| [Fragments](./fragments.md) | `kind: fragment` — partial harness documents for composition |
| [Source Resolution](./source-resolution.md) | Source resolution algorithm for `owner/repo` and local path references |
| [Exchange](./exchange.md) | *(v2)* The signed offer envelope and consent-first peer-to-peer sharing flow |
| [Registry](./registry.md) | *(v2 draft)* Hosted discovery, integrity hashing, namespace design, transparency log |
| [Application](./application.md) | Application pipeline, effective configuration, error handling |
| [Inheritance](./inheritance.md) | `extends` resolution order and per-section merge rules |
| [Security](../security/) | Permission model, integrity verification, sensitive data rules |
| [Extensions](../extensions/) | `x-` prefix fields and implementation-specific extensions |

## Conformance

This specification defines two conformance classes.

**Conforming Document.** A `harness.yaml` file is a conforming document if it:
1. Validates successfully against the Harness Protocol v1 JSON Schema at `https://harnessprotocol.io/schema/v1/harness.schema.json`, and
2. Satisfies all behavioral constraints stated in normative (MUST/MUST NOT) terms in this specification that are not fully expressible as JSON Schema constraints (e.g., cross-field declaration coverage for `${VAR_NAME}` references).

**Conforming Implementation.** A tool or library is a conforming implementation if it:
1. Correctly parses and validates `harness.yaml` documents against the v1 JSON Schema,
2. Enforces all MUST-level behavioral requirements stated in this specification (including cross-field validation not covered by the schema), and
3. Applies conforming documents to AI coding sessions in accordance with the semantics defined for each section (plugins, MCP servers, env, instructions, permissions, extends).

Conformance does not require use of any specific library, registry, or hosting provider. An implementation that satisfies the above requirements on any platform is conformant.

### Conformance Test Suite

A reference test suite for validating conformance is planned. Track progress in [GitHub Issues](https://github.com/harnessprotocol/harness-protocol/issues).
