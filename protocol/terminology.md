# Terminology

This document defines terms used throughout the Harness Protocol specification. Where a term has a specific technical meaning in this spec, that meaning takes precedence over general usage. The three foundational terms are **Harness**, **Profile**, and **Fragment** — start there if you are new to the spec.

---

## Harness

The complete operational context for an AI coding agent: its plugins, skills, MCP server declarations, environment variable requirements, behavioral instructions, permission boundaries, governance policy, and any inherited configuration from parent harnesses. A harness is described by a `harness.yaml` file conforming to the Harness Protocol Schema.

A harness is not a tool, not a plugin, and not a model. It is the environment in which an agent operates — analogous to a shell environment for a Unix process, but for an AI coding session.

---

## Profile

A `harness.yaml` document with `kind: profile` (or no `kind` field, since `profile` is the default). A profile is a **complete harness document** that passes required-field validation. It is suitable for direct application by a conformant implementation.

Profiles are the primary artifact of the Harness Protocol. When someone shares a harness configuration, they are sharing a profile.

---

## Fragment

A `harness.yaml` document with `kind: fragment`. A fragment is a **partial harness document** that intentionally omits fields that would be required in a profile. Fragments are building blocks — they define a partial set of plugins, instructions, or permissions that other harnesses can incorporate. Required-field validation is skipped for fragments.

Fragments are the primary composition mechanism for the v2 Exchange layer. In v1, they can be used locally via `extends`.

---

## Plugin

A packaged extension that adds capabilities to an AI coding agent. A plugin may provide skills (prompt templates invocable as slash commands), agents (specialized sub-agent definitions), MCP server configurations, or combinations thereof.

In `harness.yaml`, plugins are declared in the `plugins[]` array. Each entry references a plugin by `source` (owner/repo) and `version`. The plugin itself declares its capabilities in a `plugin.json` manifest. See [Plugin Manifest](./plugin-manifest.md).

---

## Skill

A portable, named capability packaged as a directory containing a `SKILL.md` file (with `name` and `description` frontmatter) and optional supporting resources. A skill is loaded on demand — its metadata is available at session start and its full content is loaded when the agent needs it (progressive disclosure).

Skills reach a harness two ways: declared directly in the top-level `skills[]` array (see [HEP-4](../heps/hep-0004-skills.md) and [Profile Schema: skills](./profile-schema.md#skills)), or bundled by a plugin via its `plugin.json` manifest. A directly-declared skill does not require authoring a plugin.

Skills are distinct from agents: a skill is a capability the agent loads to perform a task; an agent is a sub-agent with its own configuration and scope.

---

## Agent

A specialized sub-agent definition provided by a plugin. An agent has its own system prompt, tool permissions, and operational scope. Unlike skills, agents can be long-running and may maintain session state within a task boundary. Agents are declared in a plugin's `plugin.json` manifest under `agents[]`.

---

## MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server declaration within a harness. MCP servers expose tools, resources, and prompts to the AI agent at runtime. In `harness.yaml`, MCP servers are declared in the `mcp-servers` map, keyed by name.

An MCP server declaration is not the server itself — it is configuration that tells the harness implementation how to start or connect to the server (transport, command, args, env). The harness implementation is responsible for lifecycle management.

---

## Import Mode

The strategy governing how a child harness's `instructions` fields combine with inherited instructions from a parent harness (via `extends`). The `instructions.import-mode` field accepts three values:

| Mode | Behavior |
|------|---------|
| `merge` | Child instructions are appended after parent instructions. Both apply. This is the default. |
| `replace` | Child instructions entirely replace the parent's instructions for the affected fields. Parent instructions are discarded. Requires explicit user confirmation before application. |
| `skip` | Child does not define instructions. Parent instructions pass through unmodified. |

Import mode applies to the `instructions` section only, not to plugins, permissions, or other sections.

---

## Source

The canonical reference for an origin, using `owner/repo` format (e.g., `harnessprotocol/harness-kit`). A `source` appears in a `plugins[]` entry, a `skills[]` entry, an `extends[]` entry, and (as an optional provenance identifier) an `mcp-servers` declaration. The `source` field replaces the legacy `marketplace` indirection by pointing directly to where the artifact lives.

A conformant implementation resolves a source by fetching the entry point (`plugin.json` for plugins, the `SKILL.md` directory for skills, `harness.yaml` for extends) from the specified repository at the specified version. The protocol does not mandate a specific hosting provider; GitHub is conventional but not required. For MCP servers, `source` may also be a registry identity in reverse-DNS form.

---

## Integrity

A content-verification checksum (`integrity.sha256`) for a fetched artifact — a plugin (`plugins[].integrity`), a skill (`skills[].integrity`), or an MCP server package (`mcp-servers[].integrity`, `stdio` only). The SHA-256 hash must match the resolved artifact before it is loaded. If verification fails, the implementation must refuse to load it and surface an error.

Integrity fields are optional by default but strongly recommended for any harness used in a production or shared context. An organization can make them mandatory with `policy.require-integrity: true`. The v2 Registry layer hashes every indexed artifact (SHA-256) so a fetched document can be verified against the index; cryptographic publisher signing (minisign) is a v3 addition. See the [crypto map](../security/crypto-map.md) for how these provenance mechanisms compose.

---

## Provenance

The recorded origin of an artifact, used for auditability. For MCP servers, the optional `source` and `version` fields declare where a server originates (a registry identity or `owner/repo`) so a user or implementation can audit it before connecting — independently of how the server is launched or contacted. Provenance is declarative: it documents and enables verification but is not itself the enforcement boundary.

---

## Exchange

*(v2 — [HEP-7](../heps/hep-0007-exchange-layer.md))* The protocol layer that moves a single `kind: fragment` document from one person to another through a signed, consent-first flow — "AirDrop for harnesses." Exchange is strictly one-to-one (push); one-to-many distribution is the [Registry](#registry) layer's role. It adds a transport envelope and a flow, not new `harness.yaml` fields. See [Exchange](./exchange.md).

---

## Offer Envelope

The signed JSON wrapper that carries a fragment through [Exchange](#exchange). It binds a fragment (plaintext or X25519-encrypted) to its sender's ed25519 identity, a `suggested-import-mode` hint, an `expires` timestamp, and a detached ed25519 `signature` over the fragment's canonical bytes. Validated by `exchange.schema.json`; the wrapped fragment is independently validated against the harness schema. The envelope carries its own `version: "1"`, distinct from the `harness.yaml` `version`.

---

## Key Fingerprint

The canonical short identifier for an Exchange participant: `blake2b:` followed by the first 16 hex chars of a BLAKE2b-256 hash of an ed25519 public key, displayed in groups (`a3f1:e2b4:c5d6:e7f8`). The fingerprint — not the unverified `display` name — is the authenticated identity a receiver recognizes when deciding to trust an offer.

---

## Relay

Optional, untrusted infrastructure for the HTTP-pull Exchange transport. A relay stores and forwards opaque (and, when encrypted, unreadable) offer bytes; it enforces expiry/single-use but is never a trust anchor — signature verification is end-to-end. Clipboard/file transport needs no relay.

---

## Consent-First Flow

The mandatory `Offer → Preview → Accept / Edit / Reject → Apply` sequence of the [Exchange](#exchange) layer. A sender cannot cause a fragment to be applied without the receiver previewing its full contents first; there is no "push and apply." This is a security property of the protocol, not a UX convention.

---

## Registry

*(v2 — [HEP-8](../heps/hep-0008-registry-layer.md))* The protocol layer providing hosted discovery at harnessprotocol.io — an index of public `owner/repo` profiles, fragments, and plugins with search, SHA-256 integrity hashing, and an append-only transparency log. The registry is an *index, not a trust anchor*: GitHub remains authoritative, and a valid hash attests what was indexed, not that content is safe. One-to-many pull, complementing [Exchange](#exchange)'s 1:1 push. See [Registry](./registry.md).

---

## Transparency Log

The registry's append-only, publicly streamed (NDJSON) record of every `index` and `delist` event, each with a monotonic `seq`, a timestamp, an entry id, and (for index events) a content hash. It makes the index auditable — an index entry absent from the log signals tampering — and makes delistings non-silent. Cryptographic registry signing over the log is v3 scope.

---

## Policy

An organization or team governance ceiling, declared in the top-level `policy` section (see [HEP-6](../heps/hep-0006-governance-layer.md)). Unlike every other section, a `policy` constrains what extending or consuming profiles may grant and **cannot be widened by them** — downstream profiles may only narrow it. A policy can allowlist/denylist MCP server, plugin, and skill sources; cap tool and network grants; restrict marketplaces; and require integrity verification.

Policies accumulate across the inheritance chain (allowlists intersect, denylists union, ceilings intersect, `require-integrity` is monotonic) and are enforced as a fatal validation step during application. A document with no `policy` imposes no constraints. This is the protocol's expression of the managed → project → personal precedence used in team deployments.

---

## Semver Range

A version constraint string using [Semantic Versioning](https://semver.org) range syntax (following the npm/Cargo convention):

| Expression | Meaning |
|------------|---------|
| `"1.2.3"` | Exactly version 1.2.3 |
| `">=0.2.0"` | 0.2.0 or later |
| `"^1.0.0"` | Compatible with 1.x.x (>=1.0.0 <2.0.0) |
| `"~1.2.0"` | Patch-compatible with 1.2.x (>=1.2.0 <1.3.0) |
| `">=1.0.0 <2.0.0"` | Explicit range |

Semver ranges appear in `plugins[].version` and `extends[].version`.

---

## x- Prefix

Fields in `harness.yaml` whose keys begin with `x-` are **implementation extension fields**. They are reserved for implementation-specific or tool-specific configuration that is outside the core protocol. Conformant implementations must not reject a harness document solely because it contains `x-` fields they do not recognize — they must ignore unknown `x-` fields.

Extension fields must not redefine or shadow any field defined in the core schema. They are not portable across implementations unless both implementations explicitly support the same extension.

Example: `x-claude-model: claude-opus-4` is a valid extension field that a Claude Code-specific implementation might consume, while other implementations ignore it.

---

## Application Pipeline

The 7-step process that transforms a validated `harness.yaml` into an active agent session: Parse, Validate, Resolve Sources, Merge, Enforce Policy, Substitute Variables, Apply. Each step either succeeds and passes its result to the next, or fails and halts the pipeline. There is no partial application — either the full harness applies or none of it does.

See [Application Semantics](./application.md) for the full specification.

---

## Effective Configuration

The fully resolved result of applying a harness document. Produced after all `extends` chains are resolved, all merge rules are applied, and all `${VAR_NAME}` substitutions are performed. The effective configuration is the normative output contract of the [application pipeline](./application.md) — it is what an implementation has produced when it says "this harness has been applied."

The effective configuration includes the final state of all sections: metadata, plugins, skills, MCP servers, environment declarations, instructions, permissions, and the accumulated policy ceiling. It is a snapshot — changes to parent harnesses or environment variables after application do not retroactively alter an active session's effective configuration.

---

## Source Resolution

The process by which a `source` field (in `plugins[]` or `extends[]`) is transformed into fetchable content. Source resolution encompasses parsing the source string, determining the git host, resolving a version against available tags, fetching content at the resolved ref, and locating the entry point (`plugin.json` for plugins, `harness.yaml` for extends).

See [Source Resolution](./source-resolution.md) for the full specification.

---

## HEP

**Harness Enhancement Proposal.** The mechanism for proposing changes to the Harness Protocol specification. An HEP is a structured document describing a proposed change, its motivation, design, backward compatibility impact, and security considerations. The HEP process gates all changes to the core schema and protocol layers.

HEPs are numbered sequentially (HEP-1, HEP-2, ...) and fall into one of three types:

| Type | Purpose |
|------|---------|
| **Standards Track** | Normative changes — new schema fields, behavioral changes, security model changes. Requires a prototype before Accepted. |
| **Informational** | Design guidance, analysis, or documentation. No conformance impact. |
| **Process** | Changes to governance, the HEP process, or release procedures. |

HEP lifecycle: `Draft → Review → Accepted / Rejected / Withdrawn`. A Draft HEP that goes 6 months without a named maintainer sponsor enters **Dormant** status — it is not rejected and can be revived at any time by a sponsor stepping forward.

A change is not part of the specification until the corresponding HEP is accepted and merged. The HEP process does not govern implementation-specific behavior, `x-` extension fields, or blog/example content.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full HEP submission process.
